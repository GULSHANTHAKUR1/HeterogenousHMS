const { ZodError } = require('zod');

/**
 * Zod request validation middleware.
 * Validates request body, query, and params against the provided Zod schema.
 *
 * @param {Object} schemas - { body?, query?, params? }
 */
const validate = (schemas) => {
  return (req, res, next) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query);
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }
      return next();
    } catch (err) {
      if (err instanceof ZodError || err.name === 'ZodError') {
        const issues = err.issues || err.errors || [];
        const details = issues.map((e) => ({
          field: Array.isArray(e.path) ? e.path.join('.') : String(e.path || ''),
          message: e.message,
          code: e.code,
        }));

        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'The requested payload or query parameters failed validation.',
          details,
        });
      }
      return next(err);
    }
  };
};

module.exports = validate;
