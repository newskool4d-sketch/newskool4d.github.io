import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "dist", "server", "index.js");

const textAssets = [
  "index.html",
  "schools.html",
  "infrastructure.html",
  "unified-map.html",
  "shared.css",
  "atlas-theme.css",
  "shared.js",
  "vendor/xlsx.full.min.js",
  "data/connections.json",
  "data/infra.json",
  "data/institutions.json",
  "data/institutions.sample.csv",
  "data/schools.json",
  "js/connection-layer.js",
  "js/constants.js",
  "js/favorites.js",
  "js/geocode-cache.js",
  "js/geocode-queue.js",
  "js/importer.js",
  "js/institution-repository.js",
  "js/institution-schema.js",
  "js/map-layers.js",
  "js/map-provider.js",
  "js/storage.js",
  "js/unified-map-app.js",
];

const typeFor = (file) => {
  if (file.endsWith(".html")) return "text/html; charset=utf-8";
  if (file.endsWith(".css")) return "text/css; charset=utf-8";
  if (file.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (file.endsWith(".json")) return "application/json; charset=utf-8";
  if (file.endsWith(".csv")) return "text/csv; charset=utf-8";
  return "text/plain; charset=utf-8";
};

const entries = await Promise.all(textAssets.map(async (file) => {
  const value = await readFile(path.join(root, file), "utf8");
  return [`/${file.replaceAll("\\", "/")}`, value, typeFor(file)];
}));

const assets = Object.fromEntries(entries.map(([route, value]) => [route, value]));
const types = Object.fromEntries(entries.map(([route, , type]) => [route, type]));
const fontBase64 = (await readFile(path.join(root, "assets", "fonts", "incheon-edu-himchan-display.woff2"))).toString("base64");

const worker = `const ASSETS = ${JSON.stringify(assets)};
const TYPES = ${JSON.stringify(types)};
const FONT_BASE64 = ${JSON.stringify(fontBase64)};

function decodeBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

const worker = {
  async fetch(request) {
    const url = new URL(request.url);
    const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
    if (pathname === "/assets/fonts/incheon-edu-himchan-display.woff2") {
      return new Response(decodeBase64(FONT_BASE64), {
        headers: { "content-type": "font/woff2", "cache-control": "public, max-age=31536000, immutable" }
      });
    }
    if (Object.hasOwn(ASSETS, pathname)) {
      return new Response(ASSETS[pathname], {
        headers: { "content-type": TYPES[pathname], "cache-control": pathname.endsWith(".html") ? "no-cache" : "public, max-age=300" }
      });
    }
    return new Response("Not found", { status: 404 });
  }
};

export default worker;
`;

await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, worker, "utf8");
console.log(`Built ${path.relative(root, output)} with ${textAssets.length} text assets and one font.`);
