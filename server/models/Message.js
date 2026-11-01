const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  campaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Campaign",
    required: true,
    index: true
  },
  contact: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Contact",
    required: true
  },
  kind: {
    type: String,
    enum: ["initial", "followup"],
    default: "initial"
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Message"
  },
  to: {
    type: String,
    required: true
  },
  recipientName: String,
  company: String,
  subject: {
    type: String,
    required: true,
    maxlength: 200
  },
  body: {
    type: String,
    required: true,
    maxlength: 12000
  },
  status: {
    type: String,
    enum: ["draft", "queued", "processing", "accepted", "failed", "uncertain", "skipped"],
    default: "draft",
    index: true
  },
  deliveryStatus: {
    type: String,
    enum: ["unknown", "delivered", "bounced", "complained"],
    default: "unknown"
  },
  deliveryEventAt: Date,
  provider: String,
  providerId: String,
  rfcMessageId: String,
  sentFrom: String,
  renderedText: String,
  renderedHtml: String,
  acceptedAt: Date,
  startedAt: Date,
  notBefore: {
    type: Date,
    default: Date.now
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  approvedAt: Date,
  error: String,
  attempt: {
    type: Number,
    default: 0
  },
  reconciliationNote: String,
  reconciledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  reconciledAt: Date
}, {
  timestamps: true
});
schema.index({
  campaign: 1,
  contact: 1,
  kind: 1
}, {
  unique: true
});
schema.index({
  campaign: 1,
  to: 1,
  kind: 1
}, {
  unique: true
});
schema.index({
  status: 1,
  notBefore: 1
});
schema.index({
  providerId: 1
}, {
  sparse: true
});
module.exports = mongoose.model("Message", schema);
