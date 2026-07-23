import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const port = 5279;
const baseUrl = `http://127.0.0.1:${port}`;
const dataDir = mkdtempSync(join(tmpdir(), "route-photo-map-test-"));
const legacyProjectCode = "P-Z3XS7P";
writeFileSync(
  join(dataDir, "projects.json"),
  JSON.stringify({
    projects: [
      {
        code: legacyProjectCode,
        name: "legacy-six-character-project",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ownerUserId: null,
        sessions: [],
        primarySessionId: null,
      },
    ],
    shareLinks: [],
  }),
  "utf8",
);
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

  const legacyProjectResponse = await fetch(`${baseUrl}/api/projects/${legacyProjectCode}`);
  const legacyProject = await legacyProjectResponse.json();
  assert.equal(legacyProjectResponse.status, 200);
  assert.equal(legacyProject.code, legacyProjectCode);

  const pageResponse = await fetch(`${baseUrl}/`);
  const pageHtml = await pageResponse.text();
  assert.equal(pageResponse.status, 200);
  assert.match(pageHtml, /<script[^>]+app\.js/);
  assert.match(pageHtml, /20260723-compact-project-actions-1/);
  assert.match(pageHtml, /id="renameProjectBtn"/);
  assert.match(pageHtml, /id="followRouteBtn"/);
  assert.match(pageHtml, /id="shareConstructionToggleBtn"/);
  assert.match(pageHtml, /id="constructionVisibilityBtn"/);
  assert.match(pageHtml, /id="addConstructionPinBtn"/);
  assert.match(pageHtml, /document\.body\.classList\.add\("is-share-view", "is-share-loading"\)/);
  assert.match(pageHtml, /id="colorPickerConfirmBtn"[^>]*>선택 완료</);
  assert.doesNotMatch(pageHtml, /id="addMilestoneBtn"|id="destinationPhotoInput"|id="milestoneSection"/);
  const elementIds = [...pageHtml.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(elementIds).size, elementIds.length);
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
  assert.match(appSource, /findNearestRoutePosition[\s\S]+?speakRouteGuidance/);
  assert.match(appSource, /startShareViewVerification[\s\S]+?verifyShareView/);
  assert.match(appSource, /primarySession[\s\S]+?primaryPoints\.length > 0 \? primaryPoints : lastStatePoints/);
  assert.match(appSource, /ROUTE_COMPLETED_COLOR = "#1f7a57"[\s\S]+?ROUTE_REMAINING_COLOR = "#315f9e"/);
  assert.match(appSource, /\{ name: "노랑", value: BRIGHT_YELLOW_COLOR \}/);
  assert.match(appSource, /BRIGHT_YELLOW_COLOR = "#f2c400"/);
  assert.match(appSource, /normalized === "#c79a00" \|\| normalized === "#a97800"/);
  assert.match(appSource, /pinColor === BRIGHT_YELLOW_COLOR \? ";color:#3b3210"/);
  assert.match(appSource, /shareView: initialShareToken \? \{ loading: true \} : null/);
  assert.match(appSource, /if \(!initialShareToken\) \{\s*loadState\(\)/);
  assert.match(appSource, /match\(\/\^\\\/view\\\/\(\[A-Za-z0-9_-\]\+\)\\\/\?\$\/\)/);
  assert.match(appSource, /function toggleConstructionVisibility\(\)/);
  assert.match(appSource, /state\.constructionPinsVisible = !state\.constructionPinsVisible/);
  assert.match(appSource, /if \(state\.constructionPinsVisible\) \{[\s\S]+?\.addTo\(milestoneLayer\)/);
  assert.match(
    appSource,
    /function applyProject\(project\)[\s\S]+?milestoneLayer\.clearLayers\(\)[\s\S]+?state\.milestones = normalizeMilestones[\s\S]+?state\.points = \[\][\s\S]+?applyProjectMeta\(project\)/,
  );
  assert.match(appSource, /const copyButton = createPinIconButton\("코드 복사", "copy"\)/);
  assert.match(appSource, /async function copyProjectCode\(code\)/);
  assert.match(appSource, /const openButton = createPinIconButton\("열기", "open"\)/);
  assert.match(appSource, /memo\.textContent = pin\.memo\?\.trim\(\) \|\| "메모 없음"/);
  const milestoneRenderer = appSource.match(/function renderMilestones\(\)[\s\S]+?function updateMapPinPosition/);
  assert.ok(milestoneRenderer);
  assert.doesNotMatch(milestoneRenderer[0], /pin\.lat\.toFixed|pin\.lng\.toFixed/);
  assert.match(appSource, /const usesMapCenter = !options\.position && !state\.tracking/);
  assert.match(appSource, /usesMapCenter \? "map-center" : "map"/);
  assert.match(appSource, /options\.label \|\| \(fixedPosition \? "지도 화면 중앙" : "위치 정보 없음"\)/);
  assert.match(appSource, /if \(position && state\.tracking\) \{\s*state\.selectedPosition/);
  assert.match(appSource, /async function endShareLink\(token\)/);
  assert.match(appSource, /endButton\.textContent = "공유 종료"/);
  assert.doesNotMatch(appSource, /stopShareLink|stopButton\.textContent = "중지"/);
  assert.match(appSource, /customDate\.addEventListener\("input", renderShareExpiryControls\)/);
  assert.match(appSource, /createBtn\.disabled = !canShare \|\| \(usesCustomDate && !shareEls\.customDate\.value\)/);
  assert.match(
    appSource,
    /function clearData\(\)[\s\S]+?state\.adminPanelOpen = false;\s+state\.authPanelOpen = true;\s+state\.sharePanelOpen = false;/,
  );
  assert.match(appSource, /로그인 영역을 제외한 작업 영역을 숨겼습니다/);
  assert.match(appSource, /\{ name: "회색", value: "#3f4a46" \}/);
  assert.doesNotMatch(appSource, /dashArray:\s*"8 7"/);
  assert.match(css, /\.pin-icon-actions\s*\{[^}]*repeat\(4,\s*30px\)/s);
  assert.match(css, /\.pin-icon-button\s*\{[^}]*width:\s*30px;[^}]*height:\s*30px/s);
  assert.match(css, /\.color-picker-modal\s*\{/);
  assert.match(css, /\.field-action-group\s*\{[^}]*padding-top:\s*16px/s);
  assert.match(css, /#followRouteBtn\s*\{[^}]*min-height:\s*42px/s);
  assert.match(css, /#addConstructionPinBtn\s*\{[^}]*min-height:\s*42px/s);
  assert.match(css, /#constructionVisibilityBtn\s*\{[^}]*grid-column:\s*2;[^}]*min-height:\s*42px/s);
  assert.match(css, /\.my-project-actions\s*\{[^}]*grid-template-columns:\s*auto\s*auto\s*auto/s);
  assert.match(css, /\.my-project-item strong\s*\{[^}]*-webkit-line-clamp:\s*2/s);
  assert.match(
    css,
    /#followRouteBtn,[\s\S]+?#addConstructionPinBtn,[\s\S]+?#constructionVisibilityBtn\s*\{[^}]*min-height:\s*30px/s,
  );
  assert.match(css, /\.point-edit-row button,[\s\S]+?font-size:\s*12px;[\s\S]+?font-weight:\s*800/s);
  assert.doesNotMatch(css, /\.point-edit-row button,[\s\S]{0,220}?font-size:\s*10px/);
  assert.match(css, /\.route-follow-status\s*\{[^}]*background:\s*#fff1ee/s);
  assert.match(css, /\.is-share-view \.timeline-section,[\s\S]+?\.is-share-view \.history-section/s);
  assert.match(css, /\.is-share-view #recordControls\s*\{[^}]*display:\s*grid\s*!important/s);
  assert.match(css, /\.is-share-view \.share-construction-toggle:not\(\[hidden\]\)\s*\{[^}]*display:\s*inline-flex/s);
  assert.match(css, /\.is-share-loading \.control-panel\s*\{[^}]*pointer-events:\s*none/s);
  assert.match(css, /\.share-item\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s*auto\s*auto\s*auto/s);
  assert.match(css, /#shareCreateBtn\s*\{[^}]*grid-column:\s*2;[^}]*grid-row:\s*1/s);
  assert.match(css, /\.share-controls input:not\(\[hidden\]\)\s*\{[^}]*grid-column:\s*1\s*\/\s*-1;[^}]*grid-row:\s*2/s);

  const createResponse = await fetch(`${baseUrl}/api/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "smoke-test" }),
  });
  assert.equal(createResponse.status, 201);
  const project = await createResponse.json();
  assert.match(project.code, /^P-[A-HJ-NP-Z2-9]{4}$/);
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
  const privatePhotos = [
    {
      id: "private-photo",
      name: "공유 금지 사진",
      src: "https://example.invalid/private-photo.jpg",
      lat: 37.505,
      lng: 127.005,
      timestamp: 3,
    },
  ];
  const saveResponse = await fetch(`${baseUrl}/api/projects/${project.code}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "smoke-test",
      points: routePoints,
      photos: privatePhotos,
      milestones: constructionPins,
      sessions: [{ id: "route-1", points: routePoints, photos: privatePhotos }],
      primarySessionId: "route-1",
    }),
  });
  assert.equal(saveResponse.status, 200);
  const shareResponse = await fetch(`${baseUrl}/api/projects/${project.code}/share`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: "5d" }),
  });
  assert.equal(shareResponse.status, 201);
  const share = await shareResponse.json();
  const sharedResponse = await fetch(`${baseUrl}/api/share/${share.token}`);
  const sharedText = await sharedResponse.text();
  const shared = JSON.parse(sharedText);
  assert.equal(sharedResponse.status, 200);
  assert.equal(shared.project.code, "");
  assert.equal(shared.project.sessions.length, 1);
  assert.deepEqual(shared.project.sessions[0].points, routePoints);
  assert.deepEqual(shared.project.sessions[0].photos, []);
  assert.deepEqual(shared.project.lastState.photos, []);
  assert.equal(shared.project.lastState.milestones.length, 1);
  assert.equal(shared.project.lastState.milestones[0].displayCode, "D1");
  assert.equal(shared.project.lastState.milestones[0].color, "#315f9e");
  assert.doesNotMatch(sharedText, /private-photo|공유 금지 사진|example\.invalid/);
  const customExpiry = new Date(Date.now() + 1000 * 60 * 60 * 36).toISOString();
  const updateShareResponse = await fetch(`${baseUrl}/api/projects/${project.code}/share/${share.token}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: `custom:${customExpiry}` }),
  });
  const updatedShare = await updateShareResponse.json();
  assert.equal(updateShareResponse.status, 200);
  assert.equal(updatedShare.expiresAt, customExpiry);

  const deleteShareResponse = await fetch(
    `${baseUrl}/api/projects/${project.code}/share/${share.token}/delete`,
    { method: "DELETE" },
  );
  assert.equal(deleteShareResponse.status, 200);
  const deletedShareViewResponse = await fetch(`${baseUrl}/api/share/${share.token}`);
  assert.equal(deletedShareViewResponse.status, 404);

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
  console.log("Smoke test passed: route-only sharing, photo privacy, expiry/revocation, field UI, and storage guards work.");
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
