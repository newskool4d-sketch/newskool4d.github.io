import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { REGION_CODES } from "../js/constants.js";

const readJson = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, import.meta.url), "utf8"));

const TYPE_FOR_CATEGORY = Object.freeze({
  isec: "experience-site",
  direct: "direct-agency",
  library: "library",
  partner: "partner",
});

const expectedType = (place) => (place.category === "office"
  ? (place.id === "office-main" ? "headquarters" : "support-office")
  : TYPE_FOR_CATEGORY[place.category]);

const KNOWN_PHONE_DIFFERENCES = Object.freeze({
  "office-north": { infra: "032-524-9631~2", institutions: "032-524-9631" },
});

test("every infra.json record matches institutions.json in type, region, location, and contacts", async () => {
  const infra = await readJson("../data/infra.json");
  const byId = new Map((await readJson("../data/institutions.json")).map((row) => [row.id, row]));
  for (const place of infra) {
    const row = byId.get(place.id);
    assert.ok(row, `institutions.json missing ${place.id}`);
    assert.equal(row.name, place.name, place.id);
    assert.equal(row.type, expectedType(place), place.id);
    assert.equal(row.region, place.region, place.id);
    assert.equal(row.address, place.address, place.id);
    assert.equal(row.url, place.url, place.id);
    assert.equal(row.lat, place.lat, place.id);
    assert.equal(row.lng, place.lng, place.id);
    const knownPhone = KNOWN_PHONE_DIFFERENCES[place.id];
    if (knownPhone) {
      assert.deepEqual({ infra: place.tel, institutions: row.phone }, knownPhone, place.id);
    } else {
      assert.equal(row.phone, place.tel, place.id);
    }
  }
});

test("every non-school, non-imported institution carries a canonical region", async () => {
  const rows = await readJson("../data/institutions.json");
  const missing = rows.filter((row) => row.type !== "school" && row.type !== "imported" && !REGION_CODES?.includes(row.region));
  assert.deepEqual(missing.map((row) => row.id), []);
});

test("institution type counts match the merged infrastructure dataset", async () => {
  const rows = await readJson("../data/institutions.json");
  const counts = rows.reduce((acc, row) => ({ ...acc, [row.type]: (acc[row.type] ?? 0) + 1 }), {});
  assert.deepEqual(counts, {
    headquarters: 1,
    "support-office": 5,
    "direct-agency": 11,
    library: 8,
    "experience-site": 4,
    partner: 3,
    imported: 1,
    school: 967,
  });
});
