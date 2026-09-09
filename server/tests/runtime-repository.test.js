import { describe, expect, it } from "vitest";
import { MemoryRepository } from "../src/repositories/memory.js";
import { MySqlRepository } from "../src/repositories/mysql.js";
import { createRepository } from "../src/runtime/createRepository.js";

describe("runtime repository selection", () => {
  it("uses MySQL in live mode", () => {
    expect(createRepository({
      runtimeMode: "live",
      mysql: { host: "127.0.0.1", database: "nuogo", user: "nuogo", password: "test" }
    })).toBeInstanceOf(MySqlRepository);
  });

  it("uses memory only for explicit demo or injected test repositories", () => {
    expect(createRepository({ runtimeMode: "demo" })).toBeInstanceOf(MemoryRepository);
    const testRepository = new MemoryRepository();
    expect(createRepository({ runtimeMode: "test" }, { testRepository })).toBe(testRepository);
    expect(() => createRepository({ runtimeMode: "test" })).toThrow(/explicit test repository/i);
  });
});
