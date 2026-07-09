// 주소의 구·군과 좌표가 어긋난 행을 찾는다 (예: 남동구 주소인데 강화도 좌표).
// CI에서 data/*.json 3종을 검사해 오배치 데이터가 배포되는 것을 막는다.
// 경계값은 2026.4.1.자 960개교 실측 지오코딩 좌표의 구·군별 최소·최대에 여유(margin)를 더한 근사 상자다.
import { readFile } from "node:fs/promises";
import process from "node:process";

// 원본 엑셀에서 관찰된 주소 오타와 2026.7.1. 신설구(카카오 미인식)의 정규화 표.
const DISTRICT_NORMALIZATION = Object.freeze({
  님동구: "남동구",
  미추홀구구: "미추홀구",
  연수구구: "연수구",
  영종구: "중구",
  검단구: "서구",
});

// [latMin, latMax, lngMin, lngMax] — 강화·옹진은 도서 분포가 넓어 여유를 크게 둔다.
const DISTRICT_BOUNDS = Object.freeze({
  강화군: [37.55, 37.86, 126.18, 126.60],
  계양구: [37.50, 37.60, 126.67, 126.80],
  남동구: [37.36, 37.50, 126.66, 126.78],
  동구: [37.44, 37.51, 126.60, 126.68],
  미추홀구: [37.41, 37.50, 126.60, 126.72],
  부평구: [37.45, 37.55, 126.67, 126.78],
  서구: [37.46, 37.65, 126.58, 126.75],
  연수구: [37.34, 37.46, 126.58, 126.73],
  옹진군: [37.00, 38.00, 124.50, 126.70],
  중구: [37.36, 37.55, 126.36, 126.68],
});

export const districtFromAddress = (address) => {
  const match = String(address ?? "").match(/인천광역시\s*([가-힣]+[구군])/u);
  if (!match) return null;
  const raw = match[1];
  return DISTRICT_NORMALIZATION[raw] ?? (DISTRICT_BOUNDS[raw] ? raw : null);
};

export const checkRow = (row) => {
  const district = districtFromAddress(row?.address);
  const lat = Number(row?.lat);
  const lng = Number(row?.lng);
  if (!district || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { ok: true, skipped: true };
  }
  const [latMin, latMax, lngMin, lngMax] = DISTRICT_BOUNDS[district];
  const ok = lat >= latMin && lat <= latMax && lng >= lngMin && lng <= lngMax;
  return { ok, skipped: false, district };
};

export const validateRows = (rows, source) => {
  const offenders = [];
  let checked = 0;
  let skipped = 0;
  for (const row of rows) {
    const result = checkRow(row);
    if (result.skipped) {
      skipped += 1;
      continue;
    }
    checked += 1;
    if (!result.ok) {
      offenders.push({ source, name: row.name ?? row.id ?? "(이름 없음)", address: row.address, lat: row.lat, lng: row.lng, district: result.district });
    }
  }
  return { source, checked, skipped, offenders };
};

const DATA_FILES = ["data/schools.json", "data/institutions.json", "data/infra.json"];

const main = async () => {
  let failed = false;
  for (const file of DATA_FILES) {
    const rows = JSON.parse(await readFile(new URL(`../${file}`, import.meta.url), "utf8"));
    const summary = validateRows(rows, file);
    console.log(`${file}: ${summary.checked} checked, ${summary.skipped} skipped, ${summary.offenders.length} offenders`);
    for (const offender of summary.offenders) {
      failed = true;
      console.error(`  ✖ ${offender.name} | ${offender.address} | ${offender.lat},${offender.lng} (expected inside ${offender.district})`);
    }
  }
  if (failed) {
    process.exitCode = 1;
  }
};

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, "/")}`).href) {
  await main();
}
