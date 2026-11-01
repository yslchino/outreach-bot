const router = require("express").Router();
// Credentials are never printed, logged, or returned through a browser callback.
router.use((req, res) => res.status(410).json({
  error: "Configure Gmail credentials securely on the server."
}));
module.exports = router;
