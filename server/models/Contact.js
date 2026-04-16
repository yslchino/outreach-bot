const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true },
    company: String,
    title: String,
    city: String,
    state: String,
    industry: String,
    status: { type: String, default: "pending" },
    subject: String,
    emailBody: String,
    sentAt: Date,
    companyResearch: String,
    followUpSent: { type: Boolean, default: false },
    followUpSentAt: Date,
    followUpBody: String,
    followUpSubject: String,
    replied: { type: Boolean, default: false },
    repliedAt: Date,
  },
  { timestamps: true },
);

module.exports = mongoose.model("Contact", contactSchema);
