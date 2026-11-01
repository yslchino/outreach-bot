const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const {
  config
} = require("../config");
const {
  assert
} = require("../lib/errors");
const v = require("../lib/validation");
const publicUser = user => ({
  id: user._id,
  username: user.username,
  displayName: user.displayName || user.username,
  role: user.role,
  active: user.active,
  seat: user.seat
});
async function login(req, res) {
  const username = v.text(req.body.username, "Username", 80).toLowerCase();
  const supplied = req.body.password;
  assert(typeof supplied === "string" && supplied.length > 0 && Buffer.byteLength(supplied) <= 72, 401, "Invalid credentials or inactive account.");
  const user = await User.findOne({
    username
  }).select("+password");
  assert(user && user.active === true && user.seat && (await bcrypt.compare(supplied, user.password)), 401, "Invalid credentials or inactive account.");
  const token = jwt.sign({
    version: user.tokenVersion
  }, config.jwtSecret, {
    subject: String(user._id),
    expiresIn: "8h",
    issuer: "get-outreach-v2",
    algorithm: "HS256"
  });
  res.json({
    token,
    user: publicUser(user)
  });
}
async function createUser(req, res) {
  const username = v.text(req.body.username, "Username", 80).toLowerCase();
  assert(/^[a-z0-9._@+-]+$/.test(username), 400, "Username contains unsupported characters.");
  const role = req.body.role || "operator";
  assert(["admin", "operator", "viewer"].includes(role), 400, "Invalid role.");
  const displayName = v.text(req.body.displayName, "Display name", 100);
  const password = await bcrypt.hash(v.password(req.body.password), 12);
  assert(!(await User.exists({
    username
  })), 409, "Username already exists.");
  for (let seat = 2; seat <= 5; seat++) {
    try {
      const user = await User.create({
        username,
        password,
        displayName,
        role,
        seat,
        active: true
      });
      return res.status(201).json(publicUser(user));
    } catch (err) {
      if (err.code === 11000 && err.keyPattern?.seat) continue;
      throw err;
    }
  }
  res.status(409).json({
    error: "All five team seats are occupied. Reuse an existing account slot."
  });
}
async function updateUser(req, res) {
  const userId = v.id(req.params.id);
  assert(String(req.user._id) !== userId, 400, "Use another administrator to change your own access.");
  const target = await User.findById(userId);
  assert(target && target.seat, 404, "Team member not found.");
  if (target.seat === 1) {
    assert(req.body.active !== false && (!req.body.role || req.body.role === "admin"), 400,
      "The workspace owner's account must remain an active administrator.");
  }
  const changes = {};
  if (req.body.role !== undefined) {
    assert(["admin", "operator", "viewer"].includes(req.body.role), 400, "Invalid role.");
    changes.role = req.body.role;
  }
  if (req.body.active !== undefined) {
    assert(typeof req.body.active === "boolean", 400, "Active must be true or false.");
    changes.active = req.body.active;
  }
  if (req.body.displayName !== undefined) changes.displayName = v.text(req.body.displayName, "Display name", 100);
  if (req.body.password !== undefined) changes.password = await bcrypt.hash(v.password(req.body.password), 12);
  assert(Object.keys(changes).length > 0, 400, "No account changes provided.");
  const user = await User.findOneAndUpdate({
    _id: userId,
    seat: {
      $exists: true
    }
  }, {
    $set: changes,
    $inc: {
      tokenVersion: 1
    }
  }, {
    returnDocument: "after",
    runValidators: true
  });
  assert(user, 404, "Team member not found.");
  res.json(publicUser(user));
}
module.exports = {
  login,
  createUser,
  updateUser,
  publicUser
};
