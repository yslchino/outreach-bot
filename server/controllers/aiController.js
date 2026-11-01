// AI requests now require a saved campaign draft and a monthly usage reservation.
const generateMessage = (req, res) => res.status(410).json({
  error: "Generate AI drafts from a v2 campaign."
});
module.exports = {
  generateMessage
};
