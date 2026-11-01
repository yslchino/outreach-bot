const test = require("node:test");
const assert = require("node:assert/strict");
const Campaign = require("../models/Campaign");
const Contact = require("../models/Contact");
const Message = require("../models/Message");
const Suppression = require("../models/Suppression");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const {
  withDraft,
  launch,
  prepareFollowups
} = require("../controllers/campaignController");
const {
  createUser
} = require("../controllers/authController");
const {
  config
} = require("../config");
const {
  reserveRecipient
} = require("../services/reservations");
const id = "012345678901234567890123";
const response = () => ({
  statusCode: 200,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  }
});
test("competing draft edits and launch operations cannot hold the same campaign lock", async t => {
  let status = "draft",
    release;
  const wait = new Promise(resolve => {
    release = resolve;
  });
  t.mock.method(Campaign, "findOneAndUpdate", async () => {
    if (status !== "draft") return null;
    status = "editing";
    return {
      _id: id
    };
  });
  t.mock.method(Message, "exists", async () => false);
  t.mock.method(Campaign, "updateOne", async () => {
    status = "draft";
  });
  const first = withDraft(id, async () => {
    await wait;
    return "saved";
  });
  await assert.rejects(withDraft(id, async () => assert.fail("Second edit entered")), /busy or already approved/);
  release();
  assert.equal(await first, "saved");
  assert.equal(status, "draft");
});
test("one ineligible recipient prevents approval of the whole batch", async t => {
  t.mock.method(Message, "exists", async () => false);
  const previous = {
    ...config
  };
  Object.assign(config, {
    sendingEnabled: true,
    provider: "resend",
    sender: "GET <team@example.com>",
    replyTo: "team@example.com",
    postalAddress: "Test address"
  });
  t.after(() => Object.assign(config, previous));
  t.mock.method(Campaign, "findOneAndUpdate", async () => ({
    _id: id
  }));
  t.mock.method(Campaign, "updateOne", async () => ({}));
  t.mock.method(Message, "find", async () => [{
    contact: "one",
    to: "one@example.com",
    body: "Hello",
    subject: "Hi"
  }, {
    contact: "two",
    to: "two@example.com",
    body: "Hello",
    subject: "Hi"
  }]);
  t.mock.method(Contact, "findById", async contactId => ({
    emailVerified: contactId === "one",
    permission: "opted_in"
  }));
  t.mock.method(Suppression, "exists", async () => false);
  const update = t.mock.method(Message, "updateMany", async () => assert.fail("No message should be queued"));
  await assert.rejects(launch({
    params: {
      id
    },
    body: {
      confirmed: true
    },
    user: {
      _id: id
    }
  }, response()), /Verify/);
  assert.equal(update.mock.callCount(), 0);
});
test("five unique seats cap concurrent account creation, including occupied disabled accounts", async t => {
  const seats = new Set([1]);
  t.mock.method(User, "exists", async () => false);
  t.mock.method(bcrypt, "hash", async () => "test-hash");
  t.mock.method(User, "create", async input => {
    if (seats.has(input.seat)) throw Object.assign(new Error("Duplicate seat"), {
      code: 11000,
      keyPattern: {
        seat: 1
      }
    });
    seats.add(input.seat);
    return {
      ...input,
      _id: input.username
    };
  });
  const results = await Promise.all(Array.from({
    length: 8
  }, async (_, i) => {
    const res = response();
    await createUser({
      body: {
        username: "user" + i,
        displayName: "Test " + i,
        password: "long-test-password"
      }
    }, res);
    return res.statusCode;
  }));
  assert.equal(results.filter(code => code === 201).length, 4);
  assert.equal(results.filter(code => code === 409).length, 4);
  assert.equal(seats.size, 5);
});
test("global normalized-email reservation blocks a different campaign or duplicate contact", async () => {
  const owners = new Map();
  const reservations = {
    findOneAndUpdate: async query => {
      const owner = owners.get(query._id);
      if (owner && owner !== query.message) throw Object.assign(new Error("Duplicate"), {
        code: 11000
      });
      owners.set(query._id, query.message);
      return {
        _id: query._id
      };
    }
  };
  assert.equal(await reserveRecipient({
    _id: "message-one",
    to: "one@example.com",
    campaign: "campaign-one"
  }, reservations), true);
  assert.equal(await reserveRecipient({
    _id: "message-two",
    to: "one@example.com",
    campaign: "campaign-two"
  }, reservations), false);
  assert.equal(await reserveRecipient({
    _id: "message-one",
    to: "one@example.com",
    campaign: "campaign-one"
  }, reservations), true);
});
test("follow-up response waits until the campaign lock is released", async (t) => {
  let release;
  const wait = new Promise((resolve) => { release = resolve; });
  t.mock.method(Campaign, "findOneAndUpdate", async () => ({ _id: id, followUpDays: 3 }));
  t.mock.method(Message, "find", async () => []);
  t.mock.method(Message, "exists", async () => false);
  t.mock.method(Campaign, "updateOne", async () => { await wait; });
  const res = response();
  const operation = prepareFollowups({ params: { id } }, res);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(res.body, undefined);
  release();
  await operation;
  assert.equal(res.body.created, 0);
});
