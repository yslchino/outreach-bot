const cron = require("node-cron");
const { Resend } = require("resend");
const Contact = require("../models/Contact");
const { buildEmailHTML } = require("../controllers/emailController");

const resend = new Resend(process.env.RESEND_API_KEY);

const startFollowUpJob = () => {
  // Runs Mon–Fri at 9am
  cron.schedule("0 9 * * 1-5", async () => {
    console.log("Running follow-up job...");
    const now = new Date();

    const contacts = await Contact.find({
      replied: false,
      followUpSent: false,
      status: "sent",
    });

    for (const contact of contacts) {
      if (!contact.sentAt) continue;
      const daysSince = (now - new Date(contact.sentAt)) / (1000 * 60 * 60 * 24);

      if (daysSince >= 3) {
        try {
          const bodyText = `Hi ${contact.name},

I wanted to follow up on my email from a few days ago about GET Logistics LLC.

We work with carriers and shippers across the country to move freight more efficiently — whether that's covering lanes quickly, improving rates, or reducing empty miles.

If you have a few minutes this week, I'd love to connect. Even a quick reply works.

Best regards,
Erick Hernandez
GET Logistics LLC
303-304-2894
erick@getlogistics.llc`;

          const followUpSubject = `Re: ${contact.subject || "GET Logistics LLC"}`;

          await resend.emails.send({
            from: "Erick Hernandez <erick@getlogistics.llc>",
            to: contact.email,
            subject: followUpSubject,
            html: buildEmailHTML(bodyText),
            headers: {
              "List-Unsubscribe": "<mailto:erick@getlogistics.llc?subject=unsubscribe>",
            },
          });

          contact.followUpSent = true;
          contact.followUpSentAt = new Date();
          contact.followUpBody = bodyText;
          contact.followUpSubject = followUpSubject;
          await contact.save();

          console.log(`✅ Follow-up sent to ${contact.email}`);
        } catch (err) {
          console.error(`❌ Follow-up failed for ${contact.email}:`, err.message);
        }
      }
    }
  });
  console.log("Follow-up job scheduled (Mon–Fri 9am)");
};

module.exports = { startFollowUpJob };
