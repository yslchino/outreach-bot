const Usage = require("../models/Usage");
async function reserveUsage(key, limit, usage = Usage) {
  // Initialize separately so a failed conditional upsert cannot create a duplicate.
  try {
    await usage.updateOne({
      _id: key
    }, {
      $setOnInsert: {
        count: 0
      }
    }, {
      upsert: true
    });
  } catch (err) {
    if (err.code !== 11000) throw err;
  }
  return Boolean(await usage.findOneAndUpdate({
    _id: key,
    count: {
      $lt: limit
    }
  }, {
    $inc: {
      count: 1
    }
  }, {
    returnDocument: "after"
  }));
}
module.exports = {
  reserveUsage
};
