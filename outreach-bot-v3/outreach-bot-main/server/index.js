const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const emailRoutes = require("./routes/email");
const aiRoutes = require("./routes/ai");
const automationRoutes = require("./routes/automation");
const authRoutes = require("./routes/auth");
const gmailRoutes = require("./routes/gmail");
const { protect } = require("./middleware/authMiddleware");
const { startFollowUpJob } = require("./jobs/followUpJob");
const { startReplyDetectionJob } = require("./jobs/replyDetectionJob");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware FIRST — before any routes
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json());

// Health check — Railway uses this to confirm the server is alive
app.get("/health", (req, res) => res.json({ status: "ok", ts: Date.now() }));
app.get("/", (req, res) => res.send("Outreach Bot server is running!"));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/email", protect, emailRoutes);
app.use("/api/ai", protect, aiRoutes);
app.use("/api/automation", protect, automationRoutes);
app.use("/", gmailRoutes); // Gmail OAuth — must be last

// Connect to DB and start server
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB");
    app.listen(PORT, () => {
      console.log(`🚀 Server listening on port ${PORT}`);
      startFollowUpJob();
      startReplyDetectionJob();
    });
  })
  .catch((err) => console.error("❌ MongoDB connection error:", err));
