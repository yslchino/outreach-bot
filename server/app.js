const express = require("express");
const cors = require("cors");
const path = require("node:path");
const fs = require("node:fs");
const mongoose = require("mongoose");
const authRoutes = require("./routes/auth");
const {
  config
} = require("./config");
const {
  errorHandler
} = require("./lib/errors");
function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(cors({
    origin: config.clientOrigin,
    credentials: true,
    methods: ["GET", "POST", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"]
  }));
  app.use("/api/webhooks", require("./routes/webhooks"));
  app.use(express.json({
    limit: "256kb"
  }));
  app.use((req, res, next) => {
    res.set("X-Content-Type-Options", "nosniff");
    res.set("Referrer-Policy", "no-referrer");
    if (req.path.startsWith("/api/")) res.set("Cache-Control", "no-store");
    next();
  });
  app.get("/health", (req, res) => {
    const ready = mongoose.connection.readyState === 1;
    res.status(ready ? 200 : 503).json({
      status: ready ? "ready" : "database unavailable"
    });
  });
  app.use("/api/auth", authRoutes);
  // Old v1 callers must never bypass the reviewed campaign workflow.
  app.use(["/api/email", "/api/automation", "/api/ai"], (req, res) => res.status(410).json({
    error: "This v1 endpoint is retired. Use the v2 workspace."
  }));
  app.use(["/auth/gmail", "/auth/gmail/callback"], (req, res) => res.status(410).json({
    error: "Browser-based token setup is disabled. Configure Gmail credentials securely on the server."
  }));
  app.use("/api/outlook", require("./routes/outlook"));
  app.use("/api", require("./routes/workspace"));
  app.use("/api", (req, res) => res.status(404).json({
    error: "API endpoint not found."
  }));
  if (fs.existsSync(config.clientDist)) {
    app.use(express.static(config.clientDist));
    app.get("/{*path}", (req, res) => res.sendFile(path.join(config.clientDist, "index.html")));
  }
  app.use(errorHandler);
  return app;
}
module.exports = {
  createApp
};
