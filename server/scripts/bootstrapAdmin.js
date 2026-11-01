require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const {
  config,
  validateConfig
} = require("../config");
const v = require("../lib/validation");
async function main() {
  validateConfig();
  const username = v.text(process.env.BOOTSTRAP_USERNAME, "BOOTSTRAP_USERNAME", 80).toLowerCase();
  const displayName = v.text(process.env.BOOTSTRAP_DISPLAY_NAME, "BOOTSTRAP_DISPLAY_NAME", 100);
  const password = await bcrypt.hash(v.password(process.env.BOOTSTRAP_PASSWORD), 12);
  await mongoose.connect(config.databaseUri);
  await User.init();
  if (await User.exists({
    active: true,
    role: "admin",
    seat: {
      $exists: true
    }
  })) {
    throw new Error("An administrator already exists. Use Team settings to manage accounts.");
  }
  const existing = await User.findOne({
    username
  });
  const occupied = new Set((await User.find({
    seat: {
      $exists: true
    }
  })).map(u => u.seat));
  const seat = 1;
  if (occupied.has(1) && existing?.seat !== 1) throw new Error("Owner seat is occupied. Review existing users before bootstrapping.");
  await User.findOneAndUpdate({
    username
  }, {
    $set: {
      password,
      displayName,
      role: "admin",
      active: true,
      seat
    },
    $inc: {
      tokenVersion: 1
    }
  }, {
    upsert: true,
    runValidators: true
  });
  console.log("Administrator ready. Remove BOOTSTRAP_PASSWORD from your environment.");
}
main().catch(err => {
  console.error(err.message);
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
