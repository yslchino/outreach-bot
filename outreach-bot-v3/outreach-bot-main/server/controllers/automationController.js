const { Resend } = require("resend");
const Anthropic = require("@anthropic-ai/sdk");
const XLSX = require("xlsx");
const fs = require("fs");
const Contact = require("../models/Contact");
const { buildEmailHTML } = require("./emailController");

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
        max_tokens: 600,
        messages: [
          {
            role: "user",
            content: `You are writing a cold outreach email on behalf of Erick Hernandez at GET Logistics LLC, a freight brokerage.

Recipient: ${contact.name}
Title: ${contact.title || ""}
Company: ${contact.company || "their company"}
Location: ${contact.city || ""}${contact.state ? ", " + contact.state : ""}
Industry: ${contact.industry || "Transportation/Logistics"}
Extra context: ${context || "none"}

Rules:
- 100-130 words max
- Open with something specific to their industry or location — NOT "I hope this finds you well"
- One clear value proposition about freight brokerage (faster coverage, better rates, carrier network)
- One soft call to action (quick call, reply to this email)
- No exclamation marks, no ALL CAPS, no spam words (FREE, GUARANTEED, ACT NOW)
- Plain conversational tone — like a real person wrote it
- End with EXACTLY this signature, nothing after it:

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
        from: "Erick Hernandez <erick@getlogistics.llc>",
        to: contact.email,
        subject,
        html: buildEmailHTML(message),
        headers: {
          "List-Unsubscribe": "<mailto:erick@getlogistics.llc?subject=unsubscribe>",
          "X-Entity-Ref-ID": `getlogistics-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        },
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
          subject,
          emailBody: message,
        },
        { upsert: true, new: true }
      );

      results.sent++;

      // Small delay between sends to avoid rate limits
      await new Promise((r) => setTimeout(r, 500));
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

    const alreadyContacted = await Contact.find({}, "email");
    const contactedEmails = new Set(
      alreadyContacted.map((c) => c.email.toLowerCase())
    );

    const newContacts = allContacts.filter(
      (c) => !contactedEmails.has(c.email.toLowerCase())
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
      { replied: true, repliedAt: new Date() },
      { new: true }
    );
    if (!contact) return res.status(404).json({ error: "Contact not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { autoSendToAll, getTrackedContacts, markReplied, parseExcel };
