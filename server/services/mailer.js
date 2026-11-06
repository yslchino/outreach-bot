const {
  Resend
} = require("resend");
const nodemailer = require("nodemailer");
const {
  config
} = require("../config");
const {
  AppError
} = require("../lib/errors");
const {
  checkSending
} = require("./policy");
const escapeHTML = s => String(s).replace(/[&<>"']/g, c => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
})[c]);
function renderEmail(body) {
  return '<div style="font-family:Arial,sans-serif;line-height:1.7;color:#18243b;max-width:600px">' + escapeHTML(body).replace(/\n/g, "<br>") + '<hr><p style="font-size:12px;color:#64748b">GET Logistics LLC<br>' + escapeHTML(config.postalAddress) + "<br>To stop receiving messages, reply with unsubscribe.</p></div>";
}
async function sendMessage(message, contact, parent, dependencies = {}) {
  checkSending(config, contact);
  const domain = config.replyTo.split("@")[1];
  const rfcMessageId = "<get-" + message._id + "@" + domain + ">";
  const unsubscribe = "<mailto:" + config.replyTo + "?subject=unsubscribe>";
  const text = message.body + "\n\nGET Logistics LLC\n" + config.postalAddress + "\nTo stop receiving messages, reply with unsubscribe.";
  const headers = {
    "List-Unsubscribe": unsubscribe
  };
  if (parent?.rfcMessageId) {
    headers["In-Reply-To"] = parent.rfcMessageId;
    headers.References = parent.rfcMessageId;
  }
  if (config.provider === "resend") {
    const resend = dependencies.resend || new Resend(process.env.RESEND_API_KEY);
    const {
      data,
      error
    } = await resend.emails.send({
      from: config.sender,
      replyTo: config.replyTo,
      to: message.to,
      subject: message.subject,
      tags: [{ name: "workspace", value: "get-outreach-v2" }],
      text,
      html: renderEmail(message.body),
      headers: {
        ...headers,
        "Message-ID": rfcMessageId
      }
    }, {
      idempotencyKey: "message-" + message._id
    });
    if (error) {
      const failure = new AppError(502, error.message || "Email provider rejected this message.");
      failure.definitive = true;
      throw failure;
    }
    if (!data?.id) throw new Error("Email provider did not return a message ID.");
    return {
      providerId: data.id,
      // Resend replaces our supplied header. Its signed webhook supplies the real ID.
      rfcMessageId: null,
      rfcMessageIdVerified: false,
      sentFrom: config.sender
    };
  }
  const transport = dependencies.transport || nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    requireTLS: process.env.SMTP_SECURE !== "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000
  });
  const result = await transport.sendMail({
    from: config.sender,
    replyTo: config.replyTo,
    to: message.to,
    subject: message.subject,
    text,
    html: renderEmail(message.body),
    messageId: rfcMessageId,
    headers
  });
  if (!result.accepted?.length) {
    const failure = new AppError(502, "SMTP server rejected the recipient.");
    failure.definitive = true;
    throw failure;
  }
  return {
    providerId: result.messageId,
    rfcMessageId,
    rfcMessageIdVerified: true,
    sentFrom: config.sender
  };
}
module.exports = {
  sendMessage,
  renderEmail,
  escapeHTML,
  snapshotMessage: (message) => ({
    provider: config.provider,
    sentFrom: config.sender,
    rfcMessageId: "<get-" + message._id + "@" + config.replyTo.split("@")[1] + ">",
    renderedHtml: renderEmail(message.body),
    renderedText: message.body + "\n\nGET Logistics LLC\n" + config.postalAddress + "\nTo stop receiving messages, reply with unsubscribe.",
  })
};
