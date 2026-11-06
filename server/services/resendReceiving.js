const crypto = require("node:crypto");
const Inbound = require("../models/InboundEmail");
const Message = require("../models/Message");
const Contact = require("../models/Contact");
const { config } = require("../config");
const { assert, AppError } = require("../lib/errors");
const { email: validateEmail, escapeRegex } = require("../lib/validation");
const { matchesReply, recordReply, authoredText } = require("./replies");
function address(value) {
  if (typeof value !== "string") return null;
  try { return validateEmail(value.match(/<([^<>]+)>/)?.[1] || value.trim()); } catch { return null; }
}
function referenceIds(headers) {
  return [...new Set(headers.filter(header => ["in-reply-to", "references"].includes(header.name.toLowerCase()))
    .flatMap(header => header.value.slice(0, 32000).match(/<[^<>\s]+>/g) || []))].slice(0, 200);
}
async function providerGet(path) {
  const response = await fetch("https://api.resend.com" + path, { redirect: "error", signal: AbortSignal.timeout(15000),
    headers: { Authorization: "Bearer " + process.env.RESEND_API_KEY } });
  assert(response.ok, 503, "Resend email retrieval is temporarily unavailable.");
  return response.json();
}
async function matchOriginal(sender, headers, get = providerGet) {
  const ids = referenceIds(headers);
  if (!ids.length) return null;
  const to = new RegExp("^" + escapeRegex(sender) + "$", "i");
  let match = await Message.findOne({ provider: "resend", status: "accepted", to,
    rfcMessageIdVerified: true, rfcMessageId: { $in: ids } });
  if (match) return match;
  // Handle a reply arriving before the outbound Message-ID webhook has been saved.
  const pending = await Message.find({ provider: "resend", status: "accepted", to,
    rfcMessageIdVerified: { $ne: true } }).sort({ acceptedAt: -1 }).limit(10);
  for (const message of pending) {
    assert(typeof message.providerId === "string" && /^[A-Za-z0-9_-]{1,200}$/.test(message.providerId), 503, "Original provider ID is unavailable.");
    const data = await get("/emails/" + encodeURIComponent(message.providerId));
    assert(/^<[^<>\s]+>$/.test(data.message_id || ""), 503, "Original Message-ID is not ready.");
    await Message.updateOne({ _id: message._id }, { $set: { rfcMessageId: data.message_id, rfcMessageIdVerified: true } });
    if (ids.includes(data.message_id)) { message.rfcMessageId = data.message_id; return message; }
  }
  match = await Message.findOne({ provider: "resend", status: "accepted", to,
    rfcMessageIdVerified: true, rfcMessageId: { $in: ids } });
  if (match) return match;
  assert(!(await Message.exists({ provider: "resend", to, status: "processing" })) &&
    !(await Message.exists({ provider: "resend", to, status: "accepted", rfcMessageIdVerified: { $ne: true } })),
  503, "Original email metadata is still being saved. Retry this event.");
  return null;
}
async function processReceived(event, dependencies = {}) {
  assert(config.replyProvider === "resend" && config.resendReceivingEnabled, 503, "Resend receiving is not activated.");
  const id = event.data?.email_id;
  assert(typeof id === "string" && /^[A-Za-z0-9_-]{1,200}$/.test(id), 400, "Invalid inbound email ID.");
  const get = dependencies.get || providerGet;
  const ledger = dependencies.ledger || Inbound;
  try { await ledger.updateOne({ _id: id }, { $setOnInsert: { status: "pending" } }, { upsert: true }); }
  catch (error) { if (error.code !== 11000) throw error; }
  const token = crypto.randomUUID();
  const claim = await ledger.findOneAndUpdate({ _id: id, $or: [
    { status: { $in: ["pending", "failed"] } }, { status: "processing", leaseUntil: { $lt: new Date() } },
  ] }, { $set: { status: "processing", leaseToken: token, leaseUntil: new Date(Date.now() + 3 * 60000) } }, { returnDocument: "after" });
  if (!claim) {
    const existing = await ledger.findById(id);
    assert(existing && ["processed", "unmatched", "needs_review"].includes(existing.status), 503, "This incoming event is already processing. Retry later.");
    return { duplicate: true, status: existing.status };
  }
  const owner = { _id: id, leaseToken: token };
  async function finish(status, fields) {
    const result = await ledger.updateOne(owner, { $set: { status, ...fields }, $unset: { leaseToken: "", leaseUntil: "" } });
    assert(result.matchedCount === 1, 503, "Incoming event ownership changed. Retry later.");
    return { status };
  }
  try {
    const data = await get("/emails/receiving/" + encodeURIComponent(id));
    assert(data.id === id && typeof data.message_id === "string" && /^<[^<>\s]+>$/.test(data.message_id), 503, "Invalid incoming email metadata.");
    if (event.data.message_id) assert(event.data.message_id === data.message_id, 400, "Incoming message identity does not match the signed event.");
    const sender = address(data.from);
    const to = Array.isArray(data.to) ? data.to.map(address) : [];
    const fields = { sender: sender || "", subject: String(data.subject || "").slice(0, 200),
      messageId: data.message_id, receivedAt: new Date(data.created_at || event.created_at),
      preview: typeof data.text === "string" ? authoredText(data.text).slice(0, 4000) : "HTML-only message. Review in Resend." };
    assert(Number.isFinite(fields.receivedAt.getTime()), 503, "Incoming email timestamp is missing.");
    if (!sender || !to.includes(config.resendReceivingAddress.toLowerCase())) return await finish("unmatched", { ...fields, reason: "wrong_mailbox_or_sender" });
    const headers = Object.entries(data.headers || {}).filter(([, value]) => typeof value === "string").map(([name, value]) => ({ name: name.toLowerCase(), value }));
    const from = headers.find(header => header.name === "from");
    if (from && address(from.value) !== sender) return await finish("unmatched", { ...fields, reason: "sender_header_mismatch" });
    if (!from) headers.push({ name: "from", value: data.from });
    const original = await (dependencies.match || matchOriginal)(sender, headers, get);
    if (!original || !matchesReply(headers, sender, [original.rfcMessageId])) return await finish("unmatched", { ...fields, reason: "no_exact_reply_reference" });
    const contact = await (dependencies.contact || (key => Contact.findById(key)))(original.contact);
    assert(contact && address(contact.email) === sender, 503, "The matched contact is unavailable.");
    assert(new Date(original.acceptedAt).getTime() <= fields.receivedAt.getTime(), 400, "The reply predates its original email.");
    const htmlOnly = typeof data.text !== "string";
    const body = htmlOnly ? "" : data.text;
    assert(await ledger.exists({ ...owner, leaseUntil: { $gt: new Date() } }), 503, "Incoming event lease expired. Retry later.");
    const result = await (dependencies.record || recordReply)(contact, { subject: fields.subject, body,
      receivedAt: fields.receivedAt, messageId: data.message_id });
    return await finish(htmlOnly && !result.optOut ? "needs_review" : "processed", { ...fields, contact: contact._id,
      matchedMessage: original._id, optOut: result.optOut,
      preview: htmlOnly ? "HTML-only reply. Review its content in Resend." : authoredText(body).slice(0, 4000),
      reason: htmlOnly && !result.optOut ? "html_only_reply" : result.optOut ? "opt_out" : "reply" });
  } catch (error) {
    await ledger.updateOne(owner, { $set: { status: "failed", reason: "processing_failed" }, $unset: { leaseToken: "", leaseUntil: "" } });
    if (error instanceof AppError) throw error;
    throw new AppError(503, "Incoming email could not be processed. Retry later.");
  }
}
module.exports = { address, referenceIds, matchOriginal, processReceived };
