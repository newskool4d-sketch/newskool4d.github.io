import { CONNECTION_COLOR_VALUES, CONNECTION_STROKE_STYLES } from "./constants.js";
import { loadConnections, saveConnections } from "./institution-repository.js";

const VERSION = 1;
const COLOR_CODES = Object.freeze(Object.keys(CONNECTION_COLOR_VALUES));
const STROKE_SET = new Set(CONNECTION_STROKE_STYLES);
const STYLE_OPTIONS = Object.freeze({ solid: "solid", dashed: "shortdash", dotted: "dot" });
const LABEL_LIMIT = 80;

const text = (value) => String(value ?? "").trim();
const finite = (value) => (Number.isFinite(Number(value)) ? Number(value) : null);
const hasCoordinates = (row) => finite(row?.lat) !== null && finite(row?.lng) !== null;
const rowError = ({ rowNumber = null, field, code, message, id = "" }) => ({ rowNumber, field, code, message, id });
const HTML_ESCAPE = Object.freeze({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" });
const escapeHtml = (value) => text(value).replace(/[&<>"']/g, (char) => HTML_ESCAPE[char]);
const downloadJson = (filename, json) => {
  const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url; link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const sanitizeConnectionLabel = (value) => text(value).replace(/<[^>]*>/g, "").slice(0, LABEL_LIMIT);

export const connectionDistanceMeters = (from, to) => {
  if (!hasCoordinates(from) || !hasCoordinates(to)) return null;
  const radius = 6371000;
  const lat1 = finite(from.lat) * Math.PI / 180;
  const lat2 = finite(to.lat) * Math.PI / 180;
  const deltaLat = (finite(to.lat) - finite(from.lat)) * Math.PI / 180;
  const deltaLng = (finite(to.lng) - finite(from.lng)) * Math.PI / 180;
  const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return Math.round(radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

export const createConnectionDraft = ({ id = "", fromId = "", toId = "", color = "blue", strokeStyle = "solid", label = "", now = () => new Date().toISOString() } = {}) => {
  const createdAt = text(now());
  const safeFrom = text(fromId);
  const safeTo = text(toId);
  const generated = `connection-${safeFrom}-${safeTo}-${createdAt}`.replace(/[^a-z0-9가-힣_-]+/giu, "-");
  return { id: text(id) || generated, fromId: safeFrom, toId: safeTo, color: text(color) || "blue", strokeStyle: text(strokeStyle) || "solid", label: sanitizeConnectionLabel(label), createdAt };
};

const parseConnectionSet = (input) => {
  if (typeof input !== "string") return { ok: true, value: input };
  try { return { ok: true, value: JSON.parse(input) }; } catch {
    return { ok: false, errors: [rowError({ field: "connections", code: "corrupt_json", message: "Connection JSON is corrupt." })] };
  }
};

export const serializeConnectionSet = (input) => {
  const parsed = parseConnectionSet(input);
  if (!parsed.ok) return parsed;
  const value = parsed.value;
  const errors = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, errors: [rowError({ field: "connections", code: "invalid_connection_set", message: "Connection data must be an object." })] };
  }
  if (value.version !== VERSION) errors.push(rowError({ field: "version", code: "invalid_version", message: "Connection data version must be 1." }));
  if (!Array.isArray(value.connections)) errors.push(rowError({ field: "connections", code: "invalid_connections", message: "connections must be an array." }));
  if (errors.length) return { ok: false, errors };
  const idCounts = new Map();
  value.connections.forEach((row) => idCounts.set(text(row?.id), (idCounts.get(text(row?.id)) ?? 0) + 1));
  const connections = [];
  value.connections.forEach((row, index) => {
    const rowNumber = index + 1;
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      errors.push(rowError({ rowNumber, field: "connection", code: "invalid_connection", message: "Connection must be an object." }));
      return;
    }
    const connection = { id: text(row.id), fromId: text(row.fromId), toId: text(row.toId), color: text(row.color) || "blue", strokeStyle: text(row.strokeStyle) || "solid", label: sanitizeConnectionLabel(row.label), createdAt: text(row.createdAt) };
    const rowErrors = [];
    if (!connection.id) rowErrors.push(rowError({ rowNumber, field: "id", code: "missing_connection_id", message: "Connection id is required." }));
    if (!connection.fromId) rowErrors.push(rowError({ rowNumber, field: "fromId", code: "missing_from_id", message: "fromId is required." }));
    if (!connection.toId) rowErrors.push(rowError({ rowNumber, field: "toId", code: "missing_to_id", message: "toId is required." }));
    if (connection.fromId && connection.fromId === connection.toId) rowErrors.push(rowError({ rowNumber, field: "toId", code: "self_connection", message: "Connection endpoints must be different institutions.", id: connection.id }));
    if (idCounts.get(connection.id) > 1) rowErrors.push(rowError({ rowNumber, field: "id", code: "duplicate_connection_id", message: "Connection id must be unique.", id: connection.id }));
    if (!COLOR_CODES.includes(connection.color)) rowErrors.push(rowError({ rowNumber, field: "color", code: "invalid_color", message: "Connection color is not allowed.", id: connection.id }));
    if (!STROKE_SET.has(connection.strokeStyle)) rowErrors.push(rowError({ rowNumber, field: "strokeStyle", code: "invalid_stroke_style", message: "Connection stroke style is not allowed.", id: connection.id }));
    errors.push(...rowErrors);
    if (!rowErrors.length) connections.push(connection);
  });
  return errors.length ? { ok: false, errors } : { ok: true, value: { version: VERSION, connections } };
};

export const validateConnectionsForInstitutions = (input, institutions = []) => {
  const serialized = serializeConnectionSet(input);
  if (!serialized.ok) return { isValid: false, value: null, errors: serialized.errors };
  const byId = new Map(institutions.map((row) => [text(row.id), row]));
  const errors = [];
  serialized.value.connections.forEach((connection, index) => {
    const rowNumber = index + 1;
    const from = byId.get(connection.fromId);
    const to = byId.get(connection.toId);
    if (!from) errors.push(rowError({ rowNumber, field: "fromId", code: "orphan_from_id", message: "Start institution was not found.", id: connection.id }));
    if (!to) errors.push(rowError({ rowNumber, field: "toId", code: "orphan_to_id", message: "End institution was not found.", id: connection.id }));
    if ((from && !hasCoordinates(from)) || (to && !hasCoordinates(to))) {
      errors.push(rowError({ rowNumber, field: "lat,lng", code: "endpoint_missing_coordinates", message: "Both endpoints need finite coordinates.", id: connection.id }));
    }
  });
  return errors.length ? { isValid: false, value: null, errors } : { isValid: true, value: serialized.value, errors };
};

const formatDistance = (meters) => (Number.isFinite(meters) ? `${(meters / 1000).toFixed(meters >= 10000 ? 1 : 2)} km` : "좌표 필요");
const optionLabel = (row) => `${row.name || row.id} (${row.id})`;

const defaultElements = (root) => ({
  from: root.querySelector("#connection-from"), to: root.querySelector("#connection-to"), color: root.querySelector("#connection-color"), stroke: root.querySelector("#connection-stroke"),
  label: root.querySelector("#connection-label"), create: root.querySelector("#connection-create"), list: root.querySelector("#connection-list"), message: root.querySelector("#connection-message"),
  distance: root.querySelector("#connection-distance"), exportButton: root.querySelector("#connection-export"), importFile: root.querySelector("#connection-import-file"), importButton: root.querySelector("#connection-import-button"),
});

export const createConnectionManager = ({ kakao = null, map = null, storage = globalThis.localStorage, elements = null } = {}) => {
  let maps = kakao?.maps ?? null;
  let currentMap = map;
  let institutions = [];
  let connections = loadConnections({ storage }).value.connections;
  let polylines = [];
  let ui = elements;

  const institutionById = () => new Map(institutions.map((row) => [text(row.id), row]));
  const setMessage = (message) => { if (ui?.message) ui.message.textContent = message; };
  const clearLines = () => { polylines.forEach((line) => line.setMap?.(null)); polylines = []; };
  const save = () => saveConnections({ version: VERSION, connections }, { storage });

  const renderLines = () => {
    clearLines();
    const validation = validateConnectionsForInstitutions({ version: VERSION, connections }, institutions);
    if (!validation.isValid) return validation;
    if (!maps?.Polyline || !maps?.LatLng || !currentMap) return validation;
    const rows = institutionById();
    polylines = validation.value.connections.map((connection) => {
      const from = rows.get(connection.fromId);
      const to = rows.get(connection.toId);
      const line = new maps.Polyline({
        path: [new maps.LatLng(Number(from.lat), Number(from.lng)), new maps.LatLng(Number(to.lat), Number(to.lng))],
        strokeWeight: 4,
        strokeColor: CONNECTION_COLOR_VALUES[connection.color],
        strokeOpacity: 0.9,
        strokeStyle: STYLE_OPTIONS[connection.strokeStyle] ?? "solid",
      });
      line.setMap(currentMap);
      return line;
    });
    return validation;
  };

  const renderOptions = () => {
    if (!ui?.from || !ui?.to) return;
    const options = institutions.map((row) => `<option value="${escapeHtml(row.id)}">${escapeHtml(optionLabel(row))}</option>`).join("");
    ui.from.innerHTML = `<option value="">시작 기관 선택</option>${options}`;
    ui.to.innerHTML = `<option value="">도착 기관 선택</option>${options}`;
  };

  const renderList = () => {
    if (!ui?.list) return;
    const rows = institutionById();
    ui.list.innerHTML = connections.length ? connections.map((connection) => {
      const from = rows.get(connection.fromId);
      const to = rows.get(connection.toId);
      const distance = formatDistance(connectionDistanceMeters(from, to));
      return `<li><span><strong>${escapeHtml(connection.label || "무제 연결선")}</strong><small>${escapeHtml(from?.name ?? connection.fromId)} -> ${escapeHtml(to?.name ?? connection.toId)} · ${distance}</small></span><button class="um-button" type="button" data-connection-delete="${escapeHtml(connection.id)}">삭제</button></li>`;
    }).join("") : "<li>저장된 연결선이 없습니다.</li>";
  };

  const refreshUi = () => {
    renderOptions();
    renderList();
    renderLines();
    if (ui?.distance) ui.distance.textContent = "시작과 도착 기관을 선택하면 직선거리를 표시합니다.";
  };

  const add = (draft) => {
    const candidate = { version: VERSION, connections: [...connections, draft] };
    const validation = validateConnectionsForInstitutions(candidate, institutions);
    if (!validation.isValid) return { ok: false, errors: validation.errors };
    connections = validation.value.connections;
    const saved = save();
    renderList();
    renderLines();
    return { ok: saved.ok, errors: saved.ok ? [] : saved.warnings, warnings: saved.warnings };
  };

  const remove = (id) => {
    connections = connections.filter((connection) => connection.id !== id);
    const saved = save();
    renderList();
    renderLines();
    return { ok: saved.ok, warnings: saved.warnings };
  };

  const updateDistance = () => {
    if (!ui?.distance) return;
    const rows = institutionById();
    ui.distance.textContent = `직선거리: ${formatDistance(connectionDistanceMeters(rows.get(ui.from?.value), rows.get(ui.to?.value)))}`;
  };

  const importJson = (json) => {
    const validation = validateConnectionsForInstitutions(json, institutions);
    if (!validation.isValid) return { ok: false, errors: validation.errors };
    connections = validation.value.connections;
    const saved = save();
    refreshUi();
    return { ok: saved.ok, errors: saved.ok ? [] : saved.warnings, warnings: saved.warnings };
  };

  const bindControls = (root = document) => {
    ui = ui ?? defaultElements(root);
    ui?.create?.addEventListener("click", () => {
      const result = add(createConnectionDraft({ fromId: ui.from?.value, toId: ui.to?.value, color: ui.color?.value, strokeStyle: ui.stroke?.value, label: ui.label?.value }));
      setMessage(result.ok
        ? (maps?.Polyline && currentMap ? "연결선을 저장하고 지도에 표시했습니다." : "연결선을 저장했습니다. 지도 선은 카카오 지도가 준비되면 표시됩니다.")
        : result.errors.map((error) => error.message).join(" "));
      if (result.ok && ui.label) ui.label.value = "";
    });
    ui?.list?.addEventListener("click", (event) => {
      const id = event.target?.dataset?.connectionDelete;
      if (id) setMessage(remove(id).ok ? "연결선을 삭제했습니다." : "연결선을 삭제하지 못했습니다.");
    });
    ui?.exportButton?.addEventListener("click", () => {
      downloadJson("incheon-map-connections.json", JSON.stringify({ version: VERSION, connections }, null, 2));
      setMessage("연결선 JSON을 내보냈습니다.");
    });
    ui?.importButton?.addEventListener("click", () => ui.importFile?.click());
    ui?.importFile?.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const result = importJson(await file.text());
      setMessage(result.ok ? "연결선 JSON을 가져왔습니다." : result.errors.map((error) => error.message).join(" "));
      event.target.value = "";
    });
    ui?.from?.addEventListener("change", updateDistance);
    ui?.to?.addEventListener("change", updateDistance);
    refreshUi();
  };

  return {
    add,
    bindControls,
    delete: remove,
    destroy: clearLines,
    exportJson: () => JSON.stringify({ version: VERSION, connections }, null, 2),
    getState: () => ({ connections: [...connections], rendered: polylines.length, canDraw: Boolean(maps?.Polyline && currentMap) }),
    importJson,
    refreshInstitutions(nextInstitutions = []) {
      institutions = nextInstitutions;
      refreshUi();
    },
    setMap({ kakao: nextKakao, map: nextMap }) {
      maps = nextKakao?.maps ?? maps;
      currentMap = nextMap ?? currentMap;
      renderLines();
    },
  };
};
