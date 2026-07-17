import assert from "node:assert/strict";
import test from "node:test";

await import("../js/map-provider.js");

const provider = globalThis.IncheonMapProvider;

const createStorage = () => {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
};

test("defaults to Naver and stores provider credentials separately", () => {
  const storage = createStorage();
  assert.equal(provider.currentProvider(storage), "naver");
  provider.setCredential("naver", "naver-client", storage);
  provider.setCredential("kakao", "kakao-key", storage);
  assert.equal(provider.getCredential("naver", storage), "naver-client");
  assert.equal(provider.getCredential("kakao", storage), "kakao-key");
  assert.equal(provider.setProvider("kakao", storage), "kakao");
  assert.equal(provider.currentProvider(storage), "kakao");
  assert.equal(provider.setProvider("unknown", storage), "naver");
});

test("Naver facade exposes Kakao-compatible coordinates and geocoder results", async () => {
  class LatLng {
    constructor(lat, lng) { this._lat = lat; this._lng = lng; }
    lat() { return this._lat; }
    lng() { return this._lng; }
    toString() { return `${this._lat},${this._lng}`; }
  }
  class LatLngBounds {
    constructor() { this.points = []; }
    extend(point) { this.points.push(point); }
    hasLatLng() { return true; }
  }
  class NativeMap {
    constructor(container, options) { this.container = container; this.options = options; this.center = options.center; this.zoom = options.zoom; }
    setCenter(value) { this.center = value; }
    getCenter() { return this.center; }
    panTo(value) { this.center = value; }
    setZoom(value) { this.zoom = value; }
    getZoom() { return this.zoom; }
    fitBounds(value) { this.bounds = value; }
    setOptions() {}
  }
  class Marker { constructor(options) { this.options = options; } setMap(map) { this.map = map; } getPosition() { return this.options.position; } }
  class InfoWindow { constructor(options) { this.options = options; } setContent(value) { this.content = value; } open(map, target) { this.opened = { map, target }; } close() {} }
  class Polyline { constructor(options) { this.options = options; } setMap(map) { this.map = map; } }
  class Size { constructor(width, height) { this.width = width; this.height = height; } }
  class Point { constructor(x, y) { this.x = x; this.y = y; } }
  const Event = { addListener: () => ({}), removeListener() {}, trigger() {} };
  const Service = {
    Status: { OK: "OK" },
    geocode(_options, callback) {
      callback("OK", { v2: { addresses: [{ x: "126.70", y: "37.45", roadAddress: "인천광역시 교육로 1" }] } });
    },
  };
  const facade = provider.createNaverFacade({
    maps: { LatLng, LatLngBounds, Map: NativeMap, Marker, InfoWindow, Polyline, Size, Point, Event, Service, Position: { RIGHT_CENTER: "right" } },
  });
  const coordinate = new facade.maps.LatLng(37.45, 126.70);
  assert.equal(coordinate.getLat(), 37.45);
  assert.equal(coordinate.getLng(), 126.70);
  const map = new facade.maps.Map({}, { center: coordinate, level: 8 });
  assert.equal(map.getLevel(), 8);
  const result = await new Promise((resolve) => {
    new facade.maps.services.Geocoder().addressSearch("인천광역시 교육로 1", (rows, status) => resolve({ rows, status }));
  });
  assert.equal(result.status, "OK");
  assert.deepEqual(result.rows[0], {
    x: "126.70",
    y: "37.45",
    address_name: "인천광역시 교육로 1",
    road_address: "인천광역시 교육로 1",
  });
});
