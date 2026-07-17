import assert from "node:assert/strict";
import test from "node:test";

import { fetchRoadRoute, normalizeRoadRoute } from "../js/directions-service.js";

const validPayload = Object.freeze({
  provider: "naver-directions-5",
  path: [
    [37.4562754, 126.703048],
    [37.452, 126.721],
    [37.4485429, 126.7400125],
  ],
  distanceMeters: 4860,
  durationMillis: 720000,
  routedAt: "2026-07-17T00:00:00.000Z",
});

test("normalizes a server-sanitized Naver road route", () => {
  const route = normalizeRoadRoute(validPayload);
  assert.deepEqual(route.path, validPayload.path);
  assert.equal(route.distanceMeters, 4860);
  assert.equal(route.durationMillis, 720000);
});

test("fetches a same-origin road route without browser credentials", async () => {
  const calls = [];
  const route = await fetchRoadRoute({
    from: { lat: 37.4562754, lng: 126.703048 },
    to: { lat: 37.4485429, lng: 126.7400125 },
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return new Response(JSON.stringify(validPayload), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  });

  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /^\/api\/directions\?/u);
  assert.match(calls[0].url, /start=126\.703048%2C37\.4562754/u);
  assert.equal(calls[0].options.headers.accept, "application/json");
  assert.equal(route.provider, "naver-directions-5");
});

test("rejects invalid paths and surfaces server configuration errors", async () => {
  assert.throws(
    () => normalizeRoadRoute({ ...validPayload, path: [[37.4, 126.7]] }),
    /valid road path/iu,
  );

  await assert.rejects(
    fetchRoadRoute({
      from: { lat: 37.4, lng: 126.7 },
      to: { lat: 37.5, lng: 126.8 },
      fetchImpl: async () => new Response(JSON.stringify({
        code: "directions_not_configured",
        message: "네이버 도로경로 인증정보가 설정되지 않았습니다.",
      }), { status: 503, headers: { "content-type": "application/json" } }),
    }),
    (error) => error.code === "directions_not_configured" && error.status === 503,
  );
});
