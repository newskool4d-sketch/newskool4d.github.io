import { INSTITUTION_TYPE_LABELS, OFFICE_LABELS } from "./constants.js";
import { createConnectionManager } from "./connection-layer.js";
import { buildImportPreviewFromArrayBuffer, buildImportPreviewFromCsv } from "./importer.js";
import { exportDataset, filterInstitutions, loadAllInstitutions, loadConnections, mergeImportedInstitutions } from "./institution-repository.js";
import { createInstitutionMapLayer, filterRowsByMarkerLayers } from "./map-layers.js";

const MAP_PROVIDER = globalThis.IncheonMapProvider;
const INCHEON_CENTER = Object.freeze({ lat: 37.4563, lng: 126.7052 });

const state = {
  builtIns: [],
  institutions: [],
  importedInstitutions: [],
  warnings: [],
  filters: { search: "", office: "all", type: "all" }, markerLayers: { school: true, institution: true, imported: true },
  map: null, mapLayer: null, connectionManager: null,
  mapInitRequested: false,
  visibleRows: [],
};

const $ = (selector) => document.querySelector(selector);
const text = (value) => String(value ?? "").trim();
const hasCoordinates = (row) => Number.isFinite(Number(row.lat)) && Number.isFinite(Number(row.lng));

const setText = (selector, value) => {
  const node = $(selector);
  if (node) node.textContent = value;
};

const escapeHtml = (value) => text(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "\"": "&quot;",
  "'": "&#39;",
}[char]));

const safeExternalUrl = (value) => {
  try {
    const url = new URL(text(value));
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
};

const downloadJson = (filename, data) => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const selectedProvider = () => MAP_PROVIDER.currentProvider();
const providerMeta = () => MAP_PROVIDER.providerMeta(selectedProvider());
const keyStatus = () => text(MAP_PROVIDER.getCredential(selectedProvider()));

const renderKeyState = (message = "") => {
  const key = keyStatus();
  const meta = providerMeta();
  const status = $("#key-status");
  const badge = $("#map-key-badge");
  const input = $("#map-credential-input");
  const providerSelect = $("#map-provider-select");
  if (status) {
    status.textContent = key ? `${meta.badge} 연결 준비` : `${meta.badge} 설정 필요`;
    status.classList.toggle("is-ready", Boolean(key));
  }
  if (badge) badge.textContent = key ? `${meta.badge} SDK 대기` : `${meta.badge} 정보 필요`;
  badge?.classList.toggle("is-ready", Boolean(key));
  if (input && document.activeElement !== input) input.value = key;
  if (providerSelect && document.activeElement !== providerSelect) providerSelect.value = selectedProvider();
  setText("#map-credential-label", meta.credentialLabel);
  setText("#provider-help", `${meta.domainHelp} Client Secret은 입력하지 마세요.`);
  if (input) input.placeholder = meta.credentialPlaceholder;
  if (message) setText("#key-message", message);
};

const renderCounts = (rows) => {
  setText("#count-total", String(state.institutions.length)); setText("#count-visible", String(rows.length));
  setText("#count-imported", String(state.importedInstitutions.length));
  setText("#count-mappable", String(rows.filter(hasCoordinates).length));
};

const renderInvalidCoordinateRows = (rows) => {
  const host = $("#map-invalid-list");
  if (!host) return;
  const invalidRows = rows.filter((row) => !hasCoordinates(row));
  host.innerHTML = invalidRows.length
    ? invalidRows.slice(0, 20).map((row) => `<li>${escapeHtml(row.name || row.id)}: 좌표가 없어 마커를 만들지 않았습니다.</li>`).join("")
    : "<li>현재 필터에서 좌표 오류 행이 없습니다.</li>";
};

const syncMarkerLayer = (rows) => {
  const layerRows = state.visibleRows = filterRowsByMarkerLayers(rows, state.markerLayers);
  if (!state.mapLayer) {
    renderInvalidCoordinateRows(layerRows);
    setText("#map-layer-badge", keyStatus() ? "지도 준비 중" : "키 저장 후 마커 표시");
    setText("#map-state-text", `레이어 선택 기준 ${layerRows.filter(hasCoordinates).length}개 마커 대기, 좌표 오류 ${layerRows.filter((row) => !hasCoordinates(row)).length}개`);
    return;
  }
  const result = state.mapLayer.sync(layerRows);
  setText("#map-layer-badge", result.clusterer ? `클러스터 ${result.rendered}개` : `마커 ${result.rendered}개`);
  setText("#map-state-text", `마커 ${result.rendered}개 표시, 좌표 오류 ${result.invalidRows.length}개 제외`);
};

const rowTemplate = (row) => {
  const website = safeExternalUrl(row.website || row.url);
  return `
  <article class="um-row">
    <div class="um-row-main">
      <strong>${escapeHtml(row.name)}</strong>
      <span>${escapeHtml(row.address || "주소 없음")}</span>
      ${(row.phone || website) ? `<span class="um-row-contact">
        ${row.phone ? `<a href="tel:${escapeHtml(String(row.phone).replace(/[^0-9+]/g, ""))}">전화 ${escapeHtml(row.phone)}</a>` : ""}
        ${website ? `<a href="${escapeHtml(website)}" target="_blank" rel="noopener noreferrer">홈페이지</a>` : ""}
      </span>` : ""}
    </div>
    <div class="um-row-meta">
      <span class="um-chip" data-type="${escapeHtml(row.type)}">${escapeHtml(INSTITUTION_TYPE_LABELS[row.type] ?? row.type)}</span>
      <span class="um-chip">${escapeHtml(OFFICE_LABELS[row.office] ?? row.office)}</span>
      ${text(row.designation) ? `<span class="um-chip is-designation">${escapeHtml(row.designation)}</span>` : ""}
      <span class="um-chip ${hasCoordinates(row) ? "is-good" : "is-warn"}">${hasCoordinates(row) ? "좌표 있음" : "지오코딩 대기"}</span>
    </div>
  </article>
`;
};

const renderRows = () => {
  const rows = filterInstitutions(state.institutions, state.filters);
  renderCounts(rows);
  syncMarkerLayer(rows);
  const list = $("#institution-list");
  if (!list) return;
  list.innerHTML = rows.length
    ? rows.slice(0, 80).map(rowTemplate).join("")
    : `<div class="um-empty" tabindex="0">조건에 맞는 기관이 없습니다. 검색어와 필터를 조정해 주세요.</div>`;
  setText("#list-summary", rows.length > 80 ? `상위 80개 표시 / 전체 ${rows.length}개` : `${rows.length}개 표시`);
};

const renderWarnings = () => {
  const host = $("#warning-list");
  if (!host) return;
  host.innerHTML = state.warnings.length
    ? state.warnings.slice(0, 6).map((warning) => `<li>${escapeHtml(warning.message ?? warning.code)}</li>`).join("")
    : "<li>저장소 경고 없음</li>";
};

const refreshData = ({ institutions, importedInstitutions, warnings }) => {
  state.institutions = institutions;
  state.importedInstitutions = importedInstitutions;
  state.warnings = warnings;
  renderRows();
  renderWarnings();
  state.connectionManager?.refreshInstitutions(institutions);
};

const readBuiltIns = async () => {
  const response = await fetch("data/institutions.json", { cache: "no-store" });
  if (!response.ok) throw new Error("Built-in institution data could not be loaded.");
  return response.json();
};

const loadData = async () => {
  state.builtIns = await readBuiltIns();
  refreshData(loadAllInstitutions({ builtInInstitutions: state.builtIns, storage: localStorage }));
};

const renderPreview = (preview) => {
  setText("#import-valid", String(preview.counts.valid));
  setText("#import-skipped", String(preview.counts.skipped));
  setText("#import-duplicate", String(preview.counts.duplicate));
  setText("#import-geocoded", String(preview.counts.preGeocoded));
  const failed = $("#import-failed-list");
  if (failed) {
    const messageFor = (row) => row.errors[0]?.message ?? row.warnings[0]?.message ?? "검토 필요";
    failed.innerHTML = preview.invalidRows.length ? preview.invalidRows.slice(0, 5).map((row) => `<li>${row.rowNumber}행: ${escapeHtml(messageFor(row))}</li>`).join("") : "<li>실패 행 없음</li>";
  }
};

const handleImport = async (file) => {
  if (!file) return;
  const isWorkbook = /\.(xlsx|xls)$/iu.test(file.name);
  const preview = isWorkbook
    ? buildImportPreviewFromArrayBuffer(await file.arrayBuffer())
    : buildImportPreviewFromCsv(await file.text());
  renderPreview(preview);
  refreshData(mergeImportedInstitutions({
    builtInInstitutions: state.builtIns,
    importedRows: preview.rows,
    storage: localStorage,
  }));
  setText("#import-message", `${preview.counts.valid}개 행을 가져왔습니다. 마커 생성과 연결선 렌더링은 다음 단계에서 처리됩니다.`);
};

const initializeMap = async () => {
  const key = keyStatus();
  const provider = selectedProvider();
  const meta = providerMeta();
  renderKeyState();
  if (!key || state.map || state.mapInitRequested) return;
  state.mapInitRequested = true;
  setText("#map-state-text", `${meta.name} SDK를 불러오는 중입니다.`);
  try {
    const mapSdk = await MAP_PROVIDER.load({ provider, credential: key });
    const mapNode = $("#map");
    state.map = new mapSdk.maps.Map(mapNode, {
      center: new mapSdk.maps.LatLng(INCHEON_CENTER.lat, INCHEON_CENTER.lng),
      level: 8,
    });
    state.map.addControl(new mapSdk.maps.ZoomControl(), mapSdk.maps.ControlPosition.RIGHT);
    state.mapLayer = createInstitutionMapLayer({
      mapSdk,
      map: state.map,
      elements: { invalidList: $("#map-invalid-list") },
    });
    $("#map-placeholder")?.classList.add("is-hidden");
    setText("#map-state-text", "기본 지도가 준비되었습니다. 현재 필터의 기관 마커를 표시합니다.");
    setText("#map-key-badge", `${meta.badge} 지도 준비`);
    syncMarkerLayer(state.visibleRows);
    state.connectionManager?.setMap({ mapSdk, map: state.map });
  } catch (error) {
    state.mapInitRequested = false;
    setText("#map-state-text", `${meta.name}를 불러오지 못했습니다. 연결 정보와 등록 도메인을 확인해 주세요.`);
  }
};

const bindEvents = () => {
  $("#search-input")?.addEventListener("input", (event) => {
    state.filters.search = event.target.value;
    renderRows();
  });
  $("#office-filter")?.addEventListener("change", (event) => {
    state.filters.office = event.target.value;
    renderRows();
  });
  $("#type-filter")?.addEventListener("change", (event) => {
    state.filters.type = event.target.value;
    renderRows();
  });
  document.querySelectorAll("[data-marker-layer]").forEach((input) => input.addEventListener("change", (event) => { state.markerLayers[event.target.value] = event.target.checked; renderRows(); }));
  $("#import-file")?.addEventListener("change", (event) => handleImport(event.target.files?.[0]));
  $(".um-file-label")?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    $("#import-file")?.click();
  });
  $("#map-provider-select")?.addEventListener("change", (event) => {
    MAP_PROVIDER.setProvider(event.target.value);
    renderKeyState();
  });
  $("#save-map-credential")?.addEventListener("click", () => {
    const provider = MAP_PROVIDER.setProvider($("#map-provider-select")?.value);
    MAP_PROVIDER.setCredential(provider, text($("#map-credential-input")?.value));
    window.location.reload();
  });
  $("#export-data")?.addEventListener("click", () => {
    const connections = loadConnections({ storage: localStorage }).value.connections;
    downloadJson("incheon-education-map-export.json", exportDataset({
      institutions: state.institutions,
      importedInstitutions: state.importedInstitutions,
      connections,
    }));
  });
  $("#fit-map-bounds")?.addEventListener("click", () => {
    if (!state.mapLayer?.fitBounds()) {
      setText("#map-state-text", "맞출 수 있는 마커가 없습니다. 키 저장 또는 좌표 보유 행을 확인해 주세요.");
    }
  });
};

const init = async () => {
  bindEvents();
  state.connectionManager = createConnectionManager({ storage: localStorage });
  state.connectionManager.bindControls(document);
  renderKeyState();
  try {
    await loadData();
  } catch (error) {
    setText("#list-summary", "기본 데이터를 불러오지 못했습니다.");
    state.warnings = [{ message: error.message }];
    renderWarnings();
  }
  initializeMap();
};

init();
