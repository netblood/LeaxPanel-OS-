// Authentication middleware.
function isApi(req) {
  return req.path.startsWith('/api/') || (req.originalUrl || '').startsWith('/api/');
}

function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  if (isApi(req)) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  req.flash('error', 'Please log in to access this page.');
  return res.redirect('/login');
}

function requireGuest(req, res, next) {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }
  return next();
}

function optionalAuth(req, res, next) {
  res.locals.user = (req.session && req.session.user) || null;
  return next();
}

module.exports = {
  requireAuth,
  requireGuest,
  optionalAuth
};
