const Reservation = require("../models/OutreachReservation");
async function reserveRecipient(message, reservations = Reservation) {
  try {
    const result = await reservations.findOneAndUpdate({
      _id: message.to,
      message: message._id
    }, {
      $setOnInsert: {
        campaign: message.campaign
      }
    }, {
      upsert: true,
      returnDocument: "after"
    });
    return Boolean(result);
  } catch (err) {
    if (err.code === 11000) return false;
    throw err;
  }
}
module.exports = {
  reserveRecipient
};
