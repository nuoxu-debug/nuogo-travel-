import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { authLoginSchema, authRegistrationSchema } from "@nuogo/shared/schemas";

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email };
}

export class AuthService {
  constructor(repository, jwtSecret) {
    this.repository = repository;
    this.jwtSecret = jwtSecret;
  }

  createToken(user) {
    return jwt.sign({ sub: user.id, email: user.email }, this.jwtSecret, { expiresIn: "7d" });
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
      passwordHash: await bcrypt.hash(data.password, 12)
    });
    return { user: publicUser(user), token: this.createToken(user) };
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
    return { user: publicUser(user), token: this.createToken(user) };
  }

  async guest() {
    const email = "guest@nuogo.local";
    let user = await this.repository.findUserByEmail(email);
    if (!user) {
      user = await this.repository.createUser({
        name: "Nuogo Guest",
        email,
        passwordHash: await bcrypt.hash(randomUUID(), 12)
      });
    }
    return { user: publicUser(user), token: this.createToken(user) };
  }

  async getPublicUser(id) {
    const user = await this.repository.findUserById(id);
    return user ? publicUser(user) : undefined;
  }
}
