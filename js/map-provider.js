(function initIncheonMapProvider(global) {
  "use strict";

  const PROVIDER_STORAGE_KEY = "incheon_map_provider";
  const PROVIDER_DEFAULT = "naver";
  const SDK_ID = "incheon-map-provider-sdk";
  const SDK_TIMEOUT_MS = 12000;
  const PROVIDERS = Object.freeze({
    naver: Object.freeze({
      id: "naver",
      name: "네이버 지도",
      badge: "NAVER",
      credentialLabel: "Maps JavaScript Client ID",
      credentialPlaceholder: "Naver Cloud Platform Client ID",
      storageKey: "incheon_naver_map_client_id",
      domainHelp: "Naver Cloud Platform의 Web 서비스 URL에 현재 사이트 주소를 등록해 주세요.",
    }),
    kakao: Object.freeze({
      id: "kakao",
      name: "카카오 지도",
      badge: "KAKAO",
      credentialLabel: "JavaScript 키",
      credentialPlaceholder: "Kakao Developers JavaScript 키",
      storageKey: "incheon_kakao_js_key",
      domainHelp: "Kakao Developers의 Web 플랫폼 사이트 도메인에 현재 사이트 주소를 등록해 주세요.",
    }),
  });

  let activeProvider = null;
  let loadPromise = null;

  const storageFor = (storage) => storage ?? global.localStorage;
  const normalizeProvider = (value) => (value === "kakao" ? "kakao" : PROVIDER_DEFAULT);
  const currentProvider = (storage) => normalizeProvider(storageFor(storage)?.getItem(PROVIDER_STORAGE_KEY));
  const providerMeta = (provider = currentProvider()) => PROVIDERS[normalizeProvider(provider)];
  const getCredential = (provider = currentProvider(), storage) => storageFor(storage)?.getItem(providerMeta(provider).storageKey) || "";

  const setProvider = (provider, storage) => {
    const normalized = normalizeProvider(provider);
    storageFor(storage)?.setItem(PROVIDER_STORAGE_KEY, normalized);
    return normalized;
  };

  const setCredential = (provider, value, storage) => {
    const target = storageFor(storage);
    const key = providerMeta(provider).storageKey;
    const credential = String(value ?? "").trim();
    if (credential) target?.setItem(key, credential);
    else target?.removeItem(key);
    return credential;
  };

  const unwrap = (value) => value?._native ?? value;
  const number = (value) => Number(value);
  const levelToZoom = (level) => Math.max(6, Math.min(18, 18 - number(level || 8)));
  const zoomToLevel = (zoom) => Math.max(1, 18 - number(zoom || 10));

  const createNaverFacade = (naver) => {
    const Native = naver.maps;

    class LatLng {
      constructor(lat, lng) {
        this._native = new Native.LatLng(number(lat), number(lng));
      }
      getLat() { return this._native.lat(); }
      getLng() { return this._native.lng(); }
      lat() { return this._native.lat(); }
      lng() { return this._native.lng(); }
      toString() { return this._native.toString(); }
    }

    const wrapLatLng = (value) => {
      if (!value || value instanceof LatLng) return value;
      const lat = typeof value.lat === "function" ? value.lat() : value.y;
      const lng = typeof value.lng === "function" ? value.lng() : value.x;
      return new LatLng(lat, lng);
    };

    class LatLngBounds {
      constructor(sw, ne) {
        this._native = sw && ne
          ? new Native.LatLngBounds(unwrap(sw), unwrap(ne))
          : new Native.LatLngBounds();
      }
      extend(position) { this._native.extend(unwrap(position)); return this; }
      contain(position) { return this._native.hasLatLng(unwrap(position)); }
      isEmpty() { return this._native.isEmpty?.() ?? false; }
    }

    class MapView {
      constructor(container, options = {}) {
        this._native = new Native.Map(container, {
          center: unwrap(options.center),
          zoom: levelToZoom(options.level),
          zoomControl: true,
          zoomControlOptions: { position: Native.Position?.RIGHT_CENTER },
          mapDataControl: false,
          scaleControl: true,
        });
      }
      setCenter(position) { this._native.setCenter(unwrap(position)); }
      getCenter() { return wrapLatLng(this._native.getCenter()); }
      panTo(position) { this._native.panTo(unwrap(position)); }
      setLevel(level) { this._native.setZoom(levelToZoom(level)); }
      getLevel() { return zoomToLevel(this._native.getZoom()); }
      setBounds(bounds) { this._native.fitBounds(unwrap(bounds)); }
      setDraggable(value) { this._native.setOptions({ draggable: Boolean(value) }); }
      setZoomable(value) { this._native.setOptions({ scrollWheel: Boolean(value), pinchZoom: Boolean(value) }); }
      addControl() {}
      relayout() { Native.Event.trigger(this._native, "resize"); }
    }

    class Size {
      constructor(width, height) {
        this.width = number(width);
        this.height = number(height);
        this._native = new Native.Size(this.width, this.height);
      }
    }

    class Point {
      constructor(x, y) {
        this.x = number(x);
        this.y = number(y);
        this._native = new Native.Point(this.x, this.y);
      }
    }

    class MarkerImage {
      constructor(src, size, options = {}) {
        this.src = src;
        this.size = size;
        this.options = options;
      }
    }

    const markerIcon = (image) => {
      if (!image) return undefined;
      if (!(image instanceof MarkerImage)) return image;
      const icon = { url: image.src };
      if (image.size) icon.size = unwrap(image.size);
      if (image.options.offset) icon.anchor = unwrap(image.options.offset);
      return icon;
    };

    class Marker {
      constructor(options = {}) {
        this._native = new Native.Marker({
          map: unwrap(options.map),
          position: unwrap(options.position),
          title: options.title,
          clickable: options.clickable !== false,
          icon: markerIcon(options.image ?? options.icon),
          zIndex: options.zIndex,
        });
      }
      setMap(map) { this._native.setMap(unwrap(map)); }
      getMap() { return this._native.getMap(); }
      getPosition() { return wrapLatLng(this._native.getPosition()); }
      setPosition(position) { this._native.setPosition(unwrap(position)); }
      setVisible(value) { this._native.setVisible(Boolean(value)); }
    }

    class InfoWindow {
      constructor(options = {}) {
        this._native = new Native.InfoWindow({
          content: options.content || "",
          borderWidth: 0,
          backgroundColor: "transparent",
          disableAnchor: true,
          pixelOffset: new Native.Point(0, -12),
        });
      }
      setContent(content) { this._native.setContent(content); }
      open(map, markerOrPosition) { this._native.open(unwrap(map), unwrap(markerOrPosition)); }
      close() { this._native.close(); }
      setMap(map) { if (!map) this.close(); }
    }

    class CustomOverlay {
      constructor(options = {}) {
        this.position = options.position;
        this.infoWindow = new InfoWindow({ content: options.content || "" });
        if (options.map) this.setMap(options.map);
      }
      setMap(map) {
        if (!map) this.infoWindow.close();
        else this.infoWindow.open(map, this.position);
      }
      getPosition() { return this.position; }
    }

    class Polyline {
      constructor(options = {}) {
        this._native = new Native.Polyline({
          path: (options.path || []).map(unwrap),
          strokeWeight: options.strokeWeight,
          strokeColor: options.strokeColor,
          strokeOpacity: options.strokeOpacity,
          strokeStyle: options.strokeStyle,
          map: unwrap(options.map),
        });
      }
      setMap(map) { this._native.setMap(unwrap(map)); }
    }

    class Geocoder {
      addressSearch(query, callback) {
        Native.Service.geocode({ query }, (status, response) => {
          const ok = status === Native.Service.Status.OK;
          const rows = ok ? (response?.v2?.addresses || []).map((row) => ({
            x: row.x,
            y: row.y,
            address_name: row.roadAddress || row.jibunAddress || query,
            road_address: row.roadAddress || "",
          })) : [];
          callback(rows, ok && rows.length ? "OK" : ok ? "ZERO_RESULT" : "ERROR");
        });
      }
    }

    class Places {
      keywordSearch(query, callback) {
        new Geocoder().addressSearch(query, (rows, status) => {
          const items = rows.map((row) => ({
            x: row.x,
            y: row.y,
            place_name: row.address_name || query,
            address_name: row.address_name || query,
          }));
          callback(items, status);
        });
      }
    }

    const event = {
      addListener(target, type, listener) { return Native.Event.addListener(unwrap(target), type, listener); },
      removeListener(handle) { if (handle) Native.Event.removeListener(handle); },
      trigger(target, type) { Native.Event.trigger(unwrap(target), type); },
    };

    return {
      __provider: "naver",
      maps: {
        Map: MapView,
        LatLng,
        LatLngBounds,
        Marker,
        MarkerImage,
        MarkerClusterer: undefined,
        InfoWindow,
        CustomOverlay,
        Polyline,
        Size,
        Point,
        ZoomControl: class ZoomControl {},
        MapTypeControl: class MapTypeControl {},
        ControlPosition: { RIGHT: "right", TOPRIGHT: "topright" },
        event,
        services: { Geocoder, Places, Status: { OK: "OK", ZERO_RESULT: "ZERO_RESULT", ERROR: "ERROR" } },
        load(callback) { callback?.(); },
      },
    };
  };

  const removeSdk = () => global.document?.getElementById(SDK_ID)?.remove();
  const isReady = (provider) => provider === "kakao" ? Boolean(global.kakao?.maps) : Boolean(global.naver?.maps);
  const makeFacade = (provider) => provider === "kakao"
    ? Object.assign(global.kakao, { __provider: "kakao" })
    : createNaverFacade(global.naver);

  const load = ({ provider = currentProvider(), credential = getCredential(provider), timeout = SDK_TIMEOUT_MS } = {}) => {
    const normalized = normalizeProvider(provider);
    if (!credential) return Promise.reject(new Error(`${providerMeta(normalized).credentialLabel} is required.`));
    if (activeProvider === normalized && global.eduMaps?.maps) return Promise.resolve(global.eduMaps);
    if (loadPromise && activeProvider === normalized) return loadPromise;

    activeProvider = normalized;
    loadPromise = new Promise((resolve, reject) => {
      if (isReady(normalized)) {
        const facade = makeFacade(normalized);
        global.eduMaps = facade;
        facade.maps.load(() => resolve(facade));
        return;
      }

      removeSdk();
      const script = global.document.createElement("script");
      script.id = SDK_ID;
      script.async = true;
      script.src = normalized === "naver"
        ? `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(credential)}&submodules=geocoder`
        : `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(credential)}&autoload=false&libraries=services,clusterer,drawing`;

      let settled = false;
      const timer = global.setTimeout(() => {
        if (settled) return;
        settled = true;
        script.remove();
        loadPromise = null;
        reject(new Error(`${providerMeta(normalized).name} SDK load timed out.`));
      }, timeout);

      const finish = (error) => {
        if (settled) return;
        settled = true;
        global.clearTimeout(timer);
        if (error || !isReady(normalized)) {
          script.remove();
          loadPromise = null;
          reject(error || new Error(`${providerMeta(normalized).name} SDK object is missing.`));
          return;
        }
        const facade = makeFacade(normalized);
        global.eduMaps = facade;
        facade.maps.load(() => resolve(facade));
      };

      script.onload = () => finish();
      script.onerror = () => finish(new Error(`${providerMeta(normalized).name} SDK failed to load.`));
      global.document.head.appendChild(script);
    });
    return loadPromise;
  };

  global.IncheonMapProvider = Object.freeze({
    PROVIDER_DEFAULT,
    PROVIDER_STORAGE_KEY,
    PROVIDERS,
    createNaverFacade,
    currentProvider,
    getCredential,
    load,
    normalizeProvider,
    providerMeta,
    setCredential,
    setProvider,
  });
})(globalThis);
