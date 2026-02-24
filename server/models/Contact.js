const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, required: true, unique: true },
    company: String,
    title: String,
    city: String,
    state: String,
    industry: String,
    status: { type: String, default: "sent" },
    sentAt: { type: Date, default: Date.now },
    followUpSent: { type: Boolean, default: false },
    replied: { type: Boolean, default: false },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Contact", contactSchema);
