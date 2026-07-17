import {
  CONNECTION_COLOR_CODES,
  CONNECTION_STROKE_STYLES,
  INSTITUTION_TYPE_ALIASES,
  INSTITUTION_TYPE_LABELS,
  OFFICE_ALIASES,
  OFFICE_LABELS,
  OFFICE_SOURCE_CODES,
} from "./constants.js";

const text = (value) => String(value ?? "").trim();

const aliasKey = (value) => text(value).toLowerCase().replace(/[\s_\-./()·]/g, "");

const buildAliasIndex = (aliases) => {
  const index = new Map();
  for (const [code, values] of Object.entries(aliases)) {
    index.set(aliasKey(code), code);
    for (const value of values) {
      index.set(aliasKey(value), code);
    }
  }
  return index;
};

const OFFICE_ALIAS_INDEX = buildAliasIndex(OFFICE_ALIASES);
const TYPE_ALIAS_INDEX = buildAliasIndex(INSTITUTION_TYPE_ALIASES);
const SOURCE_CODE_SET = new Set(OFFICE_SOURCE_CODES);
const CONNECTION_COLOR_SET = new Set(CONNECTION_COLOR_CODES);
const CONNECTION_STROKE_SET = new Set(CONNECTION_STROKE_STYLES);

const rowError = ({ rowNumber = null, field, code, message }) => ({
  rowNumber,
  field,
  code,
  message,
});

const parseCoordinate = (value) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  const trimmed = text(value);
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const normalizeOffice = (value) => {
  const key = aliasKey(value);
  const code = OFFICE_ALIAS_INDEX.get(key);
  if (code) {
    return {
      code,
      label: OFFICE_LABELS[code],
      isKnown: true,
    };
  }
  return {
    code: "unassigned",
    label: OFFICE_LABELS.unassigned,
    isKnown: !text(value),
  };
};

export const normalizeInstitutionType = (value) => {
  const key = aliasKey(value);
  const code = TYPE_ALIAS_INDEX.get(key);
  if (code) {
    return {
      code,
      label: INSTITUTION_TYPE_LABELS[code],
      isKnown: true,
    };
  }
  return {
    code: null,
    label: "",
    isKnown: false,
  };
};

export const validateInstitution = (row, context = {}) => {
  const rowNumber = context.rowNumber ?? null;
  const errors = [];
  const warnings = [];
  if (!isPlainObject(row)) {
    return {
      isValid: false,
      value: null,
      errors: [rowError({
        rowNumber,
        field: "row",
        code: "invalid_row",
        message: "Institution row must be an object.",
      })],
      warnings,
    };
  }

  const id = text(row.id);
  const name = text(row.name);
  const type = normalizeInstitutionType(row.type);
  const office = normalizeOffice(row.office);
  const officeSource = text(row.officeSource);
  const address = text(row.address);
  const lat = parseCoordinate(row.lat);
  const lng = parseCoordinate(row.lng);

  if (!id) {
    errors.push(rowError({ rowNumber, field: "id", code: "missing_id", message: "Institution id is required." }));
  }
  if (!name) {
    errors.push(rowError({ rowNumber, field: "name", code: "missing_name", message: "Institution name is required." }));
  }
  if (!type.isKnown) {
    errors.push(rowError({ rowNumber, field: "type", code: "invalid_type", message: "Institution type must use a canonical code or known alias." }));
  }
  if (!office.isKnown) {
    warnings.push(rowError({ rowNumber, field: "office", code: "unknown_office", message: "Unknown office normalized to unassigned." }));
  }
  if (!officeSource || !SOURCE_CODE_SET.has(officeSource)) {
    errors.push(rowError({ rowNumber, field: "officeSource", code: "invalid_office_source", message: "officeSource must be explicit, inferred, default, or imported." }));
  }
  if (!address && (!Number.isFinite(lat) || !Number.isFinite(lng))) {
    errors.push(rowError({ rowNumber, field: "address", code: "missing_location", message: "A nonempty address or finite lat/lng pair is required." }));
  }
  if ((Number.isFinite(lat) && !Number.isFinite(lng)) || (!Number.isFinite(lat) && Number.isFinite(lng))) {
    errors.push(rowError({ rowNumber, field: "lat,lng", code: "partial_coordinates", message: "lat and lng must be provided together." }));
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      value: null,
      errors,
      warnings,
    };
  }

  return {
    isValid: true,
    value: {
      ...row,
      id,
      name,
      type: type.code,
      office: office.code,
      officeSource,
      address,
      lat: Number.isFinite(lat) ? lat : undefined,
      lng: Number.isFinite(lng) ? lng : undefined,
    },
    errors,
    warnings,
  };
};

export const validateInstitutionList = (rows, context = {}) => {
  if (!Array.isArray(rows)) {
    return {
      isValid: false,
      rows: [],
      errors: [rowError({
        rowNumber: null,
        field: "rows",
        code: "invalid_dataset",
        message: "Institution dataset must be an array.",
      })],
      warnings: [],
    };
  }
  const normalizedRows = [];
  const errors = [];
  const warnings = [];
  const startRowNumber = Number.isInteger(context.startRowNumber) ? context.startRowNumber : 1;
  rows.forEach((row, index) => {
    const result = validateInstitution(row, { rowNumber: startRowNumber + index });
    errors.push(...result.errors);
    warnings.push(...result.warnings);
    if (result.isValid) {
      normalizedRows.push(result.value);
    }
  });
  return {
    isValid: errors.length === 0,
    rows: normalizedRows,
    errors,
    warnings,
  };
};

export const validateConnectionSet = (input) => {
  const errors = [];
  if (!isPlainObject(input)) {
    return {
      isValid: false,
      value: null,
      errors: [rowError({ field: "connections", code: "invalid_connection_set", message: "Connection data must be an object." })],
    };
  }
  if (input.version !== 1) {
    errors.push(rowError({ field: "version", code: "invalid_version", message: "Connection data version must be 1." }));
  }
  if (!Array.isArray(input.connections)) {
    errors.push(rowError({ field: "connections", code: "invalid_connections", message: "connections must be an array." }));
  }
  if (errors.length > 0) {
    return { isValid: false, value: null, errors };
  }

  const normalizedConnections = [];
  input.connections.forEach((connection, index) => {
    const rowNumber = index + 1;
    if (!isPlainObject(connection)) {
      errors.push(rowError({ rowNumber, field: "connection", code: "invalid_connection", message: "Connection must be an object." }));
      return;
    }
    const id = text(connection.id);
    const fromId = text(connection.fromId);
    const toId = text(connection.toId);
    const color = text(connection.color || "blue");
    const strokeStyle = text(connection.strokeStyle || "solid");
    if (!id) {
      errors.push(rowError({ rowNumber, field: "id", code: "missing_connection_id", message: "Connection id is required." }));
    }
    if (!fromId) {
      errors.push(rowError({ rowNumber, field: "fromId", code: "missing_from_id", message: "fromId is required." }));
    }
    if (!toId) {
      errors.push(rowError({ rowNumber, field: "toId", code: "missing_to_id", message: "toId is required." }));
    }
    if (fromId && fromId === toId) {
      errors.push(rowError({ rowNumber, field: "toId", code: "self_connection", message: "Connection endpoints must be different institutions." }));
    }
    if (!CONNECTION_COLOR_SET.has(color)) {
      errors.push(rowError({ rowNumber, field: "color", code: "invalid_color", message: "Connection color is not allowed." }));
    }
    if (!CONNECTION_STROKE_SET.has(strokeStyle)) {
      errors.push(rowError({ rowNumber, field: "strokeStyle", code: "invalid_stroke_style", message: "Connection stroke style is not allowed." }));
    }
    if (errors.length === 0) {
      normalizedConnections.push({
        ...connection,
        id,
        fromId,
        toId,
        color,
        strokeStyle,
        label: text(connection.label),
        createdAt: text(connection.createdAt),
      });
    }
  });

  return {
    isValid: errors.length === 0,
    value: errors.length === 0 ? { version: 1, connections: normalizedConnections } : null,
    errors,
  };
};
