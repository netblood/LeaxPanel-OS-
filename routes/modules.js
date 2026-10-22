// Mounts every declarative module router (see config/modules.js).
// Each module gets its own path prefix and RBAC guard.
const express = require('express');
const { modules, buildRouter } = require('../config/modules');
const rbac = require('../middleware/rbac');

const router = express.Router();

for (const config of modules) {
  const guard = rbac.checkPermission(config.perm);
  const moduleRouter = buildRouter(config);
  router.use(`/${config.prefix}`, guard, moduleRouter);
}

module.exports = router;
module.exports.modules = modules;
