import assert from "node:assert/strict";
import test from "node:test";

import {
  exportDataset,
  filterInstitutions,
  getInstitutionById,
  loadAllInstitutions,
  loadConnections,
  mergeImportedInstitutions,
  saveConnections,
} from "../js/institution-repository.js";

const builtInInstitutions = Object.freeze([
  {
    id: "office-main",
    name: "인천광역시교육청",
    type: "headquarters",
    office: "main",
    officeSource: "explicit",
    address: "인천광역시 남동구 정각로 9",
    lat: 37.456,
    lng: 126.705,
  },
  {
    id: "office-east",
    name: "인천광역시동부교육지원청",
    type: "support-office",
    office: "east",
    officeSource: "explicit",
    address: "인천광역시 남동구 인주대로 923",
    lat: 37.448,
    lng: 126.74,
  },
  {
    id: "school-west",
    name: "인천청라초등학교",
    type: "school",
    office: "west",
    officeSource: "explicit",
    address: "인천광역시 서구 청라라임로 105",
    level: "elem",
  },
]);

const createMemoryStorage = (initial = {}) => {
  const state = new Map(Object.entries(initial));
  return {
    state,
    getItem(key) {
      return state.has(key) ? state.get(key) : null;
    },
    setItem(key, value) {
      state.set(key, String(value));
    },
    removeItem(key) {
      state.delete(key);
    },
    key(index) {
      return Array.from(state.keys())[index] ?? null;
    },
    get length() {
      return state.size;
    },
  };
};

test("merges built-in institutions, imports, and geocode results without changing seed offices", () => {
  // Given: seed institutions plus imported rows with explicit, inferred, and invalid offices.
  const importedRows = [
    {
      id: "upload-explicit",
      name: "동부 명시 기관",
      type: "학교",
      office: "동부교육지원청",
      officeSource: "explicit",
      address: "인천광역시 연수구 예술로 1",
      level: "middle",
      customFields: { 운영구분: "방과후" },
    },
    {
      id: "upload-inferred",
      name: "서구 주소 기관",
      type: "imported",
      office: "",
      officeSource: "imported",
      address: "인천광역시 서구 테스트로 1",
      customFields: { 운영구분: "돌봄" },
    },
    {
      id: "upload-invalid-office",
      name: "미지정 특수학교",
      type: "특수학교",
      office: "중부교육지원청",
      officeSource: "explicit",
      address: "인천광역시 테스트로 3",
      level: "special",
    },
    {
      id: "office-main",
      name: "덮어쓰기 시도",
      type: "school",
      office: "west",
      officeSource: "explicit",
      address: "인천광역시 서구 덮어쓰기길 1",
    },
  ];
  const geocodeResults = [
    { id: "upload-explicit", lat: 37.45, lng: 126.71, geocodeAddress: "정규화 주소" },
    { id: "upload-inferred", lat: 37.55, lng: 126.68 },
  ];

  // When: repository rows are merged.
  const result = mergeImportedInstitutions({
    builtInInstitutions,
    importedRows,
    geocodeResults,
  });

  // Then: seed offices remain intact, imports merge coordinates/custom fields, and unsafe defaults are warned.
  assert.equal(getInstitutionById(result.institutions, "office-main").name, "인천광역시교육청");
  assert.equal(getInstitutionById(result.institutions, "office-main").office, "main");
  assert.equal(getInstitutionById(result.institutions, "upload-explicit").office, "east");
  assert.equal(getInstitutionById(result.institutions, "upload-explicit").officeSource, "explicit");
  assert.equal(getInstitutionById(result.institutions, "upload-explicit").lat, 37.45);
  assert.equal(getInstitutionById(result.institutions, "upload-explicit").customFields.운영구분, "방과후");
  assert.equal(getInstitutionById(result.institutions, "upload-inferred").office, "west");
  assert.equal(getInstitutionById(result.institutions, "upload-inferred").officeSource, "inferred");
  assert.equal(getInstitutionById(result.institutions, "upload-invalid-office").office, "unassigned");
  assert.ok(result.warnings.some((warning) => warning.code === "duplicate_builtin_id"));
  assert.ok(result.warnings.some((warning) => warning.code === "unknown_office"));
});

test("filters institutions by all/type/office/level/search and custom imported fields", () => {
  // Given: a merged institution list with built-in and imported rows.
  const merged = mergeImportedInstitutions({
    builtInInstitutions,
    importedRows: [
      {
        id: "custom-1",
        name: "야간 돌봄센터",
        type: "partner",
        office: "east",
        officeSource: "explicit",
        address: "인천광역시 남동구 돌봄로 1",
        level: "high",
        customFields: { 운영구분: "야간", 담당자: "홍길동" },
      },
    ],
  });

  // When / Then: each filter narrows by the requested public contract.
  assert.equal(filterInstitutions(merged.institutions, { type: "all" }).length, 4);
  assert.deepEqual(filterInstitutions(merged.institutions, { type: "support-office" }).map((row) => row.id), ["office-east"]);
  assert.deepEqual(filterInstitutions(merged.institutions, { office: "west" }).map((row) => row.id), ["school-west"]);
  assert.deepEqual(filterInstitutions(merged.institutions, { level: "high" }).map((row) => row.id), ["custom-1"]);
  assert.deepEqual(filterInstitutions(merged.institutions, { search: "돌봄센터" }).map((row) => row.id), ["custom-1"]);
  assert.deepEqual(
    filterInstitutions(merged.institutions, { customFields: { 운영구분: "야간", 담당자: "홍" } }).map((row) => row.id),
    ["custom-1"],
  );
});

test("persists imports and connections under versioned keys with export roundtrip", () => {
  // Given: an empty localStorage-like adapter and imported state to persist.
  const storage = createMemoryStorage();
  const importedRows = [{
    id: "saved-1",
    name: "저장 기관",
    type: "imported",
    office: "east",
    officeSource: "explicit",
    address: "인천광역시 남동구 저장로 1",
  }];

  // When: imported rows and connections are saved then loaded through the repository API.
  const loadedBefore = loadAllInstitutions({ builtInInstitutions, storage });
  const merged = mergeImportedInstitutions({ builtInInstitutions, importedRows, storage });
  const saveResult = saveConnections({
    version: 1,
    connections: [{
      id: "line-1",
      fromId: "office-main",
      toId: "saved-1",
      color: "red",
      strokeStyle: "solid",
      label: "협력",
      createdAt: "2026-06-27T00:00:00.000Z",
    }],
  }, { storage });
  const loadedAfter = loadAllInstitutions({ builtInInstitutions, storage });
  const connections = loadConnections({ storage });
  const exported = exportDataset({
    institutions: loadedAfter.institutions,
    importedInstitutions: loadedAfter.importedInstitutions,
    connections: connections.value.connections,
    now: () => "2026-06-27T00:00:00.000Z",
  });

  // Then: versioned keys are used, previous built-ins are unchanged, and export/import state is complete.
  assert.equal(loadedBefore.importedInstitutions.length, 0);
  assert.equal(merged.importedInstitutions.length, 1);
  assert.equal(saveResult.ok, true);
  assert.equal(loadedAfter.importedInstitutions.length, 1);
  assert.equal(getInstitutionById(loadedAfter.institutions, "saved-1").name, "저장 기관");
  assert.deepEqual(connections.value.connections.map((connection) => connection.id), ["line-1"]);
  assert.equal(exported.version, 1);
  assert.equal(exported.exportedAt, "2026-06-27T00:00:00.000Z");
  assert.equal(exported.importedInstitutions.length, 1);
  assert.equal(exported.connections.connections.length, 1);
  assert.equal(storage.getItem("incheon_institution_imports_v1") !== null, true);
  assert.equal(storage.getItem("incheon_connections_v1") !== null, true);
});

test("backs up corrupt JSON and returns recoverable warnings without erasing stored values", () => {
  // Given: corrupt storage values that represent a user-recoverable local state.
  const storage = createMemoryStorage({
    incheon_institution_imports_v1: "{not-json",
    incheon_connections_v1: "{bad-connection-json",
  });
  const now = () => "2026-06-27T00:00:00.000Z";

  // When: repository and connection loaders encounter corrupt JSON.
  const institutions = loadAllInstitutions({ builtInInstitutions, storage, now });
  const connections = loadConnections({ storage, now });

  // Then: built-in data still loads, corrupt values remain, and backup keys hold the old payload.
  assert.equal(institutions.institutions.length, builtInInstitutions.length);
  assert.equal(connections.value.connections.length, 0);
  assert.equal(storage.getItem("incheon_institution_imports_v1"), "{not-json");
  assert.equal(storage.getItem("incheon_connections_v1"), "{bad-connection-json");
  assert.equal(
    storage.getItem("incheon_backup_incheon_institution_imports_v1_20260627T000000000Z"),
    "{not-json",
  );
  assert.equal(
    storage.getItem("incheon_backup_incheon_connections_v1_20260627T000000000Z"),
    "{bad-connection-json",
  );
  assert.ok(institutions.warnings.some((warning) => warning.code === "corrupt_json"));
  assert.ok(connections.warnings.some((warning) => warning.code === "corrupt_json"));
});

test("backs up old values and reports quota failures when destructive replacement cannot complete", () => {
  // Given: storage with existing connection data and a failing setItem for the primary key.
  const initialConnectionJson = JSON.stringify({ version: 1, connections: [] });
  const storage = createMemoryStorage({ incheon_connections_v1: initialConnectionJson });
  const originalSetItem = storage.setItem.bind(storage);
  storage.setItem = (key, value) => {
    if (key === "incheon_connections_v1") {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    }
    originalSetItem(key, value);
  };

  // When: saving a replacement fails.
  const result = saveConnections({
    version: 1,
    connections: [{
      id: "line-quota",
      fromId: "office-main",
      toId: "office-east",
      color: "blue",
      strokeStyle: "dashed",
    }],
  }, { storage, now: () => "2026-06-27T00:01:00.000Z" });

  // Then: the old value is kept, backup is available, and the caller receives a recoverable warning.
  assert.equal(result.ok, false);
  assert.equal(storage.getItem("incheon_connections_v1"), initialConnectionJson);
  assert.equal(
    storage.getItem("incheon_backup_incheon_connections_v1_20260627T000100000Z"),
    initialConnectionJson,
  );
  assert.ok(result.warnings.some((warning) => warning.code === "quota_exceeded"));
});

test("search matches designation values such as 연구학교", () => {
  const rows = [
    { id: "a", name: "인천지정초", designation: "연구학교; 선도학교" },
    { id: "b", name: "인천일반초" },
  ];
  const filtered = filterInstitutions(rows, { search: "연구학교" });
  assert.deepEqual(filtered.map((row) => row.id), ["a"]);
});
