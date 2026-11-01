const cron = require("node-cron");
const {
  google
} = require("googleapis");
const Contact = require("../models/Contact");
const Message = require("../models/Message");
const Suppression = require("../models/Suppression");
const {
  config
} = require("../config");
function isReply(headers, sender, knownIds) {
  const field = name => headers.find(h => h.name.toLowerCase() === name)?.value || "";
  const from = field("from").match(/<([^>]+)>/)?.[1] || field("from").trim();
  if (from.toLowerCase() !== sender.toLowerCase()) return false;
  const references = (field("in-reply-to") + " " + field("references")).match(/<[^>]+>/g) || [];
  return references.some(id => knownIds.includes(id));
}
async function checkForReplies() {
  if (!process.env.GMAIL_REFRESH_TOKEN) return;
  const oauth = new google.auth.OAuth2(process.env.GMAIL_CLIENT_ID, process.env.GMAIL_CLIENT_SECRET, process.env.GMAIL_REDIRECT_URI);
  oauth.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN
  });
  const gmail = google.gmail({
    version: "v1",
    auth: oauth
  });
  // Bound work per pass. Oldest checked leads rotate through the batch.
  const contacts = await Contact.find({
    replied: false,
    status: "sent",
    outreachCampaign: {
      $exists: true
    }
  }).sort({
    replyCheckedAt: 1
  }).limit(50);
  for (const contact of contacts) {
    try {
      const sent = await Message.find({
        contact: contact._id,
        status: "accepted",
        rfcMessageId: {
          $exists: true
        }
      });
      if (!sent.length) continue;
      const earliest = Math.min(...sent.map(m => new Date(m.acceptedAt).getTime()));
      const ids = sent.map(m => m.rfcMessageId);
      const list = await gmail.users.messages.list({
        userId: "me",
        q: "from:(" + contact.email + ") after:" + Math.floor(earliest / 1000),
        maxResults: 50
      }, {
        timeout: 15000
      });
      for (const item of list.data.messages || []) {
        const result = await gmail.users.messages.get({
          userId: "me",
          id: item.id,
          format: "metadata",
          metadataHeaders: ["From", "In-Reply-To", "References", "Subject"]
        }, {
          timeout: 15000
        });
        if (Number(result.data.internalDate) < earliest || !isReply(result.data.payload?.headers || [], contact.email, ids)) continue;
        await Contact.updateOne({
          _id: contact._id
        }, {
          $set: {
            replied: true,
            repliedAt: new Date(Number(result.data.internalDate))
          }
        });
        await Message.updateMany({
          contact: contact._id,
          status: {
            $in: ["draft", "queued"]
          }
        }, {
          $set: {
            status: "skipped",
            error: "Recipient replied."
          }
        });
        const subject = result.data.payload?.headers?.find(h => h.name.toLowerCase() === "subject")?.value || "";
        if (/\bunsubscribe\b/i.test(subject)) {
          await Suppression.updateOne({
            email: contact.email.toLowerCase().trim()
          }, {
            $setOnInsert: {
              reason: "opt_out"
            }
          }, {
            upsert: true
          });
        }
        break;
      }
      await Contact.updateOne({
        _id: contact._id
      }, {
        $set: {
          replyCheckedAt: new Date()
        }
      });
    } catch (err) {
      console.error("Reply check failed: " + err.name);
    }
  }
}
function startReplyDetectionJob() {
  return cron.schedule("5 * * * *", () => checkForReplies().catch(err => console.error("Reply scan failed: " + err.name)), {
    noOverlap: true,
    timezone: config.timezone
  });
}
module.exports = {
  startReplyDetectionJob,
  checkForReplies,
  isReply
};
