import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { MemoryRepository } from "../src/repositories/memory.js";

const jwtSecret = "profile-test-secret-with-enough-length";
const registeredPassword = "Nuogo123!";

function buildApp(repository = new MemoryRepository()) {
  return {
    app: createApp({
      repository,
      planProvider: {},
      objectivePlanner: async () => ({
        state: "FAILED",
        validation: { valid: false, issues: [] }
      }),
      config: {
        jwtSecret,
        demoMode: true,
        aiProvider: "demo",
        enableLegacyFeatures: false,
        clientOrigin: "http://localhost:5173"
      }
    }),
    repository
  };
}

async function register(app, email = "profile@nuogo.test") {
  const response = await request(app).post("/api/auth/register").send({
    name: "Profile Student",
    email,
    password: registeredPassword
  }).expect(201);
  return {
    ...response.body,
    auth: { Authorization: `Bearer ${response.body.token}` }
  };
}

describe("profile and account lifecycle API", () => {
  it("reads and updates only the supported public profile fields", async () => {
    const { app, repository } = buildApp();
    const account = await register(app);

    const initial = await request(app).get("/api/profile").set(account.auth).expect(200);
    expect(initial.body.profile).toEqual({
      id: account.user.id,
      name: "Profile Student",
      email: "profile@nuogo.test",
      preferredLanguage: "zh",
      accountType: "REGISTERED",
      createdAt: expect.any(String)
    });
    expect(JSON.stringify(initial.body)).not.toMatch(/password/i);

    const updated = await request(app).patch("/api/profile").set(account.auth).send({
      name: "Updated Student",
      preferredLanguage: "en"
    }).expect(200);
    expect(updated.body.profile).toMatchObject({
      name: "Updated Student",
      email: "profile@nuogo.test",
      preferredLanguage: "en"
    });
    expect(JSON.stringify(updated.body)).not.toMatch(/password/i);

    const stored = await repository.findUserById(account.user.id);
    expect(stored.name).toBe("Updated Student");
    expect(stored.preferredLanguage).toBe("en");
    expect(await bcrypt.compare(registeredPassword, stored.passwordHash)).toBe(true);
  });

  it("rejects unsupported profile fields", async () => {
    const { app } = buildApp();
    const account = await register(app, "profile-fields@nuogo.test");

    const response = await request(app).patch("/api/profile").set(account.auth).send({
      email: "changed@nuogo.test"
    }).expect(400);

    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects bcrypt truncation-collision passwords by UTF-8 byte length", async () => {
    const { app } = buildApp();
    const exactLimit = "密".repeat(24);
    const collidingValue = `${exactLimit}a`;
    const account = await request(app).post("/api/auth/register").send({
      name: "Byte Limit",
      email: "byte-limit@nuogo.test",
      password: exactLimit
    }).expect(201);
    const auth = { Authorization: `Bearer ${account.body.token}` };

    await request(app).post("/api/auth/register").send({
      name: "Collision",
      email: "collision@nuogo.test",
      password: collidingValue
    }).expect(400);
    await request(app).post("/api/auth/login").send({
      email: "byte-limit@nuogo.test",
      password: collidingValue
    }).expect(400);
    await request(app).post("/api/profile/password").set(auth).send({
      currentPassword: collidingValue,
      newPassword: "NewNuogo456!"
    }).expect(400);
    await request(app).delete("/api/privacy/account").set(auth).send({
      confirmation: "DELETE",
      currentPassword: collidingValue
    }).expect(400);
  });

  it("reserves the internal guest email namespace for explicitly created guests", async () => {
    const { app } = buildApp();

    await request(app).post("/api/auth/register").send({
      name: "Reserved Address",
      email: "guest+manual@nuogo.local",
      password: registeredPassword
    }).expect(400);

    const guest = await request(app).post("/api/auth/guest").expect(200);
    expect(guest.body.user).toMatchObject({
      email: expect.stringMatching(/^guest\+.+@nuogo\.local$/),
      accountType: "GUEST"
    });
  });

  it("returns a safe server error when authenticated user lookup fails", async () => {
    const { app, repository } = buildApp();
    const account = await register(app, "lookup-failure@nuogo.test");
    repository.findUserById = async () => {
      throw new Error("database connection failed");
    };

    const response = await request(app).get("/api/profile").set(account.auth).expect(500);

    expect(response.body).toEqual({
      error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." }
    });
  });

  it("changes a registered password after verifying the current password", async () => {
    const { app, repository } = buildApp();
    const account = await register(app, "password@nuogo.test");
    const newPassword = "NewNuogo456!";

    await request(app).post("/api/profile/password").set(account.auth).send({
      currentPassword: registeredPassword,
      newPassword
    }).expect(204);

    await request(app).get("/api/profile").set(account.auth).expect(200);
    await request(app).post("/api/auth/login").send({
      email: "password@nuogo.test",
      password: registeredPassword
    }).expect(401);
    await request(app).post("/api/auth/login").send({
      email: "password@nuogo.test",
      password: newPassword
    }).expect(200);

    const stored = await repository.findUserById(account.user.id);
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$12\$/);
    expect(await bcrypt.compare(newPassword, stored.passwordHash)).toBe(true);
  });

  it("keeps the password and session unchanged when the current password is wrong", async () => {
    const { app } = buildApp();
    const account = await register(app, "wrong-password@nuogo.test");

    const response = await request(app).post("/api/profile/password").set(account.auth).send({
      currentPassword: "Incorrect123!",
      newPassword: "NewNuogo456!"
    }).expect(403);

    expect(response.body.error.code).toBe("CURRENT_PASSWORD_INVALID");
    await request(app).get("/api/profile").set(account.auth).expect(200);
    await request(app).post("/api/auth/login").send({
      email: "wrong-password@nuogo.test",
      password: registeredPassword
    }).expect(200);
  });

  it("returns AUTH_TOKEN_EXPIRED for an expired JWT", async () => {
    const { app } = buildApp();
    const account = await register(app, "expired@nuogo.test");
    const expiredToken = jwt.sign(
      { sub: account.user.id, email: account.user.email },
      jwtSecret,
      { expiresIn: -1 }
    );

    const response = await request(app).get("/api/profile")
      .set("Authorization", `Bearer ${expiredToken}`)
      .expect(401);

    expect(response.body.error).toMatchObject({ code: "AUTH_TOKEN_EXPIRED" });
  });

  it("requires the registered current password before deleting the account", async () => {
    const { app } = buildApp();
    const account = await register(app, "delete-registered@nuogo.test");

    const missing = await request(app).delete("/api/privacy/account")
      .set(account.auth)
      .send({ confirmation: "DELETE" })
      .expect(400);
    expect(missing.body.error.code).toBe("CURRENT_PASSWORD_REQUIRED");

    const wrong = await request(app).delete("/api/privacy/account")
      .set(account.auth)
      .send({ confirmation: "DELETE", currentPassword: "Incorrect123!" })
      .expect(403);
    expect(wrong.body.error.code).toBe("CURRENT_PASSWORD_INVALID");
    await request(app).get("/api/profile").set(account.auth).expect(200);

    await request(app).delete("/api/privacy/account")
      .set(account.auth)
      .send({ confirmation: "DELETE", currentPassword: registeredPassword })
      .expect(204);
    await request(app).get("/api/profile").set(account.auth).expect(401);
  });

  it("identifies and safely deletes an authenticated guest without a password", async () => {
    const { app } = buildApp();
    const guest = await request(app).post("/api/auth/guest").expect(200);
    const auth = { Authorization: `Bearer ${guest.body.token}` };

    const profile = await request(app).get("/api/profile").set(auth).expect(200);
    expect(profile.body.profile.accountType).toBe("GUEST");
    expect(profile.body.profile.preferredLanguage).toBe("zh");

    await request(app).delete("/api/privacy/account")
      .set(auth)
      .send({ confirmation: "DELETE" })
      .expect(204);
    await request(app).get("/api/profile").set(auth).expect(401);
  });
});
