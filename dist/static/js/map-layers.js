import { INSTITUTION_TYPE_LABELS, OFFICE_LABELS } from "./constants.js";

const CATEGORY_META = Object.freeze({
  headquarters: { label: "본청", className: "type-headquarters", color: "#746019" },
  "support-office": { label: "교육지원청", className: "type-support-office", color: "#2a41b6" },
  school: { label: "학교", className: "type-school", color: "#7a2455" },
  "direct-agency": { label: "직속기관", className: "type-direct-agency", color: "#1c1c1e" },
  library: { label: "도서관", className: "type-library", color: "#187574" },
  "experience-site": { label: "체험학습장", className: "type-experience-site", color: "#7a3d00" },
  partner: { label: "협력기관", className: "type-partner", color: "#4262ff" },
  imported: { label: "가져온 행", className: "type-imported", color: "#4262ff" },
});

const text = (value) => String(value ?? "").trim();
const escapeHtml = (value) => text(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "\"": "&quot;",
  "'": "&#39;",
}[char]));

const finiteCoordinate = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const isMappable = (row) => finiteCoordinate(row?.lat) !== null && finiteCoordinate(row?.lng) !== null;

const markerTitle = (row) => text(row.name) || text(row.id) || "이름 없는 기관";

export const markerLayerKeyFor = (row) => (row?.type === "school" ? "school" : row?.type === "imported" ? "imported" : "institution");

export const filterRowsByMarkerLayers = (rows, layers) => rows.filter((row) => layers[markerLayerKeyFor(row)] !== false);

const categoryFor = (row) => CATEGORY_META[row.type] ?? {
  label: INSTITUTION_TYPE_LABELS[row.type] ?? (text(row.type) || "기관"),
  className: "type-unknown",
  color: "#6b6f7e",
};

const customFieldRows = (row) => Object.entries(row.customFields ?? {})
  .filter(([, value]) => text(value))
  .slice(0, 4)
  .map(([key, value]) => `<dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value)}</dd>`)
  .join("");

const popupHtml = (row) => {
  const category = categoryFor(row);
  const office = OFFICE_LABELS[row.office] ?? row.office ?? "미지정";
  const level = text(row.level);
  const fields = customFieldRows(row);
  return `
    <section class="um-popup" data-popup-id="${escapeHtml(row.id)}">
      <strong>${escapeHtml(markerTitle(row))}</strong>
      <div class="um-popup-chips">
        <span class="um-popup-chip ${escapeHtml(category.className)}">${escapeHtml(category.label)}</span>
        <span class="um-popup-chip">${escapeHtml(office)}</span>
        ${level ? `<span class="um-popup-chip">${escapeHtml(level)}</span>` : ""}
      </div>
      <p>${escapeHtml(row.address || "주소 없음")}</p>
      ${fields ? `<dl>${fields}</dl>` : ""}
    </section>
  `;
};

const renderInvalidRows = (host, rows) => {
  if (!host) return;
  host.innerHTML = rows.length
    ? rows.slice(0, 20).map((row) => `<li>${escapeHtml(markerTitle(row))}: 좌표가 없어 마커를 만들지 않았습니다.</li>`).join("")
    : "<li>현재 필터에서 제외된 좌표 오류 행이 없습니다.</li>";
};

const attachMarker = ({ marker, map, clusterer }) => {
  if (clusterer) return;
  marker.setMap(map);
};

const detachMarker = (marker) => {
  if (typeof marker.setMap === "function") marker.setMap(null);
};

export const buildInstitutionPopupHtml = (row) => popupHtml(row);

export const createInstitutionMapLayer = ({ kakao, map, elements = {} }) => {
  const maps = kakao?.maps;
  if (!maps || !map) throw new Error("Kakao maps namespace and map are required.");

  let clusterer = maps.MarkerClusterer
    ? new maps.MarkerClusterer({ map, averageCenter: true, minLevel: 6 })
    : null;
  let infoWindow = new maps.InfoWindow({ removable: true });
  let markers = [];
  let markerById = new Map();
  let rowsById = new Map();
  let invalidRows = [];

  const clear = () => {
    if (clusterer?.clear) clusterer.clear();
    markers.forEach(detachMarker);
    markers = [];
    markerById = new Map();
    rowsById = new Map();
    if (infoWindow?.close) infoWindow.close();
  };

  const sync = (rows = [], options = {}) => {
    clear();
    invalidRows = rows.filter((row) => !isMappable(row));
    const visibleRows = rows.filter(isMappable);
    markers = visibleRows.map((row) => {
      const position = new maps.LatLng(Number(row.lat), Number(row.lng));
      const marker = new maps.Marker({ position, title: markerTitle(row), clickable: true });
      marker.__institutionId = row.id;
      markerById.set(row.id, marker);
      rowsById.set(row.id, row);
      attachMarker({ marker, map, clusterer });
      if (maps.event?.addListener) {
        maps.event.addListener(marker, "click", () => {
          infoWindow.setContent(popupHtml(row));
          infoWindow.open(map, marker);
        });
      }
      return marker;
    });
    if (clusterer?.addMarkers) clusterer.addMarkers(markers);
    renderInvalidRows(elements.invalidList, invalidRows);
    if (options.fit) fitBounds();
    return { rendered: markers.length, invalidRows: [...invalidRows], clusterer: Boolean(clusterer) };
  };

  const fitBounds = () => {
    if (markers.length === 0 || typeof map.setBounds !== "function") return false;
    const bounds = new maps.LatLngBounds();
    markers.forEach((marker) => bounds.extend(marker.getPosition()));
    map.setBounds(bounds);
    return true;
  };

  const openById = (id) => {
    const marker = markerById.get(id);
    const row = rowsById.get(id);
    if (!marker || !row) return false;
    infoWindow.setContent(popupHtml(row));
    infoWindow.open(map, marker);
    return true;
  };

  const getState = () => ({
    markerCount: markers.length,
    invalidRows: [...invalidRows],
    clustererEnabled: Boolean(clusterer),
    markerIds: markers.map((marker) => marker.__institutionId),
  });

  const destroy = () => {
    clear();
    if (clusterer?.setMap) clusterer.setMap(null);
    clusterer = null;
    infoWindow = null;
    renderInvalidRows(elements.invalidList, []);
  };

  return { sync, clear, fitBounds, openById, getState, destroy };
};
