import jwt from "jsonwebtoken";

export function createAuthMiddleware(jwtSecret, repository) {
  return async function authenticate(req, _res, next) {
    const value = req.get("Authorization") ?? "";
    const token = value.startsWith("Bearer ") ? value.slice(7) : "";
    if (!token) {
      const error = new Error("Authentication is required.");
      error.code = "UNAUTHORIZED";
      error.status = 401;
      return next(error);
    }
    let payload;
    try {
      payload = jwt.verify(token, jwtSecret);
    } catch (cause) {
      const expired = cause?.name === "TokenExpiredError";
      const error = new Error(expired
        ? "The session token has expired."
        : "The session token is invalid.");
      error.code = expired ? "AUTH_TOKEN_EXPIRED" : "UNAUTHORIZED";
      error.status = 401;
      return next(error);
    }
    let user;
    try {
      user = repository ? await repository.findUserById(payload.sub) : undefined;
      if (repository && !user) {
        const error = new Error("Account is unavailable.");
        error.code = "UNAUTHORIZED";
        error.status = 401;
        return next(error);
      }
      if (user?.status === "SUSPENDED") {
        const error = new Error("This account has been suspended.");
        error.code = "ACCOUNT_SUSPENDED";
        error.status = 403;
        return next(error);
      }
      if (user?.accountType === "GUEST") {
        if (!user.guestExpiresAt || Date.parse(user.guestExpiresAt) <= Date.now()) {
          if (repository.deleteAccount) await repository.deleteAccount(user.id);
          const error = new Error("The guest session has expired.");
          error.code = "AUTH_TOKEN_EXPIRED";
          error.status = 401;
          return next(error);
        }
        if (repository.touchGuestSession) user = await repository.touchGuestSession(user.id) ?? user;
      }
    } catch (error) {
      return next(error);
    }
    req.user = {
      id: payload.sub,
      email: payload.email,
      accountType: payload.accountType ?? "REGISTERED",
      guestExpiresAt: user?.guestExpiresAt ?? null
    };
    return next();
  };
}
