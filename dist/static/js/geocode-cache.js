const DEFAULT_STORAGE_KEY = "incheon_geocode_cache_v1";

const cloneEntry = (entry) => ({
  lat: entry.lat,
  lng: entry.lng,
  addressName: entry.addressName,
});

const parseCoordinate = (value) => {
  const coordinate = Number(value);
  return Number.isFinite(coordinate) ? coordinate : null;
};

const normalizeEntry = (value) => {
  if (!value || typeof value !== "object") {
    return null;
  }
  const lat = parseCoordinate(value.lat);
  const lng = parseCoordinate(value.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  return {
    lat,
    lng,
    addressName: String(value.addressName ?? ""),
  };
};

const readStoredEntries = (storage, storageKey) => {
  if (!storage) {
    return [];
  }
  try {
    const raw = storage.getItem(storageKey);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.entries) ? parsed.entries : [];
  } catch (error) {
    if (error instanceof Error) {
      return [];
    }
    throw error;
  }
};

const writeStoredEntries = (storage, storageKey, entries) => {
  if (!storage) {
    return;
  }
  try {
    storage.setItem(storageKey, JSON.stringify({ version: 1, entries }));
  } catch (error) {
    if (error instanceof Error) {
      return;
    }
    throw error;
  }
};

export const normalizeGeocodeAddress = (value) => String(value ?? "")
  .replace(/[\u200B-\u200D\uFEFF]/g, "")
  .replace(/\s+/g, " ")
  .trim()
  .toLowerCase();

export const createGeocodeCache = (options = {}) => {
  const storage = options.storage ?? null;
  const storageKey = options.storageKey ?? DEFAULT_STORAGE_KEY;
  const entries = new Map();

  for (const [key, value] of readStoredEntries(storage, storageKey)) {
    const addressKey = normalizeGeocodeAddress(key);
    const entry = normalizeEntry(value);
    if (addressKey && entry) {
      entries.set(addressKey, entry);
    }
  }

  const persist = () => {
    writeStoredEntries(storage, storageKey, [...entries.entries()]);
  };

  return {
    get(address) {
      const key = normalizeGeocodeAddress(address);
      const entry = entries.get(key);
      return entry ? cloneEntry(entry) : null;
    },
    has(address) {
      return entries.has(normalizeGeocodeAddress(address));
    },
    set(address, value) {
      const key = normalizeGeocodeAddress(address);
      const entry = normalizeEntry(value);
      if (!key || !entry) {
        return false;
      }
      entries.set(key, entry);
      persist();
      return true;
    },
    clear() {
      entries.clear();
      persist();
    },
    toJSON() {
      return {
        version: 1,
        entries: [...entries.entries()].map(([key, value]) => [key, cloneEntry(value)]),
      };
    },
  };
};
