import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const port = 5279;
const baseUrl = `http://127.0.0.1:${port}`;
const dataDir = mkdtempSync(join(tmpdir(), "route-photo-map-test-"));
const child = spawn(process.execPath, ["server.mjs"], {
  cwd: new URL("..", import.meta.url),
  env: {
    ...process.env,
    PORT: String(port),
    HOST: "127.0.0.1",
    NODE_ENV: "production",
    RAILWAY_ENVIRONMENT: "",
    DATABASE_URL: "",
    MYSQL_URL: "",
    TIDB_DATABASE_URL: "",
    R2_BUCKET: "",
    R2_ENDPOINT: "",
    R2_ACCESS_KEY_ID: "",
    R2_SECRET_ACCESS_KEY: "",
    DATA_DIR: dataDir,
    MAX_BODY_BYTES: "4096",
  },
  stdio: ["ignore", "pipe", "pipe"],
});

const output = [];
child.stdout.on("data", (chunk) => output.push(chunk.toString()));
child.stderr.on("data", (chunk) => output.push(chunk.toString()));

try {
  const health = await waitForHealth();
  assert.equal(health.response.status, 200);
  assert.equal(health.body.ok, true);
  assert.equal(health.body.ready, false);
  assert.equal(health.body.environment, "production");
  assert.deepEqual(health.body.issues.sort(), ["database_not_configured", "r2_not_configured"]);

  const readyResponse = await fetch(`${baseUrl}/api/ready`);
  const readyBody = await readyResponse.json();
  assert.equal(readyResponse.status, 503);
  assert.equal(readyBody.ready, false);

  const pageResponse = await fetch(`${baseUrl}/`);
  const pageHtml = await pageResponse.text();
  assert.equal(pageResponse.status, 200);
  assert.match(pageHtml, /<script[^>]+app\.js/);
  assert.match(pageHtml, /20260723-construction-share-1/);
  const cssResponse = await fetch(`${baseUrl}/styles.css`);
  const css = await cssResponse.text();
  assert.equal(cssResponse.status, 200);
  assert.match(css, /\.control-panel\s*>\s*\*\s*\{[^}]*flex-shrink:\s*0/s);
  const appResponse = await fetch(`${baseUrl}/app.js`);
  const appSource = await appResponse.text();
  assert.equal(appResponse.status, 200);
  assert.match(
    appSource,
    /state\.milestones = normalizeMilestones\([\s\S]+?const primarySession[\s\S]+?if \(primarySession\)/,
  );
  assert.match(appSource, /displayCode[\s\S]+?normalizeConstructionColor/);

  const createResponse = await fetch(`${baseUrl}/api/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "smoke-test" }),
  });
  assert.equal(createResponse.status, 201);
  const project = await createResponse.json();
  const routePoints = [
    { lat: 37.5, lng: 127, timestamp: 1 },
    { lat: 37.51, lng: 127.01, timestamp: 2 },
  ];
  const constructionPins = [
    {
      id: "construction-1",
      type: "construction",
      name: "상수도 공사",
      displayCode: "D1",
      color: "#315f9e",
      lat: 37.505,
      lng: 127.005,
      createdAt: 1,
    },
  ];
  const saveResponse = await fetch(`${baseUrl}/api/projects/${project.code}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "smoke-test",
      points: routePoints,
      photos: [],
      milestones: constructionPins,
      sessions: [{ id: "route-1", points: routePoints, photos: [] }],
      primarySessionId: "route-1",
    }),
  });
  assert.equal(saveResponse.status, 200);
  const shareResponse = await fetch(`${baseUrl}/api/projects/${project.code}/share`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: "7d" }),
  });
  assert.equal(shareResponse.status, 201);
  const share = await shareResponse.json();
  const sharedResponse = await fetch(`${baseUrl}/api/share/${share.token}`);
  const shared = await sharedResponse.json();
  assert.equal(sharedResponse.status, 200);
  assert.deepEqual(shared.project.sessions[0].points, routePoints);
  assert.deepEqual(shared.project.lastState.milestones, constructionPins);

  const photoResponse = await fetch(`${baseUrl}/api/projects/${project.code}/photos`, {
    method: "POST",
    headers: { "Content-Type": "image/jpeg" },
    body: new Uint8Array([0xff, 0xd8, 0xff, 0xd9]),
  });
  const photoBody = await photoResponse.json();
  assert.equal(photoResponse.status, 503);
  assert.equal(photoBody.error, "r2_not_configured");

  const oversizedResponse = await fetch(`${baseUrl}/api/projects/${project.code}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "x".repeat(5000) }),
  });
  const oversizedBody = await oversizedResponse.json();
  assert.equal(oversizedResponse.status, 413);
  assert.equal(oversizedBody.error, "request_body_too_large");
  console.log("Smoke test passed: UI, shared route/construction data, storage guard, and size protection work.");
} finally {
  child.kill();
  rmSync(dataDir, { recursive: true, force: true });
}

async function waitForHealth() {
  let lastError = null;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      return { response, body: await response.json() };
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error(`Server did not become ready. ${lastError?.message || ""}\n${output.join("")}`);
}
