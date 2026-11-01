// Silent v1 follow-up sending is retired. V2 prepares due drafts through
// POST /api/campaigns/:id/followups and requires administrator approval.
const startFollowUpJob = () => null;
module.exports = {
  startFollowUpJob
};
