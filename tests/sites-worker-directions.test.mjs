import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { buildWorkerSource } from "../tools/build-sites-worker.mjs";

// Deliberately does NOT import build-sites-worker.mjs's CLI write path here —
// only dist/server/index.js, exactly as committed, so a stale bundle fails
// this file's own tests instead of being silently rebuilt and masked
// (2026-07-17 review M1).
const { default: worker } = await import(`../dist/server/index.js?test=${Date.now()}`);
const alwaysAllowLimiter = { limit: async () => ({ success: true }) };

test("dist/server/index.js is byte-in-sync with its source assets", async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const committed = await readFile(path.join(root, "dist", "server", "index.js"), "utf8");
  const rebuilt = await buildWorkerSource();
  assert.equal(
    committed,
    rebuilt,
    "dist/server/index.js is stale — run `npm run build:sites` and commit the result",
  );
});

test("Sites worker keeps Directions disabled until both server credentials exist", async () => {
  const response = await worker.fetch(new Request(
    "https://example.test/api/directions?start=126.703048,37.4562754&goal=126.7400125,37.4485429",
  ), {});
  const payload = await response.json();

  assert.equal(response.status, 503);
  assert.equal(payload.code, "directions_not_configured");
});

test("Sites worker proxies Naver Directions and exposes only a sanitized road route", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    return new Response(JSON.stringify({
      code: 0,
      route: {
        traoptimal: [{
          summary: { distance: 4860, duration: 720000 },
          path: [
            [126.703048, 37.4562754],
            [126.721, 37.452],
            [126.7400125, 37.4485429],
          ],
        }],
      },
    }), { status: 200, headers: { "content-type": "application/json" } });
  };
  try {
    const response = await worker.fetch(new Request(
      "https://example.test/api/directions?start=126.703048,37.4562754&goal=126.7400125,37.4485429",
    ), {
      NAVER_DIRECTIONS_CLIENT_ID: "server-id",
      NAVER_DIRECTIONS_CLIENT_SECRET: "server-secret",
      DIRECTIONS_RATE_LIMITER: alwaysAllowLimiter,
    });
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.equal(calls.length, 1);
    assert.match(calls[0].url, /^https:\/\/naveropenapi\.apigw\.ntruss\.com\/map-direction\/v1\/driving\?/u);
    assert.match(calls[0].url, /option=traoptimal/u);
    assert.equal(calls[0].options.headers["x-ncp-apigw-api-key-id"], "server-id");
    assert.equal(calls[0].options.headers["x-ncp-apigw-api-key"], "server-secret");
    assert.deepEqual(payload.path[0], [37.4562754, 126.703048]);
    assert.equal(payload.distanceMeters, 4860);
    assert.equal(payload.durationMillis, 720000);
    assert.equal(JSON.stringify(payload).includes("server-secret"), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Sites worker attaches an 8-second upstream timeout signal and converts abort to a clean 502", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    // Simulates what a real AbortSignal.timeout(8000) firing looks like to
    // the caller: fetch rejects. This proves handleDirections' try/catch
    // converts an aborted upstream call into a stable 502, not a 5xx crash
    // or an unhandled rejection (2026-07-17 review M2).
    throw new DOMException("The operation was aborted.", "AbortError");
  };
  try {
    const response = await worker.fetch(new Request(
      "https://example.test/api/directions?start=126.703048,37.4562754&goal=126.7400125,37.4485429",
    ), {
      NAVER_DIRECTIONS_CLIENT_ID: "server-id",
      NAVER_DIRECTIONS_CLIENT_SECRET: "server-secret",
      DIRECTIONS_RATE_LIMITER: alwaysAllowLimiter,
    });
    assert.equal(calls.length, 1);
    assert.ok(
      calls[0].options.signal instanceof AbortSignal,
      "upstream fetch must carry an AbortSignal so a hung Naver Directions call cannot block the worker indefinitely",
    );
    assert.equal(response.status, 502);
    assert.equal((await response.json()).code, "directions_upstream_unavailable");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Sites worker fails closed when the distributed rate limiter is absent", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; return new Response("{}"); };
  try {
    const response = await worker.fetch(new Request(
      "https://example.test/api/directions?start=126.703048,37.4562754&goal=126.7400125,37.4485429",
    ), {
      NAVER_DIRECTIONS_CLIENT_ID: "server-id",
      NAVER_DIRECTIONS_CLIENT_SECRET: "server-secret",
    });
    assert.equal(response.status, 503);
    assert.equal((await response.json()).code, "directions_rate_limit_not_configured");
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Sites worker rejects out-of-Incheon and cross-site requests before upstream", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; return new Response("{}"); };
  const env = {
    NAVER_DIRECTIONS_CLIENT_ID: "server-id",
    NAVER_DIRECTIONS_CLIENT_SECRET: "server-secret",
  };
  try {
    const outside = await worker.fetch(new Request(
      "https://example.test/api/directions?start=126.5312,33.4996&goal=126.7400125,37.4485429",
    ), env);
    assert.equal(outside.status, 400);
    assert.equal((await outside.json()).code, "invalid_coordinates");

    const crossSite = await worker.fetch(new Request(
      "https://example.test/api/directions?start=126.703048,37.4562754&goal=126.7400125,37.4485429",
      { headers: { origin: "https://attacker.example", "sec-fetch-site": "cross-site" } },
    ), env);
    assert.equal(crossSite.status, 403);
    assert.equal((await crossSite.json()).code, "directions_origin_forbidden");
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Sites worker limits paid Directions requests per client and returns Retry-After", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response(JSON.stringify({
      code: 0,
      route: { traoptimal: [{
        summary: { distance: 4860, duration: 720000 },
        path: [[126.703048, 37.4562754], [126.7400125, 37.4485429]],
      }] },
    }), { status: 200, headers: { "content-type": "application/json" } });
  };
  const counts = new Map();
  const distributedLimiter = {
    async limit({ key }) {
      const count = (counts.get(key) ?? 0) + 1;
      counts.set(key, count);
      return { success: count <= 12 };
    },
  };
  const env = {
    NAVER_DIRECTIONS_CLIENT_ID: "server-id",
    NAVER_DIRECTIONS_CLIENT_SECRET: "server-secret",
    DIRECTIONS_RATE_LIMITER: distributedLimiter,
  };
  const request = () => new Request(
    "https://example.test/api/directions?start=126.703048,37.4562754&goal=126.7400125,37.4485429",
    { headers: { "cf-connecting-ip": "203.0.113.42" } },
  );
  try {
    const { default: workerA } = await import(`../dist/server/index.js?instance=a-${Date.now()}`);
    const { default: workerB } = await import(`../dist/server/index.js?instance=b-${Date.now()}`);
    for (let index = 0; index < 12; index += 1) {
      const instance = index % 2 === 0 ? workerA : workerB;
      assert.equal((await instance.fetch(request(), env)).status, 200);
    }
    const limited = await workerA.fetch(request(), env);
    assert.equal(limited.status, 429);
    assert.equal(limited.headers.get("retry-after"), "60");
    assert.equal((await limited.json()).code, "directions_rate_limited");
    assert.equal(calls, 12);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
