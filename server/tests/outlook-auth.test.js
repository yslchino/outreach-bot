process.env.JWT_SECRET = "local-outlook-test-jwt-secret-more-than-32-characters";
const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const crypto = require("node:crypto");
const { createApp } = require("../app");
const User = require("../models/User");
const Attempt = require("../models/OAuthAttempt");
const Mailbox = require("../models/MailboxConnection");
const { config } = require("../config");
const outlook = require("../services/outlook");
const realFetch = fetch;
test("Outlook OAuth is admin-only, browser-bound, single-use, PKCE-protected, and checks the expected mailbox", async t => {
  const keys = ["OUTLOOK_CLIENT_ID", "OUTLOOK_CLIENT_SECRET", "OUTLOOK_REDIRECT_URI", "OUTLOOK_EXPECTED_EMAIL", "OUTLOOK_TOKEN_KEY"];
  const saved = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  Object.assign(process.env, { OUTLOOK_CLIENT_ID: "test-client", OUTLOOK_CLIENT_SECRET: "test-secret", OUTLOOK_TOKEN_KEY: Buffer.alloc(32, 8).toString("base64"),
    OUTLOOK_REDIRECT_URI: "http://127.0.0.1:5000/api/outlook/callback", OUTLOOK_EXPECTED_EMAIL: "owner@example.invalid" });
  t.after(() => { for (const key of keys) { if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key]; } });
  const user = { _id: "012345678901234567890123", active: true, role: "admin", seat: 1, tokenVersion: 0 };
  t.mock.method(User, "findById", async () => user);
  const authorization = "Bearer " + jwt.sign({ version: 0 }, config.jwtSecret, { subject: user._id, issuer: "get-outreach-v2", algorithm: "HS256" });
  let pending, savedMailbox, profileEmail = "owner@example.invalid", callbackReads = 0;
  t.mock.method(Attempt, "create", async value => { pending = value; return value; });
  t.mock.method(Attempt, "findOneAndDelete", query => ({ select: async () => {
    callbackReads++; const result = pending && pending._id === query._id && pending.expiresAt > new Date() ? pending : null;
    pending = null; return result;
  } }));
  t.mock.method(Mailbox, "findOneAndUpdate", async (query, update) => { savedMailbox = update.$set; });
  t.mock.method(Mailbox, "findById", () => ({ lean: async () => savedMailbox }));
  t.mock.method(globalThis, "fetch", async (url, options) => {
    if (String(url).includes("login.microsoftonline.com")) {
      assert.equal(options.body.get("code_verifier").length > 40, true);
      return Response.json({ access_token: "mock-access", refresh_token: "mock-private-refresh" });
    }
    assert.equal(options.headers.Authorization, "Bearer mock-access");
    return Response.json({ id: "account-1", mail: profileEmail });
  });
  const server = createApp().listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = "http://127.0.0.1:" + server.address().port + "/api/outlook";
  const start = async () => {
    const response = await realFetch(base + "/connect", { method: "POST", headers: { Authorization: authorization } });
    assert.equal(response.status, 200);
    const payload = await response.json(); const url = new URL(payload.url);
    assert.equal(url.hostname, "login.microsoftonline.com");
    assert.equal(url.searchParams.get("code_challenge"), crypto.createHash("sha256").update(outlook.unseal(pending.verifier)).digest("base64url"));
    assert.equal(payload.url.includes("test-secret"), false);
    return { state: url.searchParams.get("state"), cookie: response.headers.get("set-cookie").split(";")[0] };
  };
  assert.equal((await realFetch(base + "/connect", { method: "POST" })).status, 401);
  user.role = "viewer";
  assert.equal((await realFetch(base + "/connect", { method: "POST", headers: { Authorization: authorization } })).status, 403);
  user.role = "admin";
  const first = await start();
  assert.equal((await realFetch(base + "/callback?state=" + first.state + "&code=test")).status, 400);
  assert.equal(callbackReads, 0);
  const result = await realFetch(base + "/callback?state=" + first.state + "&code=test", { headers: { Cookie: first.cookie }, redirect: "manual" });
  assert.equal(result.status, 302);
  assert.equal(outlook.unseal(savedMailbox.refreshToken), "mock-private-refresh");
  const status = await realFetch(base + "/status", { headers: { Authorization: authorization } });
  assert.equal((await status.text()).includes("refreshToken"), false);
  assert.equal((await realFetch(base + "/callback?state=" + first.state + "&code=test", { headers: { Cookie: first.cookie }, redirect: "manual" })).status, 400);
  const wrongAccount = await start(); profileEmail = "wrong@example.invalid";
  assert.equal((await realFetch(base + "/callback?state=" + wrongAccount.state + "&code=test", { headers: { Cookie: wrongAccount.cookie }, redirect: "manual" })).status, 409);
  const expired = await start(); pending.expiresAt = new Date(0);
  assert.equal((await realFetch(base + "/callback?state=" + expired.state + "&code=test", { headers: { Cookie: expired.cookie }, redirect: "manual" })).status, 400);
});
