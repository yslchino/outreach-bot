const mongoose = require("mongoose");
const contactSchema = new mongoose.Schema({
  name: String,
  email: {
    type: String,
    unique: true
  },
  company: String,
  title: String,
  city: String,
  state: String,
  region: { type: String, maxlength: 120 },
  industry: String,
  importBatch: { type: mongoose.Schema.Types.ObjectId, ref: "ImportBatch", index: true },
  sourceFile: String,
  sourceSheet: String,
  sourceRow: Number,
  source: {
    type: String,
    maxlength: 300
  },
  audience: {
    type: String,
    enum: ["shipper", "carrier"],
    default: "shipper"
  },
  permission: {
    type: String,
    enum: ["unknown", "opted_in", "business_contact"],
    default: "unknown"
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  verifiedAt: Date,
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  verificationMethod: { type: String, enum: ["user_reported"] },
  outreachCampaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Campaign"
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  status: {
    type: String,
    default: "pending"
  },
  subject: String,
  emailBody: String,
  sentAt: Date,
  companyResearch: String,
  followUpSent: {
    type: Boolean,
    default: false
  },
  followUpSentAt: Date,
  followUpBody: String,
  followUpSubject: String,
  replied: {
    type: Boolean,
    default: false
  },
  repliedAt: Date,
  replySubject: String,
  replyPreview: String,
  replyMessageId: String,
  replyCheckedAt: Date
}, {
  timestamps: true
});
module.exports = mongoose.model("Contact", contactSchema);
