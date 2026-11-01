const Contact = require("../models/Contact");
const Campaign = require("../models/Campaign");
const Message = require("../models/Message");
const Suppression = require("../models/Suppression");
const Usage = require("../models/Usage");
const {
  config
} = require("../config");
const {
  assert
} = require("../lib/errors");
const v = require("../lib/validation");
const {
  dayKey
} = require("../services/policy");
const { contactQuery } = require("../services/contactFilters");
async function overview(req, res) {
  const [leads, campaigns, accepted, replies, drafts, uncertain, suppressed, sendUsage, aiUsage, recent] = await Promise.all([Contact.countDocuments(), Campaign.countDocuments(), Message.countDocuments({
    status: "accepted"
  }), Contact.countDocuments({
    replied: true
  }), Message.countDocuments({
    status: "draft"
  }), Message.countDocuments({
    status: "uncertain"
  }), Suppression.countDocuments(), Usage.findById("send:" + dayKey(new Date(), config.timezone)), Usage.findById("ai:" + new Date().toISOString().slice(0, 7)), Message.find().sort({
    updatedAt: -1
  }).limit(8).lean()]);
  res.json({
    leads,
    campaigns,
    accepted,
    replies,
    drafts,
    uncertain,
    suppressed,
    dailyUsed: sendUsage?.count || 0,
    dailyLimit: config.dailyLimit,
    aiUsed: aiUsage?.count || 0,
    aiLimit: config.monthlyAiLimit,
    recent
  });
}
async function settings(req, res) {
  res.json({
    sendingEnabled: config.sendingEnabled,
    jobsEnabled: config.jobsEnabled,
    provider: config.provider,
    sender: config.sender,
    replyTo: config.replyTo,
    timezone: config.timezone,
    dailyLimit: config.dailyLimit,
    aiEnabled: config.aiEnabled,
    aiLimit: config.monthlyAiLimit,
    budgetTarget: 50,
    gmailConfigured: Boolean(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN),
    providerConfigured: config.provider === "resend" ? Boolean(process.env.RESEND_API_KEY) : config.provider === "smtp" ? Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) : false,
    postalAddressConfigured: Boolean(config.postalAddress)
  });
}
async function listContacts(req, res) {
  const page = Math.max(1, Math.min(10000, Math.trunc(Number(req.query.page)) || 1));
  const query = contactQuery(req.query);
  const [items, total] = await Promise.all([Contact.find(query).sort({
    createdAt: -1
  }).skip((page - 1) * 50).limit(50).lean(), Contact.countDocuments(query)]);
  res.json({
    items,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / 50))
  });
}
async function contactFacets(req, res) {
  const combinations = await Contact.aggregate([{ $group: { _id: {
    region: { $ifNull: ["$region", ""] }, state: { $ifNull: ["$state", ""] }, industry: { $ifNull: ["$industry", ""] },
  } } }]);
  const regions = new Set(), states = new Set(), industries = new Set(), regionStates = new Map();
  for (const { _id: row } of combinations) {
    if (row.region) regions.add(row.region);
    if (row.state) states.add(row.state);
    if (row.industry) industries.add(row.industry);
    if (!regionStates.has(row.region)) regionStates.set(row.region, new Set());
    if (row.state) regionStates.get(row.region).add(row.state);
  }
  res.json({ regions: [...regions].sort(), states: [...states].sort(), industries: [...industries].sort(),
    statesByRegion: Object.fromEntries([...regionStates].map(([region, values]) => [region, [...values].sort()])) });
}
async function updateContact(req, res) {
  const changes = {
    updatedBy: req.user._id
  };
  for (const field of ["name", "company", "source", "title", "city", "state", "region", "industry"]) {
    if (req.body[field] !== undefined) changes[field] = v.text(req.body[field], field, 300, field === "name");
  }
  if (req.body.permission !== undefined) {
    assert(["unknown", "opted_in", "business_contact"].includes(req.body.permission), 400, "Invalid recipient permission.");
    changes.permission = req.body.permission;
  }
  if (req.body.emailVerified !== undefined) {
    assert(typeof req.body.emailVerified === "boolean", 400, "Verification must be true or false.");
    changes.emailVerified = req.body.emailVerified;
    changes.verifiedAt = req.body.emailVerified ? new Date() : null;
    changes.verifiedBy = req.body.emailVerified ? req.user._id : null;
    changes.verificationMethod = req.body.emailVerified ? "user_reported" : null;
  }
  if (req.body.replied === true) {
    changes.replied = true;
    changes.repliedAt = new Date();
  }
  const contact = await Contact.findByIdAndUpdate(v.id(req.params.id), {
    $set: changes
  }, {
    returnDocument: "after",
    runValidators: true
  });
  assert(contact, 404, "Lead not found.");
  if (changes.replied) await Message.updateMany({
    contact: contact._id,
    status: {
      $in: ["draft", "queued"]
    }
  }, {
    $set: {
      status: "skipped",
      error: "Recipient replied."
    }
  });
  res.json(contact);
}
async function contactHistory(req, res) {
  const contact = await Contact.findById(v.id(req.params.id)).lean();
  assert(contact, 404, "Lead not found.");
  const messages = await Message.find({
    contact: contact._id
  }).sort({
    createdAt: -1
  }).lean();
  const suppression = await Suppression.findOne({
    email: contact.email.toLowerCase().trim()
  }).lean();
  // Legacy bodies are exposed as historical evidence, never rewritten or queued.
  const legacy = [];
  if (contact.emailBody) legacy.push({
    _id: "legacy-initial",
    kind: "initial",
    subject: contact.subject,
    body: contact.emailBody,
    acceptedAt: contact.sentAt,
    status: "legacy",
    to: contact.email
  });
  if (contact.followUpBody) legacy.push({
    _id: "legacy-followup",
    kind: "followup",
    subject: contact.followUpSubject,
    body: contact.followUpBody,
    acceptedAt: contact.followUpSentAt,
    status: "legacy",
    to: contact.email
  });
  res.json({
    contact,
    messages: [...messages, ...legacy],
    suppression
  });
}
async function addSuppression(req, res) {
  const email = v.email(req.body.email);
  const reason = req.body.reason || "manual";
  assert(["manual", "opt_out", "bounce", "complaint"].includes(reason), 400, "Invalid suppression reason.");
  await Suppression.findOneAndUpdate({
    email
  }, {
    $setOnInsert: {
      reason,
      addedBy: req.user._id
    }
  }, {
    upsert: true,
    runValidators: true
  });
  await Contact.updateMany({
    email: new RegExp("^" + v.escapeRegex(email) + "$", "i")
  }, {
    $set: {
      status: "suppressed"
    }
  });
  await Message.updateMany({
    to: email,
    status: {
      $in: ["draft", "queued"]
    }
  }, {
    $set: {
      status: "skipped",
      error: "Recipient suppressed."
    }
  });
  res.json({
    success: true
  });
}
async function listMessages(req, res) {
  const page = Math.max(1, Math.min(10000, Math.trunc(Number(req.query.page)) || 1));
  const query = {};
  if (req.query.status) {
    assert(["draft", "queued", "processing", "accepted", "failed", "uncertain", "skipped"].includes(req.query.status), 400, "Invalid message status.");
    query.status = req.query.status;
  }
  const [items, total] = await Promise.all([Message.find(query).sort({
    updatedAt: -1
  }).skip((page - 1) * 50).limit(50).lean(), Message.countDocuments(query)]);
  res.json({
    items,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / 50))
  });
}
async function resolveMessage(req, res) {
  assert(["accepted", "not_sent"].includes(req.body.outcome), 400, "Choose a verified provider outcome.");
  const note = v.text(req.body.note, "Reconciliation evidence", 1000);
  assert(note.length >= 10, 400, "Record at least 10 characters of reconciliation evidence.");
  const changes = {
    reconciliationNote: note,
    reconciledBy: req.user._id,
    reconciledAt: new Date(),
    status: req.body.outcome === "accepted" ? "accepted" : "failed",
    error: ""
  };
  if (changes.status === "accepted") {
    changes.providerId = v.text(req.body.providerId, "Provider ID", 300);
    changes.acceptedAt = new Date(req.body.acceptedAt);
    assert(Number.isFinite(changes.acceptedAt.getTime()) && changes.acceptedAt.getTime() <= Date.now(), 400,
      "Enter the acceptance time shown in provider records.");
  }
  const message = await Message.findOneAndUpdate({
    _id: v.id(req.params.id),
    status: "uncertain"
  }, {
    $set: changes
  }, {
    returnDocument: "after",
    runValidators: true
  });
  assert(message, 409, "Only an uncertain message can be reconciled.");
  if (message.status === "accepted") {
    await Contact.updateOne({
      _id: message.contact,
      status: { $ne: "suppressed" }
    }, {
      $set: {
        status: "sent",
        ...(message.kind === "initial" ? { sentAt: message.acceptedAt } : {})
      }
    });
  }
  res.json(message);
}
module.exports = {
  overview,
  settings,
  listContacts,
  contactFacets,
  updateContact,
  contactHistory,
  addSuppression,
  listMessages,
  resolveMessage
};
