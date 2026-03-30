const { validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().reduce((acc, err) => {
      acc[err.path || err.param] = err.msg;
      return acc;
    }, {});
    return res.status(422).json({ success: false, message: 'Validation failed', errors: formatted });
  }
  next();
};

module.exports = validate;