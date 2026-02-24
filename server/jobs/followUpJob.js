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
            from: "GET Logistics LLC <erick@getlogistics.llc>",
            to: contact.email,
            subject: "Following Up — GET Logistics LLC",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
                <p>Hi ${contact.name},</p>
                <p>I wanted to follow up on my previous email regarding GET Logistics LLC. We specialize in freight brokerage and would love to learn more about your shipping needs.</p>
                <p>Would you have 10 minutes for a quick call this week?</p>
                <br>
                <p>Best regards,<br>
                Erick Hernandez<br>
                GET Logistics LLC<br>
                303-304-2894<br>
                erick@getlogistics.llc</p>
              </div>
            `,
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
