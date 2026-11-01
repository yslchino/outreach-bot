const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    maxlength: 120
  },
  audience: {
    type: String,
    enum: ["shipper", "carrier"],
    required: true
  },
  subject: {
    type: String,
    required: true,
    maxlength: 200
  },
  context: {
    type: String,
    maxlength: 2000
  },
  status: {
    type: String,
    enum: ["draft", "editing", "queued", "running", "paused", "completed"],
    default: "draft",
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  approvedAt: Date,
  pausedAt: Date,
  followUpDays: {
    type: Number,
    min: 3,
    max: 30,
    default: 3
  }
  // Follow-ups are individually drafted and approved; no silent v1 automation.
}, {
  timestamps: true
});
module.exports = mongoose.model("Campaign", schema);
