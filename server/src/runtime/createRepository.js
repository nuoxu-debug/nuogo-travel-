import { MemoryRepository } from "../repositories/memory.js";
import { MySqlRepository } from "../repositories/mysql.js";

export function createRepository(config, { testRepository } = {}) {
  if (config.runtimeMode === "live") return new MySqlRepository(config.mysql);
  if (config.runtimeMode === "demo") return new MemoryRepository();
  if (config.runtimeMode === "test") {
    if (!testRepository) throw new Error("Runtime test mode requires an explicit test repository.");
    return testRepository;
  }
  throw new Error(`Unsupported application runtime mode: ${config.runtimeMode}.`);
}
