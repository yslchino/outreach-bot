const cron = require("node-cron");
const { google } = require("googleapis");
const Contact = require("../models/Contact");

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI,
);

const checkForReplies = async () => {
  try {
    oauth2Client.setCredentials({
      refresh_token: process.env.GMAIL_REFRESH_TOKEN,
    });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const contacts = await Contact.find({ replied: false, status: "sent" });
    if (contacts.length === 0) return;

    const emails = contacts.map((c) => c.email);

    for (const contactEmail of emails) {
      try {
        const response = await gmail.users.messages.list({
          userId: "me",
          q: `from:${contactEmail} in:inbox`,
          maxResults: 1,
        });

        if (response.data.messages && response.data.messages.length > 0) {
          await Contact.findOneAndUpdate(
            { email: contactEmail },
            { replied: true },
            { new: true },
          );
          console.log(
            `Reply detected from ${contactEmail} — marked as replied`,
          );
        }
      } catch (err) {
        console.error(
          `Error checking replies for ${contactEmail}:`,
          err.message,
        );
      }
    }
  } catch (err) {
    console.error("Reply detection error:", err.message);
  }
};

const startReplyDetectionJob = () => {
  cron.schedule("0 * * * *", async () => {
    console.log("Checking for replies...");
    await checkForReplies();
  });
  console.log("Reply detection job scheduled (runs every hour)");
};

module.exports = { startReplyDetectionJob };
