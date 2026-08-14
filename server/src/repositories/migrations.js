import { readdir } from "node:fs/promises";

export async function listMigrationFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && /^\d{3}_.+\.sql$/.test(entry.name))
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((entry) => ({ name: entry.name, url: new URL(entry.name, directory) }));
}
