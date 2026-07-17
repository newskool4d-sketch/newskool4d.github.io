import assert from "node:assert/strict";
import test from "node:test";

import {
  createConnectionDraft,
  createConnectionManager,
  sanitizeConnectionLabel,
  serializeConnectionSet,
  validateConnectionsForInstitutions,
} from "../js/connection-layer.js";

const roadRoute = Object.freeze({
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

const institutions = Object.freeze([
  { id: "office-main", name: "인천광역시교육청", lat: 37.4562754, lng: 126.703048 },
  { id: "office-east", name: "인천광역시동부교육지원청", lat: 37.4485429, lng: 126.7400125 },
  { id: "school-east", name: "동부 <초교>", lat: 37.41, lng: 126.72 },
  { id: "missing-coordinates", name: "좌표 없음" },
]);

const createStorage = (initial = {}) => {
  const state = new Map(Object.entries(initial));
  return {
    getItem: (key) => state.get(key) ?? null,
    setItem: (key, value) => state.set(key, String(value)),
    removeItem: (key) => state.delete(key),
  };
};

const createFakeKakao = () => {
  const created = { polylines: [] };
  class LatLng {
    constructor(lat, lng) {
      this.lat = lat;
      this.lng = lng;
    }
  }
  class Polyline {
    constructor(options) {
      this.options = options;
      this.map = null;
      created.polylines.push(this);
    }

    setMap(map) {
      this.map = map;
    }
  }
  return { created, mapSdk: { maps: { LatLng, Polyline } } };
};

test("creates red and blue connections, persists, reloads, exports, imports, and deletes", () => {
  // Given: three mappable institutions, fake localStorage, and fake Kakao Polyline support.
  const storage = createStorage();
  const { mapSdk, created } = createFakeKakao();
  const manager = createConnectionManager({ mapSdk, map: { id: "map" }, storage });

  // When: two valid connection drafts are created, saved, exported, reloaded, imported, and one is deleted.
  manager.refreshInstitutions(institutions);
  const red = createConnectionDraft({
    fromId: "office-main",
    toId: "office-east",
    color: "red",
    strokeStyle: "solid",
    label: "본청 <동부>",
    route: roadRoute,
    now: () => "2026-06-27T00:00:00.000Z",
  });
  const blue = createConnectionDraft({
    fromId: "office-east",
    toId: "school-east",
    color: "blue",
    strokeStyle: "dashed",
    label: "동부-학교",
    route: {
      ...roadRoute,
      path: [
        [37.4485429, 126.7400125],
        [37.43, 126.73],
        [37.41, 126.72],
      ],
    },
    now: () => "2026-06-27T00:01:00.000Z",
  });
  assert.equal(manager.add(red).ok, true);
  assert.equal(manager.add(blue).ok, true);
  const exported = manager.exportJson();
  manager.destroy();
  const reloaded = createConnectionManager({ mapSdk, map: { id: "map2" }, storage });
  reloaded.refreshInstitutions(institutions);
  const imported = reloaded.importJson(exported);
  const deleted = reloaded.delete(red.id);

  // Then: both cached road paths render as real polylines, export/import roundtrips, and delete removes one.
  assert.equal(created.polylines.filter((line) => line.map).length, 1);
  assert.ok(created.polylines.some((line) => line.options.strokeColor === "#ef4444"));
  assert.ok(created.polylines.some((line) => line.options.strokeColor === "#2563eb" && line.options.strokeStyle === "shortdash"));
  assert.equal(imported.ok, true);
  assert.equal(deleted.ok, true);
  assert.equal(reloaded.getState().connections.length, 1);
  assert.equal(reloaded.getState().connections[0].id, blue.id);
  assert.equal(created.polylines[0].options.path.length, 3);
  assert.equal(reloaded.getState().connections[0].roadDistanceMeters, 4860);
  assert.match(exported, /"color": "red"/);
  assert.match(exported, /"routeProvider": "naver-directions-5"/);
});

test("never renders legacy connections as straight-line fallbacks", () => {
  const storage = createStorage();
  const { mapSdk, created } = createFakeKakao();
  const manager = createConnectionManager({ mapSdk, map: {}, storage });
  manager.refreshInstitutions(institutions);

  const legacy = createConnectionDraft({
    fromId: "office-main",
    toId: "office-east",
    color: "blue",
  });
  assert.equal(manager.add(legacy).ok, true);
  assert.equal(created.polylines.length, 0);
  assert.equal(manager.getState().needsRoute, 1);
});

test("calculates a road route before saving a new connection", async () => {
  const calls = [];
  const manager = createConnectionManager({
    storage: createStorage(),
    routeService: async ({ from, to }) => {
      calls.push([from.id, to.id]);
      return roadRoute;
    },
  });
  manager.refreshInstitutions(institutions);

  const result = await manager.routeAndAdd({
    fromId: "office-main",
    toId: "office-east",
    color: "green",
    label: "도로 연결",
  });

  assert.equal(result.ok, true);
  assert.deepEqual(calls, [["office-main", "office-east"]]);
  assert.equal(manager.getState().connections[0].roadDistanceMeters, 4860);
  assert.equal(manager.getState().needsRoute, 0);
});

test("disambiguates duplicate institution names with a district instead of an internal id", () => {
  const elements = { from: { innerHTML: "" }, to: { innerHTML: "" } };
  const manager = createConnectionManager({ storage: createStorage(), elements });

  manager.refreshInstitutions([
    { id: "sch-kinder-0027", name: "해승유치원", address: "인천광역시 미추홀구 학익소로61번길 93", lat: 37.44, lng: 126.65 },
    { id: "sch-kinder-0166", name: "해승유치원", address: "인천광역시 계양구 도두리로 54", lat: 37.53, lng: 126.74 },
  ]);

  assert.match(elements.from.innerHTML, />해승유치원 · 미추홀구<\/option>/);
  assert.match(elements.from.innerHTML, />해승유치원 · 계양구<\/option>/);
  assert.doesNotMatch(elements.from.innerHTML, />[^<]*sch-kinder-/);
});

test("rejects same endpoints, orphan ids, duplicates, bad styles, missing coordinates, and corrupt JSON", () => {
  // Given: malformed connection sets spanning every required failure class.
  const valid = createConnectionDraft({ fromId: "office-main", toId: "office-east", color: "red" });
  const invalidSet = {
    version: 1,
    connections: [
      { ...valid },
      { ...valid, fromId: "office-main", toId: "office-main" },
      { ...valid, id: "orphan", fromId: "missing", toId: "office-east" },
      { ...valid, id: "duplicate", color: "purple" },
      { ...valid, id: "duplicate", strokeStyle: "wave" },
      { ...valid, id: "bad-coordinate", fromId: "office-main", toId: "missing-coordinates" },
      { id: "", fromId: "", toId: "" },
    ],
  };
  const endpointFailures = {
    version: 1,
    connections: [
      { id: "orphan", fromId: "missing", toId: "office-east", color: "red", strokeStyle: "solid" },
      { id: "bad-coordinate", fromId: "office-main", toId: "missing-coordinates", color: "blue", strokeStyle: "dotted" },
    ],
  };
  const { kakao, created } = createFakeKakao();
  const manager = createConnectionManager({ kakao, map: {}, storage: createStorage() });

  // When: validation and import run against malformed input.
  const validation = validateConnectionsForInstitutions(invalidSet, institutions);
  const endpointValidation = validateConnectionsForInstitutions(endpointFailures, institutions);
  manager.refreshInstitutions(institutions);
  const selfResult = manager.add({ ...valid, id: "self", toId: "office-main" });
  const corruptResult = manager.importJson("{not-json");
  const invalidResult = manager.importJson(JSON.stringify(invalidSet));

  // Then: each failure is row-scoped and invalid/self/orphan connections create no polylines.
  assert.equal(validation.isValid, false);
  const codes = validation.errors.map((error) => error.code);
  for (const code of [
    "self_connection",
    "duplicate_connection_id",
    "invalid_color",
    "invalid_stroke_style",
    "missing_connection_id",
    "missing_from_id",
    "missing_to_id",
  ]) {
    assert.ok(codes.includes(code), `${code} missing from ${codes.join(", ")}`);
  }
  assert.ok(validation.errors.every((error) => Number.isInteger(error.rowNumber)));
  assert.deepEqual(endpointValidation.errors.map((error) => error.code), [
    "orphan_from_id",
    "endpoint_missing_coordinates",
  ]);
  assert.equal(selfResult.ok, false);
  assert.equal(corruptResult.ok, false);
  assert.equal(corruptResult.errors[0].code, "corrupt_json");
  assert.equal(invalidResult.ok, false);
  assert.equal(created.polylines.length, 0);
});

test("serializes labels safely and rejects non-object JSON boundaries", () => {
  // Given: untrusted labels and invalid boundary values.
  const draft = createConnectionDraft({
    fromId: "office-main",
    toId: "office-east",
    color: "blue",
    label: " <script>alert(1)</script> ".repeat(10),
    now: () => "2026-06-27T00:00:00.000Z",
  });
  const parsed = serializeConnectionSet(JSON.stringify({ version: 1, connections: [draft] }));
  const arrayBoundary = serializeConnectionSet("[]");

  // When / Then: labels are trimmed/length-limited and boundary errors stay explicit.
  assert.equal(sanitizeConnectionLabel("<b>협력</b>"), "협력");
  assert.equal(draft.label.includes("<"), false);
  assert.equal(draft.label.length, 80);
  assert.equal(parsed.ok, true);
  assert.equal(arrayBoundary.ok, false);
  assert.equal(arrayBoundary.errors[0].code, "invalid_connection_set");
});
