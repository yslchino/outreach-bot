const { Resend } = require("resend");
const Anthropic = require("@anthropic-ai/sdk");
const XLSX = require("xlsx");
const fs = require("fs");
const Contact = require("../models/Contact");

const resend = new Resend(process.env.RESEND_API_KEY);
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const autoSendToAll = async (req, res) => {
  const { subject, context, contacts } = req.body;
  if (!contacts || contacts.length === 0)
    return res.status(400).json({ error: "No contacts provided" });

  const results = { sent: 0, errors: [] };

  for (const contact of contacts) {
    try {
      const aiResponse = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: `You are an outreach assistant for GET Logistics LLC, a freight broker business.
Write a professional, concise cold outreach email to ${contact.name}, ${contact.title || "a professional"} at ${contact.company || "their company"} in ${contact.city || ""}, ${contact.state || ""}.
Their industry is: ${contact.industry || "Transportation/Logistics"}.
Context: ${context || "Introducing GET Logistics LLC and our freight brokerage services."}
Keep it under 150 words, friendly, and end with a clear call to action.
Always end the email with exactly this signature:

Best regards,
Erick Hernandez
GET Logistics LLC
303-304-2894
erick@getlogistics.llc`,
          },
        ],
      });

      const message = aiResponse.content[0].text;

      await resend.emails.send({
        from: "GET Logistics LLC <erick@getlogistics.llc>",
        to: contact.email,
        subject,
        html: `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
    ${message.replace(/\n/g, "<br>")}
  </div>
`,
      });

      await Contact.findOneAndUpdate(
        { email: contact.email },
        {
          name: contact.name,
          email: contact.email,
          company: contact.company || "",
          title: contact.title || "",
          city: contact.city || "",
          state: contact.state || "",
          industry: contact.industry || "",
          status: "sent",
          sentAt: new Date(),
          followUpSent: false,
          replied: false,
        },
        { upsert: true, new: true },
      );

      results.sent++;
    } catch (err) {
      results.errors.push({ email: contact.email, error: err.message });
    }
  }

  res.json(results);
};

const parseExcel = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    const allContacts = rows
      .filter((row) => row["Email Address"])
      .map((row) => ({
        name: `${row["First Name"] || ""} ${row["Last Name"] || ""}`.trim(),
        email: row["Email Address"],
        company: row["Company Name"] || "",
        title: row["Job Title"] || "",
        city: row["Person City"] || "",
        state: row["Person State"] || "",
        industry: row["Primary Industry"] || "",
      }));

    // Get already contacted emails from MongoDB
    const alreadyContacted = await Contact.find({}, "email");
    const contactedEmails = new Set(
      alreadyContacted.map((c) => c.email.toLowerCase()),
    );

    // Filter out already contacted
    const newContacts = allContacts.filter(
      (c) => !contactedEmails.has(c.email.toLowerCase()),
    );

    fs.unlinkSync(req.file.path);
    res.json({
      total: newContacts.length,
      skipped: allContacts.length - newContacts.length,
      contacts: newContacts,
    });
  } catch (err) {
    console.error("Excel parse error:", err);
    res.status(500).json({ error: err.message });
  }
};

const getTrackedContacts = async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ sentAt: -1 });
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const markReplied = async (req, res) => {
  const { email } = req.body;
  try {
    const contact = await Contact.findOneAndUpdate(
      { email },
      { replied: true },
      { new: true },
    );
    if (!contact) return res.status(404).json({ error: "Contact not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { autoSendToAll, getTrackedContacts, markReplied, parseExcel };
