const mongoose = require("mongoose");
// Key by normalized email, not contact ID, to cover mixed-case legacy duplicates.
module.exports = mongoose.model("OutreachReservation", new mongoose.Schema({
  _id: String,
  message: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Message",
    required: true
  },
  campaign: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Campaign",
    required: true
  }
}, {
  timestamps: true
}));
