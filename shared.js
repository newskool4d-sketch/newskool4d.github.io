/* Incheon Education Map - shared.js */
/* 지도 공급자 설정, 동적 SDK 로더 및 통합 GNB 공통 모듈 */

const MAP_PROVIDER = globalThis.IncheonMapProvider;
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

function renderKeepTogether(value, phrases = []) {
  return phrases.reduce((html, phrase) => {
    const safePhrase = escapeHtml(phrase);
    return html.replace(safePhrase, `<span class="um-keep-together">${safePhrase}</span>`);
  }, escapeHtml(value));
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

function getActiveMapProvider() {
  return MAP_PROVIDER.currentProvider();
}

function getActiveProviderMeta() {
  return MAP_PROVIDER.providerMeta(getActiveMapProvider());
}

function getCachedKakaoKey() {
  return MAP_PROVIDER.getCredential(getActiveMapProvider());
}

function saveKakaoKey(key) {
  MAP_PROVIDER.setCredential(getActiveMapProvider(), key);
  window.location.reload();
}

function syncProviderForm(provider) {
  const normalized = MAP_PROVIDER.normalizeProvider(provider);
  const meta = MAP_PROVIDER.providerMeta(normalized);
  const credential = MAP_PROVIDER.getCredential(normalized);
  const input = document.getElementById("modal-key-input");
  const loaderInput = document.getElementById("loader-key-input");
  const label = document.querySelector("[data-provider-credential-label]");
  const help = document.querySelector("[data-provider-help]");
  if (input) { input.value = credential; input.placeholder = meta.credentialPlaceholder; }
  if (loaderInput) { loaderInput.value = credential; loaderInput.placeholder = meta.credentialPlaceholder; }
  if (label) label.textContent = meta.credentialLabel;
  if (help) help.textContent = `${meta.domainHelp} Client Secret은 입력하지 마세요.`;
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

  document.addEventListener("change", (event) => {
    if (!(event.target instanceof HTMLSelectElement)) return;
    if (!event.target.matches("[data-provider-select]")) return;
    const provider = MAP_PROVIDER.setProvider(event.target.value);
    document.querySelectorAll("[data-provider-select]").forEach((select) => { select.value = provider; });
    syncProviderForm(provider);
  });
}

function submitKeyInput(inputId) {
  const input = document.getElementById(inputId);
  if (!(input instanceof HTMLInputElement)) return;

  const host = getStatusHost(input);
  const key = input.value.trim();

  if (!key) {
    showInlineStatus(host, `${getActiveProviderMeta().credentialLabel}를 먼저 입력해 주세요.`, "error");
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
  const provider = getActiveMapProvider();
  const providerInfo = getActiveProviderMeta();
  const statusClass = cachedKey ? "active" : "";
  const statusText = cachedKey ? `${providerInfo.badge} 연결 준비` : `${providerInfo.badge} 설정 필요`;
  const safeCachedKey = escapeHtml(cachedKey);

  const header = document.createElement("header");
  header.className = "gnb-header";
  header.innerHTML = `
    <a href="index.html" class="gnb-logo">
      <div class="gnb-badge">NEWSKOOL4D</div>
      <div class="gnb-title">인천교육 통합지도</div>
    </a>
    <nav class="gnb-nav">
      <a href="unified-map.html" class="gnb-tab ${activeTab === 'unified' ? 'active' : ''}">
        통합 작업지도
      </a>
      <a href="schools.html" class="gnb-tab ${activeTab === 'schools' ? 'active' : ''}">
        학교 디렉토리
      </a>
      <a href="infrastructure.html" class="gnb-tab ${activeTab === 'infrastructure' ? 'active' : ''}">
        체험교육 기관
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
        <span>${escapeHtml(statusText)}</span>
      </button>
    </div>
  `;

  // 2. API 키 모달 마크업 작성
  const modal = document.createElement("div");
  modal.id = "api-key-modal";
  modal.className = "key-modal";
  modal.innerHTML = `
    <div class="key-modal-content" data-status-host>
      <span class="provider-kicker">MAP PROVIDER</span>
      <h3>지도 연결 설정</h3>
      <p class="provider-modal-copy">공급자와 브라우저용 식별자를 선택합니다. 값은 이 브라우저에만 저장되며 화면에는 노출하지 않습니다.</p>
      <div class="form-group provider-selector-group">
        <label for="modal-provider-select">지도 공급자</label>
        <select id="modal-provider-select" data-provider-select>
          <option value="naver" ${provider === "naver" ? "selected" : ""}>네이버 지도 · 권장</option>
          <option value="kakao" ${provider === "kakao" ? "selected" : ""}>카카오 지도 · 대체</option>
        </select>
      </div>
      <div class="form-group" style="margin-bottom: 24px;">
        <label for="modal-key-input" data-provider-credential-label>${escapeHtml(providerInfo.credentialLabel)}</label>
        <input type="text" id="modal-key-input" placeholder="${escapeHtml(providerInfo.credentialPlaceholder)}" value="${safeCachedKey}" style="width: 100%;" autocomplete="off">
        <small data-provider-help>${renderKeepTogether(providerInfo.domainHelp, ["현재 사이트 주소를 등록하세요."])} <span class="um-keep-together">Client Secret</span>은 <span class="um-keep-together">입력하지 마세요.</span></small>
      </div>
      <div class="provider-modal-actions">
        <button type="button" ${SHARED_ACTION_ATTR}="submit-key-modal">저장하고 지도 연결</button>
        <button type="button" ${SHARED_ACTION_ATTR}="close-key-modal" class="btn-secondary">닫기</button>
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

/** 지도 공급자 SDK를 동적으로 로드합니다. 기존 페이지 호환을 위해 함수명은 유지합니다. */
function loadKakaoSDK(callback) {
  const provider = getActiveMapProvider();
  const meta = getActiveProviderMeta();
  const credential = getCachedKakaoKey();
  if (!credential) {
    createLoaderCover(
      `${meta.name} 연결 정보가 필요합니다`,
      `${meta.credentialLabel}를 입력하면 지도가 활성화됩니다. ${meta.domainHelp}`
    );
    return;
  }

  MAP_PROVIDER.load({ provider, credential }).then(() => {
    const cover = document.getElementById("loader-cover");
    if (cover) {
      cover.style.opacity = "0";
      window.setTimeout(() => cover.remove(), 220);
    }
    document.getElementById("map")?.classList.add("visible");
    document.body.dataset.mapProvider = provider;
    if (typeof callback === "function") callback();
  }).catch(() => {
    createLoaderCover(
      `${meta.name} 연결에 실패했습니다`,
      `${meta.credentialLabel}, 네트워크 상태, 등록된 Web 서비스 URL을 확인하거나 다른 지도 공급자로 전환해 주세요.`
    );
  });
}

/**
 * API 키 등록 유도를 위한 반투명 로더 커버 생성
 */
function createLoaderCover(title, description) {
  const viewport = document.querySelector(".map-viewport");
  if (!viewport) return;

  const oldCover = document.getElementById("loader-cover");
  if (oldCover) oldCover.remove();
  const provider = getActiveMapProvider();
  const meta = getActiveProviderMeta();
  const safeCachedKey = escapeHtml(getCachedKakaoKey());
  const safeTitle = renderKeepTogether(title, ["정보가 필요합니다"]);
  const safeDescription = renderKeepTogether(description, [
    "지도가 활성화됩니다.",
    "지도 이동과",
    "현재 사이트 주소를 등록하세요.",
  ]);
  const safeDomainHelp = renderKeepTogether(meta.domainHelp, ["현재 사이트 주소를 등록하세요."]);

  const cover = document.createElement("div");
  cover.id = "loader-cover";
  cover.className = "map-loader-cover";
  cover.innerHTML = `
    <div class="map-loader-card" data-status-host>
      <div class="loader-signal" aria-hidden="true"><span></span><span></span><span></span></div>
      <span class="provider-kicker">${escapeHtml(meta.badge)} MAP</span>
      <h3>${safeTitle}</h3>
      <p>${safeDescription}</p>
      <div class="form-group provider-selector-group">
        <label for="loader-provider-select">지도 공급자</label>
        <select id="loader-provider-select" data-provider-select>
          <option value="naver" ${provider === "naver" ? "selected" : ""}>네이버 지도 · 권장</option>
          <option value="kakao" ${provider === "kakao" ? "selected" : ""}>카카오 지도 · 대체</option>
        </select>
      </div>
      <div class="form-group">
        <label for="loader-key-input" data-provider-credential-label>${escapeHtml(meta.credentialLabel)}</label>
        <input type="text" id="loader-key-input" placeholder="${escapeHtml(meta.credentialPlaceholder)}" value="${safeCachedKey}" autocomplete="off">
        <small data-provider-help>${safeDomainHelp} <span class="um-keep-together">Client Secret</span>은 <span class="um-keep-together">입력하지 마세요.</span></small>
      </div>
      <button type="button" ${SHARED_ACTION_ATTR}="submit-key-loader">저장하고 지도 연결</button>
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

/** 모든 지도 화면에서 동일한 기본 조작감을 제공합니다. */
function applyStandardKakaoMapSettings(map) {
  if (!map || map.__standardControlsApplied) return;

  map.setDraggable(true);
  map.setZoomable(true);
  map.addControl(new eduMaps.maps.ZoomControl(), eduMaps.maps.ControlPosition.RIGHT);
  map.addControl(new eduMaps.maps.MapTypeControl(), eduMaps.maps.ControlPosition.TOPRIGHT);

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

  const bounds = new eduMaps.maps.LatLngBounds();
  validCoords.forEach(coord => bounds.extend(coord));
  map.setBounds(bounds);
}

/**
 * 사이드바 드래그 폭 조절 바(Resizer) 활성화 함수 (유저 피드백 최우선 적용 피처!)
 * @param {object} [map] - 레이아웃 변경 시 즉각 갱신할 지도 인스턴스
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
