/**
 * Global error handling middleware.
 * Catches all errors passed via next(error) and returns a consistent JSON response.
 */
const errorHandler = (err, req, res, _next) => {
  console.error('❌ Error:', err.message);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: messages,
    });
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    return res.status(400).json({
      success: false,
      error: 'Invalid ID format',
    });
  }

  // Groq / API errors
  if (err.status || err.statusCode) {
    return res.status(err.status || err.statusCode).json({
      success: false,
      error: err.message || 'External API error',
    });
  }

  // Default server error
  res.status(500).json({
    success: false,
    error:
      process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message,
  });
};

module.exports = errorHandler;
