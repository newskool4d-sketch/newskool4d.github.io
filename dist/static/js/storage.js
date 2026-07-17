export const STORAGE_KEYS = Object.freeze({
  institutionImports: "incheon_institution_imports_v1",
  connections: "incheon_connections_v1",
});

const isoNow = () => new Date().toISOString();

const emptyWarnings = Object.freeze([]);

const warning = (code, message, detail = {}) => ({
  code,
  message,
  ...detail,
});

const timestampForKey = (now) => now().replace(/[-:.]/g, "").replace("Z", "Z");

export const backupKeyFor = (key, now = isoNow) => `incheon_backup_${key}_${timestampForKey(now)}`;

export const resolveStorage = (storage = globalThis.localStorage) => storage ?? null;

const safeGetItem = (storage, key) => {
  if (!storage) {
    return { value: null, warnings: [warning("storage_unavailable", "localStorage is not available.", { key })] };
  }
  try {
    return { value: storage.getItem(key), warnings: emptyWarnings };
  } catch (error) {
    return {
      value: null,
      warnings: [warning("storage_read_failed", "Stored state could not be read.", { key, cause: error?.name ?? "Error" })],
    };
  }
};

const backupRawValue = ({ storage, key, rawValue, now }) => {
  if (!storage || rawValue === null || rawValue === undefined) {
    return { backupKey: null, warnings: emptyWarnings };
  }
  const backupKey = backupKeyFor(key, now);
  try {
    storage.setItem(backupKey, rawValue);
    return { backupKey, warnings: emptyWarnings };
  } catch (error) {
    return {
      backupKey: null,
      warnings: [warning("backup_failed", "Stored state could not be backed up.", {
        key,
        backupKey,
        cause: error?.name ?? "Error",
      })],
    };
  }
};

export const readVersionedJson = ({
  storage,
  key,
  fallback,
  now = isoNow,
  validate = () => ({ isValid: true }),
}) => {
  const adapter = resolveStorage(storage);
  const read = safeGetItem(adapter, key);
  if (read.value === null) {
    return { value: fallback, warnings: [...read.warnings], backupKey: null };
  }

  let parsed;
  try {
    parsed = JSON.parse(read.value);
  } catch (error) {
    const backup = backupRawValue({ storage: adapter, key, rawValue: read.value, now });
    return {
      value: fallback,
      backupKey: backup.backupKey,
      warnings: [
        ...read.warnings,
        warning("corrupt_json", "Stored JSON is corrupt; the old value was kept and backed up.", {
          key,
          cause: error?.name ?? "SyntaxError",
        }),
        ...backup.warnings,
      ],
    };
  }

  const validation = validate(parsed);
  if (!validation.isValid) {
    const backup = backupRawValue({ storage: adapter, key, rawValue: read.value, now });
    return {
      value: fallback,
      backupKey: backup.backupKey,
      warnings: [
        ...read.warnings,
        warning("migration_failed", "Stored state could not be migrated; the old value was kept and backed up.", {
          key,
          errors: validation.errors ?? [],
        }),
        ...backup.warnings,
      ],
    };
  }

  return { value: validation.value ?? parsed, warnings: [...read.warnings], backupKey: null };
};

export const writeVersionedJson = ({ storage, key, value, now = isoNow }) => {
  const adapter = resolveStorage(storage);
  const read = safeGetItem(adapter, key);
  const backup = backupRawValue({ storage: adapter, key, rawValue: read.value, now });
  if (!adapter) {
    return {
      ok: false,
      backupKey: backup.backupKey,
      warnings: [...read.warnings, ...backup.warnings],
    };
  }

  try {
    adapter.setItem(key, JSON.stringify(value));
    return {
      ok: true,
      backupKey: backup.backupKey,
      warnings: [...read.warnings, ...backup.warnings],
    };
  } catch (error) {
    const code = error?.name === "QuotaExceededError" ? "quota_exceeded" : "storage_write_failed";
    return {
      ok: false,
      backupKey: backup.backupKey,
      warnings: [
        ...read.warnings,
        ...backup.warnings,
        warning(code, "Stored state could not be replaced; the previous value was kept.", {
          key,
          cause: error?.name ?? "Error",
        }),
      ],
    };
  }
};
