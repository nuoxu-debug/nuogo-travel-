import { describe, expect, it } from "vitest";
import { MemoryRepository } from "../src/repositories/memory.js";
import { initializeDemoRuntime } from "../src/runtime/initializeDemoRuntime.js";

const config = {
  runtimeMode: "demo",
  travelDataProvider: "demo",
  jwtSecret: "demo-test-secret",
  demoAdminEmail: "admin@nuogo.test",
  demoAdminPassword: "NuogoAdmin123!"
};

describe("demo runtime initialization", () => {
  it("seeds cost references and an optional administrator", async () => {
    const repository = new MemoryRepository();

    await initializeDemoRuntime({ repository, config });

    expect(await repository.listCostReferences("singapore")).toHaveLength(14);
    const admin = await repository.findUserByEmail("admin@nuogo.test");
    expect(admin).toMatchObject({ role: "admin", status: "ACTIVE" });
    expect(admin.passwordHash).not.toBe("NuogoAdmin123!");
  });

  it("preserves an administrator's existing cost-reference changes", async () => {
    const repository = new MemoryRepository();
    await initializeDemoRuntime({ repository, config });
    const [reference] = await repository.listCostReferences("singapore");
    await repository.upsertCostReference({ ...reference, sourceName: "Reviewed FYP evidence" });

    await initializeDemoRuntime({ repository, config });

    expect((await repository.listCostReferences("singapore"))
      .find(({ id }) => id === reference.id).sourceName).toBe("Reviewed FYP evidence");
  });

  it("does nothing outside demo runtime", async () => {
    const repository = new MemoryRepository();
    await initializeDemoRuntime({
      repository,
      config: { ...config, runtimeMode: "live" }
    });

    expect(await repository.listCostReferences("singapore")).toEqual([]);
    expect(await repository.findUserByEmail("admin@nuogo.test")).toBeUndefined();
  });
});
