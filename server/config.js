const path = require("node:path");
const config = {
  port: Number(process.env.PORT || 5000),
  host: process.env.HOST || (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1"),
  jwtSecret: process.env.JWT_SECRET,
  databaseUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27018/outreach_v2_dev",
  sendingEnabled: process.env.SENDING_ENABLED === "true",
  jobsEnabled: process.env.JOBS_ENABLED === "true",
  provider: process.env.EMAIL_PROVIDER || "disabled",
  sender: process.env.EMAIL_FROM || "",
  replyTo: process.env.EMAIL_REPLY_TO || "",
  replyProvider: process.env.REPLY_PROVIDER || "manual",
  resendReceivingAddress: process.env.RESEND_RECEIVING_ADDRESS || "",
  resendReceivingEnabled: process.env.RESEND_RECEIVING_ENABLED === "true",
  postalAddress: process.env.POSTAL_ADDRESS || "",
  dailyLimit: Number(process.env.DAILY_SEND_LIMIT || 25),
  timezone: process.env.BUSINESS_TIMEZONE || "America/Los_Angeles",
  aiEnabled: process.env.AI_ENABLED === "true",
  monthlyAiLimit: Number(process.env.MONTHLY_AI_DRAFT_LIMIT || 100),
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  clientDist: path.resolve(__dirname, "../client/dist")
};
function validateConfig() {
  if (!config.jwtSecret || config.jwtSecret.length < 32) throw new Error("JWT_SECRET must contain at least 32 characters.");
  if (!/^(mongodb|mongodb\+srv):\/\//.test(config.databaseUri)) throw new Error("Invalid MONGODB_URI.");
  const localDatabase = /^mongodb:\/\/(127\.0\.0\.1|localhost|\[::1\])(?=[:/])/.test(config.databaseUri);
  if (!localDatabase && process.env.ALLOW_REMOTE_DATABASE !== "true") {
    throw new Error("Remote databases require ALLOW_REMOTE_DATABASE=true. Use a separate development database.");
  }
  if (!Number.isInteger(config.dailyLimit) || config.dailyLimit < 1 || config.dailyLimit > 100) {
    throw new Error("DAILY_SEND_LIMIT must be between 1 and 100.");
  }
  if (!Number.isInteger(config.monthlyAiLimit) || config.monthlyAiLimit < 1 || config.monthlyAiLimit > 1000) {
    throw new Error("MONTHLY_AI_DRAFT_LIMIT must be between 1 and 1000.");
  }
  new Intl.DateTimeFormat("en", {
    timeZone: config.timezone
  });
  if (!["manual", "gmail", "outlook", "resend"].includes(config.replyProvider)) throw new Error("Invalid REPLY_PROVIDER.");
  if (config.replyProvider === "resend" && config.resendReceivingAddress) require("./lib/validation").email(config.resendReceivingAddress);
  if (config.resendReceivingEnabled && (config.replyProvider !== "resend" || !config.resendReceivingAddress)) throw new Error("Configure the Resend reply address before activating receiving.");
  if (config.resendReceivingEnabled && (!process.env.RESEND_API_KEY || !process.env.RESEND_WEBHOOK_SECRET)) throw new Error("Configure Resend API and webhook credentials before activating receiving.");
  if (config.sendingEnabled) {
    if (config.replyProvider === "resend" && (!config.resendReceivingEnabled || config.replyTo !== config.resendReceivingAddress || !process.env.RESEND_WEBHOOK_SECRET)) {
      throw new Error("Activate Resend receiving and its signed webhook before enabling campaign sending.");
    }
    if (!["resend", "smtp"].includes(config.provider)) throw new Error("Select EMAIL_PROVIDER=resend or smtp before enabling sending.");
    if (!config.sender || !config.replyTo || !config.postalAddress || /[\r\n]/.test(config.sender + config.replyTo)) {
      throw new Error("Configure a valid sender, reply-to, and postal address before enabling sending.");
    }
    require("./lib/validation").email(config.replyTo);
    if (config.provider === "resend" && !process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is required.");
    if (config.provider === "smtp" && (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD)) {
      throw new Error("SMTP_HOST, SMTP_USER, and SMTP_PASSWORD are required.");
    }
  }
}
module.exports = {
  config,
  validateConfig
};
