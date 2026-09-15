import assert from "node:assert/strict";
import test from "node:test";

import { INFRA_TYPE_CODES, parseViewState, presetFor, serializeViewState, toRepositoryFilters } from "../js/view-state.js";

test("presets select school or infrastructure institution types", () => {
  assert.deepEqual(presetFor("schools").types, ["school"]);
  assert.deepEqual(presetFor("infra").types, [...INFRA_TYPE_CODES]);
  assert.equal(presetFor("infra").types.includes("school"), false);
  assert.equal(presetFor("unknown").view, "all");
  assert.equal(presetFor("all").types.length, 8);
});

test("default presets serialize to a short query", () => {
  assert.equal(serializeViewState(presetFor("all")), "");
  assert.equal(serializeViewState(presetFor("infra")), "?view=infra");
});

test("round-trips filters, lists, and viewport through the URL", () => {
  const state = {
    ...presetFor("schools"),
    search: "청라",
    office: "west",
    levels: ["elem", "mid"],
    designation: "연구학교",
    supervisor: "김장학",
    viewport: { lat: 37.5, lng: 126.6, level: 5 },
  };

  assert.deepEqual(parseViewState(serializeViewState(state)), state);
});

test("drops unknown codes and keeps an explicitly empty list", () => {
  const parsed = parseViewState("?view=infra&regions=ganghwa,jeju&types=&office=busan&lat=abc&lng=126");

  assert.deepEqual(parsed.regions, ["ganghwa"]);
  assert.deepEqual(parsed.types, []);
  assert.equal(parsed.office, "all");
  assert.equal(parsed.viewport, null);
  assert.equal(parseViewState(serializeViewState(parsed)).types.length, 0);
});

test("maps view state to repository filters without view-only fields", () => {
  const filters = toRepositoryFilters({ ...presetFor("infra"), regions: ["yeongjong"], viewport: { lat: 1, lng: 2, level: 3 } });

  assert.deepEqual(filters, {
    search: "",
    office: "all",
    types: [...INFRA_TYPE_CODES],
    levels: presetFor("infra").levels,
    regions: ["yeongjong"],
    designation: "",
    supervisor: "",
  });
});
