const test = require("node:test");
const assert = require("node:assert/strict");
const { authoredText, isOptOut, matchesReply, recordReply } = require("../services/replies");
const outlook = require("../services/outlook");
const { readReplies } = require("../jobs/outlookReplies");
const Contact = require("../models/Contact");
const Message = require("../models/Message");
const Suppression = require("../models/Suppression");
test("body opt-outs exclude quoted footer text and negative mentions", () => {
  assert.equal(isOptOut("Re: Freight", "Please remove me from your list."), true);
  assert.equal(isOptOut("Re: unsubscribe", ""), true);
  assert.equal(isOptOut("Re: Freight", "Stop emailing me!"), true);
  assert.equal(isOptOut("Re: Freight", "Thanks, let's talk.\nOn Friday Erick wrote:\nUnsubscribe"), false);
  assert.equal(isOptOut("Re: Freight", "I do not want to unsubscribe."), false);
  assert.equal(authoredText("Yes\n> unsubscribe"), "Yes");
});
test("reply matching requires both the exact sender and exact referenced ID", () => {
  const headers = [{ name: "From", value: "Person <lead@example.invalid>" }, { name: "In-Reply-To", value: "<real@ses.invalid>" }];
  assert.equal(matchesReply(headers, "lead@example.invalid", ["<real@ses.invalid>"]), true);
  assert.equal(matchesReply(headers, "other@example.invalid", ["<real@ses.invalid>"]), false);
  assert.equal(matchesReply(headers, "lead@example.invalid", ["<real@ses.invalid.extra>"]), false);
});
test("mailbox secrets are authenticated ciphertext; tokens cannot be read with a different key", () => {
  const old = process.env.OUTLOOK_TOKEN_KEY;
  try {
    process.env.OUTLOOK_TOKEN_KEY = Buffer.alloc(32, 4).toString("base64");
    const encrypted = outlook.seal("private-refresh-token");
    assert.equal(encrypted.includes("private-refresh-token"), false);
    assert.equal(outlook.unseal(encrypted), "private-refresh-token");
    process.env.OUTLOOK_TOKEN_KEY = Buffer.alloc(32, 5).toString("base64");
    assert.throws(() => outlook.unseal(encrypted));
    assert.throws(() => outlook.graphUrl("https://attacker.invalid/v1.0/me/messages"), /Invalid/);
    assert.throws(() => outlook.graphUrl("https://graph.microsoft.com@attacker.invalid/v1.0/me"), /Invalid/);
  } finally { if (old === undefined) delete process.env.OUTLOOK_TOKEN_KEY; else process.env.OUTLOOK_TOKEN_KEY = old; }
});
test("Outlook scans follow pages and retrieve matched replies as text without subject-only matching", async () => {
  const calls = [];
  const graph = async path => {
    calls.push(path);
    if (path.startsWith("me/messages?")) return { value: [], "@odata.nextLink": "https://graph.microsoft.com/v1.0/me/messages?$skip=50" };
    if (path.includes("$skip")) return { value: [{ id: "reply1", from: { emailAddress: { address: "lead@example.invalid" } },
      receivedDateTime: "2026-11-06T16:00:00Z", subject: "Re: Freight", internetMessageId: "<reply@outlook.invalid>",
      internetMessageHeaders: [{ name: "From", value: "lead@example.invalid" }, { name: "References", value: "<actual@ses.invalid>" }] }] };
    return { body: { contentType: "text", content: "Please unsubscribe me." } };
  };
  const reply = await readReplies({ email: "lead@example.invalid" }, [{ acceptedAt: "2026-11-06T15:00:00Z" }], "test", graph, async () => ["<actual@ses.invalid>"]);
  assert.equal(reply.messageId, "<reply@outlook.invalid>");
  assert.equal(reply.body, "Please unsubscribe me.");
  assert.equal(calls.length, 3);
});
test("recording an opt-out suppresses the address before saving the reply and cancels pending messages", async t => {
  const operations = [];
  t.mock.method(Suppression, "updateOne", async (query, update) => { operations.push("suppression"); assert.equal(update.$setOnInsert.reason, "opt_out"); });
  t.mock.method(Contact, "updateMany", async (query, update) => operations.push(update.$set.status || "reply"));
  t.mock.method(Message, "updateMany", async (query, update) => { operations.push("cancel"); assert.equal(update.$set.status, "skipped"); });
  const result = await recordReply({ email: "Lead@Example.invalid" }, { subject: "Re: Hello", body: "unsubscribe",
    receivedAt: "2026-11-06T16:00:00Z", messageId: "<reply@example.invalid>" });
  assert.equal(result.optOut, true);
  assert.equal(operations[0], "suppression");
  assert.equal(operations.includes("reply"), true);
});
