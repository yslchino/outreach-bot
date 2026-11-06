const router = require("express").Router();
const express = require("express");
const {
  Resend
} = require("resend");
const Message = require("../models/Message");
const { suppress } = require("../services/replies");
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
  if (event.type === "email.received") {
    await require("../services/resendReceiving").processReceived(event);
    return res.sendStatus(204);
  }
  const statuses = {
    "email.delivered": "delivered",
    "email.bounced": "bounced",
    "email.complained": "complained"
  };
  const deliveryStatus = statuses[event.type];
  if (!deliveryStatus && event.type !== "email.sent") return res.sendStatus(204);
  if (typeof event.data?.email_id !== "string" || !event.data.email_id || !Number.isFinite(Date.parse(event.created_at))) return res.sendStatus(400);
  if (event.data.message_id !== undefined && !/^<[^<>\s]+>$/.test(event.data.message_id)) return res.sendStatus(400);
  const message = await Message.findOne({
    provider: "resend",
    providerId: event.data.email_id
  });
  // Ask the provider to retry if its event raced with acceptance persistence.
  if (!message) return res.sendStatus(event.data.tags?.workspace === "get-outreach-v2" ? 503 : 204);
  if (event.data.message_id) await Message.updateOne({ _id: message._id }, { $set: {
    rfcMessageId: event.data.message_id, rfcMessageIdVerified: true,
  } });
  if (event.type === "email.sent") return res.sendStatus(204);
  if (deliveryStatus !== "delivered") await suppress(message.to, deliveryStatus === "bounced" ? "bounce" : "complaint");
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
