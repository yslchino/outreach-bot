const test = require("node:test");
const assert = require("node:assert/strict");
const XLSX = require("xlsx");
const {
  parseRows
} = require("../services/imports");
function spreadsheet(rows) {
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(rows), "Contacts");
  return XLSX.write(book, {
    type: "buffer",
    bookType: "xlsx"
  });
}
test("imports normalize and deduplicate addresses while reporting bad rows", () => {
  const result = parseRows(spreadsheet([{
    "Email Address": " PERSON@example.com ",
    "First Name": "Test",
    "Company Name": "Example"
  }, {
    "Email Address": "person@EXAMPLE.com"
  }, {
    "Email Address": "bad address"
  }]), "contacts.xlsx");
  assert.equal(result.contacts.length, 1);
  assert.equal(result.contacts[0].email, "person@example.com");
  assert.equal(result.contacts[0].name, "Test");
  assert.equal(result.duplicates, 1);
  assert.equal(result.errors.length, 1);
  assert.equal(result.errors[0].row, 4);
});
test("CSV supports simple headers; unsupported formats and oversized sheets fail", () => {
  const result = parseRows(Buffer.from("email,name,company\nperson@example.com,Test,Example"), "contacts.csv");
  assert.equal(result.contacts[0].company, "Example");
  assert.throws(() => parseRows(Buffer.from("x"), "file.exe"), /xlsx or .csv/);
  assert.throws(() => parseRows(spreadsheet(Array.from({
    length: 2001
  }, (_, i) => ({
    email: i + "@example.com"
  }))), "large.xlsx"), /2,000/);
});
test("categorized shipper headers preserve 1,200 contacts and their source locations", () => {
  const rows = Array.from({ length: 1200 }, (_, index) => ({
    Region: "West", State: index === 1199 ? "" : "wa", Company: "Example Shipper " + index,
    "First Name": "Contact", "Last Name": String(index), Email: "person" + index + "@example.invalid", Industry: "Manufacturing",
  }));
  const parsed = parseRows(spreadsheet(rows), "shippers.xlsx");
  assert.equal(parsed.totalRows, 1200);
  assert.equal(parsed.contacts.length, 1200);
  assert.equal(parsed.contacts[0].name, "Contact 0");
  assert.equal(parsed.contacts[0].company, "Example Shipper 0");
  assert.equal(parsed.contacts[0].state, "WA");
  assert.equal(parsed.contacts[0].region, "West");
  assert.equal(parsed.contacts[0].industry, "Manufacturing");
  assert.equal(parsed.contacts[1199].state, "");
  assert.equal(parsed.contacts[1199].sourceRow, 1201);
  assert.equal(parsed.columns.company, "Company");
});
test("ambiguous or missing email headers fail before importing; blank rows retain accurate row numbers", () => {
  assert.throws(() => parseRows(Buffer.from("Email,Email Address\na@example.invalid,b@example.invalid"), "ambiguous.csv"), /Multiple columns/);
  assert.throws(() => parseRows(Buffer.from("Company,Name\nExample,Test"), "missing.csv"), /Email/);
  const parsed = parseRows(Buffer.from("Email,Company\nvalid@example.invalid,Example\n,\nbad address,Another"), "rows.csv");
  assert.equal(parsed.errors[0].row, 4);
});
