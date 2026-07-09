import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

// schools.html이 자체 하드코딩한 지원청 주소·좌표가 검증된 단일 원천(data/institutions.json)과
// 어긋나면 지도 마커가 실제 청사에서 수 km 떨어진 곳에 찍힌다 (2026-07-09 위치 불일치 원인).

const OFFICE_CODES = ["main", "ganghwa", "south", "north", "east", "west"];

const loadInstitutionOffices = async () => {
  const rows = JSON.parse(await readFile(new URL("../data/institutions.json", import.meta.url), "utf8"));
  return new Map(
    rows
      .filter((row) => row.id?.startsWith("office-"))
      .map((row) => [row.id.replace("office-", ""), row]),
  );
};

const loadSchoolsHtmlOffices = async () => {
  const html = await readFile(new URL("../schools.html", import.meta.url), "utf8");
  const offices = new Map();
  const entryPattern = /code:\s*"(\w+)",[^\n]*?address:\s*"([^"]+)",\s*lat:\s*([\d.]+),\s*lng:\s*([\d.]+)/g;
  for (const match of html.matchAll(entryPattern)) {
    offices.set(match[1], { address: match[2], lat: Number(match[3]), lng: Number(match[4]) });
  }
  return offices;
};

test("schools.html office entries match verified institutions.json addresses and coordinates", async () => {
  const verified = await loadInstitutionOffices();
  const hardcoded = await loadSchoolsHtmlOffices();

  for (const code of OFFICE_CODES) {
    const expected = verified.get(code);
    const actual = hardcoded.get(code);
    assert.ok(expected, `institutions.json missing office-${code}`);
    assert.ok(actual, `schools.html missing office entry for code "${code}"`);
    assert.equal(actual.address, expected.address, `office-${code} address mismatch`);
    // 좌표는 소수점 표기 차이를 허용하되 100m 이내여야 한다.
    assert.ok(Math.abs(actual.lat - expected.lat) < 0.001, `office-${code} lat off: ${actual.lat} vs ${expected.lat}`);
    assert.ok(Math.abs(actual.lng - expected.lng) < 0.001, `office-${code} lng off: ${actual.lng} vs ${expected.lng}`);
  }
});
