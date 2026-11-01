const {
  assert
} = require("./errors");
function text(value, label, max = 200, required = true) {
  assert(typeof value === "string" || !required && value == null, 400, label + " must be text.");
  const result = (value || "").trim();
  assert((!required || result.length > 0) && result.length <= max, 400, label + " must be " + (required ? "1" : "0") + "–" + max + " characters.");
  return result;
}
function email(value) {
  const result = text(value, "Email", 254).toLowerCase();
  assert(/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(result), 400, "Enter a valid email address.");
  return result;
}
function id(value) {
  assert(typeof value === "string" && /^[a-f\d]{24}$/i.test(value), 400, "Invalid record ID.");
  return value;
}
function password(value) {
  assert(typeof value === "string" && value.length >= 12 && Buffer.byteLength(value) <= 72, 400, "Password must be at least 12 characters and no more than 72 bytes.");
  return value;
}
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
module.exports = {
  text,
  email,
  id,
  password,
  escapeRegex
};
