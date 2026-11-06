const cron = require("node-cron");
const { Resend } = require("resend");
const Contact = require("../models/Contact");
const Message = require("../models/Message");
const Mailbox = require("../models/MailboxConnection");
const outlook = require("../services/outlook");
const { matchesReply, recordReply, isOptOut } = require("../services/replies");
const { assert } = require("../lib/errors");
let running = false;
async function verifiedIds(sent) {
  const ids = [];
  for (const message of sent) {
    if (message.provider === "resend" && !message.rfcMessageIdVerified) {
      assert(process.env.RESEND_API_KEY, 409, "Configure Resend before checking its message IDs.");
      const { data, error } = await new Resend(process.env.RESEND_API_KEY).emails.get(message.providerId);
      assert(!error && /^<[^<>\s]+>$/.test(data?.message_id || ""), 409,
        "Resend's actual Message-ID is unavailable. Reply matching was not attempted.");
      await Message.updateOne({ _id: message._id, providerId: message.providerId },
        { $set: { rfcMessageId: data.message_id, rfcMessageIdVerified: true } });
      message.rfcMessageId = data.message_id;
    }
    if (message.rfcMessageId) ids.push(message.rfcMessageId);
  }
  return ids;
}
async function readReplies(contact, sent, token, graph = outlook.graph, resolveIds = verifiedIds) {
  const ids = await resolveIds(sent);
  assert(ids.length, 409, "No verified message IDs are available for reply matching.");
  const earliest = Math.min(...sent.map(message => new Date(message.acceptedAt).getTime()));
  assert(Number.isFinite(earliest), 409, "Original message acceptance time is missing.");
  const since = Math.max(earliest, (Date.parse(contact.replyCheckedAt) || earliest) - 5 * 60000);
  const query = new URLSearchParams({
    "$filter": "receivedDateTime ge " + new Date(since).toISOString() +
      " and from/emailAddress/address eq '" + contact.email.replace(/'/g, "''") + "'",
    "$select": "id,from,subject,receivedDateTime,internetMessageId,internetMessageHeaders,body",
    "$top": "50",
  });
  let next = "me/messages?" + query;
  let latest = null;
  for (let page = 0; next && page < 10; page++) {
    const result = await graph(next, token);
    assert(Array.isArray(result.value), 409, "Outlook returned an invalid message list.");
    for (const item of result.value) {
      const headers = item.internetMessageHeaders || [];
      const sender = item.from?.emailAddress?.address;
      if (!sender || sender.toLowerCase() !== contact.email.toLowerCase() ||
        !Number.isFinite(Date.parse(item.receivedDateTime)) || Date.parse(item.receivedDateTime) < earliest ||
        !matchesReply(headers, contact.email, ids)) continue;
      // Never parse quoted HTML as an unsubscribe request. Fetch this message as plain text.
      const full = await graph("me/messages/" + encodeURIComponent(item.id) +
        "?$select=body,subject,receivedDateTime,internetMessageId", token);
      assert(full.body?.contentType?.toLowerCase() === "text", 409, "Outlook did not return plain-text reply content.");
      const incoming = { subject: item.subject, body: full.body.content, receivedAt: item.receivedDateTime,
        messageId: item.internetMessageId };
      if (isOptOut(incoming.subject, incoming.body)) return incoming;
      if (!latest || Date.parse(incoming.receivedAt) > Date.parse(latest.receivedAt)) latest = incoming;
    }
    next = result["@odata.nextLink"];
  }
  assert(!next, 409, "Reply scan reached its 500-message limit; narrow the mailbox history before retrying.");
  return latest;
}
async function checkOutlookReplies() {
  assert(!running, 409, "An Outlook reply scan is already running.");
  running = true;
  let connectionId;
  try {
    const auth = await outlook.accessToken(); connectionId = auth.connectionId;
    const mailbox = await Mailbox.findById("outlook");
    assert(mailbox?.connectionId === connectionId, 409, "Outlook connection changed.");
    // Keep scanning replied contacts: an opt-out can arrive after an earlier conversation.
    const contacts = await Contact.find({ status: "sent", outreachCampaign: { $exists: true } })
      .sort({ replyCheckedAt: 1 }).limit(50);
    let replies = 0, optOuts = 0;
    for (const contact of contacts) {
      const checkedAt = new Date();
      const sent = await Message.find({ contact: contact._id, status: "accepted" });
      if (!sent.length) continue;
      const incoming = await readReplies(contact, sent, auth.token);
      assert(await Mailbox.exists({ _id: "outlook", connectionId }), 409, "Outlook was disconnected during this scan.");
      if (incoming && (!contact.repliedAt || Date.parse(incoming.receivedAt) > Date.parse(contact.repliedAt) || isOptOut(incoming.subject, incoming.body))) {
        const result = await recordReply(contact, incoming); replies++; if (result.optOut) optOuts++;
      }
      await Contact.updateOne({ _id: contact._id }, { $set: { replyCheckedAt: checkedAt } });
    }
    await Mailbox.updateOne({ _id: "outlook", connectionId }, { $set: { lastScanAt: new Date(), lastScanStatus: "ok" } });
    return { checked: contacts.length, replies, optOuts };
  } catch (error) {
    if (connectionId) await Mailbox.updateOne({ _id: "outlook", connectionId }, { $set: { lastScanStatus: "error" } });
    throw error;
  } finally { running = false; }
}
function startOutlookReplyJob() {
  return cron.schedule("*/5 * * * *", async () => {
    try { if (await Mailbox.exists({ _id: "outlook" })) await checkOutlookReplies(); }
    catch (error) { console.error("Outlook reply scan failed: " + error.name); }
  }, { noOverlap: true });
}
module.exports = { checkOutlookReplies, startOutlookReplyJob, readReplies, verifiedIds };
