const jwt = require("jsonwebtoken");
const User = require("../models/User");
const {
  config
} = require("../config");
function makeProtect(users = User) {
  return async (req, res, next) => {
    const match = /^Bearer ([^ ]+)$/.exec(req.headers.authorization || "");
    if (!match) return res.status(401).json({
      error: "Sign in to continue."
    });
    let decoded;
    try {
      decoded = jwt.verify(match[1], config.jwtSecret, {
        algorithms: ["HS256"],
        issuer: "get-outreach-v2"
      });
    } catch {
      return res.status(401).json({
        error: "Your session expired. Sign in again."
      });
    }
    try {
      const user = await users.findById(decoded.sub);
      if (!user || user.active !== true || !user.seat || !["admin", "operator", "viewer"].includes(user.role) || user.tokenVersion !== decoded.version) {
        return res.status(401).json({
          error: "Your session is no longer active."
        });
      }
      req.user = user;
      next();
    } catch (err) {
      next(err);
    }
  };
}
const allow = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) return res.status(403).json({
    error: "You do not have permission for this action."
  });
  next();
};
module.exports = {
  protect: makeProtect(),
  makeProtect,
  allow
};
