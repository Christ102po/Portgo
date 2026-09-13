function notFoundHandler(req, res) {
  res.status(404).json({ message: "Route not found" });
}

function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || "Internal server error",
    ...(err.details ? { details: err.details } : {}),
  });
}

module.exports = { notFoundHandler, errorHandler };
