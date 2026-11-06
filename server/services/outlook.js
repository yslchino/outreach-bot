const crypto = require("node:crypto");
const Mailbox = require("../models/MailboxConnection");
const { assert, AppError } = require("../lib/errors");
const scopes = "offline_access https://graph.microsoft.com/User.Read https://graph.microsoft.com/Mail.Read";
function encryptionKey() {
  const key = Buffer.from(process.env.OUTLOOK_TOKEN_KEY || "", "base64");
  assert(key.length === 32, 409, "Configure a separate 32-byte OUTLOOK_TOKEN_KEY.");
  return key;
}
function seal(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const body = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64");
}
function unseal(value) {
  const bytes = Buffer.from(value, "base64");
  const cipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), bytes.subarray(0, 12));
  cipher.setAuthTag(bytes.subarray(12, 28));
  return Buffer.concat([cipher.update(bytes.subarray(28)), cipher.final()]).toString("utf8");
}
function setup() {
  assert(process.env.OUTLOOK_CLIENT_ID && process.env.OUTLOOK_CLIENT_SECRET, 409,
    "Configure the Microsoft application client ID and secret first.");
  encryptionKey();
  const redirect = new URL(process.env.OUTLOOK_REDIRECT_URI || "http://127.0.0.1:5000/api/outlook/callback");
  assert(!redirect.username && !redirect.password && !redirect.search && !redirect.hash &&
    (redirect.protocol === "https:" || (redirect.protocol === "http:" && ["localhost", "127.0.0.1"].includes(redirect.hostname))),
  409, "Use HTTPS or a localhost Microsoft callback URI.");
  return { clientId: process.env.OUTLOOK_CLIENT_ID, redirect: redirect.href };
}
function configured() { try { setup(); return true; } catch { return false; } }
async function tokenRequest(values, fetcher = fetch) {
  const settings = setup();
  const response = await fetcher("https://login.microsoftonline.com/consumers/oauth2/v2.0/token", {
    method: "POST", signal: AbortSignal.timeout(15000), redirect: "error",
    body: new URLSearchParams({ client_id: settings.clientId, client_secret: process.env.OUTLOOK_CLIENT_SECRET,
      redirect_uri: settings.redirect, scope: scopes, ...values }),
  });
  const data = await response.json();
  assert(response.ok && typeof data.access_token === "string" && data.access_token.length > 0,
    409, "Microsoft authorization failed. Reconnect the Outlook mailbox.");
  return data;
}
function graphUrl(path) {
  const url = new URL(path, "https://graph.microsoft.com/v1.0/");
  assert(url.origin === "https://graph.microsoft.com" && /^\/v1\.0\/me(?:\/|$)/.test(url.pathname) &&
    !url.username && !url.password && !url.hash, 400, "Invalid Microsoft Graph request.");
  return url.href;
}
async function graph(path, token, fetcher = fetch) {
  const response = await fetcher(graphUrl(path), { redirect: "error", signal: AbortSignal.timeout(15000),
    headers: { Authorization: "Bearer " + token, Prefer: 'outlook.body-content-type="text"' } });
  assert(response.ok, 409, "Outlook could not be read. Reconnect or retry the scan later.");
  return response.json();
}
async function accessToken() {
  const lease = crypto.randomUUID();
  const mailbox = await Mailbox.findOneAndUpdate({ _id: "outlook", $or: [
    { refreshLeaseUntil: { $exists: false } }, { refreshLeaseUntil: { $lt: new Date() } },
  ] }, { $set: { refreshLease: lease, refreshLeaseUntil: new Date(Date.now() + 60000) } },
  { returnDocument: "after" }).select("+refreshToken");
  assert(mailbox, 409, "Outlook is disconnected or another mailbox operation is running.");
  try {
    const data = await tokenRequest({ grant_type: "refresh_token", refresh_token: unseal(mailbox.refreshToken) });
    const updated = await Mailbox.updateOne({ _id: "outlook", connectionId: mailbox.connectionId, refreshLease: lease }, {
      ...(data.refresh_token ? { $set: { refreshToken: seal(data.refresh_token) } } : {}),
      $unset: { refreshLease: "", refreshLeaseUntil: "" },
    });
    assert(updated.matchedCount === 1, 409, "The Outlook connection changed. Retry the scan.");
    return { token: data.access_token, connectionId: mailbox.connectionId };
  } catch (error) {
    await Mailbox.updateOne({ _id: "outlook", refreshLease: lease }, { $unset: { refreshLease: "", refreshLeaseUntil: "" } });
    if (error instanceof AppError) throw error;
    throw new AppError(409, "Microsoft authorization is unavailable. Retry or reconnect Outlook.");
  }
}
module.exports = { scopes, setup, configured, seal, unseal, tokenRequest, graph, graphUrl, accessToken };
