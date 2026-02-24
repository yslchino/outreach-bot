const express = require("express");
const { google } = require("googleapis");
const router = express.Router();

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI,
);

router.get("/auth/gmail", (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/gmail.readonly"],
    prompt: "consent",
  });
  res.redirect(url);
});

router.get("/auth/gmail/callback", async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log("REFRESH TOKEN:", tokens.refresh_token);
    res.send(`
      <h2>Success!</h2>
      <p>Copy this refresh token and add it to Railway Variables as GMAIL_REFRESH_TOKEN:</p>
      <code style="word-break:break-all">${tokens.refresh_token}</code>
    `);
  } catch (err) {
    res.status(500).send("Error: " + err.message);
  }
});

module.exports = router;
