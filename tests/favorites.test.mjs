import assert from "node:assert/strict";
import test from "node:test";

import { FAVORITES_STORAGE_KEY, createFavoritesStore } from "../js/favorites.js";

const createStorage = (initial = {}) => {
  const state = new Map(Object.entries(initial));
  return {
    getItem: (key) => state.get(key) ?? null,
    setItem: (key, value) => state.set(key, String(value)),
    removeItem: (key) => state.delete(key),
    dump: () => Object.fromEntries(state),
  };
};

test("toggle adds an id and toggling again removes it", () => {
  const store = createFavoritesStore({ storage: createStorage() });
  assert.equal(store.has("sch-elem-0001"), false);
  assert.equal(store.toggle("sch-elem-0001"), true);
  assert.equal(store.has("sch-elem-0001"), true);
  assert.equal(store.toggle("sch-elem-0001"), false);
  assert.equal(store.has("sch-elem-0001"), false);
});

test("favorites persist to storage and reload in a new store", () => {
  const storage = createStorage();
  const first = createFavoritesStore({ storage });
  first.toggle("office-main");
  first.toggle("sch-high-0001");

  const second = createFavoritesStore({ storage });
  assert.deepEqual(second.list().sort(), ["office-main", "sch-high-0001"]);
  assert.ok(storage.dump()[FAVORITES_STORAGE_KEY].includes("office-main"));
});

test("corrupt storage payload is treated as empty, not a crash", () => {
  const storage = createStorage({ [FAVORITES_STORAGE_KEY]: "{not json" });
  const store = createFavoritesStore({ storage });
  assert.deepEqual(store.list(), []);
  assert.equal(store.toggle("office-main"), true);
});

test("invalid ids are rejected", () => {
  const store = createFavoritesStore({ storage: createStorage() });
  assert.equal(store.toggle(""), false);
  assert.equal(store.toggle(null), false);
  assert.deepEqual(store.list(), []);
});

test("exportJson round-trips through importJson as a merge", () => {
  const source = createFavoritesStore({ storage: createStorage() });
  source.toggle("sch-elem-0001");
  source.toggle("office-east");
  const payload = source.exportJson();

  const target = createFavoritesStore({ storage: createStorage() });
  target.toggle("sch-mid-0002");
  const result = target.importJson(payload);

  assert.equal(result.ok, true);
  assert.equal(result.added, 2);
  assert.deepEqual(target.list().sort(), ["office-east", "sch-elem-0001", "sch-mid-0002"]);
});

test("importJson rejects malformed payloads without changing state", () => {
  const store = createFavoritesStore({ storage: createStorage() });
  store.toggle("office-main");
  const result = store.importJson("{not json");
  assert.equal(result.ok, false);
  assert.deepEqual(store.list(), ["office-main"]);
});

test("works without storage (list stays in memory for the session)", () => {
  const store = createFavoritesStore({ storage: null });
  assert.equal(store.toggle("office-main"), true);
  assert.deepEqual(store.list(), ["office-main"]);
});
