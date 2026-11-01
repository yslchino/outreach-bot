// One backend instance is the initial five-user deployment target.
function rateLimit({
  max = 10,
  windowMs = 15 * 60 * 1000
} = {}) {
  const buckets = new Map();
  return (req, res, next) => {
    const now = Date.now();
    for (const [key, value] of buckets) if (value.reset <= now) buckets.delete(key);
    const key = req.user ? String(req.user._id) : req.ip;
    const bucket = buckets.get(key) || {
      count: 0,
      reset: now + windowMs
    };
    bucket.count++;
    buckets.set(key, bucket);
    if (bucket.count > max) {
      res.set("Retry-After", String(Math.ceil((bucket.reset - now) / 1000)));
      return res.status(429).json({
        error: "Too many requests. Try again later."
      });
    }
    next();
  };
}
module.exports = {
  rateLimit
};
