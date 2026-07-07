import { spawnSync } from "node:child_process";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const fileExists = async (filePath) => {
  try {
    const entries = await readdir(path.dirname(filePath), { withFileTypes: true });
    return entries.some((entry) => entry.isFile() && entry.name === path.basename(filePath));
  } catch {
    return false;
  }
};

const walk = async (dirPath, predicate) => {
  let entries;
  try {
    entries = await readdir(dirPath, { withFileTypes: true });
  } catch {
    return [];
  }
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(fullPath, predicate));
    } else if (entry.isFile() && predicate(fullPath)) {
      files.push(fullPath);
    }
  }
  return files;
};

const collectTargets = async () => {
  const targets = [];
  const sharedJs = path.join(appRoot, "shared.js");
  if (await fileExists(sharedJs)) {
    targets.push(sharedJs);
  }
  targets.push(...await walk(path.join(appRoot, "js"), (filePath) => filePath.endsWith(".js")));
  targets.push(...await walk(path.join(appRoot, "tools"), (filePath) => filePath.endsWith(".mjs")));
  targets.push(...await walk(path.join(appRoot, "tests"), (filePath) => filePath.endsWith(".mjs")));
  return [...new Set(targets)].sort((left, right) => left.localeCompare(right));
};

const targets = await collectTargets();
if (targets.length === 0) {
  console.error("No JavaScript targets found for syntax check.");
  process.exit(1);
}

const failures = [];
for (const target of targets) {
  const result = spawnSync(process.execPath, ["--check", target], {
    cwd: appRoot,
    encoding: "utf8",
  });
  const relativePath = path.relative(appRoot, target);
  if (result.status === 0) {
    console.log(`ok ${relativePath}`);
  } else {
    failures.push({ relativePath, stderr: result.stderr, stdout: result.stdout });
    console.error(`fail ${relativePath}`);
    if (result.stdout) {
      console.error(result.stdout.trimEnd());
    }
    if (result.stderr) {
      console.error(result.stderr.trimEnd());
    }
  }
}

if (failures.length > 0) {
  console.error(`${failures.length} syntax check target(s) failed.`);
  process.exit(1);
}

console.log(`Checked ${targets.length} JavaScript target(s).`);
