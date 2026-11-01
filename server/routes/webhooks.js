const router = require("express").Router();
const express = require("express");
const {
  Resend
} = require("resend");
const Message = require("../models/Message");
const Suppression = require("../models/Suppression");
const Contact = require("../models/Contact");
const {
  escapeRegex
} = require("../lib/validation");
router.post("/resend", express.raw({
  type: "application/json",
  limit: "256kb"
}), async (req, res) => {
  if (!process.env.RESEND_WEBHOOK_SECRET || !process.env.RESEND_API_KEY) return res.sendStatus(503);
  let event;
  try {
    event = new Resend(process.env.RESEND_API_KEY).webhooks.verify({
      payload: req.body.toString("utf8"),
      webhookSecret: process.env.RESEND_WEBHOOK_SECRET,
      headers: {
        id: req.get("svix-id"),
        timestamp: req.get("svix-timestamp"),
        signature: req.get("svix-signature")
      }
    });
  } catch {
    return res.sendStatus(400);
  }
  const statuses = {
    "email.delivered": "delivered",
    "email.bounced": "bounced",
    "email.complained": "complained"
  };
  const deliveryStatus = statuses[event.type];
  if (!deliveryStatus) return res.sendStatus(204);
  const message = await Message.findOne({
    provider: "resend",
    providerId: event.data.email_id
  });
  // Ask the provider to retry if its event raced with acceptance persistence.
  if (!message) return res.sendStatus(503);
  if (deliveryStatus !== "delivered") {
    await Suppression.updateOne({
      email: message.to
    }, {
      $setOnInsert: {
        reason: deliveryStatus === "bounced" ? "bounce" : "complaint"
      }
    }, {
      upsert: true
    });
    await Contact.updateMany({
      email: new RegExp("^" + escapeRegex(message.to) + "$", "i")
    }, {
      $set: {
        status: "suppressed"
      }
    });
    await Message.updateMany({
      to: message.to,
      status: {
        $in: ["draft", "queued"]
      }
    }, {
      $set: {
        status: "skipped",
        error: "Recipient suppressed by delivery event."
      }
    });
  }
  // A delayed delivered event must not erase a bounce or complaint.
  const permitted = deliveryStatus === "delivered" ? ["unknown", "delivered"] : deliveryStatus === "bounced" ? ["unknown", "delivered", "bounced"] : ["unknown", "delivered", "bounced", "complained"];
  await Message.updateOne({
    _id: message._id,
    deliveryStatus: {
      $in: permitted
    }
  }, {
    $set: {
      deliveryStatus,
      deliveryEventAt: new Date(event.created_at)
    }
  });
  res.sendStatus(204);
});
module.exports = router;
