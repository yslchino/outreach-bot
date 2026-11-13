const test = require("node:test");
const assert = require("node:assert/strict");
const Campaign = require("../models/Campaign");
const Message = require("../models/Message");
const { config } = require("../config");
const { previewMessage } = require("../controllers/campaignController");

const campaignId = "012345678901234567890123";
const messageId = "112345678901234567890123";
const request = body => ({ params: { id: campaignId, messageId }, body });

function setup(t) {
  const previous = { ...config };
  Object.assign(config, { sender: "GET <sender@example.invalid>", replyTo: "replies@example.invalid",
    postalAddress: "123 Test Street <Suite 2>", sendingEnabled: false, jobsEnabled: false, aiEnabled: false });
  t.after(() => Object.assign(config, previous));
  t.mock.method(Campaign, "findById", async () => ({ _id: campaignId, status: "draft" }));
  const message = { _id: messageId, to: "recipient@example.invalid", subject: "Saved subject", body: "Saved body" };
  t.mock.method(Message, "findOne", async query => {
    assert.equal(query.campaign, campaignId);
    assert.equal(query._id, messageId);
    assert.equal(query.status, "draft");
    return message;
  });
  for (const model of [Campaign, Message]) {
    for (const method of ["create", "updateOne", "findOneAndUpdate"]) {
      t.mock.method(model, method, () => assert.fail("Preview must not write records"));
    }
  }
  return message;
}

test("preview renders unsaved content and the real footer safely while sending is disabled", async t => {
  const message = setup(t);
  let result;
  await previewMessage(request({ subject: "Unsaved subject", body: '<script>alert(1)</script>\nHello & goodbye' }), {
    json(value) { result = value; }
  });
  assert.equal(result.subject, "Unsaved subject");
  assert.equal(result.from, config.sender);
  assert.equal(result.replyTo, config.replyTo);
  assert.equal(result.to, message.to);
  assert.match(result.html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;<br>Hello &amp; goodbye/);
  assert.match(result.html, /123 Test Street &lt;Suite 2&gt;/);
  assert.match(result.text, /To stop receiving messages, reply with unsubscribe\./);
  assert.deepEqual(result.missingFields, []);
  assert.equal(message.body, "Saved body");
  assert.equal(message.subject, "Saved subject");
  assert.equal(config.sendingEnabled, false);
});

test("preview uses the saved draft by default and reports incomplete sending identity", async t => {
  setup(t);
  Object.assign(config, { sender: "", replyTo: "", postalAddress: "" });
  let result;
  await previewMessage(request({}), { json(value) { result = value; } });
  assert.equal(result.subject, "Saved subject");
  assert.match(result.text, /^Saved body\n\nGET Logistics LLC/);
  assert.deepEqual(result.missingFields, ["Sender", "Reply-to", "Postal address"]);
});

test("preview rejects invalid content, missing records, and campaigns already approved", async t => {
  setup(t);
  const res = { json() { assert.fail("Invalid preview returned content"); } };
  await assert.rejects(previewMessage(request([]), res), /must be an object/);
  await assert.rejects(previewMessage(request({ subject: "Header\r\nInjected: value" }), res), /one line/);
  await assert.rejects(previewMessage(request({ body: { unsafe: true } }), res), /must be text/);
  await assert.rejects(previewMessage(request({ body: "x".repeat(12001) }), res), /12000/);
  t.mock.method(Message, "findOne", async () => null);
  await assert.rejects(previewMessage(request({}), res), /Draft not found in this campaign/);
  t.mock.method(Campaign, "findById", async () => ({ _id: campaignId, status: "queued" }));
  await assert.rejects(previewMessage(request({}), res), /draft campaigns/);
  t.mock.method(Campaign, "findById", async () => null);
  await assert.rejects(previewMessage(request({}), res), /Campaign not found/);
  await assert.rejects(previewMessage({ params: { id: "bad", messageId }, body: {} }, res), /Invalid record ID/);
});
