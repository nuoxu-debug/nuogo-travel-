import { expect, test } from "@playwright/test";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, realpath, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

test("registered sessions and saved itineraries survive an isolated API process restart", async ({ request }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "API process persistence is viewport-independent.");
  test.setTimeout(60_000);
  const directory = await mkdtemp(join(tmpdir(), "nuogo-e2e-restart-"));
  const socket = createServer();
  socket.listen(0, "127.0.0.1");
  await once(socket, "listening");
  const port = socket.address().port;
  await new Promise(resolve => socket.close(resolve));
  const api = `http://127.0.0.1:${port}/api`;
  let child;
  let output = "";

  async function start() {
    child = spawn(process.execPath, [fileURLToPath(new URL("../../server/src/index.js", import.meta.url))], {
      cwd: fileURLToPath(new URL("../../", import.meta.url)),
      windowsHide: true,
      env: {
        ...process.env,
        PORT: String(port),
        NODE_ENV: "test",
        APP_RUNTIME_MODE: "demo",
        AI_PROVIDER: "demo",
        TRAVEL_DATA_PROVIDER: "demo",
        JWT_SECRET: "nuogo-isolated-api-restart-secret-for-tests-only",
        DEMO_PERSISTENCE_PATH: join(directory, "demo-state.json"),
        DEMO_ADMIN_EMAIL: "",
        DEMO_ADMIN_PASSWORD: ""
      },
      stdio: ["ignore", "pipe", "pipe"]
    });
    child.stdout.on("data", data => { output += data; });
    child.stderr.on("data", data => { output += data; });
    await expect.poll(async () => {
      if (child.exitCode !== null) throw new Error(`Isolated API exited: ${output}`);
      return request.get(`${api}/health`, { timeout: 1000 }).then(response => response.status()).catch(() => 0);
    }, { timeout: 15_000 }).toBe(200);
  }

  async function stop() {
    if (!child || child.exitCode !== null) return;
    const exited = once(child, "exit");
    child.kill();
    await exited;
  }

  try {
    await start();
    const credentials = { email: `restart-${Date.now()}@nuogo.test`, password: "Nuogo123!" };
    const registered = await request.post(`${api}/auth/register`, {
      data: { name: "Isolated Restart Traveller", ...credentials }
    });
    expect(registered.status()).toBe(201);
    const login = await request.post(`${api}/auth/login`, { data: credentials });
    expect(login.status()).toBe(200);
    const { token } = await login.json();
    const headers = { Authorization: `Bearer ${token}` };
    const generation = await request.post(`${api}/trips/generate`, {
      headers,
      data: {
        destination: "singapore", departurePoint: "Changi Airport", arrivalPoint: "Hotel in Singapore",
        startDate: "2026-10-10", endDate: "2026-10-12", travellerCount: 2,
        budgetMinor: 200000, currency: "SGD", interests: ["CULTURE", "FOOD"], preferredSights: [],
        transportPreferenceMode: "AUTO_CHEAPEST", preferredTransportModes: [],
        attractionSelectionMode: "AUTO", selectedAttractions: [], travelStyle: "BALANCED",
        dailyAttractionTarget: 2, rainyDayBackupEnabled: false, otherPreferences: "",
        language: "en", consentToLlmProcessing: true
      }
    });
    expect(generation.status()).toBe(201);
    const generated = await generation.json();
    expect(generated.state).toBe("FINAL_VALIDATED");
    const saved = await request.post(`${api}/trips/save-preview`, {
      headers, data: { preview: generated.preview, previewToken: generated.previewToken }
    });
    expect(saved.status()).toBe(201);
    const tripId = (await saved.json()).trip.id;

    await stop();
    await start();

    const session = await request.get(`${api}/auth/me`, { headers });
    expect(session.status()).toBe(200);
    expect((await session.json()).user.email).toBe(credentials.email);
    const reopened = await request.get(`${api}/trips/${tripId}`, { headers });
    expect(reopened.status()).toBe(200);
    const trip = (await reopened.json()).trip;
    expect(trip.id).toBe(tripId);
    expect(trip.persistenceScope).toBe("PERSISTENT");
    expect(trip.itineraryRun.itinerary.days.length).toBeGreaterThan(0);
    expect((await request.post(`${api}/auth/login`, { data: credentials })).status()).toBe(200);
  } finally {
    await stop();
    const resolved = await realpath(directory);
    if (dirname(resolved) !== await realpath(tmpdir()) || !basename(resolved).startsWith("nuogo-e2e-restart-")) {
      throw new Error("Refusing to clean outside the isolated API restart directory.");
    }
    await rm(resolved, { recursive: true, force: true });
  }
});
