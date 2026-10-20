function requireAuth(req, res, next) {
  if (req.session.user) {
    return next();
  }
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  req.flash('error', 'Please log in to access this page.');
  return res.redirect('/login');
}

function requireGuest(req, res, next) {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  next();
}

function optionalAuth(req, res, next) {
  next();
}

module.exports = {
  requireAuth,
  requireGuest,
  optionalAuth
};
