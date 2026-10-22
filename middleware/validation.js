// Request validation helpers built on express-validator.
const { body, param, query, validationResult } = require('express-validator');

const ROLES = ['owner', 'admin', 'reseller', 'manager', 'developer', 'support', 'billing', 'user', 'viewer'];

function isApi(req) {
  return req.path.startsWith('/api/') || (req.originalUrl || '').startsWith('/api/');
}

function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    if (isApi(req)) {
      return res.status(400).json({
        error: 'Validation failed',
        errors: errors.array().map(e => ({ field: e.path, message: e.msg }))
      });
    }
    req.flash('errors', errors.array().map(e => e.msg));
    return res.redirect('back');
  }
  return next();
}

const registerSchema = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').optional().isIn(ROLES)
];

const loginSchema = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

const userSchema = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('role').isIn(ROLES).withMessage('Invalid role'),
  body('password').optional({ values: 'falsy' }).isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
];

const serviceSchema = [
  body('name').trim().notEmpty().withMessage('Service name is required').isLength({ max: 120 }),
  body('type').trim().notEmpty().withMessage('Service type is required'),
  body('status').optional().isIn(['active', 'inactive', 'maintenance', 'error'])
];

const appSchema = [
  body('name').trim().notEmpty().withMessage('App name is required').isLength({ max: 120 }),
  body('type').trim().notEmpty().withMessage('App type is required'),
  body('port').optional({ values: 'falsy' }).isInt({ min: 1, max: 65535 }).withMessage('Invalid port')
];

const idParam = [
  param('id').isInt({ min: 1 }).withMessage('Invalid id')
];

const jsonBody = (field = 'config') => [
  body(field).optional({ values: 'falsy' }).custom((value) => {
    if (value === undefined || value === null || value === '') return true;
    if (typeof value === 'object') return true;
    try {
      JSON.parse(value);
      return true;
    } catch (err) {
      throw new Error(`${field} must be valid JSON`);
    }
  })
];

module.exports = {
  ROLES,
  handleValidationErrors,
  registerSchema,
  loginSchema,
  userSchema,
  serviceSchema,
  appSchema,
  idParam,
  jsonBody
};
