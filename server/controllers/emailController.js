const { Resend } = require("resend");
const fs = require("fs");
const csv = require("csv-parser");

const resend = new Resend(process.env.RESEND_API_KEY);

const sendOutreach = async (req, res) => {
  const { subject, message } = req.body;
  const results = [];

  if (!req.file) return res.status(400).json({ error: "No CSV file uploaded" });

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on("data", (data) => results.push(data))
    .on("end", async () => {
      const errors = [];
      for (const contact of results) {
        try {
          await resend.emails.send({
            from: "GET Logistics LLC <erick@getlogistics.llc>",
            to: contact.email,
            subject: subject,
            text: message.replace("{{name}}", contact.name || "there"),
          });
        } catch (err) {
          errors.push({ email: contact.email, error: err.message });
        }
      }
      fs.unlinkSync(req.file.path);
      res.json({ sent: results.length - errors.length, errors });
    });
};

const sendFollowUp = async (req, res) => {
  const { to, subject, message } = req.body;
  try {
    await resend.emails.send({
      from: "GET Logistics LLC <erick@getlogistics.llc>",
      to,
      subject,
      text: message,
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const sendTest = async (req, res) => {
  const { to, subject, message } = req.body;
  try {
    await resend.emails.send({
      from: "GET Logistics LLC <erick@getlogistics.llc>",
      to,
      subject,
      html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      ${message.replace(/\n/g, "<br>")}
    </div>
  `,
    });
    res.json({ success: true });
  } catch (err) {
    console.error("Send error:", err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = { sendOutreach, sendFollowUp, sendTest };
