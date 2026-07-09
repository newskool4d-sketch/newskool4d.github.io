import assert from "node:assert/strict";
import test from "node:test";

import { checkRow, districtFromAddress, validateRows } from "../tools/validate-coordinates.mjs";

test("extracts the district from an Incheon address", () => {
  assert.equal(districtFromAddress("인천광역시 남동구 정각로 9"), "남동구");
  assert.equal(districtFromAddress("인천광역시 강화군 불은면 중앙로 607"), "강화군");
  assert.equal(districtFromAddress("서울특별시 종로구 세종대로 1"), null);
});

test("normalizes known address typos and renamed districts", () => {
  assert.equal(districtFromAddress("인천광역시 님동구 어딘가 1"), "남동구");
  assert.equal(districtFromAddress("인천광역시 미추홀구구 어딘가 1"), "미추홀구");
  assert.equal(districtFromAddress("인천광역시 연수구구 어딘가 1"), "연수구");
  // 2026.7.1. 신설구 — 카카오 지오코딩 당시 기준 관할 구로 본다.
  assert.equal(districtFromAddress("인천광역시 영종구 영종대로 1"), "중구");
  assert.equal(districtFromAddress("인천광역시 검단구 원당대로 1"), "서구");
});

test("accepts coordinates inside the address district and flags far-away ones", () => {
  const good = checkRow({ name: "본청", address: "인천광역시 남동구 정각로 9", lat: 37.4562754, lng: 126.703048 });
  assert.equal(good.ok, true);

  // 남동구 주소인데 강화도 좌표 — 수십 km 오배치.
  const bad = checkRow({ name: "오배치", address: "인천광역시 남동구 정각로 9", lat: 37.7463, lng: 126.488 });
  assert.equal(bad.ok, false);
});

test("rows without coordinates or without a district are skipped, not failed", () => {
  assert.equal(checkRow({ name: "좌표 없음", address: "인천광역시 남동구 정각로 9" }).skipped, true);
  assert.equal(checkRow({ name: "관외", address: "김포시 어딘가", lat: 37.6, lng: 126.7 }).skipped, true);
});

test("validateRows summarizes offenders across a dataset", () => {
  const rows = [
    { name: "정상", address: "인천광역시 부평구 부평문화로53번길 35", lat: 37.4957395, lng: 126.7212777 },
    { name: "오배치", address: "인천광역시 연수구 경원대로 73", lat: 37.7746, lng: 126.4359 },
  ];
  const summary = validateRows(rows, "test.json");
  assert.equal(summary.checked, 2);
  assert.equal(summary.offenders.length, 1);
  assert.equal(summary.offenders[0].name, "오배치");
});
