import { createGeocodeCache, normalizeGeocodeAddress } from "./geocode-cache.js";

const DEFAULT_CONCURRENCY = 3;
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_CHUNK_DELAY_MS = 150;
const DEFAULT_RETRY_DELAY_MS = 250;

const wait = (delayMs) => new Promise((resolve) => {
  setTimeout(resolve, delayMs);
});

const positiveNumber = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
};

const nonNegativeNumber = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
};

const finiteCoordinate = (value) => {
  const coordinate = Number(value);
  return Number.isFinite(coordinate) ? coordinate : null;
};

const hasValidCoordinates = (row) => (
  Number.isFinite(finiteCoordinate(row?.lat)) && Number.isFinite(finiteCoordinate(row?.lng))
);

const withCoordinates = (row, entry) => ({
  ...row,
  lat: entry.lat,
  lng: entry.lng,
  geocodeAddress: entry.addressName,
});

const skippedRow = (row) => ({
  ...row,
  lat: finiteCoordinate(row.lat),
  lng: finiteCoordinate(row.lng),
});

const normalizeResult = (result) => {
  const first = Array.isArray(result) ? result[0] : null;
  const lat = finiteCoordinate(first?.y);
  const lng = finiteCoordinate(first?.x);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  return {
    lat,
    lng,
    addressName: String(first?.address?.address_name ?? first?.road_address?.address_name ?? first?.address_name ?? ""),
  };
};

const statusReason = (status, results) => {
  if (status === "429") {
    return "throttled";
  }
  if (!Array.isArray(results) || results.length === 0) {
    return "zero_result";
  }
  return "geocode_error";
};

const isRetryable = (reason) => reason === "zero_result" || reason === "throttled";

const createInitialSummary = (total) => ({
  total,
  completed: 0,
  succeeded: 0,
  failed: 0,
  skipped: 0,
  cacheHits: 0,
  cancelled: false,
  mappableRows: [],
  failures: [],
});

const createFailure = (row, reason, address) => ({
  id: row?.id ?? "",
  address,
  reason,
  row,
});

const geocodeAddress = (geocoder, address) => new Promise((resolve) => {
  geocoder.addressSearch(address, (results, status) => {
    resolve({ results, status });
  });
});

const resolveKakaoServices = (options) => options.kakao?.maps?.services ?? globalThis.kakao?.maps?.services;

const resolveGeocoder = (options, services) => {
  if (options.geocoder) {
    return options.geocoder;
  }
  if (!services?.Geocoder) {
    throw new Error("Kakao maps geocoder service is not available.");
  }
  return new services.Geocoder();
};

export const createKakaoGeocodeQueue = (options = {}) => {
  const services = resolveKakaoServices(options);
  const geocoder = resolveGeocoder(options, services);
  const cache = options.cache ?? createGeocodeCache(options.cacheOptions);
  const status = options.status ?? services?.Status ?? {};
  const concurrency = positiveNumber(options.concurrency, DEFAULT_CONCURRENCY);
  const maxRetries = nonNegativeNumber(options.maxRetries, DEFAULT_MAX_RETRIES);
  const chunkDelayMs = nonNegativeNumber(options.chunkDelayMs, DEFAULT_CHUNK_DELAY_MS);
  const retryDelayMs = nonNegativeNumber(options.retryDelayMs, DEFAULT_RETRY_DELAY_MS);
  const onProgress = typeof options.onProgress === "function" ? options.onProgress : () => {};
  let cancelled = false;
  let running = false;

  const publishProgress = (event) => {
    onProgress(event);
  };

  const geocodeWithRetry = async (address) => {
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      const response = await geocodeAddress(geocoder, address);
      if (response.status === status.OK) {
        const entry = normalizeResult(response.results);
        if (entry) {
          return { kind: "success", entry, attempts: attempt + 1 };
        }
      }
      const reason = statusReason(response.status, response.results);
      if (attempt >= maxRetries || !isRetryable(reason) || cancelled) {
        return { kind: "failure", reason, attempts: attempt + 1 };
      }
      if (retryDelayMs > 0) {
        await wait(retryDelayMs);
      }
    }
    return { kind: "failure", reason: "geocode_error", attempts: maxRetries + 1 };
  };

  const processRow = async (row, summary) => {
    if (cancelled) {
      return;
    }
    if (hasValidCoordinates(row)) {
      summary.skipped += 1;
      summary.completed += 1;
      summary.mappableRows.push(skippedRow(row));
      publishProgress({ row, status: "skipped", completed: summary.completed, total: summary.total, cacheHit: false });
      return;
    }
    const address = normalizeGeocodeAddress(row?.address);
    if (!address) {
      summary.failed += 1;
      summary.completed += 1;
      const failure = createFailure(row, "missing_address", address);
      summary.failures.push(failure);
      publishProgress({ row, status: "failure", completed: summary.completed, total: summary.total, cacheHit: false, failure });
      return;
    }
    const cached = cache.get(address);
    if (cached) {
      summary.cacheHits += 1;
      summary.succeeded += 1;
      summary.completed += 1;
      summary.mappableRows.push(withCoordinates(row, cached));
      publishProgress({ row, status: "success", completed: summary.completed, total: summary.total, cacheHit: true });
      return;
    }
    const result = await geocodeWithRetry(address);
    if (result.kind === "success") {
      cache.set(address, result.entry);
      summary.succeeded += 1;
      summary.completed += 1;
      summary.mappableRows.push(withCoordinates(row, result.entry));
      publishProgress({ row, status: "success", completed: summary.completed, total: summary.total, cacheHit: false, attempts: result.attempts });
      return;
    }
    summary.failed += 1;
    summary.completed += 1;
    const failure = createFailure(row, result.reason, address);
    summary.failures.push(failure);
    publishProgress({ row, status: "failure", completed: summary.completed, total: summary.total, cacheHit: false, failure, attempts: result.attempts });
  };

  const runWorker = async (rows, state, summary) => {
    while (!cancelled) {
      const index = state.nextIndex;
      state.nextIndex += 1;
      if (index >= rows.length) {
        return;
      }
      await processRow(rows[index], summary);
      if (!cancelled && chunkDelayMs > 0) {
        await wait(chunkDelayMs);
      }
    }
  };

  return {
    async start(rows) {
      if (running) {
        throw new Error("Geocode queue is already running.");
      }
      running = true;
      cancelled = false;
      const inputRows = Array.isArray(rows) ? rows : [];
      const summary = createInitialSummary(inputRows.length);
      const state = { nextIndex: 0 };
      const workerCount = Math.min(concurrency, inputRows.length);
      const workers = Array.from({ length: workerCount }, () => runWorker(inputRows, state, summary));
      await Promise.all(workers);
      summary.cancelled = cancelled;
      running = false;
      return summary;
    },
    cancel() {
      cancelled = true;
    },
    get isRunning() {
      return running;
    },
  };
};
