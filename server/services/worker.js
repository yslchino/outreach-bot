const { randomUUID } = require("node:crypto");
const cron = require("node-cron");
const Campaign = require("../models/Campaign");
const Contact = require("../models/Contact");
const Message = require("../models/Message");
const Suppression = require("../models/Suppression");
const {
  config
} = require("../config");
const {
  sendMessage,
  snapshotMessage
} = require("./mailer");
const {
  checkSending,
  dayKey
} = require("./policy");
const {
  reserveUsage
} = require("./usage");
const {
  AppError
} = require("../lib/errors");
const {
  reserveRecipient
} = require("./reservations");
const {
  escapeRegex
} = require("../lib/validation");
const defaultDependencies = {
  loadContact: message => Contact.findById(message.contact),
  isSuppressed: message => Suppression.exists({
    email: message.to
  }),
  campaignIsActive: message => Campaign.exists({
    _id: message.campaign,
    status: {
      $in: ["queued", "running"]
    }
  }),
  reserveContact: async message => {
    if (await Contact.exists({
      email: new RegExp("^" + escapeRegex(message.to) + "$", "i"),
      status: "sent"
    })) return null;
    if (!(await reserveRecipient(message))) return null;
    return Contact.findOneAndUpdate({
      _id: message.contact,
      replied: {
        $ne: true
      },
      status: {
        $ne: "sent"
      },
      $or: [{
        outreachCampaign: {
          $exists: false
        }
      }, {
        outreachCampaign: message.campaign
      }]
    }, {
      $set: {
        outreachCampaign: message.campaign
      }
    }, {
      returnDocument: "after"
    });
  },
  reserveDaily: () => reserveUsage("send:" + dayKey(new Date(), config.timezone), config.dailyLimit),
  parent: message => message.parent ? Message.findById(message.parent) : null,
  saveState: (message, changes) => Message.updateOne({
    _id: message._id
  }, {
    $set: changes
  }),
  markContact: (message, receipt) => Contact.updateOne({
    _id: message.contact,
    status: { $ne: "suppressed" }
  }, {
    $set: {
      status: "sent",
      ...(message.kind === "initial" ? {
        sentAt: receipt.acceptedAt
      } : {})
    }
  }),
  deliver: sendMessage
};
async function deliverClaimed(message, dependencies = defaultDependencies) {
  const d = dependencies;
  let contact;
  try {
    contact = await d.loadContact(message);
    checkSending(config, contact);
    if (await d.isSuppressed(message)) throw new AppError(409, "Recipient suppressed.");
    if (!(await d.campaignIsActive(message))) {
      await d.saveState(message, {
        status: "queued",
        error: ""
      });
      return "queued";
    }
    if (message.kind === "initial" && !(await d.reserveContact(message))) {
      throw new AppError(409, "Recipient was already contacted or reserved by another campaign.");
    }
    const parent = await d.parent(message);
    if (message.kind === "followup" && (!parent || parent.status !== "accepted" || ["bounced", "complained"].includes(parent.deliveryStatus))) throw new AppError(409, "Original message is not eligible for follow-up.");
    if (!(await d.reserveDaily())) {
      await d.saveState(message, {
        status: "queued",
        notBefore: new Date(Date.now() + 15 * 60000),
        error: "Daily send allowance reached."
      });
      return "queued";
    }
    // Check again after claiming and reserving capacity, immediately before provider I/O.
    contact = await d.loadContact(message);
    checkSending(config, contact);
    if (await d.isSuppressed(message)) throw new AppError(409, "Recipient suppressed.");
    if (!(await d.campaignIsActive(message))) {
      await d.saveState(message, {
        status: "queued",
        error: ""
      });
      return "queued";
    }
    let receipt;
    // Journal the exact footer, sender and message ID before the provider side effect.
    await d.saveState(message, snapshotMessage(message));
    try {
      receipt = await d.deliver(message, contact, parent);
    } catch (err) {
      await d.saveState(message, {
        status: err.definitive ? "failed" : "uncertain",
        error: err.definitive ? err.message : "Delivery outcome unknown. Check provider records before resolving."
      });
      return err.definitive ? "failed" : "uncertain";
    }
    const acceptedAt = new Date();
    // If this write fails, the processing lease later becomes uncertain, never auto-retried.
    await d.saveState(message, {
      status: "accepted",
      ...receipt,
      provider: config.provider,
      acceptedAt,
      error: ""
    });
    await d.markContact(message, {
      acceptedAt
    });
    return "accepted";
  } catch (err) {
    if (err.status === 409) {
      await d.saveState(message, {
        status: "skipped",
        error: err.message
      });
      return "skipped";
    }
    // A persistence failure after delivery must never be classified as a safe-to-retry rejection.
    throw err;
  }
}
async function pauseForReview(campaignId, reason) {
  await Campaign.updateOne({ _id: campaignId, status: { $in: ["queued", "running", "paused"] } }, {
    $set: { status: "paused", pausedAt: new Date(), pauseReason: reason }
  });
}
async function tick() {
  if (!config.sendingEnabled) return;
  const cutoff = new Date(Date.now() - 2 * 60000);
  // Never release an expired claim into a runnable queue: its provider outcome may be unknown.
  const staleCampaigns = await Campaign.find({ workerToken: { $exists: true }, workerStartedAt: { $lt: cutoff } }).select("_id");
  const staleMessages = await Message.find({ status: "processing", startedAt: { $lt: cutoff } }).select("campaign");
  const staleIds = new Set([...staleCampaigns.map(c => String(c._id)), ...staleMessages.map(m => String(m.campaign))]);
  for (const campaignId of staleIds) {
    await pauseForReview(campaignId, "Worker interrupted. Reconcile provider records before resuming.");
    await Message.updateMany({ campaign: campaignId, status: "processing", startedAt: { $lt: cutoff } }, {
      $set: { status: "uncertain", error: "Worker interrupted. Reconcile with provider records; no automatic retry." }
    });
    await Campaign.updateOne({ _id: campaignId, workerStartedAt: { $lt: cutoff } }, {
      $unset: { workerToken: "", workerStartedAt: "" }
    });
  }
  const campaigns = await Campaign.find({ status: { $in: ["queued", "running"] } }).select("_id");
  for (const campaign of campaigns) {
    const token = randomUUID();
    const claimed = await Campaign.findOneAndUpdate({
      _id: campaign._id, status: { $in: ["queued", "running"] }, workerToken: { $exists: false }
    }, { $set: { status: "running", workerToken: token, workerStartedAt: new Date() } }, { returnDocument: "after" });
    if (!claimed) continue;
    let message;
    try {
      // A failed pause write must not permit the next tick to advance another message.
      const unresolved = await Message.exists({ campaign: campaign._id, $or: [
        { status: { $in: ["processing", "uncertain"] } },
        { status: "failed", updatedAt: { $gt: claimed.failureReviewedAt || new Date(0) } },
        { deliveryStatus: { $in: ["bounced", "complained"] }, updatedAt: { $gt: claimed.failureReviewedAt || new Date(0) } }
      ] });
      if (unresolved) {
        await pauseForReview(campaign._id, "A failed, uncertain, processing, bounced, or complained-about message requires review before this campaign can continue.");
        continue;
      }
      message = await Message.findOneAndUpdate({
        campaign: campaign._id, status: "queued", notBefore: { $lte: new Date() }
      }, { $set: { status: "processing", startedAt: new Date() }, $inc: { attempt: 1 } }, {
        returnDocument: "after", sort: { createdAt: 1, _id: 1 }
      });
      if (message) {
        const outcome = await deliverClaimed(message);
        if (["failed", "uncertain"].includes(outcome)) {
          await pauseForReview(campaign._id, outcome === "failed"
            ? "Provider rejected a send. Review the failure before resuming queued messages."
            : "Delivery outcome unknown. Reconcile provider records before resuming.");
        }
      }
      if (!(await Message.exists({ campaign: campaign._id, status: { $in: ["queued", "processing"] } }))) {
        await Campaign.updateOne({ _id: campaign._id, status: { $in: ["queued", "running"] }, workerToken: token }, {
          $set: { status: await Message.exists({ campaign: campaign._id, status: "draft" }) ? "draft" : "completed" }
        });
      }
    } catch (err) {
      console.error("Message processing interrupted: " + err.name);
      // Pause before journaling uncertainty; either failure must leave a durable hold for the next tick.
      await pauseForReview(campaign._id, "Processing interrupted. Reconcile provider records before resuming.");
      if (message) await Message.updateOne({ _id: message._id, status: "processing" }, {
        $set: { status: "uncertain", error: "Processing interrupted. Reconcile before retrying." }
      });
    } finally {
      await Campaign.updateOne({ _id: campaign._id, workerToken: token }, { $unset: { workerToken: "", workerStartedAt: "" } });
    }
  }
}
function startWorker() {
  return cron.schedule("*/10 * * * * *", () => tick().catch(err => console.error("Worker error: " + err.name)), {
    noOverlap: true,
    timezone: config.timezone
  });
}
async function recoverDraftLocks() {
  for (const campaign of await Campaign.find({
    status: "editing",
    updatedAt: {
      $lt: new Date(Date.now() - 5 * 60000)
    }
  })) {
    const queued = await Message.exists({
      campaign: campaign._id,
      status: "queued"
    });
    await Campaign.updateOne({
      _id: campaign._id,
      status: "editing"
    }, {
      $set: {
        status: queued ? "paused" : "draft"
      }
    });
  }
}
module.exports = {
  deliverClaimed,
  tick,
  startWorker,
  recoverDraftLocks
};
