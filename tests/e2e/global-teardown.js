import { realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname } from "node:path";

export default async function globalTeardown(config) {
  const runDirectory = await realpath(config.metadata.runDirectory).catch(error => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  if (!runDirectory) return;
  const temporaryRoot = await realpath(tmpdir());
  if (dirname(runDirectory) !== temporaryRoot || !basename(runDirectory).startsWith("nuogo-e2e-")) {
    throw new Error("Refusing to clean a directory outside this temporary browser run.");
  }
  await rm(runDirectory, { recursive: true, force: true, maxRetries: 3 });
}
