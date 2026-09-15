import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { readFile } from "node:fs/promises";

// data/schools.json은 2026.4.1.자 인천 전체 967개교 + 사전계산 좌표가 정본이다.
// 과거 커밋 0f30b4c가 이 파일을 20개 샘플(좌표 없음)로 되돌려 위치 오류가 재발했다 — 그 회귀를 막는다.

const INCHEON_BOUNDS = Object.freeze({ latMin: 37.1, latMax: 37.99, lngMin: 124.5, lngMax: 126.85 });

const loadSchools = async () =>
  JSON.parse(await readFile(new URL("../data/schools.json", import.meta.url), "utf8"));

const loadInstitutions = async () =>
  JSON.parse(await readFile(new URL("../data/institutions.json", import.meta.url), "utf8"));

const loadDirectoryMetadata = async () =>
  JSON.parse(await readFile(new URL("../data/schools-directory-metadata.json", import.meta.url), "utf8"));

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

test("2026-04-01 directory contact fields are available across both school views", async () => {
  const schools = await loadSchools();
  const institutions = await loadInstitutions();
  const institutionSchools = new Map(
    institutions.filter((row) => row.type === "school").map((row) => [row.id, row]),
  );

  assert.equal(schools.length, 967);
  assert.ok(schools.every((school) => typeof school.phone === "string" && /\d/u.test(school.phone)));
  assert.ok(schools.filter((school) => school.website).length >= 750);
  assert.ok(schools.every((school) => !school.website || /^https?:\/\//u.test(school.website)));
  assert.equal(institutionSchools.size, schools.length);

  for (const school of schools) {
    const institution = institutionSchools.get(school.id);
    assert.ok(institution, `unified map missing ${school.id}`);
    assert.equal(institution.phone, school.phone);
    assert.equal(institution.website ?? "", school.website ?? "");
    assert.equal(institution.address, school.address);
  }
});

test("published school contacts retain a verifiable 2026-04-01 source fingerprint", async () => {
  const schools = await loadSchools();
  const metadata = await loadDirectoryMetadata();
  const projection = schools.map((school) => ([
    school.id,
    school.name,
    school.address,
    school.phone,
    school.website ?? "",
  ]));
  const projectionSha256 = createHash("sha256").update(JSON.stringify(projection)).digest("hex");

  assert.equal(metadata.sourceFilename, "학교현황_통합(홈페이지 추가)_2026-04-01.csv");
  assert.equal(metadata.sourceDate, "2026-04-01");
  assert.match(metadata.sourceSha256, /^[0-9a-f]{64}$/u);
  assert.equal(metadata.records, 967);
  assert.equal(metadata.directoryRecords, 967);
  assert.equal(metadata.matchedRecords, 967);
  assert.equal(metadata.unmatchedSchools, 0);
  assert.equal(metadata.unmatchedDirectory, 0);
  assert.equal(metadata.duplicateDirectoryRows, 0);
  assert.equal(metadata.phones, 967);
  assert.equal(metadata.websites, 756);
  assert.equal(projectionSha256, metadata.directoryProjectionSha256);
});
