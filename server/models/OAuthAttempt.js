const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  _id: { type: String },
  verifier: { type: String, select: false },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  tokenVersion: Number,
  expectedEmail: String,
  expiresAt: Date,
});
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
module.exports = mongoose.model("OAuthAttempt", schema);
