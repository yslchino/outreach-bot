const test = require("node:test");
const assert = require("node:assert/strict");
const {
  config
} = require("../config");
const {
  checkSending,
  dayKey
} = require("../services/policy");
const {
  sendMessage,
  escapeHTML
} = require("../services/mailer");
const {
  deliverClaimed
} = require("../services/worker");
const {
  isReply
} = require("../jobs/replyDetectionJob");
const {
  reserveUsage
} = require("../services/usage");
const safeConfig = {
  sendingEnabled: true,
  provider: "resend",
  sender: "GET <team@example.com>",
  replyTo: "team@example.com",
  postalAddress: "Test address, Test City"
};
const contact = {
  status: "pending",
  emailVerified: true,
  permission: "opted_in",
  replied: false
};
const message = {
  _id: "012345678901234567890123",
  to: "recipient@example.com",
  subject: "Introduction",
  body: "Hello",
  kind: "initial"
};
function configure(t) {
  const previous = {
    ...config
  };
  Object.assign(config, safeConfig);
  t.after(() => Object.assign(config, previous));
}
function dependencies(overrides = {}) {
  const states = [],
    delivered = [];
  return {
    states,
    delivered,
    loadContact: async () => ({
      ...contact
    }),
    isSuppressed: async () => false,
    campaignIsActive: async () => true,
    reserveContact: async () => true,
    reserveDaily: async () => true,
    parent: async () => null,
    saveState: async (m, changes) => states.push(changes),
    markContact: async () => {},
    deliver: async m => {
      delivered.push(m);
      return {
        providerId: "provider-1"
      };
    },
    ...overrides
  };
}
test("sending is denied by default and unverified or non-opted-in Resend leads are rejected", () => {
  assert.throws(() => checkSending({
    ...safeConfig,
    sendingEnabled: false
  }, contact), /disabled/);
  assert.throws(() => checkSending(safeConfig, {
    ...contact,
    emailVerified: false
  }), /Verify/);
  assert.throws(() => checkSending(safeConfig, {
    ...contact,
    permission: "business_contact"
  }), /opted-in/);
  assert.throws(() => checkSending(safeConfig, {
    ...contact,
    replied: true
  }), /eligible/);
});
test("Resend returned errors are definitive failures; a missing provider ID is not success", async t => {
  configure(t);
  await assert.rejects(sendMessage(message, contact, null, {
    resend: {
      emails: {
        send: async () => ({
          error: {
            message: "Quota exceeded"
          }
        })
      }
    }
  }), err => err.definitive === true && /Quota/.test(err.message));
  await assert.rejects(sendMessage(message, contact, null, {
    resend: {
      emails: {
        send: async () => ({
          data: {}
        })
      }
    }
  }), /message ID/);
});
test("successful sends use stable idempotency keys, reply headers, and escaped HTML", async t => {
  configure(t);
  let payload, options;
  const receipt = await sendMessage({
    ...message,
    body: "<script>alert(1)</script>"
  }, contact, {
    rfcMessageId: "<parent@example.com>"
  }, {
    resend: {
      emails: {
        send: async (p, o) => {
          payload = p;
          options = o;
          return {
            data: {
              id: "provider-1"
            }
          };
        }
      }
    }
  });
  assert.equal(options.idempotencyKey, "message-" + message._id);
  assert.equal(payload.headers["In-Reply-To"], "<parent@example.com>");
  assert.equal(payload.html.includes("<script>"), false);
  assert.equal(receipt.providerId, "provider-1");
  assert.equal(escapeHTML('"<&'), "&quot;&lt;&amp;");
});
test("accepted messages persist a receipt without labeling them delivered", async t => {
  configure(t);
  const d = dependencies();
  await deliverClaimed(message, d);
  assert.equal(d.delivered.length, 1);
  assert.equal(d.states[0].renderedText.includes("Test address"), true);
  assert.equal(d.states.at(-1).status, "accepted");
  assert.equal(d.states.at(-1).providerId, "provider-1");
  assert.equal(d.states.at(-1).deliveryStatus, undefined);
});
test("provider rejection and network uncertainty are separate terminal outcomes", async t => {
  configure(t);
  for (const definitive of [true, false]) {
    const d = dependencies({
      deliver: async () => {
        throw Object.assign(new Error("failure"), {
          definitive
        });
      }
    });
    await deliverClaimed(message, d);
    assert.equal(d.states.at(-1).status, definitive ? "failed" : "uncertain");
  }
});
test("send-success/save-failure never becomes a safe-to-retry failure", async t => {
  configure(t);
  const d = dependencies({
    saveState: async (message, changes) => {
      if (changes.status === "accepted") throw new Error("Database unavailable");
    }
  });
  await assert.rejects(deliverClaimed(message, d), /Database unavailable/);
  assert.equal(d.delivered.length, 1);
});
test("daily capacity, paused campaigns, duplicate reservations, and suppression prevent sends", async t => {
  configure(t);
  for (const [overrides, status] of [[{
    reserveDaily: async () => false
  }, "queued"], [{
    campaignIsActive: async () => false
  }, "queued"], [{
    reserveContact: async () => false
  }, "skipped"], [{
    isSuppressed: async () => true
  }, "skipped"]]) {
    const d = dependencies(overrides);
    await deliverClaimed(message, d);
    assert.equal(d.delivered.length, 0);
    assert.equal(d.states[0].status, status);
  }
});
test("reply arriving between claim and delivery stops the message", async t => {
  configure(t);
  let checks = 0;
  const d = dependencies({
    loadContact: async () => ({
      ...contact,
      replied: ++checks > 1
    })
  });
  await deliverClaimed({
    ...message,
    kind: "followup",
    parent: "p"
  }, dependencies({
    ...d,
    parent: async () => ({
      status: "accepted",
      deliveryStatus: "unknown"
    })
  }));
  assert.equal(d.delivered.length, 0);
  assert.equal(d.states[0].status, "skipped");
});
test("reply matching requires the correct sender and an exact reference", () => {
  const headers = [{
    name: "From",
    value: "Person <recipient@example.com>"
  }, {
    name: "References",
    value: "<original@example.com> <other@example.com>"
  }];
  assert.equal(isReply(headers, "recipient@example.com", ["<original@example.com>"]), true);
  assert.equal(isReply(headers, "someone@example.com", ["<original@example.com>"]), false);
  assert.equal(isReply(headers, "recipient@example.com", ["<old@example.com>"]), false);
  assert.equal(isReply([{
    name: "From",
    value: "recipient@example.com"
  }], "recipient@example.com", ["<original@example.com>"]), false);
});
test("daily usage boundaries follow the configured business timezone", () => {
  assert.equal(dayKey(new Date("2026-11-01T02:00:00Z"), "America/Los_Angeles"), "2026-10-31");
  assert.equal(dayKey(new Date("2026-11-01T09:00:00Z"), "America/Los_Angeles"), "2026-11-01");
});
test("atomic usage reservation never exceeds the allowance under competing requests", async () => {
  let count = 0;
  const usage = {
    updateOne: async () => {},
    findOneAndUpdate: async query => {
      if (count >= query.count.$lt) return null;
      count++;
      return {
        count
      };
    }
  };
  const results = await Promise.all(Array.from({
    length: 20
  }, () => reserveUsage("test", 5, usage)));
  assert.equal(results.filter(Boolean).length, 5);
  assert.equal(count, 5);
});
