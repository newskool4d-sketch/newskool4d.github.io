const PROVIDER = "naver-directions-5";
const MAX_PATH_POINTS = 10000;

const finite = (value) => (Number.isFinite(Number(value)) ? Number(value) : null);
const isCoordinate = (lat, lng) => (
  finite(lat) !== null && finite(lng) !== null
  && finite(lat) >= -90 && finite(lat) <= 90
  && finite(lng) >= -180 && finite(lng) <= 180
);

export class RoadRouteError extends Error {
  constructor(message, { code = "directions_error", status = 0 } = {}) {
    super(message);
    this.name = "RoadRouteError";
    this.code = code;
    this.status = status;
  }
}

export const normalizeRoadRoute = (payload) => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new RoadRouteError("The road route response is invalid.", { code: "invalid_route_response" });
  }
  if (payload.provider !== PROVIDER) {
    throw new RoadRouteError("The road route provider is invalid.", { code: "invalid_route_provider" });
  }
  const path = Array.isArray(payload.path) ? payload.path.map((point) => (
    Array.isArray(point) && point.length === 2 && isCoordinate(point[0], point[1])
      ? [finite(point[0]), finite(point[1])]
      : null
  )) : [];
  if (path.length < 2 || path.length > MAX_PATH_POINTS || path.some((point) => point === null)) {
    throw new RoadRouteError("The response does not contain a valid road path.", { code: "invalid_route_path" });
  }
  const distanceMeters = finite(payload.distanceMeters);
  const durationMillis = finite(payload.durationMillis);
  if (distanceMeters === null || distanceMeters < 0 || durationMillis === null || durationMillis < 0) {
    throw new RoadRouteError("The road route summary is invalid.", { code: "invalid_route_summary" });
  }
  return {
    provider: PROVIDER,
    path,
    distanceMeters,
    durationMillis,
    routedAt: String(payload.routedAt ?? "").trim() || new Date().toISOString(),
  };
};

// Stored-route field mapping shared by js/connection-layer.js and
// js/institution-schema.js. Both modules normalize the same persisted
// connection fields (routeProvider/routePath/roadDistanceMeters/
// roadDurationMillis/routedAt) through normalizeRoadRoute() on save and
// again on load — this lives here once instead of twice (2026-09 review M3).
const STORED_ROUTE_FIELDS = ["routeProvider", "routePath", "roadDistanceMeters", "roadDurationMillis", "routedAt"];

export const hasStoredRouteData = (row) => STORED_ROUTE_FIELDS
  .some((field) => row?.[field] !== undefined && row?.[field] !== null && row?.[field] !== "");

// Normalizes a stored connection row's route fields, or throws RoadRouteError
// (same as normalizeRoadRoute) when they don't form a valid route. Callers
// keep their own try/catch so each can shape its own row-level error object.
export const extractStoredRouteFields = (row) => {
  const route = normalizeRoadRoute({
    provider: row.routeProvider,
    path: row.routePath,
    distanceMeters: row.roadDistanceMeters,
    durationMillis: row.roadDurationMillis,
    routedAt: row.routedAt,
  });
  return {
    routeProvider: route.provider,
    routePath: route.path,
    roadDistanceMeters: route.distanceMeters,
    roadDurationMillis: route.durationMillis,
    routedAt: route.routedAt,
  };
};

const endpoint = (row, name) => {
  if (!isCoordinate(row?.lat, row?.lng)) {
    throw new RoadRouteError(`${name} institution needs valid coordinates.`, { code: "invalid_route_endpoint" });
  }
  return { lat: finite(row.lat), lng: finite(row.lng) };
};

export const fetchRoadRoute = async ({ from, to, fetchImpl = globalThis.fetch, signal } = {}) => {
  const start = endpoint(from, "Start");
  const goal = endpoint(to, "End");
  const params = new URLSearchParams({
    start: `${start.lng},${start.lat}`,
    goal: `${goal.lng},${goal.lat}`,
  });
  const response = await fetchImpl(`/api/directions?${params}`, {
    method: "GET",
    headers: { accept: "application/json" },
    signal,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new RoadRouteError(
      String(payload.message ?? "도로 경로를 계산하지 못했습니다."),
      { code: String(payload.code ?? "directions_request_failed"), status: response.status },
    );
  }
  return normalizeRoadRoute(payload);
};
