const { Resend } = require("resend");
const fs = require("fs");
const csv = require("csv-parser");

const resend = new Resend(process.env.RESEND_API_KEY);

// Clean, professional plain-text-style HTML — avoids spam filters
const buildEmailHTML = (bodyText) => {
  const lines = bodyText.split("\n");
  const paragraphs = lines
    .map((line) => {
      if (line.trim() === "") return "";
      return `<p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#2d2d2d;">${line.trim()}</p>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
          <!-- Header bar -->
          <tr>
            <td style="background:#c41430;padding:16px 36px;">
              <span style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;font-weight:700;color:#ffffff;letter-spacing:2px;text-transform:uppercase;">GET Logistics LLC</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 36px 24px 36px;">
              ${paragraphs}
            </td>
          </tr>
          <!-- Divider -->
          <tr>
            <td style="padding:0 36px;">
              <div style="height:1px;background:#eeeeee;"></div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 36px 32px 36px;">
              <p style="margin:0;font-size:12px;color:#999999;line-height:1.6;">
                GET Logistics LLC &nbsp;·&nbsp; Freight Brokerage<br>
                303-304-2894 &nbsp;·&nbsp; <a href="mailto:erick@getlogistics.llc" style="color:#999999;text-decoration:none;">erick@getlogistics.llc</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

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
          const body = message.replace("{{name}}", contact.name || "there");
          await resend.emails.send({
            from: "Erick Hernandez <erick@getlogistics.llc>",
            to: contact.email,
            subject,
            html: buildEmailHTML(body),
            headers: {
              "List-Unsubscribe": "<mailto:erick@getlogistics.llc?subject=unsubscribe>",
            },
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
      from: "Erick Hernandez <erick@getlogistics.llc>",
      to,
      subject,
      html: buildEmailHTML(message),
      headers: {
        "List-Unsubscribe": "<mailto:erick@getlogistics.llc?subject=unsubscribe>",
      },
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
      from: "Erick Hernandez <erick@getlogistics.llc>",
      to,
      subject,
      html: buildEmailHTML(message),
    });
    res.json({ success: true });
  } catch (err) {
    console.error("Send error:", err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = { sendOutreach, sendFollowUp, sendTest, buildEmailHTML };
