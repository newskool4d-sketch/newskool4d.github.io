import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  normalizeInstitutionType,
  normalizeOffice,
  validateConnectionSet,
  validateInstitution,
  validateInstitutionList,
} from "../js/institution-schema.js";

const readJson = async (relativePath) => {
  const url = new URL(relativePath, import.meta.url);
  return JSON.parse(await readFile(url, "utf8"));
};

test("validates canonical sample institutions when rows include required location data", async () => {
  // Given: representative public seed rows in the canonical static dataset.
  const rows = await readJson("../data/institutions.json");

  // When: the schema validator parses the dataset.
  const result = validateInstitutionList(rows);

  // Then: every row is accepted and normalized with required canonical fields.
  assert.equal(result.isValid, true, JSON.stringify(result.errors));
  assert.equal(result.errors.length, 0);
  assert.equal(result.rows.length, rows.length);
  assert.ok(result.rows.every((row) => row.id && row.name && row.type && row.office && row.officeSource));
  assert.ok(
    result.rows.every((row) => (
      Number.isFinite(row.lat) && Number.isFinite(row.lng)
    ) || row.address.length > 0),
  );
});

test("normalizes office and type aliases when Korean or legacy labels are supplied", () => {
  // Given: labels used by current pages, likely uploaded sheets, and legacy datasets.
  const officeCases = new Map([
    ["본청", "main"],
    ["인천광역시교육청", "main"],
    ["강화교육지원청", "ganghwa"],
    ["남부", "south"],
    ["북부교육지원청", "north"],
    ["동부", "east"],
    ["서부교육지원청", "west"],
    ["", "unassigned"],
    ["알수없음", "unassigned"],
  ]);
  const typeCases = new Map([
    ["학교", "school"],
    ["고등학교", "school"],
    ["본청", "headquarters"],
    ["교육지원청", "support-office"],
    ["직속기관", "direct-agency"],
    ["도서관", "library"],
    ["체험학습장", "experience-site"],
    ["협력기관", "partner"],
    ["업로드", "imported"],
  ]);

  // When / Then: aliases resolve to canonical codes.
  for (const [input, expected] of officeCases) {
    assert.equal(normalizeOffice(input).code, expected);
  }
  for (const [input, expected] of typeCases) {
    assert.equal(normalizeInstitutionType(input).code, expected);
  }
});

test("rejects invalid rows with row-level errors when required fields or location are missing", () => {
  // Given: malformed uploaded rows that ordinary data validation should reject.
  const missingName = {
    id: "bad-1",
    type: "school",
    office: "main",
    officeSource: "explicit",
    address: "인천광역시 남동구 정각로 9",
  };
  const missingLocation = {
    id: "bad-2",
    name: "위치 없는 기관",
    type: "school",
    office: "main",
    officeSource: "explicit",
  };

  // When: each row is validated at the boundary.
  const nameResult = validateInstitution(missingName, { rowNumber: 2 });
  const locationResult = validateInstitution(missingLocation, { rowNumber: 3 });

  // Then: failures are returned as row-level errors rather than thrown.
  assert.equal(nameResult.isValid, false);
  assert.equal(nameResult.errors[0].rowNumber, 2);
  assert.match(nameResult.errors[0].message, /name/i);
  assert.equal(locationResult.isValid, false);
  assert.equal(locationResult.errors[0].rowNumber, 3);
  assert.match(locationResult.errors[0].message, /address|lat|lng/i);
});

test("normalizes unknown office values with row-level warnings", () => {
  // Given: an otherwise valid uploaded row with an office value outside known aliases.
  const invalidOffice = {
    id: "warn-1",
    name: "미지정 기관",
    type: "school",
    office: "중부교육지원청",
    officeSource: "explicit",
    address: "인천광역시 남동구 정각로 9",
  };

  // When: the row is validated at the schema boundary.
  const result = validateInstitution(invalidOffice, { rowNumber: 5 });

  // Then: the row is accepted with office normalized and a row-scoped warning.
  assert.equal(result.isValid, true, JSON.stringify(result.errors));
  assert.equal(result.value.office, "unassigned");
  assert.equal(result.errors.length, 0);
  assert.deepEqual(result.warnings, [{
    rowNumber: 5,
    field: "office",
    code: "unknown_office",
    message: "Unknown office normalized to unassigned.",
  }]);
});

test("rejects malformed institution types and connections with row-level errors", () => {
  // Given: data shapes that must not pass into repository or map layers.
  const invalidType = {
    id: "bad-3",
    name: "잘못된 유형 기관",
    type: "mystery",
    office: "main",
    officeSource: "explicit",
    address: "인천광역시 남동구 정각로 9",
  };
  const invalidConnections = {
    version: 1,
    connections: [
      {
        id: "conn-1",
        fromId: "office-main",
        toId: "office-main",
        color: "purple",
        strokeStyle: "wave",
      },
    ],
  };

  // When: malformed data is validated.
  const rowResult = validateInstitution(invalidType, { rowNumber: 4 });
  const connectionResult = validateConnectionSet(invalidConnections);

  // Then: failures are explicit and row-scoped.
  assert.equal(rowResult.isValid, false);
  assert.equal(rowResult.errors[0].rowNumber, 4);
  assert.equal(rowResult.errors[0].code, "invalid_type");
  assert.equal(connectionResult.isValid, false);
  assert.deepEqual(
    connectionResult.errors.map((error) => error.code),
    ["self_connection", "invalid_color", "invalid_stroke_style"],
  );
  assert.ok(connectionResult.errors.every((error) => error.rowNumber === 1));
});

test("validates versioned connection data when connections is an array", async () => {
  // Given: the static connection template.
  const connectionSet = await readJson("../data/connections.json");

  // When: the schema validator parses it.
  const result = validateConnectionSet(connectionSet);

  // Then: the versioned shape is accepted.
  assert.equal(result.isValid, true, JSON.stringify(result.errors));
  assert.equal(result.value.version, 1);
  assert.ok(Array.isArray(result.value.connections));
});
