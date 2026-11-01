const Campaign = require("../models/Campaign");
const Contact = require("../models/Contact");
const Message = require("../models/Message");
const Suppression = require("../models/Suppression");
const {
  assert
} = require("../lib/errors");
const v = require("../lib/validation");
const {
  config
} = require("../config");
const {
  checkSending
} = require("../services/policy");
const {
  generateDraft
} = require("../services/ai");
const summary = async campaign => {
  const groups = await Message.aggregate([{
    $match: {
      campaign: campaign._id
    }
  }, {
    $group: {
      _id: "$status",
      count: {
        $sum: 1
      }
    }
  }]);
  return {
    ...campaign.toObject(),
    counts: Object.fromEntries(groups.map(g => [g._id, g.count])),
    total: groups.reduce((sum, g) => sum + g.count, 0)
  };
};
async function list(req, res) {
  const campaigns = await Campaign.find().sort({
    createdAt: -1
  }).limit(100);
  res.json(await Promise.all(campaigns.map(summary)));
}
async function detail(req, res) {
  const campaign = await Campaign.findById(v.id(req.params.id));
  assert(campaign, 404, "Campaign not found.");
  res.json({
    ...(await summary(campaign)),
    messages: await Message.find({
      campaign: campaign._id
    }).sort({
      createdAt: 1
    }).lean()
  });
}
function initialDraft(contact, audience) {
  return "Hi " + (contact.name || "there") + ",\n\n" + (audience === "shipper" ? "I'm reaching out from GET Logistics LLC about your freight transportation needs. " + "Could we connect about your upcoming shipments and where a freight brokerage partner might help?" : "I'm reaching out from GET Logistics LLC to learn about your equipment, preferred lanes, and availability. " + "Could we connect about potential carrier partnerships?") + "\n\nIf someone else handles this at " + (contact.company || "your company") + ", I'd appreciate a referral.\n\nBest regards,\nGET Logistics LLC";
}
async function create(req, res) {
  const name = v.text(req.body.name, "Campaign name", 120);
  const subject = v.text(req.body.subject, "Subject", 200);
  assert(!/[\r\n]/.test(subject), 400, "Subject must be one line.");
  const context = v.text(req.body.context, "Context", 2000, false);
  assert(["shipper", "carrier"].includes(req.body.audience), 400, "Choose an audience.");
  assert(Array.isArray(req.body.contactIds) && req.body.contactIds.length > 0 && req.body.contactIds.length <= 100, 400, "Select between 1 and 100 leads.");
  const ids = [...new Set(req.body.contactIds.map(v.id))];
  const contacts = await Contact.find({
    _id: {
      $in: ids
    }
  });
  assert(contacts.length === ids.length, 400, "Some selected leads no longer exist.");
  const suppressed = new Set((await Suppression.find({
    email: {
      $in: contacts.map(c => c.email.toLowerCase().trim())
    }
  })).map(s => s.email));
  assert(contacts.every(c => c.audience === req.body.audience && !c.replied && c.status === "pending" && !c.outreachCampaign && !suppressed.has(c.email.toLowerCase().trim())), 409, "Choose new, unsuppressed leads from the selected audience.");
  const campaign = await Campaign.create({
    name,
    subject,
    context,
    audience: req.body.audience,
    createdBy: req.user._id,
    status: "editing"
  });
  await Message.insertMany(contacts.map(contact => ({
    campaign: campaign._id,
    contact: contact._id,
    to: v.email(contact.email),
    recipientName: contact.name,
    company: contact.company,
    subject,
    body: initialDraft(contact, req.body.audience)
  })));
  campaign.status = "draft";
  await campaign.save();
  res.status(201).json(await summary(campaign));
}
// A draft lock prevents an edit or AI response from changing approved content mid-launch.
async function withDraft(campaignId, operation) {
  const campaign = await Campaign.findOneAndUpdate({
    _id: campaignId,
    status: "draft"
  }, {
    $set: {
      status: "editing"
    }
  }, {
    returnDocument: "after"
  });
  assert(campaign, 409, "Campaign is busy or already approved.");
  try {
    return await operation(campaign);
  } finally {
    const queued = await Message.exists({ campaign: campaignId, status: "queued" });
    await Campaign.updateOne({
      _id: campaignId,
      status: "editing"
    }, {
      $set: {
        status: queued ? "paused" : "draft"
      }
    });
  }
}
async function editMessage(req, res) {
  const result = await withDraft(v.id(req.params.id), async campaign => {
    const subject = v.text(req.body.subject, "Subject", 200);
    assert(!/[\r\n]/.test(subject), 400, "Subject must be one line.");
    const message = await Message.findOneAndUpdate({
      _id: v.id(req.params.messageId),
      campaign: campaign._id,
      status: "draft"
    }, {
      $set: {
        subject,
        body: v.text(req.body.body, "Email body", 12000)
      }
    }, {
      returnDocument: "after",
      runValidators: true
    });
    assert(message, 404, "Editable draft not found.");
    return message;
  });
  res.json(result);
}
async function generate(req, res) {
  res.json(await withDraft(v.id(req.params.id), async campaign => {
    const message = await Message.findOne({
      _id: v.id(req.params.messageId),
      campaign: campaign._id,
      status: "draft"
    });
    assert(message, 404, "Editable draft not found.");
    const contact = await Contact.findById(message.contact);
    assert(contact, 404, "Lead not found.");
    message.body = await generateDraft(contact, campaign);
    await message.save();
    return message;
  }));
}
async function launch(req, res) {
  const campaignId = v.id(req.params.id);
  assert(req.body.confirmed === true, 400, "Review and confirm the campaign first.");
  // Validation happens under the same lock used for editing.
  await withDraft(campaignId, async campaign => {
    const messages = await Message.find({
      campaign: campaign._id,
      status: "draft"
    });
    assert(messages.length > 0, 409, "No drafts to approve.");
    for (const message of messages) {
      const contact = await Contact.findById(message.contact);
      checkSending(config, contact);
      assert(!(await Suppression.exists({
        email: message.to
      })), 409, "A recipient is suppressed.");
      assert(message.body && message.subject, 400, "Every message needs a subject and body.");
    }
    // Only after every draft passes validation do messages enter the durable queue.
    await Message.updateMany({
      campaign: campaign._id,
      status: "draft"
    }, {
      $set: {
        status: "queued",
        approvedBy: req.user._id,
        approvedAt: new Date()
      }
    });
    await Campaign.updateOne({
      _id: campaign._id,
      status: "editing"
    }, {
      $set: {
        status: "queued",
        approvedBy: req.user._id,
        approvedAt: new Date()
      }
    });
  });
  res.json({
    success: true
  });
}
async function action(req, res) {
  const id = v.id(req.params.id);
  const action = req.body.action;
  assert(["pause", "resume"].includes(action), 400, "Unknown campaign action.");
  if (action === "resume") assert(config.sendingEnabled, 409, "Sending is disabled.");
  const campaign = await Campaign.findOneAndUpdate({
    _id: id,
    status: {
      $in: action === "pause" ? ["queued", "running"] : ["paused"]
    }
  }, {
    $set: {
      status: action === "pause" ? "paused" : "queued",
      pausedAt: action === "pause" ? new Date() : null
    }
  }, {
    returnDocument: "after"
  });
  assert(campaign, 409, "Campaign cannot perform that action in its current state.");
  res.json(campaign);
}
async function prepareFollowups(req, res) {
  const campaign = await Campaign.findOneAndUpdate({
    _id: v.id(req.params.id),
    status: "completed"
  }, {
    $set: {
      status: "editing"
    }
  }, {
    returnDocument: "after"
  });
  assert(campaign, 409, "Complete initial sending before preparing follow-ups.");
  let created = 0;
  try {
    const cutoff = new Date(Date.now() - campaign.followUpDays * 86400000);
    const parents = await Message.find({
      campaign: campaign._id,
      kind: "initial",
      status: "accepted",
      acceptedAt: {
        $lte: cutoff
      },
      deliveryStatus: {
        $nin: ["bounced", "complained"]
      }
    });
    for (const parent of parents) {
      const contact = await Contact.findById(parent.contact);
      if (!contact || contact.replied || (await Suppression.exists({
        email: parent.to
      }))) continue;
      try {
        await Message.create({
          campaign: campaign._id,
          contact: parent.contact,
          parent: parent._id,
          kind: "followup",
          to: parent.to,
          recipientName: parent.recipientName,
          company: parent.company,
          subject: "Re: " + parent.subject,
          body: "Hi " + (parent.recipientName || "there") + ",\n\nFollowing up on my note about GET Logistics LLC. " + "Would a quick conversation about your " + (campaign.audience === "shipper" ? "shipping needs" : "preferred lanes") + " be useful? If the timing isn't right, just let me know.\n\nBest regards,\nGET Logistics LLC"
        });
        created++;
      } catch (err) {
        if (err.code !== 11000) throw err;
      }
    }
  } finally {
    const hasDrafts = await Message.exists({
      campaign: campaign._id,
      status: "draft"
    });
    await Campaign.updateOne({
      _id: campaign._id,
      status: "editing"
    }, {
      $set: {
        status: hasDrafts ? "draft" : "completed"
      }
    });
  }
  res.json({ created });
}
module.exports = {
  list,
  detail,
  create,
  editMessage,
  generate,
  launch,
  action,
  prepareFollowups,
  withDraft
};
