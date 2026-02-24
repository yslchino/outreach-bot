const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const generateMessage = async (req, res) => {
  const { recipientName, companyName, context } = req.body;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001", // Much faster than opus
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `You are an outreach assistant for GET Logistics LLC, a freight broker business. 
Write a professional, concise cold outreach email to ${recipientName} at ${companyName}.
Context: ${context || "Introducing GET Logistics LLC and our freight brokerage services."}
Keep it under 150 words, friendly, and end with a clear call to action.
Always end the email with exactly this signature:

Best regards,
Erick Hernandez
GET Logistics LLC
303-304-2894
getlogisticsllc.outreach@gmail.com`,
        },
      ],
    });

    res.json({ message: message.content[0].text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate message" });
  }
};

module.exports = { generateMessage };
