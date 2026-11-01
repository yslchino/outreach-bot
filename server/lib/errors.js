class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const assert = (condition, status, message) => {
  if (!condition) throw new AppError(status, message);
};
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  const status = err.status || (err.code === 11000 ? 409 : ["ValidationError", "CastError", "MulterError"].includes(err.name) ? 400 : 500);
  if (status >= 500) console.error(req.method + " " + req.path + ": " + err.name);
  res.status(status).json({
    error: status >= 500 ? "The request could not be completed. Please try again." : err.code === 11000 ? "This record already exists." : err.message
  });
}
module.exports = {
  AppError,
  assert,
  errorHandler
};
