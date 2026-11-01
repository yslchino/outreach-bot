const XLSX = require("xlsx");
const v = require("../lib/validation");
const { assert } = require("../lib/errors");

const MAX_IMPORT_ROWS = 2000;
const aliases = {
  email: ["email address", "email", "e-mail", "e-mail address"],
  name: ["name", "full name", "contact name"],
  firstName: ["first name", "firstname"],
  lastName: ["last name", "lastname"],
  company: ["company name", "company"],
  title: ["job title", "title"],
  city: ["person city", "city"],
  state: ["person state", "state"],
  region: ["region"],
  industry: ["primary industry", "industry"],
};
const headerKey = (value) => String(value ?? "").replace(/^\uFEFF/, "").trim().toLowerCase().replace(/\s+/g, " ");

function parseRows(buffer, filename) {
  assert(/\.(xlsx|csv)$/i.test(filename), 400, "Upload an .xlsx or .csv file.");
  const book = XLSX.read(buffer, { type: "buffer", sheetRows: MAX_IMPORT_ROWS + 2, dense: true });
  assert(book.SheetNames.length > 0, 400, "The file has no worksheets.");
  const sheetName = book.SheetNames[0];
  const sheet = book.Sheets[sheetName];
  // Refuse out-of-bounds worksheets rather than silently truncating later records.
  const reference = sheet["!fullref"] || sheet["!ref"];
  assert(!reference || XLSX.utils.decode_range(reference).e.r <= MAX_IMPORT_ROWS, 400,
    "Import at most 2,000 worksheet data rows at a time.");
  const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", blankrows: true });
  assert(grid.length && grid[0].some((value) => headerKey(value)), 400, "The first row must contain column headers.");
  const headers = grid[0].map((value) => String(value).trim());
  const mapped = {};
  for (const [field, names] of Object.entries(aliases)) {
    const matches = headers.map((name, index) => names.includes(headerKey(name)) ? index : -1).filter((index) => index >= 0);
    assert(matches.length <= 1, 400, "Multiple columns map to " + field + ". Keep one source column for this field.");
    if (matches.length) mapped[field] = matches[0];
  }
  assert(mapped.email !== undefined, 400, "Add an Email or Email Address column.");
  const contacts = [], errors = [], seen = new Set();
  let duplicates = 0, totalRows = 0;
  for (let index = 1; index < grid.length; index++) {
    const row = grid[index];
    if (!row.some((value) => String(value ?? "").trim())) continue;
    totalRows++;
    const field = (name) => mapped[name] === undefined ? "" : row[mapped[name]];
    try {
      const address = v.email(field("email"));
      const contact = {
        email: address,
        name: v.text(field("name") || [field("firstName"), field("lastName")].filter(Boolean).join(" ") || address.split("@")[0], "Name", 120),
        company: v.text(field("company"), "Company", 200, false),
        title: v.text(field("title"), "Title", 120, false),
        city: v.text(field("city"), "City", 120, false),
        state: v.text(field("state"), "State", 120, false).toUpperCase(),
        region: v.text(field("region"), "Region", 120, false),
        industry: v.text(field("industry"), "Industry", 200, false),
        sourceRow: index + 1,
      };
      if (seen.has(address)) { duplicates++; continue; }
      seen.add(address);
      contacts.push(contact);
    } catch (err) { errors.push({ row: index + 1, error: err.message }); }
  }
  assert(totalRows <= MAX_IMPORT_ROWS, 400, "Import at most 2,000 rows at a time.");
  return { contacts, errors, duplicates, totalRows, sheetName, sheetCount: book.SheetNames.length,
    columns: Object.fromEntries(Object.entries(mapped).map(([field, index]) => [field, headers[index]])) };
}
module.exports = { parseRows, MAX_IMPORT_ROWS };
