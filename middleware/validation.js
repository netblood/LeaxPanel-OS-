const { body, param, query, validationResult } = require('express-validator');

function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    if (req.path.startsWith('/api/')) {
      return res.status(400).json({ errors: errors.array() });
    }
    req.flash('errors', errors.array());
    return res.redirect('back');
  }
  next();
}

const registerSchema = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').optional().isIn(['owner', 'admin', 'reseller', 'manager', 'developer', 'support', 'billing', 'user', 'viewer'])
];

const loginSchema = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

const userSchema = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('role').isIn(['owner', 'admin', 'reseller', 'manager', 'developer', 'support', 'billing', 'user', 'viewer']).withMessage('Invalid role')
];

const serviceSchema = [
  body('name').trim().notEmpty().withMessage('Service name is required'),
  body('type').trim().notEmpty().withMessage('Service type is required'),
  body('status').optional().isIn(['active', 'inactive', 'maintenance', 'error'])
];

module.exports = {
  handleValidationErrors,
  registerSchema,
  loginSchema,
  userSchema,
  serviceSchema
};
