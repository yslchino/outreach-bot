const mongoose = require("mongoose");
module.exports = mongoose.model("Suppression", new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  reason: {
    type: String,
    enum: ["opt_out", "bounce", "complaint", "manual"],
    default: "manual"
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }
}, {
  timestamps: true
}));
