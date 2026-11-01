// Retired v1 sending paths cannot bypass v2 campaign approval and persistence.
const retired = (req, res) => res.status(410).json({
  error: "Use the v2 campaign workflow."
});
module.exports = {
  sendOutreach: retired,
  sendFollowUp: retired,
  sendTest: retired,
  buildEmailHTML: require("../services/mailer").renderEmail
};
