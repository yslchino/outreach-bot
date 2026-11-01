const mongoose = require("mongoose");
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true,
    select: false
  },
  displayName: {
    type: String,
    maxlength: 100
  },
  role: {
    type: String,
    enum: ["admin", "operator", "viewer"],
    default: "viewer"
  },
  active: {
    type: Boolean,
    default: false
  },
  // Unique slots enforce the five-account cap even during concurrent creation.
  seat: {
    type: Number,
    min: 1,
    max: 5,
    unique: true,
    sparse: true
  },
  tokenVersion: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});
module.exports = mongoose.model("User", userSchema);
