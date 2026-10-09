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

async function createLegacyGuestAuth(repository) {
  const guest = await repository.createUser({
    name: "Legacy Guest",
    email: "guest+legacy@nuogo.local",
    passwordHash: "legacy-hash",
    preferredLanguage: "zh",
    accountType: "GUEST",
    guestLastActivityAt: new Date().toISOString(),
    guestExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  });
  const token = jwt.sign(
    { sub: guest.id, email: guest.email, accountType: "GUEST" },
    jwtSecret,
    { expiresIn: "24h" }
  );
  return { Authorization: `Bearer ${token}` };
}

describe("profile and account lifecycle API", () => {
  it("registers public users only as registered travellers", async () => {
    const { app, repository } = buildApp();

    const account = await request(app).post("/api/auth/register").send({
      name: "Traveller Student",
      email: "traveller-role@nuogo.test",
      password: registeredPassword
    }).expect(201);

    expect(account.body.user).toMatchObject({
      role: "user",
      accountType: "REGISTERED"
    });
    await expect(repository.getUserRole(account.body.user.id)).resolves.toBe("user");
  });

  it("does not let the client self-assign or update an administrator role", async () => {
    const { app } = buildApp();

    await request(app).post("/api/auth/register").send({
      name: "Role Escalation",
      email: "role-escalation@nuogo.test",
      password: registeredPassword,
      role: "admin"
    }).expect(400);

    const account = await register(app, "role-profile@nuogo.test");
    await request(app).patch("/api/profile").set(account.auth).send({
      name: "Role Profile",
      role: "admin"
    }).expect(400);
  });

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

  it("reserves the internal guest email namespace without creating guest users", async () => {
    const { app, repository } = buildApp();

    await request(app).post("/api/auth/register").send({
      name: "Reserved Address",
      email: "guest+manual@nuogo.local",
      password: registeredPassword
    }).expect(400);

    const guest = await request(app).post("/api/auth/guest").expect(410);
    expect(guest.body.error.code).toBe("GUEST_AUTH_DEPRECATED");
    expect([...repository.users.values()].filter((user) => user.accountType === "GUEST")).toHaveLength(0);
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

  it("blocks legacy guest tokens from profile and account lifecycle APIs", async () => {
    const { app, repository } = buildApp();
    const auth = await createLegacyGuestAuth(repository);

    const profile = await request(app).get("/api/profile").set(auth).expect(403);
    expect(profile.body.error.code).toBe("REGISTERED_ACCOUNT_REQUIRED");

    const deletion = await request(app).delete("/api/privacy/account")
      .set(auth)
      .send({ confirmation: "DELETE" })
      .expect(403);
    expect(deletion.body.error.code).toBe("REGISTERED_ACCOUNT_REQUIRED");
  });
});
