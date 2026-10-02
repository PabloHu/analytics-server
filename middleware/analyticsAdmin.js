const { validateMasterKey } = require('./apiKey');
const { verifyFirebaseToken, requirePermission, requireAdminOrOwner } = require('./rbac');

// Browser dashboard reads use Firebase. Server key administration retains its master key.
module.exports = function analyticsAdmin(getMongoClient) {
  const readPermission = requirePermission('users:read');
  return function (req, res, next) {
    if (req.headers['x-master-key'] || req.method !== 'GET' || !(req.path === '/stats' || req.path.startsWith('/stats/'))) {
      return validateMasterKey(req, res, next);
    }
    req.app.locals.getMongoClient = getMongoClient;
    return verifyFirebaseToken(req, res, () =>
      readPermission(req, res, () => requireAdminOrOwner(req, res, next))
    );
  };
};
