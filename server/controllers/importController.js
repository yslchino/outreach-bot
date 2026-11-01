const crypto = require("node:crypto");
const Contact = require("../models/Contact");
const ImportBatch = require("../models/ImportBatch");
const Suppression = require("../models/Suppression");
const { parseUpload } = require("../services/importWorker");
const { assert } = require("../lib/errors");
const v = require("../lib/validation");
const emailKey = (value) => value.trim().toLowerCase();

async function classify(contacts, batchId) {
  const emails = contacts.map((contact) => contact.email);
  const [existing, suppressed] = await Promise.all([
    Contact.find({ email: { $in: emails } }).collation({ locale: "en", strength: 2 }).select("email importBatch").lean(),
    Suppression.find({ email: { $in: emails } }).select("email").lean(),
  ]);
  const existingMap = new Map(existing.map((contact) => [emailKey(contact.email), contact]));
  const suppressedSet = new Set(suppressed.map((entry) => emailKey(entry.email)));
  return contacts.map((contact) => {
    const previous = existingMap.get(contact.email);
    const disposition = previous && String(previous.importBatch) === String(batchId) ? "imported" :
      previous ? "existing" : suppressedSet.has(contact.email) ? "suppressed" : "new";
    return { ...contact, disposition };
  });
}
function previewResponse(batch, rows, page = 1) {
  const items = rows.slice((page - 1) * 50, page * 50);
  const summary = { ...batch.summary,
    newContacts: rows.filter((row) => row.disposition === "new").length,
    existing: rows.filter((row) => row.disposition === "existing").length,
    suppressed: rows.filter((row) => row.disposition === "suppressed").length,
  };
  return { id: batch._id, status: batch.status, source: batch.source, filename: batch.filename,
    sheetName: batch.sheetName, audience: batch.audience, permission: batch.permission, verified: batch.verified,
    summary, result: batch.result, items, total: rows.length, page, pages: Math.max(1, Math.ceil(rows.length / 50)) };
}
async function preview(req, res) {
  assert(req.file, 400, "Select a spreadsheet or CSV.");
  const source = v.text(req.body.source, "Lead source", 300);
  assert(["shipper", "carrier"].includes(req.body.audience), 400, "Choose shipper or carrier.");
  const permission = req.body.permission || "unknown";
  assert(["unknown", "business_contact", "opted_in"].includes(permission), 400, "Choose a contact classification.");
  assert([undefined, "true", "false"].includes(req.body.verified), 400, "Verification must be true or false.");
  const parsed = await parseUpload(req.file.buffer, req.file.originalname);
  const batch = await ImportBatch.create({
    createdBy: req.user._id, source, filename: v.text(req.file.originalname, "Filename", 255),
    fileHash: crypto.createHash("sha256").update(req.file.buffer).digest("hex"),
    sheetName: parsed.sheetName, audience: req.body.audience, permission,
    verified: req.body.verified === "true", contacts: parsed.contacts,
    summary: { totalRows: parsed.totalRows, validContacts: parsed.contacts.length, duplicates: parsed.duplicates,
      errors: parsed.errors, columns: parsed.columns, sheetCount: parsed.sheetCount,
      missingState: parsed.contacts.filter((contact) => !contact.state).length,
      transportation: parsed.contacts.filter((contact) => contact.industry.toLowerCase() === "transportation").length },
    expiresAt: new Date(Date.now() + 24 * 60 * 60000),
  });
  res.status(201).json(previewResponse(batch, await classify(parsed.contacts, batch._id)));
}
async function getPreview(req, res) {
  const batch = await ImportBatch.findOne({ _id: v.id(req.params.id), createdBy: req.user._id });
  assert(batch, 404, "Import preview not found or expired.");
  if (batch.status === "completed") return res.json({ id: batch._id, status: batch.status, result: batch.result });
  const page = Math.max(1, Math.trunc(Number(req.query.page)) || 1);
  res.json(previewResponse(batch, await classify(batch.contacts.map((contact) => contact.toObject()), batch._id), page));
}
async function confirm(req, res) {
  assert(req.body.confirmed === true, 400, "Confirm the import preview first.");
  const id = v.id(req.params.id);
  const previous = await ImportBatch.findOne({ _id: id, createdBy: req.user._id });
  assert(previous, 404, "Import preview not found or expired.");
  if (previous.status === "completed") return res.json(previous.result);
  const leaseToken = crypto.randomUUID();
  const batch = await ImportBatch.findOneAndUpdate({ _id: id, createdBy: req.user._id,
    $or: [{ status: "preview" }, { status: "importing", leaseUntil: { $lt: new Date() } }] },
    { $set: { status: "importing", leaseToken, leaseUntil: new Date(Date.now() + 3 * 60000) } },
    { returnDocument: "after" });
  assert(batch, 409, "This import is already running. Refresh its status before retrying.");
  try {
    const rows = await classify(batch.contacts.map((contact) => contact.toObject()), batch._id);
    const candidates = rows.filter((contact) => contact.disposition === "new");
    for (let offset = 0; offset < candidates.length; offset += 500) {
      await ImportBatch.updateOne({ _id: id, leaseToken }, { $set: { leaseUntil: new Date(Date.now() + 3 * 60000) } });
      const operations = candidates.slice(offset, offset + 500).map(({ disposition, ...contact }) => ({
        updateOne: { filter: { email: contact.email }, update: { $setOnInsert: {
          ...contact, source: batch.source, sourceFile: batch.filename, sourceSheet: batch.sheetName,
          importBatch: batch._id, audience: batch.audience, permission: batch.permission,
          emailVerified: batch.verified,
          ...(batch.verified ? { verifiedAt: new Date(), verifiedBy: batch.createdBy, verificationMethod: "user_reported" } : {}),
          status: "pending", replied: false, followUpSent: false,
          createdAt: new Date(), updatedAt: new Date(),
          createdBy: req.user._id, updatedBy: req.user._id,
        } }, upsert: true, timestamps: false },
      }));
      try { if (operations.length) await Contact.bulkWrite(operations, { ordered: false }); }
      catch (err) {
        if (!err.writeErrors?.length || err.writeErrors.some((error) => error.code !== 11000)) throw err;
      }
    }
    const created = await Contact.countDocuments({ importBatch: batch._id });
    const result = { created, existing: batch.summary.validContacts - created - rows.filter((row) => row.disposition === "suppressed").length,
      suppressed: rows.filter((row) => row.disposition === "suppressed").length,
      duplicates: batch.summary.duplicates, errors: batch.summary.errors, batchId: batch._id };
    await ImportBatch.updateOne({ _id: id, leaseToken }, { $set: { status: "completed", result, completedAt: new Date() },
      $unset: { contacts: "", leaseToken: "", leaseUntil: "", expiresAt: "" } });
    res.json(result);
  } catch (err) {
    // A retry rechecks normalized emails and only inserts missing records.
    await ImportBatch.updateOne({ _id: id, leaseToken }, { $set: { status: "preview" }, $unset: { leaseToken: "", leaseUntil: "" } });
    throw err;
  }
}
module.exports = { preview, getPreview, confirm };
