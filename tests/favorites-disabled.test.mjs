import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (relativePath) => readFile(new URL(relativePath, import.meta.url), "utf8");

test("favorite controls and persistence are disabled on every public school surface", async () => {
  const [schoolsHtml, unifiedHtml, unifiedApp, sitesBuild] = await Promise.all([
    read("../schools.html"),
    read("../unified-map.html"),
    read("../js/unified-map-app.js"),
    read("../tools/build-sites-worker.mjs"),
  ]);
  const publicSources = `${schoolsHtml}\n${unifiedHtml}\n${unifiedApp}`;

  for (const disabledToken of [
    "chk-sch-fav",
    "toggle-favorite",
    "favorites-only",
    "export-favorites",
    "import-favorites-file",
    "createFavoritesStore",
    "incheon_edu_favorites_v1",
  ]) {
    assert.equal(publicSources.includes(disabledToken), false, `${disabledToken} remains public`);
  }
  assert.equal(sitesBuild.includes('"js/favorites.js"'), false);
});
