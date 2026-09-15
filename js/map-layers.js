import { INSTITUTION_TYPE_LABELS, OFFICE_LABELS, SCHOOL_LEVEL_LABELS } from "./constants.js";

const CATEGORY_META = Object.freeze({
  headquarters: { label: "본청", className: "type-headquarters", color: "#746019" },
  "support-office": { label: "교육지원청", className: "type-support-office", color: "#004c8c" },
  school: { label: "학교", className: "type-school", color: "#7a2455" },
  "direct-agency": { label: "직속기관", className: "type-direct-agency", color: "#1c1c1e" },
  library: { label: "도서관", className: "type-library", color: "#187574" },
  "experience-site": { label: "체험학습장", className: "type-experience-site", color: "#7a3d00" },
  partner: { label: "협력기관", className: "type-partner", color: "#0060b0" },
  imported: { label: "가져온 행", className: "type-imported", color: "#0060b0" },
});

// Per-type marker glyph (shape/character) + color so category is never encoded by color alone (DESIGN.md §9).
// Colors are drawn from the DESIGN.md category text-color table / ice-blue token family; none are deprecated tokens.
const MARKER_STYLE_META = Object.freeze({
  school: { glyph: "학", color: "#7a2455" },
  headquarters: { glyph: "본", color: "#746019" },
  "support-office": { glyph: "청", color: "#004c8c" },
  "direct-agency": { glyph: "직", color: "#1c1c1e" },
  library: { glyph: "도", color: "#187574" },
  "experience-site": { glyph: "체", color: "#7a3d00" },
  partner: { glyph: "협", color: "#0060b0" },
  imported: { glyph: "가", color: "#0060b0" },
});

const DEFAULT_MARKER_STYLE = Object.freeze({ glyph: "기", color: "#6b6f7e" });

export const markerStyleFor = (type) => MARKER_STYLE_META[type] ?? DEFAULT_MARKER_STYLE;

const svgDataUri = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

// Compact filled circle for schools (highest-density layer) — 22x22, anchored at its own center.
const circleMarkerSvg = ({ color, glyph }) => `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="10" fill="${color}" stroke="#ffffff" stroke-width="2"/><text x="11" y="15" text-anchor="middle" font-size="11" font-family="sans-serif" font-weight="700" fill="#ffffff">${glyph}</text></svg>`;

// Bottom-anchored pin for non-school institutions — 30x40, anchored at the pin tip so it points at its coordinate.
const pinMarkerSvg = ({ color, glyph }) => `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="40" viewBox="0 0 30 40"><path d="M15 40 C15 40 28 24.2 28 15 C28 6.716 22.284 1 15 1 C7.716 1 2 6.716 2 15 C2 24.2 15 40 15 40 Z" fill="${color}" stroke="#ffffff" stroke-width="2"/><circle cx="15" cy="15" r="9" fill="#ffffff"/><text x="15" y="19" text-anchor="middle" font-size="11" font-family="sans-serif" font-weight="700" fill="${color}">${glyph}</text></svg>`;

export const markerIconSpecFor = (type) => {
  const style = markerStyleFor(type);
  if (type === "school") {
    return { width: 22, height: 22, anchorX: 11, anchorY: 11, src: svgDataUri(circleMarkerSvg(style)) };
  }
  return { width: 30, height: 40, anchorX: 15, anchorY: 40, src: svgDataUri(pinMarkerSvg(style)) };
};

const text = (value) => String(value ?? "").trim();
const escapeHtml = (value) => text(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "\"": "&quot;",
  "'": "&#39;",
}[char]));

const safeHttpUrl = (value) => {
  try {
    const url = new URL(text(value));
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
};

const telHref = (phone) => String(phone).replace(/[^0-9+]/g, "");

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
  const level = SCHOOL_LEVEL_LABELS[row.level] ?? text(row.level);
  const phone = text(row.phone);
  const website = safeHttpUrl(row.website || row.url);
  const description = text(row.description);
  const designation = text(row.designation);
  const supervisor = text(row.supervisor);
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
      ${description ? `<p>${escapeHtml(description)}</p>` : ""}
      ${(phone || website) ? `<p class="um-popup-contact">
        ${phone ? `<a href="tel:${escapeHtml(telHref(phone))}">전화 ${escapeHtml(phone)}</a>` : ""}
        ${website ? `<a href="${escapeHtml(website)}" target="_blank" rel="noopener noreferrer">홈페이지</a>` : ""}
      </p>` : ""}
      ${designation ? `<p>지정교유형: ${escapeHtml(designation)}</p>` : ""}
      ${supervisor ? `<p>담당 장학사: ${escapeHtml(supervisor)}</p>` : ""}
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

export const createInstitutionMapLayer = ({ mapSdk, map, elements = {} }) => {
  const maps = mapSdk?.maps;
  if (!maps || !map) throw new Error("Map SDK namespace and map are required.");

  let clusterer = maps.MarkerClusterer
    ? new maps.MarkerClusterer({ map, averageCenter: true, minLevel: 6 })
    : null;
  let infoWindow = new maps.InfoWindow({ removable: true });
  let markers = [];
  let markerById = new Map();
  let rowsById = new Map();
  let invalidRows = [];
  const iconImageCache = new Map();

  const iconImageFor = (type) => {
    if (!maps.MarkerImage || !maps.Size || !maps.Point) return undefined;
    if (iconImageCache.has(type)) return iconImageCache.get(type);
    const spec = markerIconSpecFor(type);
    const image = new maps.MarkerImage(
      spec.src,
      new maps.Size(spec.width, spec.height),
      { offset: new maps.Point(spec.anchorX, spec.anchorY) },
    );
    iconImageCache.set(type, image);
    return image;
  };

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
      const marker = new maps.Marker({ position, title: markerTitle(row), clickable: true, image: iconImageFor(row.type) });
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
    if (typeof map.panTo === "function") map.panTo(marker.getPosition());
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
