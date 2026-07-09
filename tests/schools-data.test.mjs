import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

// data/schools.json은 2026.4.1.자 인천 전체 960개교 + 사전계산 좌표가 정본이다.
// 과거 커밋 0f30b4c가 이 파일을 20개 샘플(좌표 없음)로 되돌려 위치 오류가 재발했다 — 그 회귀를 막는다.

const INCHEON_BOUNDS = Object.freeze({ latMin: 37.1, latMax: 37.99, lngMin: 124.5, lngMax: 126.85 });

const loadSchools = async () =>
  JSON.parse(await readFile(new URL("../data/schools.json", import.meta.url), "utf8"));

test("schools.json holds the full school list, not the 20-row sample", async () => {
  const schools = await loadSchools();
  assert.ok(schools.length >= 900, `expected >=900 schools, got ${schools.length}`);
});

test("every school has finite coordinates inside greater Incheon", async () => {
  const schools = await loadSchools();
  const offenders = schools.filter(
    (s) =>
      !Number.isFinite(s.lat) ||
      !Number.isFinite(s.lng) ||
      s.lat < INCHEON_BOUNDS.latMin ||
      s.lat > INCHEON_BOUNDS.latMax ||
      s.lng < INCHEON_BOUNDS.lngMin ||
      s.lng > INCHEON_BOUNDS.lngMax,
  );
  assert.deepEqual(
    offenders.map((s) => s.name).slice(0, 10),
    [],
    `${offenders.length} schools missing/out-of-bounds coordinates`,
  );
});
