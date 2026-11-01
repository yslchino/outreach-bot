const test = require("node:test");
const assert = require("node:assert/strict");
const { contactQuery } = require("../services/contactFilters");
test("geographic and missing-state filters combine with search without replacing its clauses", () => {
  const query = contactQuery({ q: "Example (West)", region: "Other", state: "__missing__", industry: "Manufacturing" });
  assert.equal(query.$and.length, 4);
  assert.equal(query.$and[0].$or[0].name.test("Example (West)"), true);
  assert.equal(query.$and[0].$or[0].name.test("Example West"), false);
  assert.deepEqual(query.$and[1], { region: "Other" });
  assert.equal(query.$and[2].$or.length, 3);
  assert.deepEqual(query.$and[3], { industry: "Manufacturing" });
  assert.throws(() => contactQuery({ state: { $ne: "" } }), /must be text/);
});
