const test = require("node:test");
const assert = require("node:assert/strict");
const { config } = require("../config");
const { validateConfig } = require("../config");
const { processReceived } = require("../services/resendReceiving");
const { isOptOut, recordReply } = require("../services/replies");
const Contact = require("../models/Contact");
const Message = require("../models/Message");
class Ledger {
  rows = new Map();
  async updateOne(query, update, options = {}) {
    let row = this.rows.get(query._id);
    if (!row && options.upsert) { row = { _id: query._id, ...update.$setOnInsert }; this.rows.set(query._id, row); }
    if (!row || (query.leaseToken && query.leaseToken !== row.leaseToken)) return { matchedCount: 0 };
    Object.assign(row, update.$set);
    for (const key of Object.keys(update.$unset || {})) delete row[key];
    return { matchedCount: 1 };
  }
  async findOneAndUpdate(query, update) {
    const row = this.rows.get(query._id);
    if (!row || !(["pending", "failed"].includes(row.status) || (row.status === "processing" && row.leaseUntil < new Date()))) return null;
    Object.assign(row, update.$set); return { ...row };
  }
  async findById(id) { return this.rows.get(id); }
  async exists(query) {
    const row = this.rows.get(query._id);
    return row && row.leaseToken === query.leaseToken && row.leaseUntil > query.leaseUntil.$gt;
  }
}
function fixture(t, overrides = {}) {
  const previous = { ...config };
  Object.assign(config, { replyProvider: "resend", resendReceivingEnabled: true, resendReceivingAddress: "replies@example.invalid" });
  t.after(() => Object.assign(config, previous));
  const ledger = new Ledger(), saved = [];
  const data = { id: "incoming-one", from: "Person <lead@example.invalid>", to: ["replies@example.invalid"],
    message_id: "<reply@sender.invalid>", created_at: "2026-11-06T16:00:00Z", subject: "Re: Freight",
    text: "Please remove me from your list.", headers: { From: "Person <lead@example.invalid>", "In-Reply-To": "<original@provider.invalid>" }, ...overrides };
  const dependencies = { ledger, get: async () => data,
    match: async () => ({ _id: "original-one", contact: "contact-one", rfcMessageId: "<original@provider.invalid>", acceptedAt: "2026-11-06T15:00:00Z" }),
    contact: async () => ({ _id: "contact-one", email: "lead@example.invalid" }),
    record: async (contact, incoming) => { saved.push(incoming); return { optOut: isOptOut(incoming.subject, incoming.body) }; },
  };
  const event = { type: "email.received", created_at: data.created_at, data: { email_id: data.id, message_id: data.message_id } };
  return { ledger, saved, data, dependencies, event };
}
test("received reply is processed once and duplicate events do not retrieve or apply it again", async t => {
  const f = fixture(t); let reads = 0;
  f.dependencies.get = async () => { reads++; return f.data; };
  assert.equal((await processReceived(f.event, f.dependencies)).status, "processed");
  assert.equal((await processReceived(f.event, f.dependencies)).duplicate, true);
  assert.equal(reads, 1); assert.equal(f.saved.length, 1);
  assert.equal(f.ledger.rows.get(f.data.id).optOut, true);
});
test("wrong mailbox, sender headers, and missing exact reply references never change a contact", async t => {
  const f = fixture(t);
  for (const [id, change] of [
    ["wrong-inbox", { to: ["elsewhere@example.invalid"] }],
    ["wrong-from", { headers: { From: "attacker@example.invalid", References: "<original@provider.invalid>" } }],
    ["wrong-reference", { headers: { From: "lead@example.invalid", References: "<other@provider.invalid>" } }],
  ]) {
    const data = { ...f.data, id, ...change }; f.dependencies.get = async () => data;
    const event = { ...f.event, data: { ...f.event.data, email_id: id } };
    assert.equal((await processReceived(event, f.dependencies)).status, "unmatched");
  }
  assert.equal(f.saved.length, 0);
});
test("temporary retrieval failures are retryable; competing attempts do not both apply a reply", async t => {
  const f = fixture(t); f.dependencies.get = async () => { throw new Error("network"); };
  await assert.rejects(processReceived(f.event, f.dependencies), error => error.status === 503);
  assert.equal(f.ledger.rows.get(f.data.id).status, "failed");
  let release;
  f.dependencies.get = async () => { await new Promise(resolve => { release = resolve; }); return f.data; };
  const first = processReceived(f.event, f.dependencies);
  while (!release) await new Promise(resolve => setImmediate(resolve));
  await assert.rejects(processReceived(f.event, f.dependencies), error => error.status === 503);
  release(); await first;
  assert.equal(f.saved.length, 1);
});
test("HTML-only matched replies stop follow-ups and require content review; raw HTML is not stored", async t => {
  const f = fixture(t, { text: null, html: "<script>bad()</script>unsubscribe" });
  assert.equal((await processReceived(f.event, f.dependencies)).status, "needs_review");
  assert.equal(f.saved.length, 1); assert.equal(f.saved[0].body, "");
  assert.equal(f.ledger.rows.get(f.data.id).preview.includes("<script>"), false);
});
test("disabled receiving and mismatched provider message identities cannot process incoming mail", async t => {
  const f = fixture(t);
  config.resendReceivingEnabled = false;
  await assert.rejects(processReceived(f.event, f.dependencies), error => error.status === 503);
  config.resendReceivingEnabled = true;
  const changed = { ...f.event, data: { ...f.event.data, message_id: "<different@sender.invalid>" } };
  await assert.rejects(processReceived(changed, f.dependencies), error => error.status === 400);
  assert.equal(f.saved.length, 0);
});
test("an older reply does not overwrite a newer reply preview", async t => {
  let selector;
  t.mock.method(Contact, "updateMany", async query => { selector = query; });
  t.mock.method(Message, "updateMany", async () => ({}));
  await recordReply({ email: "lead@example.invalid" }, { body: "Thanks", subject: "Re: Hi", receivedAt: "2026-11-06T16:00:00Z", messageId: "<older@sender.invalid>" });
  assert.equal(selector.$or[1].repliedAt.$lte.toISOString(), "2026-11-06T16:00:00.000Z");
});
test("receiving mode cannot enable campaign sending before reply routing and webhook configuration are complete", t => {
  const previous = { ...config };
  const previousKey = process.env.RESEND_API_KEY, previousSecret = process.env.RESEND_WEBHOOK_SECRET;
  t.after(() => {
    Object.assign(config, previous);
    if (previousKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = previousKey;
    if (previousSecret === undefined) delete process.env.RESEND_WEBHOOK_SECRET; else process.env.RESEND_WEBHOOK_SECRET = previousSecret;
  });
  Object.assign(config, { jwtSecret: "local-test-configuration-secret-long-enough", sendingEnabled: true, provider: "resend",
    sender: "Test <sender@example.invalid>", replyTo: "outlook@example.invalid", postalAddress: "LOCAL TEST Address",
    replyProvider: "resend", resendReceivingAddress: "replies@example.invalid", resendReceivingEnabled: false });
  assert.throws(validateConfig, /Activate Resend receiving/);
  config.resendReceivingEnabled = true;
  delete process.env.RESEND_API_KEY; delete process.env.RESEND_WEBHOOK_SECRET;
  assert.throws(validateConfig, /credentials before activating/);
  process.env.RESEND_API_KEY = "re_mock_test_only"; process.env.RESEND_WEBHOOK_SECRET = "whsec_mock_test_only";
  assert.throws(validateConfig, /Activate Resend receiving/);
  config.replyTo = config.resendReceivingAddress;
  assert.doesNotThrow(validateConfig);
});
