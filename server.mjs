import {
  appendFileSync,
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:http";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { networkInterfaces } from "node:os";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(import.meta.dirname);
const dataDir = process.env.DATA_DIR ? resolve(process.env.DATA_DIR) : join(root, "data");
const projectsPath = join(dataDir, "projects.json");
const port = Number(process.env.PORT || 5179);
const host = process.env.HOST || "0.0.0.0";
const logPath = join(root, "server-debug.log");
const maxBodyBytes = Number(process.env.MAX_BODY_BYTES || 120 * 1024 * 1024);
const maxPhotoBytes = Number(process.env.MAX_PHOTO_BYTES || 12 * 1024 * 1024);
const databaseUrl = process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.TIDB_DATABASE_URL || "";
const isProduction = process.env.NODE_ENV === "production" || Boolean(process.env.RAILWAY_ENVIRONMENT);
const sessionCookieName = "rpm_session";
const sessionTtlMs = 1000 * 60 * 60 * 24 * 30;
const defaultAdminEmails = new Set(
  (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => normalizeEmail(email))
    .filter(Boolean),
);
const r2Config = {
  bucket: process.env.R2_BUCKET || "",
  endpoint: process.env.R2_ENDPOINT || "",
  accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  publicBaseUrl: (process.env.R2_PUBLIC_BASE_URL || "").replace(/\/+$/, ""),
};
const shareExpiryOptions = new Map([
  ["1d", 1000 * 60 * 60 * 24],
  ["5d", 1000 * 60 * 60 * 24 * 5],
  ["7d", 1000 * 60 * 60 * 24 * 7],
  ["30d", 1000 * 60 * 60 * 24 * 30],
  ["none", null],
]);
const minPasswordLength = Number(process.env.MIN_PASSWORD_LENGTH || 8);

mkdirSync(dataDir, { recursive: true });

let mysqlPool = null;
let s3Client = null;

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host}`);
    if (url.pathname.startsWith("/api/")) {
      await handleApi(request, response, url);
      return;
    }
    serveStatic(url, response);
  } catch (error) {
    log(`ERROR ${error.stack || error.message}`);
    const status = Number(error.status) || 500;
    sendJson(response, status, {
      error: status >= 500 ? "server_error" : error.message,
      message: error.message,
    });
  }
});

async function handleApi(request, response, url) {
  let currentUser = null;

  if (request.method === "GET" && url.pathname.startsWith("/api/files/")) {
    await serveR2File(request, response, url);
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/health") {
    sendJson(response, 200, getHealthStatus());
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/ready") {
    const health = getHealthStatus();
    sendJson(response, health.ready ? 200 : 503, health);
    return;
  }

  currentUser = await getCurrentUser(request);

  if (request.method === "GET" && url.pathname === "/api/auth/me") {
    sendJson(response, 200, { user: publicUser(currentUser) });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/auth/session") {
    const body = await readJsonBody(request);
    const result = await loginOrRegister(body?.email, body?.password);
    if (!result.ok) {
      sendJson(response, result.status || 400, {
        error: result.error,
        ...(result.error === "password_too_short" ? { minPasswordLength } : {}),
      });
      return;
    }
    setSessionCookie(response, result.sessionId, request);
    sendJson(response, 200, { user: publicUser(result.user) });
    return;
  }

  if (request.method === "DELETE" && url.pathname === "/api/auth/session") {
    await deleteSession(getCookie(request, sessionCookieName));
    clearSessionCookie(response, request);
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/my/projects") {
    if (!currentUser) {
      sendJson(response, 401, { error: "login_required" });
      return;
    }
    sendJson(response, 200, { projects: await listUserProjects(currentUser) });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/admin/users") {
    if (!requireAdmin(currentUser, response)) {
      return;
    }
    sendJson(response, 200, { users: await listAdminUsers() });
    return;
  }

  const adminUserStatusMatch = url.pathname.match(/^\/api\/admin\/users\/([^/]+)\/status$/);
  if (adminUserStatusMatch && request.method === "PATCH") {
    if (!requireAdmin(currentUser, response)) {
      return;
    }
    const body = await readJsonBody(request);
    const result = await updateUserStatus(adminUserStatusMatch[1], body?.status, currentUser.id);
    if (!result.ok) {
      sendJson(response, result.status || 400, { error: result.error });
      return;
    }
    sendJson(response, 200, { user: result.user });
    return;
  }

  const adminUserPasswordMatch = url.pathname.match(/^\/api\/admin\/users\/([^/]+)\/password$/);
  if (adminUserPasswordMatch && request.method === "POST") {
    if (!requireAdmin(currentUser, response)) {
      return;
    }
    const body = await readJsonBody(request);
    const result = await resetUserPassword(adminUserPasswordMatch[1], body?.password);
    if (!result.ok) {
      sendJson(response, result.status || 400, { error: result.error });
      return;
    }
    sendJson(response, 200, { user: result.user, temporaryPassword: result.temporaryPassword });
    return;
  }

  const projectShareDeleteMatch = url.pathname.match(
    /^\/api\/projects\/([A-Z0-9-]+)\/share\/([A-Za-z0-9_-]+)\/delete$/,
  );
  if (projectShareDeleteMatch && request.method === "DELETE") {
    const code = normalizeProjectCode(projectShareDeleteMatch[1]);
    const token = projectShareDeleteMatch[2] || "";
    const project = await getProject(code);
    if (!project) {
      sendJson(response, 404, { error: "not_found" });
      return;
    }
    if (!canManageProject(currentUser, project)) {
      sendJson(response, 401, { error: "login_required" });
      return;
    }
    await removeShareLink(code, token);
    sendJson(response, 200, { ok: true });
    return;
  }

  const shareViewMatch = url.pathname.match(/^\/api\/share\/([A-Za-z0-9_-]+)$/);
  if (shareViewMatch && request.method === "GET") {
    const sharedProject = await getSharedProject(shareViewMatch[1]);
    if (!sharedProject) {
      sendJson(response, 404, { error: "share_not_found" });
      return;
    }
    sendJson(response, 200, sharedProject);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/projects") {
    if (databaseUrl && !currentUser) {
      sendJson(response, 401, { error: "login_required" });
      return;
    }
    const body = await readJsonBody(request);
    const project = await createProject(body?.name || "프로젝트A", currentUser);
    sendJson(response, 201, project);
    return;
  }

  const projectShareMatch = url.pathname.match(/^\/api\/projects\/([A-Z0-9-]+)\/share(?:\/([A-Za-z0-9_-]+))?$/);
  if (projectShareMatch && request.method === "GET") {
    const code = normalizeProjectCode(projectShareMatch[1]);
    const project = await getProject(code);
    if (!project) {
      sendJson(response, 404, { error: "not_found" });
      return;
    }
    if (!canManageProject(currentUser, project)) {
      sendJson(response, 401, { error: "login_required" });
      return;
    }
    sendJson(response, 200, { shares: await listProjectShares(code) });
    return;
  }

  if (projectShareMatch && request.method === "POST") {
    const code = normalizeProjectCode(projectShareMatch[1]);
    const project = await getProject(code);
    if (!project) {
      sendJson(response, 404, { error: "not_found" });
      return;
    }
    if (!canManageProject(currentUser, project)) {
      sendJson(response, 401, { error: "login_required" });
      return;
    }
    const body = await readJsonBody(request);
    sendJson(response, 201, await createShareLink(project, currentUser, body?.expiresIn || "5d"));
    return;
  }

  if (projectShareMatch && request.method === "DELETE") {
    const code = normalizeProjectCode(projectShareMatch[1]);
    const token = projectShareMatch[2] || "";
    const project = await getProject(code);
    if (!project) {
      sendJson(response, 404, { error: "not_found" });
      return;
    }
    if (!canManageProject(currentUser, project)) {
      sendJson(response, 401, { error: "login_required" });
      return;
    }
    await deactivateShareLink(code, token);
    sendJson(response, 200, { ok: true });
    return;
  }

  if (projectShareMatch && request.method === "PATCH") {
    const code = normalizeProjectCode(projectShareMatch[1]);
    const token = projectShareMatch[2] || "";
    const project = await getProject(code);
    if (!project) {
      sendJson(response, 404, { error: "not_found" });
      return;
    }
    if (!canManageProject(currentUser, project)) {
      sendJson(response, 401, { error: "login_required" });
      return;
    }
    const body = await readJsonBody(request);
    sendJson(response, 200, await updateShareLinkExpiry(code, token, body?.expiresIn || "5d"));
    return;
  }

  const projectMatch = url.pathname.match(/^\/api\/projects\/([A-Z0-9-]+)$/);
  const projectPhotoMatch = url.pathname.match(/^\/api\/projects\/([A-Z0-9-]+)\/photos$/);
  if (projectPhotoMatch && request.method === "POST") {
    const code = normalizeProjectCode(projectPhotoMatch[1]);
    const project = await getProject(code);
    if (!project) {
      sendJson(response, 404, { error: "not_found" });
      return;
    }
    if (!canManageProject(currentUser, project)) {
      sendJson(response, 403, { error: "project_access_denied" });
      return;
    }
    if (!isR2Configured()) {
      sendJson(response, 503, {
        error: "r2_not_configured",
        message: "photo_storage_not_configured",
      });
      return;
    }
    const contentType = String(request.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
    if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(contentType)) {
      sendJson(response, 415, { error: "unsupported_photo_type" });
      return;
    }
    const body = await readRequestBody(request, maxPhotoBytes);
    const photo = {
      id: decodeHeaderValue(request.headers["x-photo-id"]) || randomBytes(12).toString("hex"),
      displayName: decodeHeaderValue(request.headers["x-photo-name"]) || "photo",
    };
    const src = await uploadPhotoBufferToR2(code, photo, contentType, body);
    sendJson(response, 201, { src });
    return;
  }

  if (projectMatch && request.method === "GET") {
    const code = normalizeProjectCode(projectMatch[1]);
    const project = await getProject(code);
    if (!project) {
      sendJson(response, 404, { error: "not_found" });
      return;
    }
    if (!canManageProject(currentUser, project)) {
      sendJson(response, 401, { error: "login_required" });
      return;
    }
    sendJson(response, 200, project);
    return;
  }

  if (projectMatch && request.method === "PUT") {
    const code = normalizeProjectCode(projectMatch[1]);
    const existingProject = await getProject(code);
    if (!existingProject) {
      sendJson(response, 404, { error: "not_found" });
      return;
    }
    if (!canManageProject(currentUser, existingProject)) {
      sendJson(response, 403, { error: "project_access_denied" });
      return;
    }
    const body = await readJsonBody(request);
    const project = await saveProjectState(code, body, currentUser);
    sendJson(response, 200, project);
    return;
  }

  if (projectMatch && request.method === "DELETE") {
    const code = normalizeProjectCode(projectMatch[1]);
    const project = await getProject(code);
    if (!project) {
      sendJson(response, 404, { error: "not_found" });
      return;
    }
    if (!canManageProject(currentUser, project)) {
      sendJson(response, 401, { error: "login_required" });
      return;
    }
    await deleteProject(code);
    sendJson(response, 200, { ok: true });
    return;
  }

  sendJson(response, 404, { error: "not_found" });
}

async function createProject(name, user = null) {
  const now = new Date().toISOString();
  let code = "";
  do {
    code = generateProjectCode();
  } while (await getProject(code));

  const project = {
    code,
    name: String(name).trim() || "프로젝트A",
    createdAt: now,
    updatedAt: now,
    ownerUserId: user?.id || null,
    sessions: [],
    primarySessionId: null,
  };

  if (databaseUrl) {
    await upsertProject(project);
  } else {
    const db = readProjectsFile();
    db.projects.unshift(project);
    writeProjectsFile(db);
  }
  return project;
}

async function getProject(code) {
  if (databaseUrl) {
    return getProjectFromDatabase(code);
  }
  const db = readProjectsFile();
  return db.projects.find((project) => project.code === code) || null;
}

async function deleteProject(code) {
  if (databaseUrl) {
    const pool = await getMysqlPool();
    await ensureDatabase();
    await pool.execute("DELETE FROM share_links WHERE project_code = ?", [code]);
    await pool.execute("DELETE FROM projects WHERE code = ?", [code]);
    return;
  }
  const db = readProjectsFile();
  db.projects = (db.projects || []).filter((project) => project.code !== code);
  db.shareLinks = (db.shareLinks || []).filter((share) => share.projectCode !== code);
  writeProjectsFile(db);
}

async function saveProjectState(code, body, user = null) {
  const normalizedCode = normalizeProjectCode(code);
  const now = new Date().toISOString();
  const previous = (await getProject(normalizedCode)) || {
    code: normalizedCode,
    name: body?.name || "프로젝트A",
    createdAt: now,
    ownerUserId: user?.id || null,
    sessions: [],
    primarySessionId: null,
  };

  const prepared = await prepareProjectPayload(normalizedCode, {
    ...previous,
    ownerUserId: previous.ownerUserId || user?.id || null,
    name: String(body?.name || previous.name || "프로젝트A").trim(),
    updatedAt: now,
    sessions: Array.isArray(body?.sessions) ? body.sessions.slice(0, 50) : previous.sessions || [],
    primarySessionId:
      body?.primarySessionId ||
      previous.primarySessionId ||
      body?.sessions?.[0]?.id ||
      previous.sessions?.[0]?.id ||
      null,
    lastState: {
      points: Array.isArray(body?.points) ? body.points : [],
      photos: Array.isArray(body?.photos) ? body.photos : [],
      milestones: Array.isArray(body?.milestones) ? body.milestones : [],
      savedAt: now,
    },
  });

  if (databaseUrl) {
    await upsertProject(prepared);
  } else {
    const db = readProjectsFile();
    const index = db.projects.findIndex((item) => item.code === normalizedCode);
    if (index >= 0) {
      db.projects[index] = prepared;
    } else {
      db.projects.unshift(prepared);
    }
    writeProjectsFile(db);
  }

  return prepared;
}

async function createShareLink(project, user, expiresIn) {
  const now = new Date().toISOString();
  const token = generateShareToken();
  const expiresAt = resolveShareExpiresAt(expiresIn);
  const share = {
    token,
    projectCode: project.code,
    ownerUserId: user?.id || project.ownerUserId || null,
    expiresAt,
    active: true,
    createdAt: now,
    updatedAt: now,
  };

  if (databaseUrl) {
    await upsertShareLink(share);
  } else {
    const db = readProjectsFile();
    db.shareLinks = Array.isArray(db.shareLinks) ? db.shareLinks : [];
    db.shareLinks.unshift(share);
    writeProjectsFile(db);
  }
  return share;
}

async function listProjectShares(code) {
  if (databaseUrl) {
    return listProjectSharesFromDatabase(code);
  }
  const db = readProjectsFile();
  return (db.shareLinks || []).filter((share) => share.projectCode === code).map(normalizeShareLink);
}

async function deactivateShareLink(code, token) {
  if (!token) {
    return;
  }
  if (databaseUrl) {
    const pool = await getMysqlPool();
    await ensureDatabase();
    await pool.execute(
      "UPDATE share_links SET active = 0, updated_at = ? WHERE project_code = ? AND token = ?",
      [toMysqlDate(new Date().toISOString()), code, token],
    );
    return;
  }
  const db = readProjectsFile();
  db.shareLinks = (db.shareLinks || []).map((share) =>
    share.projectCode === code && share.token === token
      ? { ...share, active: false, updatedAt: new Date().toISOString() }
      : share,
  );
  writeProjectsFile(db);
}

async function removeShareLink(code, token) {
  if (!token) {
    return;
  }
  if (databaseUrl) {
    const pool = await getMysqlPool();
    await ensureDatabase();
    await pool.execute("DELETE FROM share_links WHERE project_code = ? AND token = ?", [code, token]);
    return;
  }
  const db = readProjectsFile();
  db.shareLinks = (db.shareLinks || []).filter((share) => !(share.projectCode === code && share.token === token));
  writeProjectsFile(db);
}

async function updateShareLinkExpiry(code, token, expiresIn) {
  const expiresAt = resolveShareExpiresAt(expiresIn);
  const updatedAt = new Date().toISOString();
  if (databaseUrl) {
    const pool = await getMysqlPool();
    await ensureDatabase();
    await pool.execute(
      "UPDATE share_links SET expires_at = ?, active = 1, updated_at = ? WHERE project_code = ? AND token = ?",
      [expiresAt ? toMysqlDate(expiresAt) : null, toMysqlDate(updatedAt), code, token],
    );
    return (await getShareLink(token)) || { token, projectCode: code, expiresAt, active: true, updatedAt };
  }
  const db = readProjectsFile();
  let updated = null;
  db.shareLinks = (db.shareLinks || []).map((share) => {
    if (share.projectCode === code && share.token === token) {
      updated = { ...share, expiresAt, active: true, updatedAt };
      return updated;
    }
    return share;
  });
  writeProjectsFile(db);
  return normalizeShareLink(updated);
}

function resolveShareExpiresAt(expiresIn) {
  const value = String(expiresIn || "5d");
  if (value.startsWith("custom:")) {
    const timestamp = new Date(value.slice("custom:".length)).getTime();
    if (Number.isFinite(timestamp) && timestamp > Date.now()) {
      return new Date(timestamp).toISOString();
    }
  }
  const duration = shareExpiryOptions.has(value) ? shareExpiryOptions.get(value) : shareExpiryOptions.get("5d");
  return duration === null ? null : new Date(Date.now() + duration).toISOString();
}

async function getSharedProject(token) {
  const share = await getShareLink(token);
  if (!isShareActive(share)) {
    return null;
  }
  const project = await getProject(share.projectCode);
  if (!project) {
    return null;
  }
  return {
    share: {
      token: share.token,
      expiresAt: share.expiresAt,
      active: share.active,
      createdAt: share.createdAt,
      updatedAt: share.updatedAt,
    },
    project: createSharedProjectView(project),
  };
}

function createSharedProjectView(project) {
  const sessions = Array.isArray(project.sessions) ? project.sessions : [];
  const primarySession =
    sessions.find((session) => session.id === project.primarySessionId) ||
    sessions[0] ||
    null;
  const routePoints = sanitizeSharedRoutePoints(
    Array.isArray(primarySession?.points) && primarySession.points.length > 0
      ? primarySession.points
      : project.lastState?.points,
  );
  const sharedSession = {
    id: "shared-route",
    name: "공유 노선",
    startedAt: primarySession?.startedAt || project.createdAt || null,
    endedAt: primarySession?.endedAt || project.updatedAt || null,
    distanceMeters: Number(primarySession?.distanceMeters || 0),
    points: routePoints,
    photos: [],
  };
  const milestones = Array.isArray(project.lastState?.milestones)
    ? project.lastState.milestones
        .filter((pin) => pin?.type === "construction")
        .map((pin) => ({
          id: pin.id,
          type: "construction",
          name: pin.name || "공사구역",
          memo: pin.memo || "",
          displayCode: pin.displayCode || pin.code || "",
          color: pin.color || "#c34236",
          lat: Number(pin.lat),
          lng: Number(pin.lng),
          createdAt: pin.createdAt || null,
        }))
        .filter((pin) => Number.isFinite(pin.lat) && Number.isFinite(pin.lng))
    : [];

  return {
    code: "",
    name: project.name || "공유 노선",
    createdAt: project.createdAt || null,
    updatedAt: project.updatedAt || null,
    primarySessionId: sharedSession.id,
    sessions: [sharedSession],
    lastState: {
      points: routePoints,
      photos: [],
      milestones,
      savedAt: project.lastState?.savedAt || project.updatedAt || null,
    },
  };
}

function sanitizeSharedRoutePoints(points) {
  if (!Array.isArray(points)) {
    return [];
  }
  return points
    .map((point) => ({
      lat: Number(point?.lat),
      lng: Number(point?.lng),
      timestamp: point?.timestamp || null,
      ...(Number.isFinite(Number(point?.accuracy)) ? { accuracy: Number(point.accuracy) } : {}),
      ...(point?.skipInRoute === true ? { skipInRoute: true } : {}),
    }))
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
}

async function prepareProjectPayload(code, project) {
  if (!isR2Configured()) {
    return project;
  }

  const photoMap = new Map();
  const lastStatePhotos = await uploadPhotoListToR2(code, project.lastState?.photos || [], photoMap);
  const sessions = [];
  for (const session of project.sessions || []) {
    sessions.push({
      ...session,
      photos: await uploadPhotoListToR2(code, session.photos || [], photoMap),
    });
  }

  return {
    ...project,
    sessions,
    lastState: {
      ...(project.lastState || {}),
      photos: lastStatePhotos,
    },
  };
}

async function uploadPhotoListToR2(code, photos, photoMap) {
  const uploaded = [];
  for (const photo of photos) {
    if (!photo?.src || !String(photo.src).startsWith("data:image/")) {
      uploaded.push(photo);
      continue;
    }

    const cacheKey = photo.id || photo.src.slice(0, 128);
    if (photoMap.has(cacheKey)) {
      uploaded.push({ ...photo, src: photoMap.get(cacheKey) });
      continue;
    }

    const url = await uploadDataUrlToR2(code, photo);
    photoMap.set(cacheKey, url);
    uploaded.push({ ...photo, src: url });
  }
  return uploaded;
}

async function uploadDataUrlToR2(code, photo) {
  const match = String(photo.src).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    return photo.src;
  }

  const [, contentType, base64] = match;
  const body = Buffer.from(base64, "base64");
  return uploadPhotoBufferToR2(code, photo, contentType, body);
}

async function uploadPhotoBufferToR2(code, photo, contentType, body) {
  const extension = getExtensionFromMime(contentType);
  const safeName = sanitizeFileName(photo.displayName || photo.name || photo.id || "photo");
  const safeId = sanitizeFileName(photo.id || Date.now());
  const key = `route-photo-map/${code}/photos/${safeName}-${safeId}${extension}`;
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  const client = await getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: r2Config.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );

  if (r2Config.publicBaseUrl) {
    return `${r2Config.publicBaseUrl}/${key}`;
  }
  return `/api/files/${key.split("/").map(encodeURIComponent).join("/")}`;
}

async function serveR2File(request, response, url) {
  if (!isR2Configured()) {
    sendJson(response, 404, { error: "r2_not_configured" });
    return;
  }

  const key = decodeURIComponent(url.pathname.replace(/^\/api\/files\//, ""));
  if (!key || key.includes("..") || key.startsWith("/")) {
    sendJson(response, 400, { error: "invalid_file_key" });
    return;
  }

  const { GetObjectCommand } = await import("@aws-sdk/client-s3");
  const client = await getS3Client();
  const object = await client.send(
    new GetObjectCommand({
      Bucket: r2Config.bucket,
      Key: key,
    }),
  );

  response.writeHead(200, {
    "Content-Type": object.ContentType || "application/octet-stream",
    "Cache-Control": "public, max-age=31536000, immutable",
  });
  object.Body.pipe(response);
}

async function getProjectFromDatabase(code) {
  const pool = await getMysqlPool();
  await ensureDatabase();
  const [rows] = await pool.execute("SELECT * FROM projects WHERE code = ? LIMIT 1", [code]);
  if (!rows.length) {
    return null;
  }
  return rowToProject(rows[0]);
}

async function upsertProject(project) {
  const pool = await getMysqlPool();
  await ensureDatabase();
  await pool.execute(
    `INSERT INTO projects
      (code, name, created_at, updated_at, owner_user_id, primary_session_id, sessions_json, last_state_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      updated_at = VALUES(updated_at),
      owner_user_id = COALESCE(projects.owner_user_id, VALUES(owner_user_id)),
      primary_session_id = VALUES(primary_session_id),
      sessions_json = VALUES(sessions_json),
      last_state_json = VALUES(last_state_json)`,
    [
      project.code,
      project.name,
      toMysqlDate(project.createdAt || new Date().toISOString()),
      toMysqlDate(project.updatedAt || new Date().toISOString()),
      project.ownerUserId || null,
      project.primarySessionId || null,
      JSON.stringify(project.sessions || []),
      JSON.stringify(project.lastState || null),
    ],
  );
}

async function ensureDatabase() {
  const pool = await getMysqlPool();
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(64) PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'active',
      role VARCHAR(32) NOT NULL DEFAULT 'user',
      created_at DATETIME(3) NOT NULL,
      last_login_at DATETIME(3) NULL,
      INDEX idx_users_email (email)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id VARCHAR(96) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      expires_at DATETIME(3) NOT NULL,
      created_at DATETIME(3) NOT NULL,
      INDEX idx_user_sessions_user_id (user_id),
      INDEX idx_user_sessions_expires_at (expires_at)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS projects (
      code VARCHAR(24) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      created_at DATETIME(3) NOT NULL,
      updated_at DATETIME(3) NOT NULL,
      owner_user_id VARCHAR(64) NULL,
      primary_session_id VARCHAR(128) NULL,
      sessions_json LONGTEXT NOT NULL,
      last_state_json LONGTEXT NULL,
      INDEX idx_projects_owner_user_id (owner_user_id),
      INDEX idx_projects_updated_at (updated_at)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS share_links (
      token VARCHAR(96) PRIMARY KEY,
      project_code VARCHAR(24) NOT NULL,
      owner_user_id VARCHAR(64) NULL,
      expires_at DATETIME(3) NULL,
      active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME(3) NOT NULL,
      updated_at DATETIME(3) NOT NULL,
      INDEX idx_share_links_project_code (project_code),
      INDEX idx_share_links_expires_at (expires_at)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);
  await ensureColumn("projects", "owner_user_id", "VARCHAR(64) NULL");
}

async function getMysqlPool() {
  if (mysqlPool) {
    return mysqlPool;
  }
  const mysql = await import("mysql2/promise");
  mysqlPool = mysql.createPool({
    uri: databaseUrl,
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 4),
    enableKeepAlive: true,
    ssl: process.env.DB_SSL === "false" ? undefined : { rejectUnauthorized: true },
  });
  return mysqlPool;
}

async function getS3Client() {
  if (s3Client) {
    return s3Client;
  }
  const { S3Client } = await import("@aws-sdk/client-s3");
  s3Client = new S3Client({
    region: "auto",
    endpoint: r2Config.endpoint,
    credentials: {
      accessKeyId: r2Config.accessKeyId,
      secretAccessKey: r2Config.secretAccessKey,
    },
  });
  return s3Client;
}

function rowToProject(row) {
  return {
    code: row.code,
    name: row.name,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    ownerUserId: row.owner_user_id || null,
    sessions: parseJson(row.sessions_json, []),
    primarySessionId: row.primary_session_id || null,
    lastState: parseJson(row.last_state_json, null),
  };
}

async function upsertShareLink(share) {
  const pool = await getMysqlPool();
  await ensureDatabase();
  await pool.execute(
    `INSERT INTO share_links
      (token, project_code, owner_user_id, expires_at, active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      expires_at = VALUES(expires_at),
      active = VALUES(active),
      updated_at = VALUES(updated_at)`,
    [
      share.token,
      share.projectCode,
      share.ownerUserId || null,
      share.expiresAt ? toMysqlDate(share.expiresAt) : null,
      share.active ? 1 : 0,
      toMysqlDate(share.createdAt || new Date().toISOString()),
      toMysqlDate(share.updatedAt || new Date().toISOString()),
    ],
  );
}

async function getShareLink(token) {
  if (databaseUrl) {
    const pool = await getMysqlPool();
    await ensureDatabase();
    const [rows] = await pool.execute("SELECT * FROM share_links WHERE token = ? LIMIT 1", [token]);
    return rows.length ? rowToShareLink(rows[0]) : null;
  }
  const db = readProjectsFile();
  return normalizeShareLink((db.shareLinks || []).find((share) => share.token === token));
}

async function listProjectSharesFromDatabase(code) {
  const pool = await getMysqlPool();
  await ensureDatabase();
  const [rows] = await pool.execute(
    "SELECT * FROM share_links WHERE project_code = ? ORDER BY created_at DESC LIMIT 20",
    [code],
  );
  return rows.map(rowToShareLink);
}

function rowToShareLink(row) {
  return normalizeShareLink({
    token: row.token,
    projectCode: row.project_code,
    ownerUserId: row.owner_user_id || null,
    expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
    active: Boolean(row.active),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  });
}

async function loginOrRegister(emailValue, passwordValue) {
  if (!databaseUrl) {
    return { ok: false, status: 503, error: "database_required" };
  }
  const email = normalizeEmail(emailValue);
  const password = String(passwordValue || "");
  if (!email || !password) {
    return { ok: false, status: 400, error: "invalid_credentials" };
  }

  const pool = await getMysqlPool();
  await ensureDatabase();
  const [rows] = await pool.execute("SELECT * FROM users WHERE email = ? LIMIT 1", [email]);
  let user = rows[0] || null;
  const now = new Date().toISOString();

  if (user) {
    if (user.status !== "active") {
      return { ok: false, status: 403, error: "account_disabled" };
    }
    if (!verifyPassword(password, user.password_hash)) {
      return { ok: false, status: 401, error: "invalid_credentials" };
    }
    if (isAdminEmail(user.email) && user.role !== "admin") {
      user.role = "admin";
      await pool.execute("UPDATE users SET role = 'admin' WHERE id = ?", [user.id]);
    }
  } else {
    if (password.length < minPasswordLength) {
      return { ok: false, status: 400, error: "password_too_short" };
    }
    user = {
      id: `U-${randomBytes(12).toString("hex")}`,
      email,
      password_hash: hashPassword(password),
      status: "active",
      role: isAdminEmail(email) ? "admin" : "user",
      created_at: toMysqlDate(now),
      last_login_at: null,
    };
    await pool.execute(
      `INSERT INTO users (id, email, password_hash, status, role, created_at, last_login_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user.id, user.email, user.password_hash, user.status, user.role, toMysqlDate(now), null],
    );
  }

  await pool.execute("UPDATE users SET last_login_at = ? WHERE id = ?", [toMysqlDate(now), user.id]);
  const sessionId = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + sessionTtlMs).toISOString();
  await pool.execute(
    "INSERT INTO user_sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
    [sessionId, user.id, toMysqlDate(expiresAt), toMysqlDate(now)],
  );
  return { ok: true, user, sessionId };
}

async function getCurrentUser(request) {
  if (!databaseUrl) {
    return null;
  }
  const sessionId = getCookie(request, sessionCookieName);
  if (!sessionId) {
    return null;
  }
  const pool = await getMysqlPool();
  await ensureDatabase();
  const [rows] = await pool.execute(
    `SELECT users.*
       FROM user_sessions
       JOIN users ON users.id = user_sessions.user_id
      WHERE user_sessions.id = ?
        AND user_sessions.expires_at > NOW(3)
      LIMIT 1`,
    [sessionId],
  );
  const user = rows[0] || null;
  if (!user || user.status !== "active") {
    return null;
  }
  if (isAdminEmail(user.email) && user.role !== "admin") {
    user.role = "admin";
    await pool.execute("UPDATE users SET role = 'admin' WHERE id = ?", [user.id]);
  }
  return user;
}

async function deleteSession(sessionId) {
  if (!databaseUrl || !sessionId) {
    return;
  }
  const pool = await getMysqlPool();
  await ensureDatabase();
  await pool.execute("DELETE FROM user_sessions WHERE id = ?", [sessionId]);
}

async function listUserProjects(user) {
  if (!databaseUrl || !user?.id) {
    return [];
  }
  const pool = await getMysqlPool();
  await ensureDatabase();
  const [rows] = await pool.execute(
    `SELECT code, name, created_at, updated_at, primary_session_id, sessions_json, last_state_json, owner_user_id
       FROM projects
      WHERE owner_user_id = ?
      ORDER BY updated_at DESC
      LIMIT 100`,
    [user.id],
  );
  return rows.map(rowToProject);
}

async function listAdminUsers() {
  if (!databaseUrl) {
    return [];
  }
  const pool = await getMysqlPool();
  await ensureDatabase();
  const [rows] = await pool.execute(
    `SELECT users.id,
            users.email,
            users.status,
            users.role,
            users.created_at,
            users.last_login_at,
            COUNT(projects.code) AS project_count
       FROM users
       LEFT JOIN projects ON projects.owner_user_id = users.id
      GROUP BY users.id, users.email, users.status, users.role, users.created_at, users.last_login_at
      ORDER BY users.created_at DESC
      LIMIT 200`,
  );
  return rows.map(rowToAdminUser);
}

async function updateUserStatus(userId, statusValue, currentUserId) {
  if (!databaseUrl) {
    return { ok: false, status: 503, error: "database_required" };
  }
  const status = statusValue === "disabled" ? "disabled" : statusValue === "active" ? "active" : "";
  if (!status) {
    return { ok: false, status: 400, error: "invalid_status" };
  }
  if (userId === currentUserId && status === "disabled") {
    return { ok: false, status: 400, error: "cannot_disable_self" };
  }
  const pool = await getMysqlPool();
  await ensureDatabase();
  await pool.execute("UPDATE users SET status = ? WHERE id = ?", [status, userId]);
  if (status === "disabled") {
    await pool.execute("DELETE FROM user_sessions WHERE user_id = ?", [userId]);
  }
  const [rows] = await pool.execute(
    `SELECT users.id,
            users.email,
            users.status,
            users.role,
            users.created_at,
            users.last_login_at,
            COUNT(projects.code) AS project_count
       FROM users
       LEFT JOIN projects ON projects.owner_user_id = users.id
      WHERE users.id = ?
      GROUP BY users.id, users.email, users.status, users.role, users.created_at, users.last_login_at
      LIMIT 1`,
    [userId],
  );
  return rows.length ? { ok: true, user: rowToAdminUser(rows[0]) } : { ok: false, status: 404, error: "not_found" };
}

async function resetUserPassword(userId, passwordValue) {
  if (!databaseUrl) {
    return { ok: false, status: 503, error: "database_required" };
  }
  const temporaryPassword = String(passwordValue || "").trim() || generateTemporaryPassword();
  if (temporaryPassword.length < minPasswordLength) {
    return { ok: false, status: 400, error: "invalid_password" };
  }
  const pool = await getMysqlPool();
  await ensureDatabase();
  await pool.execute("UPDATE users SET password_hash = ? WHERE id = ?", [hashPassword(temporaryPassword), userId]);
  await pool.execute("DELETE FROM user_sessions WHERE user_id = ?", [userId]);
  const [rows] = await pool.execute(
    `SELECT users.id,
            users.email,
            users.status,
            users.role,
            users.created_at,
            users.last_login_at,
            COUNT(projects.code) AS project_count
       FROM users
       LEFT JOIN projects ON projects.owner_user_id = users.id
      WHERE users.id = ?
      GROUP BY users.id, users.email, users.status, users.role, users.created_at, users.last_login_at
      LIMIT 1`,
    [userId],
  );
  return rows.length
    ? { ok: true, user: rowToAdminUser(rows[0]), temporaryPassword }
    : { ok: false, status: 404, error: "not_found" };
}

function rowToAdminUser(row) {
  return {
    id: row.id,
    email: row.email,
    status: row.status || "active",
    role: row.role || "user",
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    lastLoginAt: row.last_login_at ? new Date(row.last_login_at).toISOString() : null,
    projectCount: Number(row.project_count || 0),
  };
}

function publicUser(user) {
  if (!user) {
    return null;
  }
  return {
    id: user.id,
    email: user.email,
    role: user.role || "user",
    status: user.status || "active",
  };
}

function requireAdmin(user, response) {
  if (!user) {
    sendJson(response, 401, { error: "login_required" });
    return false;
  }
  if (user.role !== "admin") {
    sendJson(response, 403, { error: "admin_required" });
    return false;
  }
  return true;
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isAdminEmail(email) {
  return defaultAdminEmails.has(normalizeEmail(email));
}

function generateTemporaryPassword() {
  return `Rpm-${randomBytes(5).toString("base64url")}`;
}

function canManageProject(user, project) {
  if (!databaseUrl) {
    return true;
  }
  if (!user) {
    return false;
  }
  return user.role === "admin" || !project.ownerUserId || project.ownerUserId === user.id;
}

function generateShareToken() {
  return randomBytes(18).toString("base64url");
}

function normalizeShareLink(share) {
  if (!share) {
    return null;
  }
  return {
    token: share.token,
    projectCode: share.projectCode,
    ownerUserId: share.ownerUserId || null,
    expiresAt: share.expiresAt || null,
    active: share.active !== false,
    createdAt: share.createdAt || new Date().toISOString(),
    updatedAt: share.updatedAt || share.createdAt || new Date().toISOString(),
  };
}

function isShareActive(share) {
  if (!share || share.active === false) {
    return false;
  }
  if (!share.expiresAt) {
    return true;
  }
  return new Date(share.expiresAt).getTime() > Date.now();
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(String(password), salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const parts = String(storedHash || "").split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") {
    return false;
  }
  const [, salt, hash] = parts;
  const actual = Buffer.from(hash, "hex");
  const expected = scryptSync(String(password), salt, 64);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function getCookie(request, name) {
  const cookie = request.headers.cookie || "";
  return cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`))
    ?.slice(name.length + 1) || "";
}

function setSessionCookie(response, sessionId, request) {
  const secure = isSecureRequest(request);
  response.setHeader(
    "Set-Cookie",
    `${sessionCookieName}=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(sessionTtlMs / 1000)}${
      secure ? "; Secure" : ""
    }`,
  );
}

function clearSessionCookie(response, request) {
  const secure = isSecureRequest(request);
  response.setHeader(
    "Set-Cookie",
    `${sessionCookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`,
  );
}

function isSecureRequest(request) {
  return request.headers["x-forwarded-proto"] === "https" || request.headers["x-forwarded-ssl"] === "on";
}

async function ensureColumn(table, column, definition) {
  const pool = await getMysqlPool();
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS count
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?`,
    [table, column],
  );
  if (Number(rows[0]?.count || 0) === 0) {
    await pool.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function readProjectsFile() {
  if (!existsSync(projectsPath)) {
    return { projects: [], shareLinks: [] };
  }
  try {
    const parsed = JSON.parse(readFileSync(projectsPath, "utf8"));
    return {
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
      shareLinks: Array.isArray(parsed.shareLinks) ? parsed.shareLinks : [],
    };
  } catch {
    return { projects: [], shareLinks: [] };
  }
}

function writeProjectsFile(db) {
  writeFileSync(projectsPath, JSON.stringify(db, null, 2), "utf8");
}

function generateProjectCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "P-";
  for (let index = 0; index < 4; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

function normalizeProjectCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "");
}

function serveStatic(url, response) {
  const pathname = decodeURIComponent(url.pathname);
  const requestedPath =
    pathname === "/" || pathname.startsWith("/view/")
      ? "index.html"
      : normalize(pathname).replace(/^[/\\]+/, "").replace(/^(\.\.[/\\])+/, "");
  const filePath = join(root, requestedPath);

  if (!filePath.startsWith(root) || !existsSync(filePath)) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream",
    "Cache-Control": "no-store",
  });
  createReadStream(filePath).pipe(response);
}

function readJsonBody(request) {
  return readRequestBody(request, maxBodyBytes).then((body) => {
    if (body.length === 0) {
      return {};
    }
    try {
      return JSON.parse(body.toString("utf8"));
    } catch {
      throw createHttpError("invalid_json", 400);
    }
  });
}

function readRequestBody(request, limitBytes) {
  return new Promise((resolveBody, rejectBody) => {
    let size = 0;
    const chunks = [];
    let settled = false;
    request.on("data", (chunk) => {
      if (settled) {
        return;
      }
      size += chunk.length;
      if (size > limitBytes) {
        settled = true;
        rejectBody(createHttpError("request_body_too_large", 413));
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      if (!settled) {
        settled = true;
        resolveBody(Buffer.concat(chunks));
      }
    });
    request.on("error", (error) => {
      if (!settled) {
        settled = true;
        rejectBody(error);
      }
    });
  });
}

function createHttpError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function decodeHeaderValue(value) {
  try {
    return decodeURIComponent(String(value || ""));
  } catch {
    return String(value || "");
  }
}

function getHealthStatus() {
  const issues = [];
  if (isProduction && !databaseUrl) {
    issues.push("database_not_configured");
  }
  if (isProduction && !isR2Configured()) {
    issues.push("r2_not_configured");
  }
  return {
    ok: true,
    ready: issues.length === 0,
    environment: isProduction ? "production" : "development",
    storage: databaseUrl ? "tidb" : "local-json",
    files: isR2Configured() ? "cloudflare-r2" : "embedded-json",
    issues,
    limits: {
      projectBodyBytes: maxBodyBytes,
      photoBytes: maxPhotoBytes,
    },
    time: new Date().toISOString(),
  };
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

function isR2Configured() {
  return Boolean(r2Config.bucket && r2Config.endpoint && r2Config.accessKeyId && r2Config.secretAccessKey);
}

function sanitizeFileName(value) {
  return String(value || "photo")
    .trim()
    .replace(/[\\/:*?"<>|#%{}[\]^~`]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80) || "photo";
}

function getExtensionFromMime(contentType) {
  if (contentType === "image/png") return ".png";
  if (contentType === "image/webp") return ".webp";
  return ".jpg";
}

function toMysqlDate(value) {
  return new Date(value).toISOString().slice(0, 23).replace("T", " ");
}

function parseJson(value, fallback) {
  if (!value) {
    return fallback;
  }
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function log(message) {
  appendFileSync(logPath, `[${new Date().toISOString()}] ${message}\n`);
}

server.on("error", (error) => {
  log(`ERROR ${error.stack || error.message}`);
  console.error(error);
});

server.listen(port, host, () => {
  const lanUrls = getLanUrls(port);
  const health = getHealthStatus();
  const message = [
    `Route Photo Map running at http://127.0.0.1:${port}`,
    `Project storage: ${databaseUrl ? "TiDB/MySQL" : "local JSON"}`,
    `File storage: ${isR2Configured() ? "Cloudflare R2" : "embedded JSON"}`,
    `Readiness: ${health.ready ? "ready" : `not ready (${health.issues.join(", ")})`}`,
    ...lanUrls.map((url) => `Mobile URL: ${url}`),
  ].join("\n");
  log(message);
  console.log(message);
});

function getLanUrls(serverPort) {
  return Object.values(networkInterfaces())
    .flat()
    .filter((item) => item && item.family === "IPv4" && !item.internal)
    .map((item) => `http://${item.address}:${serverPort}`);
}

