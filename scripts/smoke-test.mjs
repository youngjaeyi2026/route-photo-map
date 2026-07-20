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
    MAX_BODY_BYTES: "256",
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

  const createResponse = await fetch(`${baseUrl}/api/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "smoke-test" }),
  });
  assert.equal(createResponse.status, 201);
  const project = await createResponse.json();
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
    body: JSON.stringify({ name: "x".repeat(1000) }),
  });
  const oversizedBody = await oversizedResponse.json();
  assert.equal(oversizedResponse.status, 413);
  assert.equal(oversizedBody.error, "request_body_too_large");
  console.log("Smoke test passed: UI serving, readiness, photo storage guard, and size protection work.");
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
