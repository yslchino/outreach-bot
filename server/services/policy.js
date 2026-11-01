const {
  assert
} = require("../lib/errors");
function checkSending(config, contact) {
  assert(config.sendingEnabled, 409, "Sending is disabled. Drafts can still be prepared.");
  assert(["resend", "smtp"].includes(config.provider), 409, "Configure a supported email provider before sending.");
  assert(config.sender && config.replyTo && config.postalAddress, 409, "Sender, reply-to, and postal address are required.");
  assert(contact && !contact.replied && contact.status !== "suppressed", 409, "This contact is not eligible for outreach.");
  assert(contact.emailVerified === true, 409, "Verify the recipient address before sending.");
  assert(["opted_in", "business_contact"].includes(contact.permission), 409, "Review the recipient's contact permission before sending.");
  if (config.provider === "resend") assert(contact.permission === "opted_in", 409, "Resend requires an opted-in recipient.");
  if (config.provider === "smtp") assert(process.env.SMTP_OUTREACH_APPROVED === "true" || contact.permission === "opted_in", 409, "Confirm the SMTP provider permits this outreach before enabling it.");
}
function dayKey(now, timezone) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(now);
}
module.exports = {
  checkSending,
  dayKey
};
