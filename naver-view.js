const NAVER_MAP_CLIENT_ID = "pie7hw0qho";
const params = new URLSearchParams(window.location.search);
const lat = Number(params.get("lat"));
const lng = Number(params.get("lng"));
const name = String(params.get("name") || "선택 위치").slice(0, 80);
const viewer = document.querySelector("#viewer");
const status = document.querySelector("#status");
const title = document.querySelector("#title");
const mapLink = document.querySelector("#mapLink");
const viewerWrap = document.querySelector("#viewerWrap");
const zoomControls = document.querySelector("#zoomControls");
const zoomInBtn = document.querySelector("#zoomInBtn");
const zoomOutBtn = document.querySelector("#zoomOutBtn");
let panoramaInitialized = false;
let panorama = null;
let resizeFrame = null;

const validPosition = Number.isFinite(lat) && Number.isFinite(lng) && lat >= 31 && lat <= 45 && lng >= 122 && lng <= 133;
const webMapUrl = validPosition
  ? `https://map.naver.com/p?c=${encodeURIComponent(`${lng.toFixed(7)},${lat.toFixed(7)},18.00,0,0,1,dh`)}`
  : "https://map.naver.com/";

title.textContent = `${name} · 네이버 로드뷰`;
window.name = "routePhotoNaverWindow";
mapLink.href = webMapUrl;
mapLink.target = "routePhotoNaverWindow";
zoomInBtn.addEventListener("click", () => panorama?.zoomIn());
zoomOutBtn.addEventListener("click", () => panorama?.zoomOut());

if (!validPosition) {
  showError("위치 정보가 올바르지 않아 로드뷰를 열 수 없습니다.");
} else {
  loadPanorama();
}

function loadPanorama() {
  const script = document.createElement("script");
  script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(NAVER_MAP_CLIENT_ID)}&submodules=panorama`;
  script.async = true;
  script.addEventListener("load", () => {
    waitForPanoramaApi()
      .then(initializePanorama)
      .catch(() => showError("네이버 로드뷰 기능을 준비하지 못했습니다. 네이버 지도보기를 이용해 주세요."));
  });
  script.addEventListener("error", () => showError("네이버 로드뷰를 불러오지 못했습니다. 네이버 지도보기를 이용해 주세요."));
  document.head.append(script);
}

function waitForPanoramaApi(timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const checkApi = () => {
      if (window.naver?.maps?.Panorama) {
        resolve();
        return;
      }
      if (Date.now() - startedAt >= timeoutMs) {
        reject(new Error("naver_panorama_unavailable"));
        return;
      }
      window.setTimeout(checkApi, 50);
    };
    checkApi();
  });
}

function initializePanorama() {
  if (panoramaInitialized || !window.naver?.maps?.Panorama) {
    return;
  }
  panoramaInitialized = true;
  try {
    panorama = new window.naver.maps.Panorama(viewer, {
      position: new window.naver.maps.LatLng(lat, lng),
      aroundControl: true,
      flightSpot: true,
      logoControl: true,
      zoomControl: false,
    });
    zoomControls.hidden = false;
    observeViewerSize();
    syncPanoramaSize();
    window.naver.maps.Event.addListener(panorama, "pano_status", (result) => {
      status.textContent = result === "OK"
        ? `${name} 위치에서 가장 가까운 로드뷰입니다.`
        : "주변 300m 이내에 제공되는 로드뷰가 없습니다.";
    });
  } catch (error) {
    console.warn("Standalone Naver panorama failed", error);
    showError("네이버 로드뷰를 열지 못했습니다. 네이버 지도보기를 이용해 주세요.");
  }
}

function observeViewerSize() {
  if (window.ResizeObserver) {
    const resizeObserver = new ResizeObserver(schedulePanoramaResize);
    resizeObserver.observe(viewerWrap);
  }
  window.addEventListener("resize", schedulePanoramaResize, { passive: true });
}

function schedulePanoramaResize() {
  if (resizeFrame !== null) {
    window.cancelAnimationFrame(resizeFrame);
  }
  resizeFrame = window.requestAnimationFrame(() => {
    resizeFrame = null;
    syncPanoramaSize();
  });
}

function syncPanoramaSize() {
  if (!panorama || !window.naver?.maps?.Size) {
    return;
  }
  const width = Math.max(1, Math.round(viewerWrap.clientWidth));
  const height = Math.max(1, Math.round(viewerWrap.clientHeight));
  panorama.setSize(new window.naver.maps.Size(width, height));
}

function showError(message) {
  status.textContent = message;
  zoomControls.hidden = true;
  viewer.innerHTML = `<div id="error">${message}</div>`;
}
