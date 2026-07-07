import assert from "node:assert/strict";
import test from "node:test";

import { buildInstitutionPopupHtml, createInstitutionMapLayer, filterRowsByMarkerLayers, markerLayerKeyFor } from "../js/map-layers.js";

const makeRows = (count) => Array.from({ length: count }, (_, index) => ({
  id: `synthetic-map-layer-${index + 1}`,
  name: `합성 기관 ${index + 1}`,
  type: index % 5 === 0 ? "support-office" : "school",
  office: ["main", "south", "north", "east", "west"][index % 5],
  level: index % 3 === 0 ? "초" : "중",
  address: `인천광역시 합성로 ${index + 1}`,
  lat: 37.35 + (index % 50) * 0.001,
  lng: 126.55 + Math.floor(index / 50) * 0.001,
  customFields: { 원본메모: `비민감 합성 ${index + 1}` },
}));

const makeFakeKakao = ({ clusterer = true } = {}) => {
  const created = { markers: [], clusterers: [], infoWindows: [] };

  class LatLng {
    constructor(lat, lng) {
      this.lat = lat;
      this.lng = lng;
    }
  }

  class LatLngBounds {
    constructor() {
      this.points = [];
    }

    extend(point) {
      this.points.push(point);
    }
  }

  class Marker {
    constructor(options) {
      this.options = options;
      this.map = null;
      this.listeners = {};
      created.markers.push(this);
    }

    setMap(map) {
      this.map = map;
    }

    getPosition() {
      return this.options.position;
    }
  }

  class MarkerClusterer {
    constructor(options) {
      this.options = options;
      this.markers = [];
      this.map = options.map;
      created.clusterers.push(this);
    }

    addMarkers(markers) {
      this.markers.push(...markers);
    }

    clear() {
      this.markers = [];
    }

    setMap(map) {
      this.map = map;
    }
  }

  class InfoWindow {
    constructor(options) {
      this.options = options;
      this.content = "";
      this.opened = null;
      created.infoWindows.push(this);
    }

    setContent(content) {
      this.content = content;
    }

    open(map, marker) {
      this.opened = { map, marker };
    }

    close() {
      this.opened = null;
    }
  }

  return {
    created,
    kakao: {
      maps: {
        LatLng,
        LatLngBounds,
        Marker,
        MarkerClusterer: clusterer ? MarkerClusterer : undefined,
        InfoWindow,
        event: {
          addListener(target, eventName, handler) {
            target.listeners[eventName] = handler;
          },
        },
      },
    },
  };
};

const makeMap = () => ({
  bounds: null,
  setBounds(bounds) {
    this.bounds = bounds;
  },
});

test("renders 1000 synthetic pre-geocoded institutions through the Kakao clusterer", () => {
  // Given: a fake Kakao namespace with MarkerClusterer and 1000 finite-coordinate rows.
  const { kakao, created } = makeFakeKakao();
  const map = makeMap();
  const layer = createInstitutionMapLayer({ kakao, map });

  // When: the marker layer syncs the rows.
  const result = layer.sync(makeRows(1000));

  // Then: all rows become clustered markers and no map fallback markers are duplicated.
  assert.equal(result.rendered, 1000);
  assert.equal(result.clusterer, true);
  assert.equal(layer.getState().markerCount, 1000);
  assert.equal(created.clusterers[0].markers.length, 1000);
  assert.equal(created.markers.filter((marker) => marker.map === map).length, 0);
});

test("keeps repeated syncs duplicate-free when filters or imports refresh", () => {
  // Given: an existing layer that already rendered a dense filtered set.
  const { kakao, created } = makeFakeKakao();
  const layer = createInstitutionMapLayer({ kakao, map: makeMap() });
  const rows = makeRows(1000);
  layer.sync(rows);

  // When: the same rows are synced again after a filter/import refresh.
  layer.sync(rows);

  // Then: the active clusterer only contains the current 1000 markers.
  assert.equal(created.clusterers[0].markers.length, 1000);
  assert.equal(layer.getState().markerCount, 1000);
  assert.equal(new Set(layer.getState().markerIds).size, 1000);
});

test("excludes invalid coordinates and renders an invalid-coordinate list", () => {
  // Given: mixed valid and invalid rows plus an invalid-list host.
  const { kakao } = makeFakeKakao();
  const invalidList = { innerHTML: "" };
  const layer = createInstitutionMapLayer({ kakao, map: makeMap(), elements: { invalidList } });
  const rows = [
    ...makeRows(3),
    { id: "bad-lat", name: "위도 오류", type: "school", office: "east", lat: "x", lng: 126.7 },
    { id: "missing-lng", name: "경도 없음", type: "imported", office: "unassigned", lat: 37.4 },
  ];

  // When: the marker layer syncs the mixed rows.
  const result = layer.sync(rows);

  // Then: invalid rows are reported and never become markers.
  assert.equal(result.rendered, 3);
  assert.equal(result.invalidRows.length, 2);
  assert.equal(layer.getState().markerCount, 3);
  assert.match(invalidList.innerHTML, /위도 오류/);
  assert.match(invalidList.innerHTML, /마커를 만들지 않았습니다/);
});

test("escapes popup HTML from names, addresses, and uploaded custom fields", () => {
  // Given: untrusted uploaded text that looks like executable HTML.
  const { kakao, created } = makeFakeKakao();
  const layer = createInstitutionMapLayer({ kakao, map: makeMap() });
  const row = {
    id: "xss-row",
    name: "<script>alert(1)</script>",
    type: "imported",
    office: "unassigned",
    level: "<b>초</b>",
    address: "<img src=x onerror=alert(1)>",
    lat: 37.4,
    lng: 126.7,
    customFields: { "<svg>": "<iframe src=evil></iframe>" },
  };

  // When: popup HTML is built and opened by id.
  layer.sync([row]);
  assert.equal(layer.openById("xss-row"), true);
  const html = created.infoWindows[0].content;

  // Then: raw executable tags/attributes are not present in the content.
  assert.equal(html.includes("<script>"), false);
  assert.equal(html.includes("<img"), false);
  assert.equal(html.includes("<iframe"), false);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(buildInstitutionPopupHtml(row), /&lt;iframe src=evil&gt;&lt;\/iframe&gt;/);
});

test("fits current markers to Kakao LatLngBounds and supports no-clusterer fallback", () => {
  // Given: a fake Kakao namespace without MarkerClusterer.
  const { kakao, created } = makeFakeKakao({ clusterer: false });
  const map = makeMap();
  const layer = createInstitutionMapLayer({ kakao, map });

  // When: rows are synced and fitBounds is requested.
  layer.sync(makeRows(12));
  const fitted = layer.fitBounds();

  // Then: markers attach directly to the map and bounds include every current marker.
  assert.equal(layer.getState().clustererEnabled, false);
  assert.equal(created.markers.filter((marker) => marker.map === map).length, 12);
  assert.equal(fitted, true);
  assert.equal(map.bounds.points.length, 12);
});

test("classifies marker layer toggles for schools institutions and imported rows", () => {
  // Given: rows spanning every marker layer category.
  const rows = [
    { id: "school", type: "school" },
    { id: "imported", type: "imported" },
    { id: "library", type: "library" },
    { id: "partner", type: "partner" },
  ];

  // When: the institution layer is disabled.
  const visible = filterRowsByMarkerLayers(rows, { school: true, institution: false, imported: true });

  // Then: schools and imported rows remain while non-school institutions are hidden.
  assert.equal(markerLayerKeyFor(rows[0]), "school");
  assert.deepEqual(visible.map((row) => row.id), ["school", "imported"]);
});
