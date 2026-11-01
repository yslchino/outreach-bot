process.env.JWT_SECRET = "long-secret-only-for-local-tests-12345";
process.env.RESEND_API_KEY = "re_test_not_a_real_key";
const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { createApp } = require("../app");
const Message = require("../models/Message");
const Contact = require("../models/Contact");
const Suppression = require("../models/Suppression");

test("webhooks reject invalid signatures; verified bounces suppress without a delayed delivery downgrade", async (t) => {
  const secretBytes = Buffer.from("local-test-webhook-secret");
  process.env.RESEND_WEBHOOK_SECRET = "whsec_" + secretBytes.toString("base64");
  const server = createApp().listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const url = "http://127.0.0.1:" + server.address().port + "/api/webhooks/resend";
  assert.equal((await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })).status, 400);
  let suppressed = 0, delivery = "unknown";
  t.mock.method(Message, "findOne", async () => ({ _id: "message-one", to: "test@example.com", deliveryStatus: delivery }));
  t.mock.method(Message, "updateMany", async () => ({}));
  t.mock.method(Contact, "updateMany", async () => ({}));
  t.mock.method(Suppression, "updateOne", async () => { suppressed++; });
  t.mock.method(Message, "updateOne", async (query, update) => {
    if (query.deliveryStatus.$in.includes(delivery)) delivery = update.$set.deliveryStatus;
  });
  for (const type of ["email.bounced", "email.delivered"]) {
    const payload = JSON.stringify({ type, created_at: new Date().toISOString(), data: { email_id: "provider-one" } });
    const id = "event-" + type, timestamp = String(Math.floor(Date.now() / 1000));
    const signature = crypto.createHmac("sha256", secretBytes).update(id + "." + timestamp + "." + payload).digest("base64");
    const result = await fetch(url, { method: "POST", body: payload, headers: {
      "Content-Type": "application/json", "svix-id": id, "svix-timestamp": timestamp, "svix-signature": "v1," + signature,
    } });
    assert.equal(result.status, 204);
  }
  assert.equal(suppressed, 1); assert.equal(delivery, "bounced");
});
