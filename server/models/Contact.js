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
    sentAt: Date,
    followUpSent: { type: Boolean, default: false },
    followUpSentAt: Date,
    followUpBody: String,
    replied: { type: Boolean, default: false },
    subject: String,
    emailBody: String,
  },
  { timestamps: true },
);

module.exports = mongoose.model("Contact", contactSchema);
