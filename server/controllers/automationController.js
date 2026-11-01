// Kept as a tombstone for older integrations; no v1 operation can send email.
const retired = (req, res) => res.status(410).json({
  error: "Use the v2 workspace API."
});
module.exports = {
  autoSendToAll: retired,
  getTrackedContacts: retired,
  markReplied: retired,
  parseExcel: retired
};
