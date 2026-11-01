const v = require("../lib/validation");
function contactQuery(filters) {
  const clauses = [];
  if (filters.q) {
    const search = new RegExp(v.escapeRegex(v.text(filters.q, "Search", 100)), "i");
    clauses.push({ $or: [{ name: search }, { email: search }, { company: search }] });
  }
  if (["shipper", "carrier"].includes(filters.audience)) clauses.push({ audience: filters.audience });
  if (filters.status === "replied") clauses.push({ replied: true });
  if (filters.status === "new") clauses.push({ status: "pending", replied: false });
  if (filters.status === "sent") clauses.push({ status: "sent" });
  for (const field of ["region", "state", "industry"]) {
    if (!filters[field]) continue;
    if (filters[field] === "__missing__") {
      clauses.push({ $or: [{ [field]: { $exists: false } }, { [field]: null }, { [field]: "" }] });
    } else {
      clauses.push({ [field]: v.text(filters[field], field, 200) });
    }
  }
  return clauses.length ? { $and: clauses } : {};
}
module.exports = { contactQuery };
