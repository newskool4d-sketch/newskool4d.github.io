import assert from "node:assert/strict";
import test from "node:test";

import {
  buildImportPreview,
  buildImportPreviewFromCsv,
  buildImportPreviewFromWorkbook,
  inferHeaderMap,
  parseDelimitedText,
} from "../js/importer.js";

test("parses quoted CSV fields and infers Korean headers into canonical institutions", () => {
  // Given: a Korean CSV export with quoted commas, embedded newlines, coordinates, and a custom column.
  const csv = [
    "학교명,주소,관할지원청,기관유형,학교급,위도,경도,원본메모",
    '"인천,테스트초","인천광역시 남동구 정각로 9","동부교육지원청","초등학교","초","37.456","126.705","쉼표, 포함"',
    '"줄바꿈학교","인천광역시 연수구 예술로 1","동부","학교","중","37.45","126.70","첫 줄',
    '둘째 줄"',
  ].join("\n");

  // When: the importer builds a preview from CSV text.
  const preview = buildImportPreviewFromCsv(csv);

  // Then: canonical fields are mapped and custom fields remain local-only row data.
  assert.deepEqual(preview.counts, {
    total: 2,
    valid: 2,
    skipped: 0,
    duplicate: 0,
    preGeocoded: 2,
    missingAddress: 0,
  });
  assert.equal(preview.rows[0].name, "인천,테스트초");
  assert.equal(preview.rows[0].office, "east");
  assert.equal(preview.rows[0].type, "school");
  assert.equal(preview.rows[0].customFields.원본메모, "쉼표, 포함");
  assert.equal(preview.rows[1].customFields.원본메모, "첫 줄\n둘째 줄");
});

test("handles tabular paste, no-header rows, duplicate rows, and invalid rows", () => {
  // Given: headerless pasted rows where first two columns are name and address.
  const table = [
    "기관 A\t인천광역시 남동구 정각로 9\t메모 A",
    "기관 A\t인천광역시 남동구 정각로 9\t중복",
    "주소만 있는 행",
    "\t",
  ].join("\n");

  // When: the importer previews headerless tabular data.
  const preview = buildImportPreviewFromCsv(table);

  // Then: the first row imports, the duplicate is skipped with a warning, and malformed rows stay in failures.
  assert.equal(preview.counts.total, 4);
  assert.equal(preview.counts.valid, 1);
  assert.equal(preview.counts.skipped, 3);
  assert.equal(preview.counts.duplicate, 1);
  assert.equal(preview.counts.missingAddress, 2);
  assert.equal(preview.rows[0].name, "기관 A");
  assert.equal(preview.rows[0].address, "인천광역시 남동구 정각로 9");
  assert.equal(preview.rows[0].customFields.column_3, "메모 A");
  assert.ok(preview.warnings.some((warning) => warning.code === "duplicate_row"));
  assert.ok(preview.invalidRows.some((row) => row.errors.some((error) => error.code === "missing_location")));
});

test("retains custom fields while rejecting a row with no name and no address", () => {
  // Given: parsed rows from an uploaded sheet with weird headers and one empty required row.
  const input = {
    headers: ["시설명", "소재지", "weird memo", "기관유형"],
    rows: [
      ["교육시설", "인천광역시 미추홀구 석정로 165", "local only", "직속기관"],
      ["", "", "must fail", "학교"],
    ],
  };

  // When: the preview normalizes rows.
  const preview = buildImportPreview(input);

  // Then: custom data is retained only on valid local rows and the malformed row is excluded.
  assert.equal(preview.counts.valid, 1);
  assert.equal(preview.counts.skipped, 1);
  assert.equal(preview.rows.length, 1);
  assert.equal(preview.rows[0].customFields["weird memo"], "local only");
  assert.equal(preview.invalidRows[0].raw["weird memo"], "must fail");
  assert.deepEqual(
    preview.invalidRows[0].errors.map((error) => error.code).sort(),
    ["missing_location", "missing_name"],
  );
});

test("infers English and Korean header aliases including coordinates", () => {
  // Given: mixed English and Korean sheet headers.
  const headers = ["Institution Name", "Address", "office", "type", "학교급", "latitude", "longitude"];

  // When: header aliases are inferred.
  const inferred = inferHeaderMap(headers);

  // Then: every expected canonical field is mapped once.
  assert.equal(inferred.fields.name, 0);
  assert.equal(inferred.fields.address, 1);
  assert.equal(inferred.fields.office, 2);
  assert.equal(inferred.fields.type, 3);
  assert.equal(inferred.fields.level, 4);
  assert.equal(inferred.fields.lat, 5);
  assert.equal(inferred.fields.lng, 6);
});

test("adapts workbook sheets through a SheetJS-compatible boundary", () => {
  // Given: a minimal fake SheetJS adapter that exposes the same sheet_to_json shape used in browsers.
  const workbook = {
    SheetNames: ["기관"],
    Sheets: { 기관: {} },
  };
  const sheetjs = {
    utils: {
      sheet_to_json(sheet, options) {
        assert.equal(sheet, workbook.Sheets.기관);
        assert.equal(options.header, 1);
        return [
          ["기관명", "주소", "위도", "경도"],
          ["엑셀기관", "인천광역시 부평구 부평대로 168", 37.5, 126.7],
        ];
      },
    },
  };

  // When: workbook rows are adapted into the importer preview.
  const preview = buildImportPreviewFromWorkbook(workbook, { sheetjs });

  // Then: XLS/XLSX parsing is isolated behind the adapter and produces the same preview contract.
  assert.equal(preview.counts.valid, 1);
  assert.equal(preview.counts.preGeocoded, 1);
  assert.equal(preview.rows[0].name, "엑셀기관");
});

test("parses CRLF CSV without naive comma splitting", () => {
  // Given: Windows CSV text containing a comma inside quotes.
  const table = parseDelimitedText("기관명,주소\r\n\"쉼표,기관\",인천광역시 남동구 정각로 9\r\n");

  // When / Then: the quoted comma remains inside one field.
  assert.deepEqual(table.rows, [
    ["기관명", "주소"],
    ["쉼표,기관", "인천광역시 남동구 정각로 9"],
  ]);
});

test("maps designation headers (지정교유형) and normalizes multi-value designations", () => {
  // Given: an upload that tags schools as 연구학교/선도학교 via the unified template header.
  const csv = [
    "학교급,학교명,담당교육지원청,주소,지정교유형",
    "초,인천지정초등학교,동부,인천광역시 남동구 인주대로 1,연구학교;선도학교",
    "중,인천일반중학교,남부,인천광역시 중구 차이나타운로 1,",
  ].join("\n");

  const preview = buildImportPreviewFromCsv(csv);

  assert.equal(preview.counts.valid, 2);
  assert.equal(preview.rows[0].designation, "연구학교; 선도학교");
  assert.equal(preview.rows[0].level, "초");
  assert.equal(preview.rows[0].office, "east");
  assert.equal(preview.rows[1].designation, undefined);
});

test("designation header aliases resolve to the designation field", () => {
  const { fields } = inferHeaderMap(["학교명", "주소", "지정교", "학교성격"]);
  assert.equal(fields.name, 0);
  assert.equal(fields.address, 1);
  assert.equal(fields.designation, 2);
});

test("shipped sample template imports with zero skipped rows", async () => {
  const { readFile } = await import("node:fs/promises");
  const csv = await readFile(new URL("../data/institutions.sample.csv", import.meta.url), "utf8");
  const preview = buildImportPreviewFromCsv(csv);
  assert.equal(preview.counts.skipped, 0);
  assert.equal(preview.counts.valid, 4);
  const cheongna = preview.rows.find((row) => row.name === "인천청라초등학교");
  assert.equal(cheongna.designation, "연구학교; 선도학교");
  assert.equal(cheongna.office, "west");
  assert.equal(cheongna.level, "elem");
});
