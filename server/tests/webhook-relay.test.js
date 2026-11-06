const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { createWebhookRelay } = require("../scripts/webhookRelay");
test("public relay exposes only the signed webhook route and forwards the unchanged payload", async t => {
  const bytes = Buffer.from("local-relay-signing-test");
  const secret = "whsec_" + bytes.toString("base64");
  const forwarded = [];
  const server = createWebhookRelay({ getSecret: () => secret, forward: async (body, headers) => {
    forwarded.push({ body: body.toString(), headers }); return 204;
  } });
  server.listen(0, "127.0.0.1"); await new Promise(resolve => server.once("listening", resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = "http://127.0.0.1:" + server.address().port;
  assert.equal((await fetch(base + "/api/contacts")).status, 404);
  assert.equal((await fetch(base + "/api/auth/login", { method: "POST" })).status, 404);
  assert.equal((await fetch(base + "/api/webhooks/resend")).status, 404);
  assert.equal((await fetch(base + "/api/webhooks/resend", { method: "POST", body: "{}", headers: { "Content-Type": "application/json" } })).status, 400);
  assert.equal(forwarded.length, 0);
  const payload = JSON.stringify({ type: "email.received", data: { email_id: "test" } });
  const id = crypto.randomUUID(), timestamp = String(Math.floor(Date.now()/1000));
  const signature = crypto.createHmac("sha256", bytes).update(id+"."+timestamp+"."+payload).digest("base64");
  const response = await fetch(base + "/api/webhooks/resend", { method: "POST", body: payload, headers: {
    "Content-Type": "application/json", "svix-id": id, "svix-timestamp": timestamp, "svix-signature": "v1,"+signature,
  } });
  assert.equal(response.status, 204);
  assert.equal(forwarded.length, 1);
  assert.equal(forwarded[0].body, payload);
  assert.equal(forwarded[0].headers["svix-id"], id);
});
