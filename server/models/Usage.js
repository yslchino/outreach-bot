const mongoose = require("mongoose");
module.exports = mongoose.model("Usage", new mongoose.Schema({
  _id: String,
  count: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
}));
