/* Incheon Education Map - shared.js */
/* 카카오 맵 API 키 관리, 동적 SDK 로더 및 통합 GNB 공통 모듈 */

const STORAGE_KEY = "incheon_kakao_js_key";
const SHARED_ACTION_ATTR = "data-shared-action";
const SHARED_STATUS_ATTR = "data-shared-status";
const _hideTimers = new WeakMap();
const _trapFocusHandlers = new WeakMap();

/**
 * 사용자 입력 또는 외부 데이터가 HTML로 해석되지 않도록 텍스트로 변환합니다.
 */
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function safeHttpUrl(value) {
  try {
    const url = new URL(String(value || ""), window.location.href);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "#";
  } catch (error) {
    return "#";
  }
}

function getSharedActionTarget(target) {
  return target instanceof Element ? target.closest(`[${SHARED_ACTION_ATTR}]`) : null;
}

function getStatusHost(element) {
  return element?.closest("[data-status-host]") || null;
}

function ensureInlineStatus(host) {
  if (!host) return null;

  let status = host.querySelector(`[${SHARED_STATUS_ATTR}]`);
  if (!status) {
    status = document.createElement("div");
    status.setAttribute(SHARED_STATUS_ATTR, "");
    status.setAttribute("aria-live", "polite");
    status.hidden = true;
    status.style.marginTop = "12px";
    status.style.padding = "10px 12px";
    status.style.borderRadius = "10px";
    status.style.fontSize = "13px";
    status.style.lineHeight = "1.5";
    host.appendChild(status);
  }

  return status;
}

function showInlineStatus(host, message, tone = "info") {
  const status = ensureInlineStatus(host);
  if (!status) return;

  const palette = {
    info: {
      background: "rgba(59, 130, 246, 0.16)",
      border: "1px solid rgba(96, 165, 250, 0.36)",
      color: "#dbeafe"
    },
    error: {
      background: "rgba(239, 68, 68, 0.16)",
      border: "1px solid rgba(248, 113, 113, 0.36)",
      color: "#fecaca"
    }
  };
  const style = palette[tone] || palette.info;

  status.hidden = false;
  status.textContent = message;
  status.style.background = style.background;
  status.style.border = style.border;
  status.style.color = style.color;

  window.clearTimeout(_hideTimers.get(status));
  _hideTimers.set(status, window.setTimeout(() => {
    status.hidden = true;
  }, 4000));
}

function hideInlineStatus(host) {
  const status = host?.querySelector(`[${SHARED_STATUS_ATTR}]`);
  if (!status) return;

  window.clearTimeout(_hideTimers.get(status));
  _hideTimers.delete(status);
  status.hidden = true;
}

/**
 * 로컬 스토리지에서 카카오 자바스크립트 키 읽기
 */
function getCachedKakaoKey() {
  return localStorage.getItem(STORAGE_KEY) || "";
}

/**
 * 로컬 스토리지에 카카오 자바스크립트 키 저장 및 페이지 새로고침
 */
function saveKakaoKey(key) {
  if (key) {
    localStorage.setItem(STORAGE_KEY, key.trim());
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
  window.location.reload();
}

function bindSharedUiEvents() {
  if (document.body?.dataset.sharedUiBound === "true") return;
  if (!document.body) return;

  document.body.dataset.sharedUiBound = "true";

  document.addEventListener("click", (event) => {
    const actionTarget = getSharedActionTarget(event.target);
    if (!actionTarget) return;

    const action = actionTarget.getAttribute(SHARED_ACTION_ATTR);
    if (!action) return;

    if (action === "open-key-modal") {
      showKeyModal();
      return;
    }

    if (action === "close-key-modal") {
      hideKeyModal();
      return;
    }

    if (action === "submit-key-modal") {
      submitKeyFromModal();
      return;
    }

    if (action === "submit-key-loader") {
      submitKeyFromLoader();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (!(event.target instanceof HTMLElement)) return;

    if (event.key === "Escape" && document.getElementById("api-key-modal")?.classList.contains("show")) {
      hideKeyModal();
      return;
    }

    if (event.key !== "Enter") return;

    if (event.target.id === "modal-key-input") {
      event.preventDefault();
      submitKeyFromModal();
      return;
    }

    if (event.target.id === "loader-key-input") {
      event.preventDefault();
      submitKeyFromLoader();
    }
  });
}

function submitKeyInput(inputId) {
  const input = document.getElementById(inputId);
  if (!(input instanceof HTMLInputElement)) return;

  const host = getStatusHost(input);
  const key = input.value.trim();

  if (!key) {
    showInlineStatus(host, "JavaScript 키를 먼저 입력해주세요.", "error");
    input.focus();
    return;
  }

  hideInlineStatus(host);
  showInlineStatus(host, "키를 저장하고 지도를 다시 불러오는 중입니다.", "info");
  saveKakaoKey(key);
}

/**
 * 공통 GNB(Global Navigation Bar) 및 API 키 입력 모달을 동적으로 본문에 주입합니다.
 * @param {'schools' | 'infrastructure' | 'business'} activeTab 
 */
function injectSharedGNB(activeTab) {
  if (document.querySelector(".gnb-header")) return;

  const cachedKey = getCachedKakaoKey();
  const maskedKey = cachedKey ? cachedKey.substring(0, 8) + "••••" + cachedKey.substring(cachedKey.length - 4) : "미등록";
  const statusClass = cachedKey ? "active" : "";
  const statusText = cachedKey ? "API 키 ACTIVE" : "API 키 미인증";
  
  const safeMaskedKey = escapeHtml(maskedKey);
  const safeCachedKey = escapeHtml(cachedKey);

  const header = document.createElement("header");
  header.className = "gnb-header";
  header.innerHTML = `
    <a href="index.html" class="gnb-logo">
      <div class="gnb-badge">NEWSKOOL4D</div>
      <div class="gnb-title">인천교육 통합지도</div>
    </a>
    <nav class="gnb-nav">
      <a href="schools.html" class="gnb-tab ${activeTab === 'schools' ? 'active' : ''}">
        🏫 관내 학교 디렉토리
      </a>
      <a href="infrastructure.html" class="gnb-tab ${activeTab === 'infrastructure' ? 'active' : ''}">
        🗺️ 교육청 체험교육 기관 안내
      </a>
    </nav>
    <div class="gnb-key-info">
      <button
        type="button"
        class="gnb-status-badge"
        ${SHARED_ACTION_ATTR}="open-key-modal"
        style="border: 0; background: transparent; padding: 0; cursor: pointer;"
      >
        <div class="gnb-status-dot ${statusClass}"></div>
        <span>${statusText} (${safeMaskedKey})</span>
      </button>
    </div>
  `;

  // 2. API 키 모달 마크업 작성
  const modal = document.createElement("div");
  modal.id = "api-key-modal";
  modal.className = "key-modal";
  modal.innerHTML = `
    <div class="key-modal-content" data-status-host>
      <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 12px; color: #fff;">🔑 카카오 API 키 설정</h3>
      <p style="font-size: 13.5px; color: var(--text-sub); line-height: 1.6; margin-bottom: 20px;">
        카카오 Developers의 [내 애플리케이션] &gt; [앱 키]에서 발급받은 <strong>JavaScript 키</strong>를 입력해주세요. 이 키는 브라우저 localStorage에 저장됩니다. 운영 전 카카오 콘솔 Web 플랫폼 사이트 도메인에 <strong>https://newskool4d-sketch.github.io</strong>를 등록해 주세요.
      </p>
      <div class="form-group" style="margin-bottom: 24px;">
        <label for="modal-key-input">JavaScript 키 입력</label>
        <input type="text" id="modal-key-input" placeholder="키 입력..." value="${safeCachedKey}" style="width: 100%;">
      </div>
      <div style="display: flex; gap: 10px;">
        <button type="button" ${SHARED_ACTION_ATTR}="submit-key-modal" style="flex: 1;">저장 후 불러오기</button>
        <button type="button" ${SHARED_ACTION_ATTR}="close-key-modal" class="btn-secondary" style="flex: 1;">닫기</button>
      </div>
    </div>
  `;

  // body의 맨 위에 헤더와 모달 주입
  document.body.insertBefore(header, document.body.firstChild);
  document.body.appendChild(modal);
  bindSharedUiEvents();
}

/**
 * API 키 변경 모달 표시
 */
function showKeyModal() {
  const modal = document.getElementById("api-key-modal");
  if (!modal) return;
  modal.classList.add("show");
  document.getElementById("modal-key-input")?.focus();

  const focusable = Array.from(
    modal.querySelectorAll('button, input, [tabindex]:not([tabindex="-1"])')
  ).filter((el) => !el.disabled);

  function trapFocus(e) {
    if (e.key !== "Tab") return;
    if (focusable.length === 0) { e.preventDefault(); return; }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  const previousTrapFocus = _trapFocusHandlers.get(modal);
  if (previousTrapFocus) {
    document.removeEventListener("keydown", previousTrapFocus);
  }

  _trapFocusHandlers.set(modal, trapFocus);
  document.addEventListener("keydown", trapFocus);
}

/**
 * API 키 변경 모달 닫기
 */
function hideKeyModal() {
  const modal = document.getElementById("api-key-modal");
  if (!modal) return;
  modal.classList.remove("show");
  const trapFocus = _trapFocusHandlers.get(modal);
  if (trapFocus) {
    document.removeEventListener("keydown", trapFocus);
    _trapFocusHandlers.delete(modal);
  }
}

/**
 * 모달에서 입력된 키 제출 및 반영
 */
function submitKeyFromModal() {
  submitKeyInput("modal-key-input");
}

/**
 * 카카오 맵 SDK를 동적으로 웹에 로드합니다.
 * 키가 없으면 로더 카버창을 노출하고 입력을 유도합니다.
 * @param {Function} callback - SDK 로드 완료 후 실행될 콜백 함수
 */
function loadKakaoSDK(callback) {
  const apiKey = getCachedKakaoKey();

  // 1. 키가 미지정된 경우 사용자 인터페이스 차단 및 입력을 유도하는 커버 생성
  if (!apiKey) {
    createLoaderCover(
      "🔑 카카오 JavaScript 키 등록 필요",
        "인천교육 공개지도를 실행하려면 카카오 Developers에서 발급한 JavaScript 키 등록이 필요합니다. 이 키는 브라우저 localStorage에 저장됩니다. 카카오 콘솔 Web 플랫폼 사이트 도메인에 https://newskool4d-sketch.github.io 를 등록한 뒤 입력해 주세요."
    );
    return;
  }

  // 2. 키가 있는 경우 카카오 SDK 스크립트 태그 동적 삽입
  document.querySelectorAll('script[src*="dapi.kakao.com/v2/maps/sdk.js"]').forEach((existingScript) => {
    existingScript.remove();
  });

  const script = document.createElement("script");
  script.type = "text/javascript";
  script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(apiKey)}&autoload=false&libraries=services,clusterer,drawing`;

  script.onload = () => {
    window.kakao.maps.load(() => {
      const cover = document.getElementById("loader-cover");
      if (cover) {
        cover.style.opacity = "0";
        setTimeout(() => cover.remove(), 500);
      }
      
      const mapDiv = document.getElementById("map");
      if (mapDiv) mapDiv.classList.add("visible");

      if (typeof callback === "function") {
        callback();
      }
    });
  };

  script.onerror = () => {
    createLoaderCover(
      "❌ SDK 로드 실패",
      "카카오 맵 라이브러리를 로드하는 도중 에러가 발생했습니다. JavaScript 키가 정확한지, 카카오 콘솔 Web 플랫폼 사이트 도메인에 https://newskool4d-sketch.github.io 가 등록되어 있는지 확인해 주세요."
    );
  };

  document.head.appendChild(script);
}

/**
 * API 키 등록 유도를 위한 반투명 로더 커버 생성
 */
function createLoaderCover(title, description) {
  const viewport = document.querySelector(".map-viewport");
  if (!viewport) return;

  const oldCover = document.getElementById("loader-cover");
  if (oldCover) oldCover.remove();
  const safeCachedKey = escapeHtml(getCachedKakaoKey());

  const cover = document.createElement("div");
  cover.id = "loader-cover";
  cover.className = "map-loader-cover";
  cover.innerHTML = `
    <div class="map-loader-card" data-status-host>
      <div class="loader-icon">📍</div>
      <h3 style="font-size: 20px; font-weight: 700; margin-bottom: 12px; color: #fff;">${escapeHtml(title)}</h3>
      <p style="font-size: 14.5px; color: var(--text-sub); line-height: 1.6; margin-bottom: 24px;">${escapeHtml(description)}</p>
      
      <div class="form-group" style="max-width: 320px; margin: 0 auto 20px auto; text-align: left;">
        <label for="loader-key-input">JavaScript Key</label>
        <input type="text" id="loader-key-input" placeholder="여기에 키를 입력하세요..." value="${safeCachedKey}" style="width: 100%;">
      </div>
      
      <button type="button" ${SHARED_ACTION_ATTR}="submit-key-loader" style="margin: 0 auto;">대시보드 기동하기</button>
    </div>
  `;
  viewport.appendChild(cover);
  bindSharedUiEvents();
}

/**
 * 로더 커버의 키 제출 및 로딩 재시도
 */
function submitKeyFromLoader() {
  submitKeyInput("loader-key-input");
}

/**
 * 모든 카카오 지도 화면에서 동일한 기본 조작감을 제공합니다.
 * 확대/축소 컨트롤, 지도 타입 컨트롤, 드래그/휠 줌, 리사이즈 보정을 한 번만 적용합니다.
 */
function applyStandardKakaoMapSettings(map) {
  if (!map || map.__standardControlsApplied) return;

  map.setDraggable(true);
  map.setZoomable(true);
  map.addControl(new kakao.maps.ZoomControl(), kakao.maps.ControlPosition.RIGHT);
  map.addControl(new kakao.maps.MapTypeControl(), kakao.maps.ControlPosition.TOPRIGHT);

  const onResize = () => {
    map.relayout();
  };
  window.addEventListener("resize", onResize);
  map.__resizeHandler = onResize;

  map.__standardControlsApplied = true;
}

function fitKakaoMapToCoords(map, coords, fallbackCenter, fallbackLevel = 8) {
  if (!map) return;

  const validCoords = coords.filter(Boolean);
  if (!validCoords.length) {
    if (fallbackCenter) map.setCenter(fallbackCenter);
    map.setLevel(fallbackLevel);
    return;
  }

  const bounds = new kakao.maps.LatLngBounds();
  validCoords.forEach(coord => bounds.extend(coord));
  map.setBounds(bounds);
}

/**
 * 사이드바 드래그 폭 조절 바(Resizer) 활성화 함수 (유저 피드백 최우선 적용 피처!)
 * @param {kakao.maps.Map} [map] - 레이아웃 변경 시 즉각 갱신할 카카오 맵 인스턴스
 */
const SIDEBAR_WIDTH_KEY = "incheon_sidebar_width";

function initSidebarResizer(map) {
  const resizer = document.getElementById("sidebar-resizer");
  const sidebar = document.querySelector(".sidebar");
  if (!resizer || !sidebar) return;

  if (resizer.__sidebarResizerState) {
    if (map) resizer.__sidebarResizerState.map = map;
    return;
  }

  const minWidth = 320;
  const maxWidth = 650;
  const state = {
    isDragging: false,
    map: map || null
  };
  resizer.__sidebarResizerState = state;

  // 이전에 저장된 폭 복원
  const savedWidth = parseInt(localStorage.getItem(SIDEBAR_WIDTH_KEY), 10);
  if (savedWidth >= minWidth && savedWidth <= maxWidth) {
    sidebar.style.width = `${savedWidth}px`;
  }

  resizer.setAttribute("role", "separator");
  resizer.setAttribute("aria-label", "메뉴와 지도 폭 조절");
  resizer.setAttribute("aria-orientation", "vertical");
  resizer.setAttribute("aria-valuemin", String(minWidth));
  resizer.setAttribute("aria-valuemax", String(maxWidth));
  resizer.setAttribute("aria-valuenow", String(Math.round(sidebar.getBoundingClientRect().width)));
  resizer.setAttribute("title", "드래그해서 메뉴와 지도 폭 조절");

  function startDrag() {
    state.isDragging = true;
    resizer.classList.add("active");
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.body.style.webkitUserSelect = "none";
  }

  function applyDragWidth(clientX) {
    let newWidth = clientX;
    if (newWidth < minWidth) newWidth = minWidth;
    if (newWidth > maxWidth) newWidth = maxWidth;
    sidebar.style.width = `${newWidth}px`;
    resizer.setAttribute("aria-valuenow", String(Math.round(newWidth)));
    if (state.map) state.map.relayout();
  }

  function endDrag() {
    if (!state.isDragging) return;
    state.isDragging = false;
    resizer.classList.remove("active");
    document.body.style.cursor = "default";
    document.body.style.userSelect = "";
    document.body.style.webkitUserSelect = "";
    const currentWidth = Math.round(sidebar.getBoundingClientRect().width);
    localStorage.setItem(SIDEBAR_WIDTH_KEY, String(currentWidth));
  }

  // Mouse
  resizer.addEventListener("mousedown", (e) => {
    startDrag();
    e.preventDefault();
  });
  document.addEventListener("mousemove", (e) => {
    if (!state.isDragging) return;
    applyDragWidth(e.clientX);
  });
  document.addEventListener("mouseup", endDrag);

  // Touch
  resizer.addEventListener("touchstart", (e) => {
    startDrag();
    e.preventDefault();
  }, { passive: false });
  document.addEventListener("touchmove", (e) => {
    if (!state.isDragging) return;
    applyDragWidth(e.touches[0].clientX);
  }, { passive: true });
  document.addEventListener("touchend", endDrag);
}
