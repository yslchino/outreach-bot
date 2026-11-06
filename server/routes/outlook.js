const router = require("express").Router();
const crypto = require("node:crypto");
const { config } = require("../config");
const { assert } = require("../lib/errors");
const { protect, allow } = require("../middleware/authMiddleware");
const { rateLimit } = require("../middleware/rateLimit");
const OAuthAttempt = require("../models/OAuthAttempt");
const Mailbox = require("../models/MailboxConnection");
const User = require("../models/User");
const outlook = require("../services/outlook");
const { checkOutlookReplies } = require("../jobs/outlookReplies");
const hash = value => crypto.createHash("sha256").update(value).digest("hex");
const cookieOptions = () => ({ httpOnly: true, sameSite: "lax", secure: outlook.setup().redirect.startsWith("https:"),
  path: "/api/outlook", maxAge: 10 * 60000 });
router.get("/callback", async (req, res) => {
  res.set("Cache-Control", "no-store"); res.set("Referrer-Policy", "no-referrer");
  const state = req.query.state;
  assert(typeof state === "string" && /^[a-f0-9]{64}$/.test(state), 400, "Invalid Microsoft authorization state.");
  const cookie = (req.headers.cookie || "").split(";").map(value => value.trim()).find(value => value.startsWith("outlook-state="))?.slice(14);
  assert(typeof cookie === "string" && /^[a-f0-9]{64}$/.test(cookie) &&
    crypto.timingSafeEqual(Buffer.from(cookie), Buffer.from(state)), 400, "Open Microsoft sign-in in the browser where you started it.");
  const attempt = await OAuthAttempt.findOneAndDelete({ _id: hash(state), expiresAt: { $gt: new Date() } }).select("+verifier");
  assert(attempt, 400, "Microsoft sign-in expired or was already used. Start again.");
  res.clearCookie("outlook-state", { ...cookieOptions(), maxAge: undefined });
  const user = await User.findById(attempt.user);
  assert(user?.active && user.seat && user.role === "admin" && user.tokenVersion === attempt.tokenVersion,
    403, "The administrator session is no longer active.");
  if (req.query.error) return res.redirect(config.clientOrigin + "/?outlook=cancelled");
  assert(typeof req.query.code === "string" && req.query.code.length < 10000, 400, "Microsoft authorization code is missing.");
  const tokens = await outlook.tokenRequest({ grant_type: "authorization_code", code: req.query.code,
    code_verifier: outlook.unseal(attempt.verifier) });
  assert(typeof tokens.refresh_token === "string" && tokens.refresh_token, 409, "Microsoft did not grant offline mailbox access.");
  const profile = await outlook.graph("me?$select=id,mail,userPrincipalName", tokens.access_token);
  const email = (profile.mail || profile.userPrincipalName || "").toLowerCase();
  assert(email === attempt.expectedEmail, 409, "That Microsoft account does not match the configured reply inbox. Sign in with the correct account.");
  await Mailbox.findOneAndUpdate({ _id: "outlook" }, { $set: { connectionId: crypto.randomUUID(),
    email, accountId: profile.id, refreshToken: outlook.seal(tokens.refresh_token), connectedBy: user._id,
    lastScanStatus: "not_run" }, $unset: { lastScanAt: "", refreshLease: "", refreshLeaseUntil: "" } }, { upsert: true });
  res.redirect(config.clientOrigin + "/?outlook=connected");
});
router.use(protect);
router.get("/status", async (req, res) => {
  const mailbox = await Mailbox.findById("outlook").lean();
  res.json({ configured: outlook.configured(), connected: Boolean(mailbox), email: mailbox?.email || "",
    lastScanAt: mailbox?.lastScanAt, lastScanStatus: mailbox?.lastScanStatus });
});
router.post("/connect", allow("admin"), rateLimit({ max: 10 }), async (req, res) => {
  const setup = outlook.setup();
  const expectedEmail = (process.env.OUTLOOK_EXPECTED_EMAIL || config.replyTo).trim().toLowerCase();
  require("../lib/validation").email(expectedEmail);
  const state = crypto.randomBytes(32).toString("hex");
  const verifier = crypto.randomBytes(48).toString("base64url");
  await OAuthAttempt.create({ _id: hash(state), verifier: outlook.seal(verifier), user: req.user._id,
    tokenVersion: req.user.tokenVersion, expectedEmail, expiresAt: new Date(Date.now() + 10 * 60000) });
  res.cookie("outlook-state", state, cookieOptions());
  const params = new URLSearchParams({ client_id: setup.clientId, response_type: "code", response_mode: "query",
    redirect_uri: setup.redirect, scope: outlook.scopes, state, prompt: "select_account", login_hint: expectedEmail,
    code_challenge: crypto.createHash("sha256").update(verifier).digest("base64url"), code_challenge_method: "S256" });
  res.json({ url: "https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize?" + params });
});
router.post("/disconnect", allow("admin"), async (req, res) => {
  await Mailbox.deleteOne({ _id: "outlook" });
  await OAuthAttempt.deleteMany({});
  res.json({ disconnected: true });
});
router.post("/scan", allow("admin"), rateLimit({ max: 10 }), async (req, res) => res.json(await checkOutlookReplies()));
module.exports = router;
