import { describe, expect, it, vi } from "vitest";
import { createLogger, createRepositoryLogSink } from "../src/services/logger.js";

describe("system logger", () => {
  it("writes redacted records to the console and administration repository", async () => {
    const consoleSink = vi.fn();
    const repository = { appendSystemRecord: vi.fn().mockResolvedValue(undefined) };
    const logger = createLogger({ sink: createRepositoryLogSink({ repository, consoleSink }) });

    await logger.error("provider.failure", { destination: "singapore", apiKey: "private-value" });

    const expected = {
      level: "error",
      event: "provider.failure",
      metadata: { destination: "singapore", apiKey: "[REDACTED]" }
    };
    expect(consoleSink).toHaveBeenCalledWith(expected);
    expect(repository.appendSystemRecord).toHaveBeenCalledWith(expected);
  });
});
