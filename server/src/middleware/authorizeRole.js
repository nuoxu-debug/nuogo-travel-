export function authorizeRole(repository, requiredRole) {
  return async function requireRole(req, _res, next) {
    try {
      const role = await repository.getUserRole(req.user.id);
      if (role !== requiredRole) {
        const error = new Error("Administrator access is required.");
        error.code = "ADMIN_REQUIRED";
        error.status = 403;
        throw error;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
