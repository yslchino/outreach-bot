const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  _id: { type: String },
  connectionId: String,
  email: String,
  accountId: String,
  refreshToken: { type: String, select: false },
  connectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  lastScanAt: Date,
  lastScanStatus: String,
  refreshLease: String,
  refreshLeaseUntil: Date,
}, { timestamps: true });
module.exports = mongoose.model("MailboxConnection", schema);
