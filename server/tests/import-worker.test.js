const test = require("node:test");
const assert = require("node:assert/strict");
const { parseUpload } = require("../services/importWorker");
test("isolated importer returns validated data and handles invalid uploads", async () => {
  const result = await parseUpload(Buffer.from("email,name\ntest@example.com,Test"), "test.csv");
  assert.equal(result.contacts[0].email, "test@example.com");
  await assert.rejects(parseUpload(Buffer.from("x"), "unsafe.exe"), /xlsx or .csv/);
});
