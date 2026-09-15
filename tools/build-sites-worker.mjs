import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "dist", "server", "index.js");

const textAssets = [
  "index.html",
  "schools.html",
  "infrastructure.html",
  "unified-map.html",
  "shared.css",
  "atlas-theme.css",
  "shared.js",
  "vendor/xlsx.full.min.js",
  "data/connections.json",
  "data/infra.json",
  "data/institutions.json",
  "data/institutions.sample.csv",
  "data/schools.json",
  "js/connection-layer.js",
  "js/constants.js",
  "js/directions-service.js",
  "js/geocode-cache.js",
  "js/geocode-queue.js",
  "js/importer.js",
  "js/institution-repository.js",
  "js/institution-schema.js",
  "js/map-layers.js",
  "js/map-provider.js",
  "js/storage.js",
  "js/unified-map-app.js",
];

const DIRECTIONS_UPSTREAM_TIMEOUT_MS = 8000;

const typeFor = (file) => {
  if (file.endsWith(".html")) return "text/html; charset=utf-8";
  if (file.endsWith(".css")) return "text/css; charset=utf-8";
  if (file.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (file.endsWith(".json")) return "application/json; charset=utf-8";
  if (file.endsWith(".csv")) return "text/csv; charset=utf-8";
  return "text/plain; charset=utf-8";
};

// Builds the worker source as a string, without touching the filesystem beyond
// reading the source assets. Exported so tests can assert dist/server/index.js
// stays in sync with sources without the act of testing silently rebuilding
// (and thereby masking) a stale committed artifact.
export async function buildWorkerSource() {
  const entries = await Promise.all(textAssets.map(async (file) => {
    const value = await readFile(path.join(root, file), "utf8");
    return [`/${file.replaceAll("\\", "/")}`, value, typeFor(file)];
  }));

  const assets = Object.fromEntries(entries.map(([route, value]) => [route, value]));
  const types = Object.fromEntries(entries.map(([route, , type]) => [route, type]));
  const fontBase64 = (await readFile(path.join(root, "assets", "fonts", "incheon-edu-himchan-display.woff2"))).toString("base64");

  return `const ASSETS = ${JSON.stringify(assets)};
const TYPES = ${JSON.stringify(types)};
const FONT_BASE64 = ${JSON.stringify(fontBase64)};
const DIRECTIONS_UPSTREAM_TIMEOUT_MS = ${DIRECTIONS_UPSTREAM_TIMEOUT_MS};

function decodeBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

function parseCoordinatePair(value) {
  const parts = String(value || "").split(",");
  if (parts.length !== 2) return null;
  const lng = Number(parts[0]);
  const lat = Number(parts[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lng < 124.5 || lng > 126.85 || lat < 37.1 || lat > 37.99) return null;
  return { lng, lat };
}

function directionClientKey(request) {
  return String(
    request.headers.get("cf-connecting-ip")
      || request.headers.get("x-forwarded-for")
      || "anonymous"
  ).split(",")[0].trim().slice(0, 80);
}

async function consumeDirectionQuota(request, env) {
  const limiter = env && env.DIRECTIONS_RATE_LIMITER;
  if (!limiter || typeof limiter.limit !== "function") {
    return { configured: false, allowed: false };
  }
  const result = await limiter.limit({ key: directionClientKey(request) });
  return { configured: true, allowed: Boolean(result && result.success) };
}

function isSameSiteRequest(request, url) {
  const fetchSite = String(request.headers.get("sec-fetch-site") || "").toLowerCase();
  if (fetchSite === "cross-site") return false;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).origin === url.origin;
  } catch {
    return false;
  }
}

async function handleDirections(request, env, url) {
  if (request.method !== "GET") {
    return jsonResponse({ code: "method_not_allowed", message: "GET 요청만 지원합니다." }, 405);
  }
  const clientId = String(env && env.NAVER_DIRECTIONS_CLIENT_ID || "").trim();
  const clientSecret = String(env && env.NAVER_DIRECTIONS_CLIENT_SECRET || "").trim();
  if (!clientId || !clientSecret) {
    return jsonResponse({ code: "directions_not_configured", message: "네이버 도로경로 인증정보가 설정되지 않았습니다." }, 503);
  }
  if (!isSameSiteRequest(request, url)) {
    return jsonResponse({ code: "directions_origin_forbidden", message: "현재 사이트에서 보낸 도로경로 요청만 지원합니다." }, 403);
  }
  const start = parseCoordinatePair(url.searchParams.get("start"));
  const goal = parseCoordinatePair(url.searchParams.get("goal"));
  if (!start || !goal) {
    return jsonResponse({ code: "invalid_coordinates", message: "인천 권역의 유효한 시작·도착 좌표가 필요합니다." }, 400);
  }
  const quota = await consumeDirectionQuota(request, env);
  if (!quota.configured) {
    return jsonResponse({ code: "directions_rate_limit_not_configured", message: "도로경로 요청 제한기가 설정되지 않았습니다." }, 503);
  }
  if (!quota.allowed) {
    const response = jsonResponse({ code: "directions_rate_limited", message: "도로경로 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." }, 429);
    response.headers.set("retry-after", "60");
    return response;
  }
  const upstreamUrl = new URL("https://naveropenapi.apigw.ntruss.com/map-direction/v1/driving");
  upstreamUrl.search = new URLSearchParams({
    start: start.lng + "," + start.lat,
    goal: goal.lng + "," + goal.lat,
    option: "traoptimal",
    lang: "ko"
  }).toString();
  let upstream;
  try {
    upstream = await fetch(upstreamUrl, {
      headers: {
        "accept": "application/json",
        "x-ncp-apigw-api-key-id": clientId,
        "x-ncp-apigw-api-key": clientSecret
      },
      signal: typeof AbortSignal.timeout === "function" ? AbortSignal.timeout(DIRECTIONS_UPSTREAM_TIMEOUT_MS) : undefined
    });
  } catch {
    return jsonResponse({ code: "directions_upstream_unavailable", message: "네이버 도로경로 서비스에 연결하지 못했습니다." }, 502);
  }
  const payload = await upstream.json().catch(() => null);
  const route = payload && payload.route && payload.route.traoptimal && payload.route.traoptimal[0];
  if (!upstream.ok || payload?.code !== 0 || !route) {
    return jsonResponse({ code: "directions_upstream_error", message: "네이버 도로경로를 계산하지 못했습니다." }, 502);
  }
  const rawPath = Array.isArray(route.path) ? route.path : [];
  const path = rawPath.map((point) => (
    Array.isArray(point) && point.length === 2 && Number.isFinite(Number(point[0])) && Number.isFinite(Number(point[1]))
      ? [Number(point[1]), Number(point[0])]
      : null
  ));
  const distanceMeters = Number(route.summary?.distance);
  const durationMillis = Number(route.summary?.duration);
  if (path.length < 2 || path.length > 10000 || path.some((point) => point === null)
      || !Number.isFinite(distanceMeters) || distanceMeters < 0
      || !Number.isFinite(durationMillis) || durationMillis < 0) {
    return jsonResponse({ code: "invalid_directions_response", message: "도로경로 응답 형식이 올바르지 않습니다." }, 502);
  }
  return jsonResponse({
    provider: "naver-directions-5",
    path,
    distanceMeters,
    durationMillis,
    routedAt: new Date().toISOString()
  });
}

const worker = {
  async fetch(request, env = {}) {
    const url = new URL(request.url);
    if (url.pathname === "/api/directions") return handleDirections(request, env, url);
    const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
    if (pathname === "/assets/fonts/incheon-edu-himchan-display.woff2") {
      return new Response(decodeBase64(FONT_BASE64), {
        headers: { "content-type": "font/woff2", "cache-control": "public, max-age=31536000, immutable" }
      });
    }
    if (Object.hasOwn(ASSETS, pathname)) {
      return new Response(ASSETS[pathname], {
        headers: { "content-type": TYPES[pathname], "cache-control": pathname.endsWith(".html") ? "no-cache" : "public, max-age=300" }
      });
    }
    return new Response("Not found", { status: 404 });
  }
};

export default worker;
`;
}

const isMainModule = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  const worker = await buildWorkerSource();
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, worker, "utf8");
  console.log(`Built ${path.relative(root, output)} with ${textAssets.length} text assets and one font.`);
}
