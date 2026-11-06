const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  _id: { type: String },
  status: { type: String, enum: ["pending", "processing", "processed", "unmatched", "needs_review", "failed"], default: "pending", index: true },
  leaseToken: String,
  leaseUntil: Date,
  sender: String,
  subject: { type: String, maxlength: 200 },
  preview: { type: String, maxlength: 4000 },
  receivedAt: Date,
  messageId: String,
  matchedMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
  contact: { type: mongoose.Schema.Types.ObjectId, ref: "Contact" },
  optOut: Boolean,
  reason: String,
}, { timestamps: true });
module.exports = mongoose.model("InboundEmail", schema);
