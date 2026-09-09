import { readFile } from "node:fs/promises";
import mysql from "mysql2/promise";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { listMigrationFiles } from "../../src/repositories/migrations.js";
import { MySqlRepository } from "../../src/repositories/mysql.js";

const requiredVariables = [
  "MYSQL_INTEGRATION_HOST",
  "MYSQL_INTEGRATION_PORT",
  "MYSQL_INTEGRATION_DATABASE",
  "MYSQL_INTEGRATION_USER",
  "MYSQL_INTEGRATION_PASSWORD"
];
const missingVariables = requiredVariables.filter((name) => !process.env[name]);
const explicitlyEnabled = process.env.MYSQL_INTEGRATION_ENABLED === "true";
const runIntegration = explicitlyEnabled && missingVariables.length === 0;
const database = process.env.MYSQL_INTEGRATION_DATABASE;

if (!runIntegration) {
  const requirements = [
    ...missingVariables,
    ...(explicitlyEnabled ? [] : ["MYSQL_INTEGRATION_ENABLED=true"])
  ];
  console.info(
    `[mysql integration] skipped: set ${requirements.join(", ")} to run the MySQL connectivity and migration smoke test against a dedicated disposable database.`
  );
}

describe.skipIf(!runIntegration)("MySQL connectivity and migration smoke", () => {
  let connection;
  let pool;

  beforeAll(async () => {
    if (!/^[A-Za-z_][A-Za-z0-9_]*_integration$/.test(database)) {
      throw new Error("MYSQL_INTEGRATION_DATABASE must be a safe identifier ending in _integration.");
    }
    connection = await mysql.createConnection({
      host: process.env.MYSQL_INTEGRATION_HOST,
      port: Number(process.env.MYSQL_INTEGRATION_PORT),
      user: process.env.MYSQL_INTEGRATION_USER,
      password: process.env.MYSQL_INTEGRATION_PASSWORD
    });
    const migrations = await listMigrationFiles(new URL("../../../database/migrations/", import.meta.url));
    expect(migrations).not.toHaveLength(0);
    await connection.query(`DROP DATABASE IF EXISTS \`${database}\``);
    for (const migration of migrations) {
      const sql = (await readFile(migration.url, "utf8")).replaceAll("nuogo", database);
      for (const statement of sql.split(";")) {
        if (statement.trim()) await connection.query(statement);
      }
    }
    pool = mysql.createPool({
      host: process.env.MYSQL_INTEGRATION_HOST,
      port: Number(process.env.MYSQL_INTEGRATION_PORT),
      user: process.env.MYSQL_INTEGRATION_USER,
      password: process.env.MYSQL_INTEGRATION_PASSWORD,
      database
    });
  });

  afterAll(async () => {
    await pool?.end();
    if (connection) {
      await connection.query(`DROP DATABASE IF EXISTS \`${database}\``);
      await connection.end();
    }
  });

  it("applies the ordered migrations to a dedicated integration database", async () => {
    const [health] = await connection.query("SELECT 1 AS ok");
    expect(health).toEqual([{ ok: 1 }]);

    const [tables] = await connection.query(
      `SELECT table_name AS name
       FROM information_schema.tables
       WHERE table_schema = ?
         AND table_name IN ('users', 'attractions', 'privacy_consents', 'supported_destinations', 'trip_members')`,
      [database]
    );
    expect(new Set(tables.map(({ name }) => name))).toEqual(
      new Set(["users", "privacy_consents", "supported_destinations"])
    );

    const [columns] = await connection.query(
      `SELECT column_name AS name
       FROM information_schema.columns
       WHERE table_schema = ? AND table_name = 'trips' AND column_name = 'objective_payload_json'`,
      [database]
    );
    expect(columns).toEqual([{ name: "objective_payload_json" }]);
  });

  it("deletes only the target account's current MySQL records", async () => {
    const targetId = "00000000-0000-4000-8000-000000000001";
    const otherId = "00000000-0000-4000-8000-000000000002";
    const ownedTripId = "10000000-0000-4000-8000-000000000001";
    const otherTripId = "10000000-0000-4000-8000-000000000002";

    await pool.execute(
      `INSERT INTO users (id, name, email, password_hash, preferred_language, account_type)
       VALUES (?, ?, ?, ?, 'zh', 'REGISTERED'), (?, ?, ?, ?, 'en', 'REGISTERED')`,
      [targetId, "Delete Me", "delete@integration.test", "hash", otherId, "Keep Me", "keep@integration.test", "hash"]
    );
    await pool.execute(
      `INSERT INTO trips (id, user_id, title_en, title_zh, destination, start_date, end_date, total_budget, preferences_json)
       VALUES (?, ?, 'Target trip', 'Target trip', 'singapore', '2026-01-01', '2026-01-02', 1000, '{}'),
              (?, ?, 'Other trip', 'Other trip', 'singapore', '2026-01-01', '2026-01-02', 1000, '{}')`,
      [ownedTripId, targetId, otherTripId, otherId]
    );
    await pool.execute(
      `INSERT INTO privacy_consents (user_id, consent_type, version, accepted)
       VALUES (?, 'GENERAL', 'v1', true), (?, 'GENERAL', 'v1', true)`,
      [targetId, otherId]
    );

    await expect(new MySqlRepository(pool).deleteAccount(targetId)).resolves.toBe(true);

    async function count(table, idColumn, id) {
      const [rows] = await pool.execute(`SELECT COUNT(*) AS count FROM ${table} WHERE ${idColumn} = ?`, [id]);
      return Number(rows[0].count);
    }

    await expect(count("users", "id", targetId)).resolves.toBe(0);
    await expect(count("users", "id", otherId)).resolves.toBe(1);
    await expect(count("trips", "id", ownedTripId)).resolves.toBe(0);
    await expect(count("trips", "id", otherTripId)).resolves.toBe(1);
    await expect(count("privacy_consents", "user_id", targetId)).resolves.toBe(0);
    await expect(count("privacy_consents", "user_id", otherId)).resolves.toBe(1);
  });
});
