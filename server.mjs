import {
  appendFileSync,
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:http";
import { networkInterfaces } from "node:os";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(import.meta.dirname);
const dataDir = join(root, "data");
const projectsPath = join(dataDir, "projects.json");
const port = Number(process.env.PORT || 5179);
const host = process.env.HOST || "0.0.0.0";
const logPath = join(root, "server-debug.log");
const maxBodyBytes = Number(process.env.MAX_BODY_BYTES || 120 * 1024 * 1024);
const databaseUrl = process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.TIDB_DATABASE_URL || "";
const r2Config = {
  bucket: process.env.R2_BUCKET || "",
  endpoint: process.env.R2_ENDPOINT || "",
  accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  publicBaseUrl: (process.env.R2_PUBLIC_BASE_URL || "").replace(/\/+$/, ""),
};

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
    sendJson(response, 500, { error: "server_error", message: error.message });
  }
});

async function handleApi(request, response, url) {
  if (request.method === "GET" && url.pathname === "/api/health") {
    sendJson(response, 200, {
      ok: true,
      storage: databaseUrl ? "tidb" : "local-json",
      files: isR2Configured() ? "cloudflare-r2" : "embedded-json",
      time: new Date().toISOString(),
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/projects") {
    const body = await readJsonBody(request);
    const project = await createProject(body?.name || "프로젝트A");
    sendJson(response, 201, project);
    return;
  }

  const projectMatch = url.pathname.match(/^\/api\/projects\/([A-Z0-9-]+)$/);
  if (projectMatch && request.method === "GET") {
    const code = normalizeProjectCode(projectMatch[1]);
    const project = await getProject(code);
    if (!project) {
      sendJson(response, 404, { error: "not_found" });
      return;
    }
    sendJson(response, 200, project);
    return;
  }

  if (projectMatch && request.method === "PUT") {
    const code = normalizeProjectCode(projectMatch[1]);
    const body = await readJsonBody(request);
    const project = await saveProjectState(code, body);
    sendJson(response, 200, project);
    return;
  }

  sendJson(response, 404, { error: "not_found" });
}

async function createProject(name) {
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

async function saveProjectState(code, body) {
  const normalizedCode = normalizeProjectCode(code);
  const now = new Date().toISOString();
  const previous = (await getProject(normalizedCode)) || {
    code: normalizedCode,
    name: body?.name || "프로젝트A",
    createdAt: now,
    sessions: [],
    primarySessionId: null,
  };

  const prepared = await prepareProjectPayload(normalizedCode, {
    ...previous,
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
  const extension = getExtensionFromMime(contentType);
  const safeName = sanitizeFileName(photo.displayName || photo.name || photo.id || "photo");
  const key = `route-photo-map/${code}/photos/${safeName}-${photo.id || Date.now()}${extension}`;
  const body = Buffer.from(base64, "base64");
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

  return r2Config.publicBaseUrl ? `${r2Config.publicBaseUrl}/${key}` : key;
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
      (code, name, created_at, updated_at, primary_session_id, sessions_json, last_state_json)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      updated_at = VALUES(updated_at),
      primary_session_id = VALUES(primary_session_id),
      sessions_json = VALUES(sessions_json),
      last_state_json = VALUES(last_state_json)`,
    [
      project.code,
      project.name,
      toMysqlDate(project.createdAt || new Date().toISOString()),
      toMysqlDate(project.updatedAt || new Date().toISOString()),
      project.primarySessionId || null,
      JSON.stringify(project.sessions || []),
      JSON.stringify(project.lastState || null),
    ],
  );
}

async function ensureDatabase() {
  const pool = await getMysqlPool();
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS projects (
      code VARCHAR(24) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      created_at DATETIME(3) NOT NULL,
      updated_at DATETIME(3) NOT NULL,
      primary_session_id VARCHAR(128) NULL,
      sessions_json LONGTEXT NOT NULL,
      last_state_json LONGTEXT NULL,
      INDEX idx_projects_updated_at (updated_at)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);
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
    sessions: parseJson(row.sessions_json, []),
    primarySessionId: row.primary_session_id || null,
    lastState: parseJson(row.last_state_json, null),
  };
}

function readProjectsFile() {
  if (!existsSync(projectsPath)) {
    return { projects: [] };
  }
  try {
    const parsed = JSON.parse(readFileSync(projectsPath, "utf8"));
    return { projects: Array.isArray(parsed.projects) ? parsed.projects : [] };
  } catch {
    return { projects: [] };
  }
}

function writeProjectsFile(db) {
  writeFileSync(projectsPath, JSON.stringify(db, null, 2), "utf8");
}

function generateProjectCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "P-";
  for (let index = 0; index < 6; index += 1) {
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
    pathname === "/" ? "index.html" : normalize(pathname).replace(/^[/\\]+/, "").replace(/^(\.\.[/\\])+/, "");
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
  return new Promise((resolveBody, rejectBody) => {
    let size = 0;
    const chunks = [];
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBodyBytes) {
        rejectBody(new Error("request_body_too_large"));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      if (chunks.length === 0) {
        resolveBody({});
        return;
      }
      try {
        resolveBody(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        rejectBody(new Error("invalid_json"));
      }
    });
    request.on("error", rejectBody);
  });
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
  const message = [
    `Route Photo Map running at http://127.0.0.1:${port}`,
    `Project storage: ${databaseUrl ? "TiDB/MySQL" : "local JSON"}`,
    `File storage: ${isR2Configured() ? "Cloudflare R2" : "embedded JSON"}`,
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
