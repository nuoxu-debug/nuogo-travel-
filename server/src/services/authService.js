import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { authLoginSchema, authRegistrationSchema } from "@nuogo/shared/schemas";

const BCRYPT_ROUNDS = 12;

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    preferredLanguage: user.preferredLanguage ?? "zh",
    accountType: user.accountType ?? "REGISTERED",
    createdAt: user.createdAt
  };
}

function sessionUser(user) {
  return {
    ...publicUser(user),
    role: user.role ?? "user",
    status: user.status ?? "ACTIVE"
  };
}

function authError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

export class AuthService {
  constructor(repository, jwtSecret) {
    this.repository = repository;
    this.jwtSecret = jwtSecret;
  }

  createToken(user) {
    const guest = user.accountType === "GUEST";
    return jwt.sign({ sub: user.id, email: user.email, accountType: user.accountType ?? "REGISTERED" }, this.jwtSecret, { expiresIn: guest ? "24h" : "7d" });
  }

  async register(input) {
    const data = authRegistrationSchema.parse(input);
    if (await this.repository.findUserByEmail(data.email)) {
      const error = new Error("An account already exists for this email.");
      error.code = "EMAIL_EXISTS";
      error.status = 409;
      throw error;
    }
    const user = await this.repository.createUser({
      ...data,
      passwordHash: await bcrypt.hash(data.password, BCRYPT_ROUNDS),
      preferredLanguage: "zh",
      accountType: "REGISTERED"
    });
    return { user: sessionUser(user), token: this.createToken(user) };
  }

  async login(input) {
    const data = authLoginSchema.parse(input);
    const user = await this.repository.findUserByEmail(data.email);
    if (!user || !(await bcrypt.compare(data.password, user.passwordHash))) {
      const error = new Error("Email or password is incorrect.");
      error.code = "INVALID_CREDENTIALS";
      error.status = 401;
      throw error;
    }
    return { user: sessionUser(user), token: this.createToken(user) };
  }

  async guest() {
    const guestId = randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const user = await this.repository.createUser({
      name: "Nuogo Guest",
      email: `guest+${guestId}@nuogo.local`,
      passwordHash: await bcrypt.hash(randomUUID(), BCRYPT_ROUNDS),
      preferredLanguage: "zh",
      accountType: "GUEST",
      guestLastActivityAt: new Date().toISOString(),
      guestExpiresAt: expiresAt
    });
    return { user: sessionUser(user), token: this.createToken(user) };
  }

  async getPublicUser(id) {
    const user = await this.repository.findUserById(id);
    return user ? sessionUser(user) : undefined;
  }

  async getProfile(id) {
    const user = await this.repository.findUserById(id);
    if (!user) throw authError(404, "NOT_FOUND", "User was not found.");
    return publicUser(user);
  }

  async updateProfile(id, input) {
    const user = await this.repository.updateUserProfile(id, input);
    if (!user) throw authError(404, "NOT_FOUND", "User was not found.");
    return publicUser(user);
  }

  async changePassword(id, { currentPassword, newPassword }) {
    const user = await this.repository.findUserById(id);
    if (!user) throw authError(404, "NOT_FOUND", "User was not found.");
    if (user.accountType === "GUEST") {
      throw authError(403, "GUEST_PASSWORD_UNAVAILABLE", "Guest accounts do not have a password.");
    }
    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw authError(403, "CURRENT_PASSWORD_INVALID", "The current password is incorrect.");
    }
    await this.repository.updateUserPassword(id, await bcrypt.hash(newPassword, BCRYPT_ROUNDS));
  }

  async deleteAccount(id, { currentPassword } = {}) {
    const user = await this.repository.findUserById(id);
    if (!user) throw authError(404, "NOT_FOUND", "User was not found.");
    if (user.accountType !== "GUEST") {
      if (!currentPassword) {
        throw authError(400, "CURRENT_PASSWORD_REQUIRED", "The current password is required.");
      }
      if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
        throw authError(403, "CURRENT_PASSWORD_INVALID", "The current password is incorrect.");
      }
    }
    await this.repository.deleteAccount(id);
  }
}
