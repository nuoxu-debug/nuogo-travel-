import jwt from "jsonwebtoken";

export function createAuthMiddleware(jwtSecret) {
  return function authenticate(req, _res, next) {
    const value = req.get("Authorization") ?? "";
    const token = value.startsWith("Bearer ") ? value.slice(7) : "";
    if (!token) {
      const error = new Error("Authentication is required.");
      error.code = "UNAUTHORIZED";
      error.status = 401;
      return next(error);
    }
    try {
      const payload = jwt.verify(token, jwtSecret);
      req.user = { id: payload.sub, email: payload.email };
      return next();
    } catch {
      const error = new Error("The session token is invalid or expired.");
      error.code = "UNAUTHORIZED";
      error.status = 401;
      return next(error);
    }
  };
}
