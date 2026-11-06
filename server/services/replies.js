const Contact = require("../models/Contact");
const Message = require("../models/Message");
const Suppression = require("../models/Suppression");
const { escapeRegex } = require("../lib/validation");
function authoredText(text) {
  return String(text || "").slice(0, 12000).split(/\r?\n/).slice(0, 100).reduce((result, line) => {
    if (result.stopped || /^\s*(>|On .+wrote:|From:|[-_]{3,}\s*(Original Message|Forwarded))/i.test(line)) return { ...result, stopped: true };
    return { text: result.text + line + "\n", stopped: false };
  }, { text: "", stopped: false }).text.trim();
}
function isOptOut(subject, body) {
  if (/^\s*(?:re:\s*)?unsubscribe\s*[.!]?\s*$/i.test(subject || "")) return true;
  return authoredText(body).split(/\r?\n/).some(line =>
    /^\s*(?:please\s+)?(?:unsubscribe(?:\s+me)?|remove\s+me(?:\s+from\s+(?:your|the|this)\s+(?:email\s+|mailing\s+)?list)?|stop\s+(?:emailing|contacting)(?:\s+me)?|do\s+not\s+(?:email|contact)\s+me)[.!]?\s*$/i.test(line));
}
function matchesReply(headers, sender, knownIds) {
  const field = name => headers.find(h => h.name?.toLowerCase() === name)?.value || "";
  const from = field("from").match(/<([^>]+)>/)?.[1] || field("from").trim();
  if (from.toLowerCase() !== sender.toLowerCase()) return false;
  return ((field("in-reply-to") + " " + field("references")).match(/<[^>]+>/g) || []).some(id => knownIds.includes(id));
}
async function suppress(email, reason = "opt_out") {
  email = email.trim().toLowerCase();
  await Suppression.updateOne({ email }, { $setOnInsert: { reason } }, { upsert: true });
  await Contact.updateMany({ email: new RegExp("^" + escapeRegex(email) + "$", "i") }, { $set: { status: "suppressed" } });
  await Message.updateMany({ to: new RegExp("^" + escapeRegex(email) + "$", "i"), status: { $in: ["draft", "queued"] } },
    { $set: { status: "skipped", error: "Recipient suppressed: " + reason + "." } });
}
async function recordReply(contact, incoming) {
  const optOut = isOptOut(incoming.subject, incoming.body);
  // Suppress first so queued sends stop even if saving reply details later fails.
  if (optOut) await suppress(contact.email);
  const emailQuery = new RegExp("^" + escapeRegex(contact.email) + "$", "i");
  await Contact.updateMany({ email: emailQuery, $or: [{ repliedAt: null }, { repliedAt: { $lte: new Date(incoming.receivedAt) } }] }, { $set: { replied: true,
    repliedAt: new Date(incoming.receivedAt), replySubject: String(incoming.subject || "").slice(0, 200),
    replyPreview: authoredText(incoming.body).slice(0, 4000), replyMessageId: incoming.messageId,
  } });
  await Message.updateMany({ to: emailQuery, status: { $in: ["draft", "queued"] } },
    { $set: { status: "skipped", error: optOut ? "Recipient opted out." : "Recipient replied." } });
  return { optOut };
}
module.exports = { authoredText, isOptOut, matchesReply, recordReply, suppress };
