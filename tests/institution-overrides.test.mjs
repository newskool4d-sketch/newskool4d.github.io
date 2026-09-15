import assert from "node:assert/strict";
import test from "node:test";

import {
  applyOverrides,
  distinctOverrideValues,
  loadOverrides,
  normalizeDesignation,
  OVERRIDE_KEYS,
  saveOverride,
} from "../js/institution-overrides.js";

const memoryStorage = (initial = {}) => {
  const state = new Map(Object.entries(initial));
  return {
    state,
    getItem: (key) => (state.has(key) ? state.get(key) : null),
    setItem: (key, value) => state.set(key, String(value)),
    removeItem: (key) => state.delete(key),
  };
};

test("reads the legacy schools.html supervisor and designation maps", () => {
  const storage = memoryStorage({
    incheon_school_supervisors: JSON.stringify({ "sch-elem-0001": "김장학" }),
    incheon_school_designations: JSON.stringify({ "sch-elem-0001": "연구학교; 선도학교" }),
  });

  const overrides = loadOverrides({ storage });
  const [school, other] = applyOverrides([{ id: "sch-elem-0001", name: "가" }, { id: "sch-mid-0001", name: "나" }], overrides);

  assert.equal(OVERRIDE_KEYS.supervisor, "incheon_school_supervisors");
  assert.equal(OVERRIDE_KEYS.designation, "incheon_school_designations");
  assert.equal(school.supervisor, "김장학");
  assert.equal(school.designation, "연구학교; 선도학교");
  assert.equal(Object.hasOwn(other, "supervisor"), false);
  assert.deepEqual(overrides.warnings, []);
});

test("saves normalized values and deletes cleared entries", () => {
  const storage = memoryStorage();

  const saved = saveOverride({ storage, kind: "designation", id: "a", value: " 연구학교, 선도학교 / " });
  saveOverride({ storage, kind: "supervisor", id: "a", value: "  김장학 " });
  saveOverride({ storage, kind: "supervisor", id: "a", value: "" });

  assert.equal(saved.ok, true);
  assert.equal(saved.value, "연구학교; 선도학교");
  assert.deepEqual(JSON.parse(storage.getItem("incheon_school_designations")), { a: "연구학교; 선도학교" });
  assert.deepEqual(JSON.parse(storage.getItem("incheon_school_supervisors")), {});
  assert.equal(normalizeDesignation("시범학교·거점학교"), "시범학교; 거점학교");
});

test("reports corrupt legacy JSON and save failures without throwing", () => {
  const storage = memoryStorage({ incheon_school_supervisors: "{broken" });
  storage.setItem = () => {
    throw new Error("Quota exceeded");
  };

  const overrides = loadOverrides({ storage });
  const result = saveOverride({ storage, kind: "supervisor", id: "a", value: "김장학" });

  assert.deepEqual(overrides.supervisor, {});
  assert.equal(overrides.warnings[0].code, "corrupt_override");
  assert.equal(result.ok, false);
  assert.equal(result.warning.code, "override_save_failed");
});

test("lists distinct supervisors and designation tokens in Korean order", () => {
  const rows = [
    { id: "a", supervisor: "홍장학", designation: "연구학교; 선도학교" },
    { id: "b", supervisor: "김장학", designation: "선도학교" },
    { id: "c" },
  ];

  assert.deepEqual(distinctOverrideValues(rows, "supervisor"), ["김장학", "홍장학"]);
  assert.deepEqual(distinctOverrideValues(rows, "designation"), ["선도학교", "연구학교"]);
});
