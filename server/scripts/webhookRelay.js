const http = require("node:http");
const { Resend } = require("resend");
const route = "/api/webhooks/resend";
function createWebhookRelay({ getSecret, forward = forwardToApp }) {
  let active = 0;
  const server = http.createServer(async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    const end = code => { req.resume(); if (!res.writableEnded) { res.writeHead(code); res.end(); } };
    if (req.method !== "POST" || req.url !== route) return end(404);
    if (!/^application\/json(?:\s*;|$)/i.test(req.headers["content-type"] || "")) return end(415);
    if (active >= 16) return end(429);
    const secret = getSecret();
    if (!secret) return end(503);
    active++;
    res.once("close", () => active--);
    let size = 0; const chunks = [];
    req.on("data", chunk => {
      size += chunk.length;
      if (size > 256 * 1024) { chunks.length = 0; end(413); }
      else if (!res.writableEnded) chunks.push(chunk);
    });
    req.on("error", () => end(400));
    req.on("end", async () => {
      if (res.writableEnded) return;
      const payload = Buffer.concat(chunks);
      const headers = Object.fromEntries(["svix-id", "svix-timestamp", "svix-signature"].map(name => [name, req.headers[name]]));
      try {
        // Signature verification is offline. This instance never calls Resend's API.
        new Resend("signature-verification-only").webhooks.verify({ payload: payload.toString("utf8"), webhookSecret: secret,
          headers: { id: headers["svix-id"], timestamp: headers["svix-timestamp"], signature: headers["svix-signature"] } });
      } catch { return end(400); }
      try {
        const status = await forward(payload, headers);
        end(status === 204 ? 204 : status === 400 ? 400 : 503);
      } catch { end(503); }
    });
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.setTimeout(25000, socket => socket.destroy());
  return server;
}
async function forwardToApp(payload, headers) {
  const result = await fetch("http://127.0.0.1:5000" + route, { method: "POST", redirect: "error",
    signal: AbortSignal.timeout(20000), headers: { "Content-Type": "application/json", ...headers }, body: payload });
  await result.body?.cancel();
  return result.status;
}
if (require.main === module) {
  require("dotenv").config({ quiet: true });
  if (!process.env.RESEND_WEBHOOK_SECRET) throw new Error("Configure RESEND_WEBHOOK_SECRET before starting the relay.");
  const server = createWebhookRelay({ getSecret: () => process.env.RESEND_WEBHOOK_SECRET });
  server.listen(5001, "127.0.0.1", () => console.log("Signed webhook relay listening on 127.0.0.1:5001."));
  for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => server.close());
}
module.exports = { createWebhookRelay };
