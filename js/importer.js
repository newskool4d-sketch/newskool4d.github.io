import { validateInstitution } from "./institution-schema.js";

const HEADER_ALIASES = Object.freeze({
  id: ["id", "식별자", "고유번호", "연번", "번호"],
  name: ["name", "school", "institution", "facility", "schoolname", "institutionname", "facilityname", "학교명", "기관명", "시설명", "명칭", "이름"],
  address: ["address", "addr", "location", "주소", "소재지", "위치", "도로명주소"],
  office: ["office", "regionaloffice", "관할지원청", "지원청", "관할", "교육지원청", "담당교육지원청", "담당지원청"],
  type: ["type", "category", "기관유형", "유형", "구분", "분류"],
  level: ["level", "schoollevel", "학교급", "급별", "과정"],
  lat: ["lat", "latitude", "y", "위도"],
  lng: ["lng", "lon", "long", "longitude", "x", "경도"],
  designation: ["designation", "지정교", "지정교유형", "학교성격", "성격", "지정구분"],
});

// "연구학교;선도학교" / "연구학교, 선도학교" 등 다중 지정을 "연구학교; 선도학교"로 통일한다.
const normalizeDesignation = (value) => text(value)
  .split(/[;,/·]/)
  .map((item) => item.trim())
  .filter(Boolean)
  .join("; ");

const text = (value) => String(value ?? "").trim();

const headerKey = (value) => text(value).toLowerCase().replace(/[\s_\-./()·:]/g, "");

const parseNumber = (value) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  const trimmed = text(value).replace(/,/g, "");
  if (!trimmed) {
    return undefined;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const isNonemptyRow = (row) => row.some((cell) => text(cell));

const delimiterCandidates = [",", "\t", ";"];

const countDelimiter = (line, delimiter) => {
  let count = 0;
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === "\"" && inQuotes && next === "\"") {
      index += 1;
    } else if (char === "\"") {
      inQuotes = !inQuotes;
    } else if (!inQuotes && char === delimiter) {
      count += 1;
    }
  }
  return count;
};

const firstPhysicalLine = (input) => {
  const match = String(input ?? "").match(/^[^\r\n]*/u);
  return match ? match[0] : "";
};

const detectDelimiter = (input) => {
  const firstLine = firstPhysicalLine(input);
  return delimiterCandidates
    .map((delimiter) => ({ delimiter, count: countDelimiter(firstLine, delimiter) }))
    .sort((left, right) => right.count - left.count)[0].delimiter;
};

export const parseDelimitedText = (input, options = {}) => {
  const delimiter = options.delimiter ?? detectDelimiter(input);
  const source = String(input ?? "").replace(/^\uFEFF/u, "");
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (char === "\"" && inQuotes && next === "\"") {
      cell += "\"";
      index += 1;
    } else if (char === "\"") {
      inQuotes = !inQuotes;
    } else if (!inQuotes && char === delimiter) {
      row.push(cell);
      cell = "";
    } else if (!inQuotes && (char === "\n" || char === "\r")) {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      if (char === "\r" && next === "\n") {
        index += 1;
      }
    } else {
      cell += char;
    }
  }

  if (cell || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return { delimiter, rows };
};

export const inferHeaderMap = (headers) => {
  const fields = {};
  const custom = [];
  const used = new Set();
  const aliasEntries = Object.entries(HEADER_ALIASES).map(([field, aliases]) => [
    field,
    new Set([field, ...aliases].map(headerKey)),
  ]);

  headers.forEach((header, index) => {
    const key = headerKey(header);
    const matched = aliasEntries.find(([field, aliases]) => !used.has(field) && aliases.has(key));
    if (matched) {
      fields[matched[0]] = index;
      used.add(matched[0]);
    } else {
      custom.push(index);
    }
  });

  return { fields, custom };
};

const hasHeader = (row) => Object.keys(inferHeaderMap(row).fields).length > 0;

const normalizeMatrix = (rows) => {
  const rectangularRows = rows.map((row) => row.map((cell) => text(cell)));
  if (rectangularRows.length === 0) {
    return { headers: [], rows: [], headered: false };
  }
  if (hasHeader(rectangularRows[0])) {
    return { headers: rectangularRows[0], rows: rectangularRows.slice(1), headered: true };
  }
  const maxColumns = Math.max(...rectangularRows.map((row) => row.length));
  return { headers: Array.from({ length: maxColumns }, (_, index) => `column_${index + 1}`), rows: rectangularRows, headered: false };
};

const valueAt = (row, index) => (Number.isInteger(index) ? text(row[index]) : "");

const rawObject = (headers, row) => Object.fromEntries(headers.map((header, index) => [header, text(row[index])]));

const customFieldsFor = (headers, row, customIndexes) => {
  const customFields = {};
  for (const index of customIndexes) {
    const value = text(row[index]);
    if (value) {
      customFields[headers[index] || `column_${index + 1}`] = value;
    }
  }
  return customFields;
};

const duplicateKeyFor = (row) => headerKey(`${row.name}|${row.address}|${row.lat ?? ""}|${row.lng ?? ""}`);

const slug = (value) => {
  const normalized = headerKey(value).replace(/[^a-z0-9가-힣]/giu, "");
  return normalized || "row";
};

const rowError = ({ rowNumber, field, code, message }) => ({ rowNumber, field, code, message });

const makeCandidate = ({ headers, row, rowNumber, fields, custom }) => {
  const fallbackName = fields.name === undefined ? valueAt(row, 0) : "";
  const fallbackAddress = fields.address === undefined ? valueAt(row, 1) : "";
  const lat = parseNumber(valueAt(row, fields.lat));
  const lng = parseNumber(valueAt(row, fields.lng));
  const name = valueAt(row, fields.name) || fallbackName;
  const address = valueAt(row, fields.address) || fallbackAddress;
  const candidate = {
    id: valueAt(row, fields.id) || `import-${rowNumber}-${slug(name || address)}`,
    name,
    address,
    office: valueAt(row, fields.office) || "unassigned",
    officeSource: valueAt(row, fields.office) ? "explicit" : "imported",
    type: valueAt(row, fields.type) || "imported",
    level: valueAt(row, fields.level),
    customFields: customFieldsFor(headers, row, custom),
  };
  if (lat !== undefined) {
    candidate.lat = lat;
  }
  if (lng !== undefined) {
    candidate.lng = lng;
  }
  const designation = normalizeDesignation(valueAt(row, fields.designation));
  if (designation) {
    candidate.designation = designation;
  }
  return candidate;
};

export const buildImportPreview = (table) => {
  const normalized = Array.isArray(table)
    ? normalizeMatrix(table)
    : { headers: table.headers ?? [], rows: table.rows ?? [], headered: true };
  const inferred = inferHeaderMap(normalized.headers);
  const rows = [];
  const invalidRows = [];
  const warnings = [];
  const seen = new Set();
  const baseCounts = {
    total: normalized.rows.length,
    valid: 0,
    skipped: 0,
    duplicate: 0,
    preGeocoded: 0,
    missingAddress: 0,
  };

  normalized.rows.forEach((row, index) => {
    const rowNumber = index + (normalized.headered ? 2 : 1);
    const candidate = makeCandidate({ headers: normalized.headers, row, rowNumber, fields: inferred.fields, custom: inferred.custom });
    const raw = rawObject(normalized.headers, row);
    if (!candidate.address) {
      baseCounts.missingAddress += 1;
    }
    if (!isNonemptyRow(row)) {
      const errors = [
        rowError({ rowNumber, field: "name", code: "missing_name", message: "Institution name is required." }),
        rowError({ rowNumber, field: "address", code: "missing_location", message: "A nonempty address or finite lat/lng pair is required." }),
      ];
      invalidRows.push({ rowNumber, raw, errors, warnings: [] });
      baseCounts.skipped += 1;
      return;
    }

    const result = validateInstitution(candidate, { rowNumber });
    if (!result.isValid) {
      invalidRows.push({ rowNumber, raw, errors: result.errors, warnings: result.warnings });
      baseCounts.skipped += 1;
      return;
    }

    const duplicateKey = duplicateKeyFor(result.value);
    if (seen.has(duplicateKey)) {
      const warning = rowError({ rowNumber, field: "row", code: "duplicate_row", message: "Duplicate imported row skipped." });
      warnings.push(warning);
      invalidRows.push({ rowNumber, raw, errors: [], warnings: [warning] });
      baseCounts.duplicate += 1;
      baseCounts.skipped += 1;
      return;
    }

    seen.add(duplicateKey);
    rows.push(result.value);
    warnings.push(...result.warnings);
    baseCounts.valid += 1;
    if (Number.isFinite(result.value.lat) && Number.isFinite(result.value.lng)) {
      baseCounts.preGeocoded += 1;
    }
  });

  return { counts: baseCounts, rows, invalidRows, warnings, headerMap: inferred };
};

export const buildImportPreviewFromCsv = (input, options = {}) => {
  const parsed = parseDelimitedText(input, options);
  return buildImportPreview(normalizeMatrix(parsed.rows));
};

export const buildImportPreviewFromWorkbook = (workbook, options = {}) => {
  const sheetjs = options.sheetjs ?? globalThis.XLSX;
  if (!sheetjs?.utils?.sheet_to_json) {
    throw new Error("SheetJS XLSX adapter is required to parse workbook sheets.");
  }
  const sheetName = options.sheetName ?? workbook?.SheetNames?.[0];
  const sheet = sheetName ? workbook.Sheets?.[sheetName] : null;
  if (!sheet) {
    throw new Error("Workbook does not contain a readable first sheet.");
  }
  const rows = sheetjs.utils.sheet_to_json(sheet, { header: 1, blankrows: false, defval: "" });
  return buildImportPreview(rows);
};

export const buildImportPreviewFromArrayBuffer = (arrayBuffer, options = {}) => {
  const sheetjs = options.sheetjs ?? globalThis.XLSX;
  if (!sheetjs?.read) {
    throw new Error("SheetJS XLSX adapter is required to read XLS/XLSX files.");
  }
  return buildImportPreviewFromWorkbook(sheetjs.read(arrayBuffer, { type: "array" }), { ...options, sheetjs });
};

export const canonicalImportFields = Object.freeze(["id", "name", "address", "office", "type", "level", "designation", "lat", "lng"]);
