require("dotenv").config();
const mongoose = require("mongoose");
const {
  config,
  validateConfig
} = require("./config");
const {
  createApp
} = require("./app");
async function start() {
  validateConfig();
  await mongoose.connect(config.databaseUri, {
    serverSelectionTimeoutMS: 5000
  });
  await Promise.all(["User", "Contact", "Campaign", "Message", "Suppression", "Usage", "OutreachReservation", "ImportBatch", "MailboxConnection", "OAuthAttempt", "InboundEmail"].map(name => require("./models/" + name).init()));
  const {
    startWorker,
    recoverDraftLocks
  } = require("./services/worker");
  await recoverDraftLocks();
  const maintenance = setInterval(() => recoverDraftLocks().catch(err => console.error("Draft recovery failed: " + err.name)), 60000);
  maintenance.unref();
  const tasks = config.jobsEnabled ? [startWorker(),
    ...(config.replyProvider === "gmail" ? [require("./jobs/replyDetectionJob").startReplyDetectionJob()] : []),
    ...(config.replyProvider === "outlook" ? [require("./jobs/outlookReplies").startOutlookReplyJob()] : [])] : [];
  const server = createApp().listen(config.port, config.host, () => {
    console.log("GET Logistics v2 listening on port " + config.port + ". Sending: " + config.sendingEnabled);
  });
  for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => {
    tasks.forEach(task => task.stop());
    clearInterval(maintenance);
    server.close(() => mongoose.disconnect().then(() => process.exit(0)));
  });
}
if (require.main === module) start().catch(err => {
  console.error(err.message);
  process.exitCode = 1;
});
module.exports = {
  start
};
