const mongoose = require("mongoose");
const stagedContact = new mongoose.Schema({
  email: String, name: String, company: String, title: String,
  city: String, state: String, region: String, industry: String, sourceRow: Number,
}, { _id: false });
const schema = new mongoose.Schema({
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  source: String,
  filename: String,
  fileHash: String,
  sheetName: String,
  audience: { type: String, enum: ["shipper", "carrier"], required: true },
  permission: { type: String, enum: ["unknown", "business_contact", "opted_in"], default: "unknown" },
  verified: { type: Boolean, default: false },
  status: { type: String, enum: ["preview", "importing", "completed"], default: "preview" },
  contacts: [stagedContact],
  summary: mongoose.Schema.Types.Mixed,
  result: mongoose.Schema.Types.Mixed,
  leaseUntil: Date,
  leaseToken: String,
  completedAt: Date,
  expiresAt: Date,
}, { timestamps: true });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
module.exports = mongoose.model("ImportBatch", schema);
