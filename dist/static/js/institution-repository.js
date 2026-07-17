import { validateConnectionSet, validateInstitution } from "./institution-schema.js";
import { readVersionedJson, STORAGE_KEYS, writeVersionedJson } from "./storage.js";

const DATASET_VERSION = 1;

const text = (value) => String(value ?? "").trim();

const lowerText = (value) => text(value).toLowerCase();

const finiteNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const rowWarning = ({ rowNumber = null, field = "row", code, message, id = "" }) => ({ rowNumber, field, code, message, id });

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value ?? {}, key);

const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

const importSetValidator = (value) => ({
  isValid: isObject(value) && value.version === DATASET_VERSION && Array.isArray(value.institutions),
  value,
  errors: ["Stored institution import data must be version 1 with an institutions array."],
});

const connectionSetValidator = (value) => validateConnectionSet(value);

const normalizeStoredImports = (stored) => stored.institutions ?? [];

const OFFICE_INFERENCE_RULES = Object.freeze([
  { office: "ganghwa", patterns: [/강화군/u, /강화읍/u] },
  { office: "south", patterns: [/미추홀구/u, /중구/u, /동구/u, /옹진군/u] },
  { office: "north", patterns: [/부평구/u, /계양구/u] },
  { office: "east", patterns: [/남동구/u, /연수구/u] },
  { office: "west", patterns: [/서구/u] },
]);

const inferOfficeFromAddress = (address) => {
  const source = text(address);
  const matched = OFFICE_INFERENCE_RULES.find((rule) => rule.patterns.some((pattern) => pattern.test(source)));
  return matched?.office ?? null;
};

const withGeocode = (row, geocodeById) => {
  const geocoded = geocodeById.get(text(row.id));
  if (!geocoded) {
    return row;
  }
  const lat = finiteNumber(geocoded.lat);
  const lng = finiteNumber(geocoded.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return row;
  }
  return { ...row, lat, lng, geocodeAddress: text(geocoded.geocodeAddress ?? geocoded.addressName ?? row.geocodeAddress) };
};

const geocodeRowsFrom = (geocodeResults) => (
  Array.isArray(geocodeResults) ? geocodeResults : geocodeResults?.mappableRows ?? []
);

const geocodeIndex = (geocodeResults) => new Map(
  geocodeRowsFrom(geocodeResults)
    .filter((row) => text(row?.id))
    .map((row) => [text(row.id), row]),
);

const prepareImportedRow = (row, rowNumber, geocodeById) => {
  const rawOffice = text(row?.office);
  const inferredOffice = rawOffice ? null : inferOfficeFromAddress(row?.address);
  const office = rawOffice || inferredOffice || "unassigned";
  const officeSource = inferredOffice ? "inferred" : text(row?.officeSource || (rawOffice ? "explicit" : "imported"));
  const prepared = withGeocode({ ...row, office, officeSource }, geocodeById);
  const warnings = [];
  if (!rawOffice && !inferredOffice) {
    warnings.push(rowWarning({
      rowNumber,
      field: "office",
      code: "unassigned_import_office",
      message: "Imported row has no valid office and was kept as unassigned.",
      id: text(row?.id),
    }));
  }
  return { row: prepared, warnings };
};

const normalizeImportedRows = ({ importedRows, geocodeResults, builtInIds }) => {
  const geocodeById = geocodeIndex(geocodeResults);
  const importedInstitutions = [];
  const warnings = [];
  const seen = new Set();

  importedRows.forEach((row, index) => {
    const rowNumber = index + 1;
    const prepared = prepareImportedRow(row, rowNumber, geocodeById);
    warnings.push(...prepared.warnings);
    const result = validateInstitution(prepared.row, { rowNumber });
    warnings.push(...result.warnings);
    if (!result.isValid) {
      warnings.push(...result.errors);
      return;
    }
    if (builtInIds.has(result.value.id)) {
      warnings.push(rowWarning({
        rowNumber,
        code: "duplicate_builtin_id",
        message: "Imported row id matched a built-in institution and was skipped.",
        id: result.value.id,
      }));
      return;
    }
    if (seen.has(result.value.id)) {
      warnings.push(rowWarning({
        rowNumber,
        code: "duplicate_import_id",
        message: "Duplicate imported institution id was skipped.",
        id: result.value.id,
      }));
      return;
    }
    seen.add(result.value.id);
    importedInstitutions.push(result.value);
  });

  return { importedInstitutions, warnings };
};

const normalizeBuiltIns = (rows) => {
  const institutions = [];
  const warnings = [];
  rows.forEach((row, index) => {
    const result = validateInstitution(row, { rowNumber: index + 1 });
    warnings.push(...result.warnings);
    if (result.isValid) {
      institutions.push(result.value);
    } else {
      warnings.push(...result.errors);
    }
  });
  return { institutions, warnings };
};

export const mergeImportedInstitutions = ({
  builtInInstitutions = [],
  importedRows = [],
  geocodeResults = [],
  storage = null,
  now,
} = {}) => {
  const builtIns = normalizeBuiltIns(builtInInstitutions);
  const builtInIds = new Set(builtIns.institutions.map((row) => row.id));
  const imported = normalizeImportedRows({ importedRows, geocodeResults, builtInIds });
  const institutions = [...builtIns.institutions, ...imported.importedInstitutions];
  const warnings = [...builtIns.warnings, ...imported.warnings];

  if (storage) {
    const saved = saveImportedInstitutions(imported.importedInstitutions, { storage, now });
    warnings.push(...saved.warnings);
  }

  return { institutions, builtInInstitutions: builtIns.institutions, importedInstitutions: imported.importedInstitutions, warnings };
};

export const saveImportedInstitutions = (institutions, { storage, now } = {}) => writeVersionedJson({
  storage,
  key: STORAGE_KEYS.institutionImports,
  value: { version: DATASET_VERSION, institutions },
  now,
});

export const loadAllInstitutions = ({ builtInInstitutions = [], storage = null, now } = {}) => {
  const loaded = readVersionedJson({
    storage,
    key: STORAGE_KEYS.institutionImports,
    fallback: { version: DATASET_VERSION, institutions: [] },
    now,
    validate: importSetValidator,
  });
  const merged = mergeImportedInstitutions({ builtInInstitutions, importedRows: normalizeStoredImports(loaded.value) });
  return { ...merged, warnings: [...loaded.warnings, ...merged.warnings] };
};

export const getInstitutionById = (institutions, id) => (
  institutions.find((institution) => institution.id === id) ?? null
);

const matchesCustomFields = (institution, customFields) => {
  if (!isObject(customFields) || Object.keys(customFields).length === 0) {
    return true;
  }
  const fields = institution.customFields ?? {};
  return Object.entries(customFields).every(([key, expected]) => (
    hasOwn(fields, key) && lowerText(fields[key]).includes(lowerText(expected))
  ));
};

const matchesSearch = (institution, query) => {
  const normalizedQuery = lowerText(query);
  if (!normalizedQuery) {
    return true;
  }
  const customText = Object.values(institution.customFields ?? {}).map(text).join(" ");
  return [institution.name, institution.address, institution.office, institution.type, institution.level, institution.designation, customText]
    .some((value) => lowerText(value).includes(normalizedQuery));
};

export const filterInstitutions = (institutions, filters = {}) => institutions.filter((institution) => {
  if (filters.type && filters.type !== "all" && institution.type !== filters.type) {
    return false;
  }
  if (filters.office && filters.office !== "all" && institution.office !== filters.office) {
    return false;
  }
  if (filters.level && filters.level !== "all" && text(institution.level) !== text(filters.level)) {
    return false;
  }
  if (!matchesSearch(institution, filters.search)) {
    return false;
  }
  return matchesCustomFields(institution, filters.customFields);
});

export const exportDataset = ({
  institutions = [],
  importedInstitutions = [],
  connections = [],
  now = () => new Date().toISOString(),
} = {}) => ({
  version: DATASET_VERSION,
  exportedAt: now(),
  institutions,
  importedInstitutions,
  connections: { version: DATASET_VERSION, connections },
});

export const loadConnections = ({ storage = null, now } = {}) => {
  const loaded = readVersionedJson({
    storage,
    key: STORAGE_KEYS.connections,
    fallback: { version: DATASET_VERSION, connections: [] },
    now,
    validate: connectionSetValidator,
  });
  return { value: loaded.value, warnings: loaded.warnings, backupKey: loaded.backupKey };
};

export const saveConnections = (connectionSet, { storage = null, now } = {}) => {
  const candidate = Array.isArray(connectionSet)
    ? { version: DATASET_VERSION, connections: connectionSet }
    : connectionSet;
  const validated = validateConnectionSet(candidate);
  if (!validated.isValid) {
    return { ok: false, backupKey: null, warnings: validated.errors };
  }
  return writeVersionedJson({ storage, key: STORAGE_KEYS.connections, value: validated.value, now });
};
