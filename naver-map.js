const params = new URLSearchParams(window.location.search);
const lat = Number(params.get("lat"));
const lng = Number(params.get("lng"));
const name = String(params.get("name") || "선택 위치").slice(0, 80);
const title = document.querySelector("#title");
const status = document.querySelector("#status");
const fallbackLink = document.querySelector("#fallbackLink");
const validPosition = Number.isFinite(lat) && Number.isFinite(lng) && lat >= 31 && lat <= 45 && lng >= 122 && lng <= 133;
const webMapUrl = validPosition
  ? `https://map.naver.com/p?c=${encodeURIComponent(`${lng.toFixed(7)},${lat.toFixed(7)},18.00,0,0,1,dh`)}`
  : "https://map.naver.com/";

window.name = "routePhotoNaverWindow";
title.textContent = `${name} · 네이버 지도`;
fallbackLink.href = webMapUrl;

if (!validPosition) {
  status.textContent = "위치 정보가 올바르지 않습니다.";
} else {
  openNaverMap();
}

function openNaverMap() {
  const userAgent = navigator.userAgent || "";
  const fixedLat = lat.toFixed(7);
  const fixedLng = lng.toFixed(7);
  const appName = encodeURIComponent(window.location.origin);
  if (/Android/i.test(userAgent)) {
    const fallbackUrl = encodeURIComponent(webMapUrl);
    window.location.replace(`intent://map?lat=${fixedLat}&lng=${fixedLng}&zoom=18&appname=${appName}#Intent;scheme=nmap;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;package=com.nhn.android.nmap;S.browser_fallback_url=${fallbackUrl};end`);
    return;
  }
  if (/iPhone|iPad|iPod/i.test(userAgent)) {
    const startedAt = Date.now();
    window.location.href = `nmap://map?lat=${fixedLat}&lng=${fixedLng}&zoom=18&appname=${appName}`;
    window.setTimeout(() => {
      if (!document.hidden && Date.now() - startedAt < 2500) {
        window.location.replace(webMapUrl);
      }
    }, 1400);
    return;
  }
  window.location.replace(webMapUrl);
}
