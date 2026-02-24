const cron = require("node-cron");
const { Resend } = require("resend");
const Contact = require("../models/Contact");

const resend = new Resend(process.env.RESEND_API_KEY);

const startFollowUpJob = () => {
  cron.schedule("0 9 * * *", async () => {
    console.log("Running follow-up job...");
    const now = new Date();
    const contacts = await Contact.find({
      replied: false,
      followUpSent: false,
    });

    for (const contact of contacts) {
      const daysSince =
        (now - new Date(contact.sentAt)) / (1000 * 60 * 60 * 24);
      if (daysSince >= 3) {
        try {
          await resend.emails.send({
            from: "GET Logistics LLC <onboarding@resend.dev>",
            to: contact.email,
            subject: "Following Up — GET Logistics LLC",
            text: `Hi ${contact.name},\n\nI wanted to follow up on my previous email regarding GET Logistics LLC. We specialize in freight brokerage and would love to learn more about your shipping needs.\n\nWould you have 10 minutes for a quick call this week?\n\nBest regards,\nErick Hernandez\nGET Logistics LLC\n303-304-2894\ngetlogisticsllc.outreach@gmail.com`,
          });
          contact.followUpSent = true;
          await contact.save();
          console.log(`Follow-up sent to ${contact.email}`);
        } catch (err) {
          console.error(`Failed follow-up to ${contact.email}:`, err.message);
        }
      }
    }
  });
  console.log("Follow-up job scheduled (runs daily at 9am)");
};

module.exports = { startFollowUpJob };
