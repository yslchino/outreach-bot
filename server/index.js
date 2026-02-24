const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const emailRoutes = require("./routes/email");
const aiRoutes = require("./routes/ai");
const automationRoutes = require("./routes/automation");
const authRoutes = require("./routes/auth");
const { protect } = require("./middleware/authMiddleware");
const { startFollowUpJob } = require("./jobs/followUpJob");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/email", protect, emailRoutes);
app.use("/api/ai", protect, aiRoutes);
app.use("/api/automation", protect, automationRoutes);

app.get("/", (req, res) => res.send("Outreach Bot server is running!"));

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
      startFollowUpJob();
    });
  })
  .catch((err) => console.error("MongoDB connection error:", err));
