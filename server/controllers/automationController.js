const { Resend } = require("resend");
const Anthropic = require("@anthropic-ai/sdk");
const XLSX = require("xlsx");
const fs = require("fs");
const Contact = require("../models/Contact");
const { buildEmailHTML } = require("./emailController");

const resend = new Resend(process.env.RESEND_API_KEY);
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const researchCompany = async (contact) => {
  const query =
    `${contact.company} ${contact.city || ""} ${contact.state || ""} trucking freight carrier`.trim();
  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [
        {
          role: "user",
          content: `Search for this trucking/freight company and return a short summary of what you find:

Company: ${contact.company}
Location: ${contact.city || ""}${contact.state ? ", " + contact.state : ""}
Industry: ${contact.industry || "Transportation/Logistics"}

Search query to use: "${query}"

Return ONLY a 2-3 sentence factual summary covering:
- What they haul (dry van, flatbed, reefer, etc.) if known
- How big they are (fleet size, number of trucks) if known
- What lanes or regions they operate in if known
- Any recent news or notable facts

If you can't find specific info, return: "No additional details found."
Keep it factual, no fluff.`,
        },
      ],
    });
    const textBlock = response.content.find((b) => b.type === "text");
    return textBlock ? textBlock.text.trim() : "No additional details found.";
  } catch (err) {
    console.log(`Research failed for ${contact.company}: ${err.message}`);
    return "No additional details found.";
  }
};

const generateEmail = async (contact, context, companyResearch) => {
  const hasResearch =
    companyResearch && companyResearch !== "No additional details found.";
  const response = await client.messages.create({
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
${hasResearch ? `\nResearch about this company:\n${companyResearch}` : ""}

Rules:
- 100-130 words max
- ${hasResearch ? "Open by referencing something SPECIFIC from the research above — their equipment type, lanes, or fleet size. This must feel personal." : "Open with something specific to their industry or location."}
- One clear value proposition (faster load coverage, better rates, strong carrier network)
- One soft call to action (quick call, or reply to this email)
- No exclamation marks, no ALL CAPS, no spam words (FREE, GUARANTEED, ACT NOW)
- Plain conversational tone — like a real person wrote it, not a marketing blast
- End with EXACTLY this signature, nothing after it:

Best regards,
Erick Hernandez
GET Logistics LLC
303-304-2894
erick@getlogistics.llc`,
      },
    ],
  });
  return response.content[0].text;
};

const autoSendToAll = async (req, res) => {
  const { subject, context, contacts, useWebSearch = true } = req.body;
  if (!contacts || contacts.length === 0)
    return res.status(400).json({ error: "No contacts provided" });

  const results = { sent: 0, errors: [], researched: 0 };

  for (const contact of contacts) {
    try {
      let companyResearch = "No additional details found.";
      if (useWebSearch && contact.company) {
        console.log(`🔍 Researching: ${contact.company}...`);
        companyResearch = await researchCompany(contact);
        if (companyResearch !== "No additional details found.") {
          results.researched++;
          console.log(`✅ Research found for ${contact.company}`);
        }
      }

      const message = await generateEmail(contact, context, companyResearch);

      await resend.emails.send({
        from: "Erick Hernandez <erick@getlogistics.llc>",
        to: contact.email,
        subject,
        html: buildEmailHTML(message),
        headers: {
          "List-Unsubscribe":
            "<mailto:erick@getlogistics.llc?subject=unsubscribe>",
          "X-Entity-Ref-ID": `getlogistics-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}`,
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
          companyResearch:
            companyResearch !== "No additional details found."
              ? companyResearch
              : null,
        },
        { upsert: true, new: true },
      );

      results.sent++;
      const delay = useWebSearch ? 1500 : 500;
      await new Promise((r) => setTimeout(r, delay));
    } catch (err) {
      console.error(`❌ Failed for ${contact.email}: ${err.message}`);
      results.errors.push({ email: contact.email, error: err.message });
    }
  }

  console.log(
    `Campaign done: ${results.sent} sent, ${results.researched} researched, ${results.errors.length} failed`,
  );
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
      alreadyContacted.map((c) => c.email.toLowerCase()),
    );

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
      { replied: true, repliedAt: new Date() },
      { new: true },
    );
    if (!contact) return res.status(404).json({ error: "Contact not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { autoSendToAll, getTrackedContacts, markReplied, parseExcel };
