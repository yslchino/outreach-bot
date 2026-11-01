// This suite never loads .env or connects to a configurable/remote database.
// It retains its uniquely named local test database for inspection; it never drops data.
const crypto = require("node:crypto");
process.env.JWT_SECRET = crypto.randomBytes(48).toString("hex");
process.env.SENDING_ENABLED = "false";
process.env.JOBS_ENABLED = "false";
process.env.AI_ENABLED = "false";
process.env.EMAIL_PROVIDER = "disabled";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { createApp } = require("../app");
const { config } = require("../config");
const User = require("../models/User");
const Contact = require("../models/Contact");
const Campaign = require("../models/Campaign");
const Message = require("../models/Message");
const Suppression = require("../models/Suppression");
const Usage = require("../models/Usage");
const Reservation = require("../models/OutreachReservation");
const ImportBatch = require("../models/ImportBatch");
const XLSX = require("xlsx");

test("isolated local MongoDB workflow, with no live email or AI provider", { timeout: 60000 }, async (t) => {
  const database = "outreach_v2_test_" + Date.now() + "_" + crypto.randomBytes(4).toString("hex");
  const uri = "mongodb://127.0.0.1:27018/" + database;
  assert.match(uri, /^mongodb:\/\/127\.0\.0\.1:27018\/outreach_v2_test_[0-9]+_[a-f0-9]+$/);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  t.after(() => mongoose.disconnect());
  await Promise.all([User, Contact, Campaign, Message, Suppression, Usage, Reservation, ImportBatch].map((model) => model.init()));
  const password = crypto.randomBytes(24).toString("base64url");
  await User.create({ username: "test-owner", displayName: "LOCAL TEST Owner", role: "admin",
    active: true, seat: 1, password: await bcrypt.hash(password, 12) });
  let server, base, token, operatorToken, viewerToken, viewerId, leads, firstCampaign, competingCampaign;
  const results = [];
  async function listen() {
    server = createApp().listen(0, "127.0.0.1");
    await new Promise((resolve) => server.once("listening", resolve));
    base = "http://127.0.0.1:" + server.address().port;
  }
  await listen();
  t.after(() => new Promise((resolve) => server.close(resolve)));
  async function request(route, { method = "GET", body, auth = token, expected = 200 } = {}) {
    const form = body instanceof FormData;
    const response = await fetch(base + "/api" + route, { method,
      headers: { ...(form ? {} : { "Content-Type": "application/json" }), ...(auth ? { Authorization: "Bearer " + auth } : {}) },
      body: body ? form ? body : JSON.stringify(body) : undefined });
    const result = await response.json();
    assert.equal(response.status, expected, method + " " + route + ": " + (result.error || "unexpected response"));
    return result;
  }
  async function check(name, fn) {
    await t.test(name, fn);
    results.push(name);
  }
  const csv = "email,name,company\n" +
    "alex@shipper.example.invalid,LOCAL TEST Alex,Test Shipper\n" +
    "morgan@shipper.example.invalid,LOCAL TEST Morgan,Test Shipper Two\n" +
    "ALEX@SHIPPER.EXAMPLE.INVALID,Duplicate,Duplicate\n" +
    "not-an-email,Invalid,Invalid\n";
  const importForm = () => {
    const form = new FormData();
    form.append("file", new Blob([csv], { type: "text/csv" }), "local-test-leads.csv");
    form.append("source", "LOCAL TEST FIXTURES — NOT REAL LEADS");
    form.append("audience", "shipper");
    return form;
  };
  await check("login, readiness, and disabled integration settings", async () => {
    const health = await fetch(base + "/health");
    assert.equal(health.status, 200);
    await request("/auth/register", { method: "POST", auth: null, body: {}, expected: 403 });
    const login = await request("/auth/login", { method: "POST", auth: null, body: { username: "test-owner", password } });
    token = login.token;
    assert.equal(login.user.role, "admin");
    const settings = await request("/settings");
    assert.equal(settings.sendingEnabled, false);
    assert.equal(settings.jobsEnabled, false);
    assert.equal(settings.aiEnabled, false);
  });
  await check("five-seat access with real database indexes", async () => {
    await request("/auth/users", { method: "POST", body: { username: "test-operator", displayName: "LOCAL TEST Operator", role: "operator", password }, expected: 201 });
    const viewer = await request("/auth/users", { method: "POST", body: { username: "test-viewer", displayName: "LOCAL TEST Viewer", role: "viewer", password }, expected: 201 });
    viewerId = viewer.id;
    operatorToken = (await request("/auth/login", { method: "POST", auth: null, body: { username: "test-operator", password } })).token;
    viewerToken = (await request("/auth/login", { method: "POST", auth: null, body: { username: "test-viewer", password } })).token;
    const competing = await Promise.all(Array.from({ length: 4 }, async (_, index) => {
      const response = await fetch(base + "/api/auth/users", { method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ username: "test-extra-" + index, displayName: "LOCAL TEST Extra " + index, role: "operator", password }) });
      return response.status;
    }));
    assert.equal(competing.filter((status) => status === 201).length, 2);
    assert.equal(competing.filter((status) => status === 409).length, 2);
    assert.equal(await User.countDocuments({ seat: { $exists: true } }), 5);
    await request("/contacts/import", { method: "POST", auth: viewerToken, body: importForm(), expected: 403 });
  });
  await check("CSV import, normalized duplicates, invalid rows, and persisted source", async () => {
    const preview = await request("/contacts/import/preview", { method: "POST", body: importForm(), expected: 201 });
    assert.equal(await Contact.countDocuments(), 0);
    const result = await request("/contacts/import/" + preview.id + "/confirm", { method: "POST", body: { confirmed: true } });
    assert.equal(result.created, 2); assert.equal(result.duplicates, 1); assert.equal(result.errors.length, 1);
    const repeatPreview = await request("/contacts/import/preview", { method: "POST", body: importForm(), expected: 201 });
    const repeat = await request("/contacts/import/" + repeatPreview.id + "/confirm", { method: "POST", body: { confirmed: true } });
    assert.equal(repeat.created, 0); assert.equal(repeat.existing, 2);
    leads = (await request("/contacts?status=new&audience=shipper")).items;
    assert.equal(leads.length, 2);
    assert.equal(leads[0].source, "LOCAL TEST FIXTURES — NOT REAL LEADS");
    for (const lead of leads) await request("/contacts/" + lead._id, { method: "PATCH",
      body: { permission: "opted_in", emailVerified: true } });
  });
  await check("draft creation, saved edits, permission boundaries, and disabled-send approval gate", async () => {
    const payload = { name: "LOCAL TEST Draft review", audience: "shipper", subject: "LOCAL TEST Introduction",
      context: "Local fixture only", contactIds: [leads[0]._id] };
    firstCampaign = await request("/campaigns", { method: "POST", body: payload, expected: 201 });
    competingCampaign = await request("/campaigns", { method: "POST",
      body: { ...payload, name: "LOCAL TEST Competing campaign" }, expected: 201 });
    const detail = await request("/campaigns/" + firstCampaign._id);
    assert.equal(detail.status, "draft"); assert.equal(detail.messages.length, 1);
    await request("/campaigns/" + firstCampaign._id + "/messages/" + detail.messages[0]._id, { method: "PATCH",
      body: { subject: "LOCAL TEST Edited subject", body: "LOCAL TEST body saved before approval." } });
    const saved = await request("/campaigns/" + firstCampaign._id);
    assert.equal(saved.messages[0].body, "LOCAL TEST body saved before approval.");
    await request("/campaigns/" + firstCampaign._id + "/launch", { method: "POST", auth: operatorToken,
      body: { confirmed: true }, expected: 403 });
    await request("/campaigns/" + firstCampaign._id + "/launch", { method: "POST",
      body: { confirmed: true }, expected: 409 });
    assert.equal((await Campaign.findById(firstCampaign._id)).status, "draft");
  });
  let accepted, fakeCalls = 0;
  await check("approved queue uses real persistence and a mocked provider; competing campaigns send once", async () => {
    // Only this isolated test process permits approval. The running development app stays disabled.
    Object.assign(config, { sendingEnabled: true, provider: "resend", sender: "LOCAL TEST <test@example.invalid>",
      replyTo: "test@example.invalid", postalAddress: "LOCAL TEST ADDRESS" });
    const mailer = require("../services/mailer");
    t.mock.method(mailer, "sendMessage", async (message) => {
      assert.equal(message.to.endsWith(".invalid"), true);
      fakeCalls++;
      return { providerId: "local-mock-" + message._id,
        rfcMessageId: "<get-" + message._id + "@example.invalid>", sentFrom: config.sender };
    });
    const { tick } = require("../services/worker");
    await request("/campaigns/" + firstCampaign._id + "/launch", { method: "POST", body: { confirmed: true } });
    await request("/campaigns/" + competingCampaign._id + "/launch", { method: "POST", body: { confirmed: true } });
    await tick();
    assert.equal(fakeCalls, 1);
    assert.equal(await Message.countDocuments({ status: "accepted" }), 1);
    assert.equal(await Message.countDocuments({ status: "skipped" }), 1);
    accepted = await Message.findOne({ status: "accepted" });
    assert.equal(accepted.renderedText.includes("LOCAL TEST ADDRESS"), true);
    assert.equal(accepted.deliveryStatus, "unknown");
    const history = await request("/contacts/" + leads[0]._id + "/history");
    assert.equal(history.messages.filter((message) => message.status === "accepted").length, 1);
    assert.equal(await Reservation.countDocuments(), 1);
  });
  await check("due follow-up drafts preserve initial content; a reply cancels queued follow-ups", async () => {
    const { tick } = require("../services/worker");
    await Message.updateOne({ _id: accepted._id }, { $set: { acceptedAt: new Date(Date.now() - 4 * 86400000) } });
    const originalBody = accepted.body;
    const followups = await request("/campaigns/" + accepted.campaign + "/followups", { method: "POST" });
    assert.equal(followups.created, 1);
    assert.equal((await Campaign.findById(accepted.campaign)).status, "draft");
    await request("/campaigns/" + accepted.campaign + "/followups", { method: "POST", expected: 409 });
    const details = await request("/campaigns/" + accepted.campaign);
    const followup = details.messages.find((message) => message.kind === "followup");
    assert.equal(followup.status, "draft");
    await request("/campaigns/" + accepted.campaign + "/launch", { method: "POST", body: { confirmed: true } });
    await request("/contacts/" + leads[0]._id, { method: "PATCH", body: { replied: true } });
    await tick();
    assert.equal((await Message.findById(followup._id)).status, "skipped");
    assert.equal((await Message.findById(accepted._id)).body, originalBody);
    assert.equal(fakeCalls, 1);
    await request("/suppressions", { method: "POST", body: { email: leads[0].email, reason: "opt_out" } });
    assert.equal(await Suppression.countDocuments(), 1);
  });
  await check("interrupted processing becomes uncertain and manual reconciliation never retries", async () => {
    const interruptedCampaign = await Campaign.create({ name: "LOCAL TEST Interrupted send", subject: "LOCAL TEST",
      audience: "shipper", status: "queued", createdBy: (await User.findOne({ seat: 1 }))._id });
    const interrupted = await Message.create({ campaign: interruptedCampaign._id, contact: leads[1]._id, to: leads[1].email,
      kind: "initial", subject: "LOCAL TEST", body: "LOCAL TEST interrupted attempt", status: "processing",
      startedAt: new Date(Date.now() - 3 * 60000) });
    await require("../services/worker").tick();
    assert.equal((await Message.findById(interrupted._id)).status, "uncertain");
    await request("/messages/" + interrupted._id + "/resolve", { method: "POST",
      body: { outcome: "not_sent", note: "LOCAL TEST: mock provider confirms no delivery occurred." } });
    assert.equal((await Message.findById(interrupted._id)).status, "failed");
    assert.equal(fakeCalls, 1);
    Object.assign(config, { sendingEnabled: false, provider: "disabled" });
  });
  await check("disabling a user revokes an already issued session", async () => {
    await request("/auth/users/" + viewerId, { method: "PATCH", body: { active: false } });
    await request("/overview", { auth: viewerToken, expected: 401 });
  });
  await check("workspace survives a fresh HTTP app instance and remains in draft mode", async () => {
    await new Promise((resolve) => server.close(resolve));
    await listen();
    const overview = await request("/overview");
    assert.equal(overview.leads, 2);
    assert.equal(overview.accepted, 1);
    assert.equal((await request("/settings")).sendingEnabled, false);
    assert.equal((await request("/auth/users")).length, 5);
  });
  await check("1,200-row geographic import previews before saving and preserves verification without opt-in", async () => {
    const owner = await User.findOne({ seat: 1 });
    const legacy = await Contact.create({ name: "LOCAL TEST Legacy", email: "LEGACY@example.invalid", company: "Original company" });
    await Suppression.create({ email: "suppressed@example.invalid", reason: "manual" });
    const fixtureRows = Array.from({ length: 1200 }, (_, index) => ({
      Region: index === 1199 ? "Other" : "West", State: index === 1199 ? "" : index < 600 ? "WA" : "OR",
      Company: "Local fixture company " + index, "First Name": "LOCAL TEST Geography", "Last Name": String(index),
      Email: "geography" + index + "@example.invalid", Industry: index < 1000 ? "Manufacturing" : "Transportation",
    }));
    fixtureRows.push({ Region: "West", State: "WA", Company: "Do not overwrite", "First Name": "Legacy",
      "Last Name": "Record", Email: "legacy@example.invalid", Industry: "Retail" });
    fixtureRows.push({ Region: "West", State: "WA", Company: "Suppressed fixture", "First Name": "Suppressed",
      "Last Name": "Contact", Email: "suppressed@example.invalid", Industry: "Retail" });
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(fixtureRows), "Shippers");
    const file = XLSX.write(book, { type: "buffer", bookType: "xlsx" });
    const form = new FormData();
    form.append("file", new Blob([file]), "geographic-fixtures.xlsx");
    form.append("source", "LOCAL TEST geographic import");
    form.append("audience", "shipper"); form.append("permission", "business_contact"); form.append("verified", "true");
    const before = await Contact.countDocuments();
    const preview = await request("/contacts/import/preview", { method: "POST", body: form, expected: 201 });
    assert.equal(await Contact.countDocuments(), before);
    assert.equal(preview.summary.newContacts, 1200);
    assert.equal(preview.summary.existing, 1); assert.equal(preview.summary.suppressed, 1);
    assert.equal(preview.summary.missingState, 1);
    assert.equal(preview.summary.columns.company, "Company");
    const later = await request("/contacts/import/" + preview.id + "?page=24");
    assert.equal(later.items.length, 50);
    await request("/contacts/import/" + preview.id + "/confirm", { method: "POST", auth: operatorToken, body: { confirmed: true }, expected: 404 });
    const saved = await request("/contacts/import/" + preview.id + "/confirm", { method: "POST", body: { confirmed: true } });
    assert.equal(saved.created, 1200); assert.equal(saved.existing, 1); assert.equal(saved.suppressed, 1);
    const repeated = await request("/contacts/import/" + preview.id + "/confirm", { method: "POST", body: { confirmed: true } });
    assert.equal(repeated.created, 1200);
    assert.equal(await Contact.countDocuments(), before + 1200);
    const lead = await Contact.findOne({ email: "geography0@example.invalid" });
    assert.equal(lead.company, "Local fixture company 0"); assert.equal(lead.region, "West"); assert.equal(lead.state, "WA");
    assert.equal(lead.emailVerified, true); assert.equal(lead.verificationMethod, "user_reported");
    assert.equal(String(lead.verifiedBy), String(owner._id)); assert.equal(lead.permission, "business_contact");
    assert.equal(lead.sourceFile, "geographic-fixtures.xlsx"); assert.equal(lead.sourceRow, 2);
    assert.equal((await Contact.findById(legacy._id)).company, "Original company");
    assert.equal(await Contact.countDocuments({ email: "suppressed@example.invalid" }), 0);
    const filtered = await request("/contacts?region=West&state=WA&industry=Manufacturing");
    assert.equal(filtered.total, 600);
    assert.equal(filtered.items.every((contact) => contact.state === "WA" && contact.region === "West"), true);
    const missing = await request("/contacts?region=Other&state=__missing__&q=Geography");
    assert.equal(missing.total, 1);
    const facets = await request("/contacts/facets");
    assert.equal(facets.regions.includes("West"), true); assert.deepEqual(facets.statesByRegion.West, ["OR", "WA"]);
    const batch = await ImportBatch.findById(preview.id);
    assert.equal(batch.status, "completed"); assert.equal(batch.contacts.length, 0);
    const unverified = await request("/contacts/" + lead._id, { method: "PATCH", body: { emailVerified: false } });
    assert.equal(unverified.emailVerified, false);
    assert.equal(unverified.verificationMethod, null);
    assert.equal(unverified.verifiedBy, null);
  });
  const output = path.resolve(__dirname, "../../.local/integration-result.json");
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify({ completedAt: new Date().toISOString(), database,
    scenarios: results, provider: "mock only", externalEmailsSent: 0, productionTouched: false }, null, 2));
});
