const router = require("express").Router();
const User = require("../models/User");
const {
  login,
  createUser,
  updateUser,
  publicUser
} = require("../controllers/authController");
const {
  protect,
  allow
} = require("../middleware/authMiddleware");
const {
  rateLimit
} = require("../middleware/rateLimit");
router.post("/login", rateLimit(), login);
router.post("/register", (req, res) => res.status(403).json({
  error: "Public registration is closed. Contact your administrator."
}));
router.get("/me", protect, (req, res) => res.json(publicUser(req.user)));
router.post("/logout", protect, async (req, res) => {
  await User.updateOne({
    _id: req.user._id
  }, {
    $inc: {
      tokenVersion: 1
    }
  });
  res.json({
    success: true
  });
});
router.get("/users", protect, allow("admin"), async (req, res) => {
  res.json((await User.find({
    seat: {
      $exists: true
    }
  }).sort({
    seat: 1
  })).map(publicUser));
});
router.post("/users", protect, allow("admin"), rateLimit(), createUser);
router.patch("/users/:id", protect, allow("admin"), rateLimit(), updateUser);
module.exports = router;
