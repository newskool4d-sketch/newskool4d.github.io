export const OVERRIDE_KEYS = Object.freeze({
  supervisor: "incheon_school_supervisors",
  designation: "incheon_school_designations",
});

export const DESIGNATION_SUGGESTIONS = Object.freeze([
  "연구학교",
  "선도학교",
  "시범학교",
  "자율학교",
  "거점학교",
  "혁신학교",
  "정책연구학교",
]);

const text = (value) => String(value ?? "").trim();

export const normalizeDesignation = (value) => text(value).split(/[;,/·]/u).map(text).filter(Boolean).join("; ");

const NORMALIZERS = Object.freeze({ supervisor: text, designation: normalizeDesignation });

const parseJson = (raw) => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const readMap = (storage, kind) => {
  const raw = storage?.getItem(OVERRIDE_KEYS[kind]);
  if (!raw) return { map: {}, warning: null };
  const parsed = parseJson(raw);
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    return { map: Object.fromEntries(Object.entries(parsed).filter(([, value]) => typeof value === "string" && text(value))), warning: null };
  }
  return {
    map: {},
    warning: { code: "corrupt_override", field: kind, message: `${OVERRIDE_KEYS[kind]} 저장값을 읽지 못해 빈 상태로 표시합니다.` },
  };
};

export const loadOverrides = ({ storage } = {}) => {
  const supervisor = readMap(storage, "supervisor");
  const designation = readMap(storage, "designation");
  return {
    supervisor: supervisor.map,
    designation: designation.map,
    warnings: [supervisor.warning, designation.warning].filter(Boolean),
  };
};

export const applyOverrides = (rows, overrides) => rows.map((row) => {
  const supervisor = overrides.supervisor[row.id];
  const designation = overrides.designation[row.id];
  if (supervisor === undefined && designation === undefined) return row;
  return {
    ...row,
    ...(supervisor === undefined ? {} : { supervisor }),
    ...(designation === undefined ? {} : { designation }),
  };
});

export const saveOverride = ({ storage, kind, id, value }) => {
  const normalized = NORMALIZERS[kind](value);
  const { map } = readMap(storage, kind);
  if (normalized) map[id] = normalized;
  else delete map[id];
  try {
    storage.setItem(OVERRIDE_KEYS[kind], JSON.stringify(map));
    return { ok: true, value: normalized };
  } catch (error) {
    return { ok: false, value: normalized, warning: { code: "override_save_failed", field: kind, message: error.message } };
  }
};

export const distinctOverrideValues = (rows, kind) => {
  const values = rows.flatMap((row) => (kind === "designation" ? text(row.designation).split(";").map(text) : [text(row.supervisor)]));
  return [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right, "ko"));
};
