import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseDelimitedText } from "../js/importer.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = process.argv[2];

if (!sourcePath) {
  throw new Error("Usage: node tools/merge-school-directory.mjs <school-directory.csv>");
}

const text = (value) => String(value ?? "").trim();
const normalizeAddress = (value) => text(value)
  .replace(/\s*\([^)]*\)\s*$/u, "")
  .replace(/\s+/gu, " ");
const schoolKey = (name, address) => `${text(name)}|${normalizeAddress(address)}`;
const normalizeWebsite = (value) => {
  const website = text(value);
  if (!website) return "";
  return /^https?:\/\//iu.test(website) ? website : `https://${website}`;
};

const csvText = await readFile(path.resolve(sourcePath), "utf8");
const { rows } = parseDelimitedText(csvText, { delimiter: "," });
const [headers, ...records] = rows;
const headerIndex = new Map(headers.map((header, index) => [text(header), index]));
const requiredHeaders = ["학교명", "학교급", "담당교육지원청", "주소", "전화", "URL"];
for (const header of requiredHeaders) {
  if (!headerIndex.has(header)) throw new Error(`Missing CSV header: ${header}`);
}

const valueAt = (record, header) => text(record[headerIndex.get(header)]);
const directoryRows = records.filter((record) => record.some((cell) => text(cell)));
const schoolsPath = path.join(root, "data", "schools.json");
const institutionsPath = path.join(root, "data", "institutions.json");
const metadataPath = path.join(root, "data", "schools-directory-metadata.json");
const schools = JSON.parse(await readFile(schoolsPath, "utf8"));
const institutions = JSON.parse(await readFile(institutionsPath, "utf8"));
const directoryByKey = new Map();

for (const record of directoryRows) {
  const key = schoolKey(valueAt(record, "학교명"), valueAt(record, "주소"));
  if (directoryByKey.has(key)) throw new Error(`Duplicate directory row: ${key}`);
  directoryByKey.set(key, record);
}

const unmatchedSchools = [];
const matchedDirectoryKeys = new Set();
const mergedSchools = schools.map((school) => {
  const key = schoolKey(school.name, school.address);
  const record = directoryByKey.get(key);
  if (!record) {
    unmatchedSchools.push(key);
    return school;
  }
  matchedDirectoryKeys.add(key);
  const website = normalizeWebsite(valueAt(record, "URL"));
  return {
    ...school,
    address: valueAt(record, "주소"),
    phone: valueAt(record, "전화"),
    ...(website ? { website } : {}),
  };
});

const unmatchedDirectory = [...directoryByKey.keys()].filter((key) => !matchedDirectoryKeys.has(key));
if (unmatchedSchools.length || unmatchedDirectory.length || mergedSchools.length !== directoryRows.length) {
  throw new Error(JSON.stringify({
    schoolCount: mergedSchools.length,
    directoryCount: directoryRows.length,
    unmatchedSchools: unmatchedSchools.slice(0, 10),
    unmatchedDirectory: unmatchedDirectory.slice(0, 10),
  }, null, 2));
}

const schoolInstitutions = mergedSchools.map((school) => ({
  ...school,
  type: "school",
  officeSource: "explicit",
}));
const mergedInstitutions = [
  ...institutions.filter((institution) => institution.type !== "school"),
  ...schoolInstitutions,
];
const directoryProjection = mergedSchools.map((school) => ([
  school.id,
  school.name,
  school.address,
  school.phone,
  school.website ?? "",
]));
const sourceFilename = path.basename(sourcePath);
const sourceDate = sourceFilename.match(/(\d{4}-\d{2}-\d{2})/u)?.[1] ?? "";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const metadata = {
  sourceFilename,
  sourceDate,
  sourceSha256: sha256(csvText),
  directoryProjectionSha256: sha256(JSON.stringify(directoryProjection)),
  records: mergedSchools.length,
  directoryRecords: directoryRows.length,
  matchedRecords: matchedDirectoryKeys.size,
  unmatchedSchools: unmatchedSchools.length,
  unmatchedDirectory: unmatchedDirectory.length,
  duplicateDirectoryRows: 0,
  phones: mergedSchools.filter((school) => school.phone).length,
  websites: mergedSchools.filter((school) => school.website).length,
};

await writeFile(schoolsPath, `${JSON.stringify(mergedSchools, null, 2)}\n`, "utf8");
await writeFile(institutionsPath, `${JSON.stringify(mergedInstitutions, null, 2)}\n`, "utf8");
await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  schools: mergedSchools.length,
  institutions: mergedInstitutions.length,
  directoryRecords: metadata.directoryRecords,
  matchedRecords: metadata.matchedRecords,
  unmatchedSchools: metadata.unmatchedSchools,
  unmatchedDirectory: metadata.unmatchedDirectory,
  duplicateDirectoryRows: metadata.duplicateDirectoryRows,
  phones: mergedSchools.filter((school) => school.phone).length,
  websites: mergedSchools.filter((school) => school.website).length,
  sourceSha256: metadata.sourceSha256,
  directoryProjectionSha256: metadata.directoryProjectionSha256,
}, null, 2));
