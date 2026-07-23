const STORAGE_KEY = "route-photo-map-state-v1";
const SESSIONS_KEY = "route-photo-map-sessions-v1";
const MAX_STORED_IMAGE_LENGTH = 850000;
const MAX_EDIT_POINT_MARKERS = 1000;
const DEFAULT_CONSTRUCTION_COLOR = "#c34236";
const BRIGHT_YELLOW_COLOR = "#f2c400";
const ROUTE_COMPLETED_COLOR = "#1f7a57";
const ROUTE_REMAINING_COLOR = "#315f9e";
const ROUTE_DEVIATION_METERS = 50;
const REPRESENTATIVE_COLORS = [
  { name: "빨강", value: "#c34236" },
  { name: "주황", value: "#d96c1f" },
  { name: "노랑", value: BRIGHT_YELLOW_COLOR },
  { name: "초록", value: "#1f7a57" },
  { name: "파랑", value: "#315f9e" },
  { name: "보라", value: "#6d4aa2" },
  { name: "갈색", value: "#8b5a2b" },
  { name: "회색", value: "#3f4a46" },
];
const OVERLAY_COLORS = ["#315f9e", "#c34236", "#1f7a57", "#6d4aa2", "#d96c1f", "#3f4a46", BRIGHT_YELLOW_COLOR, "#8b5a2b"];
const initialShareToken = getShareTokenFromPath();

if (!window.L) {
  window.L = createFallbackMapApi();
}

const state = {
  tracking: false,
  paused: false,
  watcherId: null,
  pollerId: null,
  wakeLock: null,
  wakeLockEnabled: false,
  autoFollow: true,
  mapProvider: "osm",
  photoFilter: "all",
  photoView: "list",
  activePhotoId: null,
  projectCode: "",
  projectName: "프로젝트A",
  serverHealth: null,
  syncDirty: false,
  syncing: false,
  lastSyncedAt: null,
  lastSyncFailedAt: null,
  lastSyncError: "",
  user: null,
  myProjects: [],
  shareLinks: [],
  shareView: initialShareToken ? { loading: true } : null,
  shareConstructionVisible: true,
  adminUsers: [],
  adminPanelOpen: false,
  authPanelOpen: true,
  sharePanelOpen: false,
  recordPanelOpen: true,
  pointEditPanelOpen: false,
  pointEditMode: false,
  pointAddMode: false,
  destinationFollow: false,
  followProgressIndex: 0,
  routeOffTrack: false,
  routeDeviationSamples: 0,
  routeRecoverySamples: 0,
  continuingSessionId: null,
  selectedPointIndex: null,
  lastRoutePointIndex: null,
  segmentStartIndex: null,
  segmentEndIndex: null,
  undoRouteEdit: null,
  selectedPosition: null,
  initialPosition: null,
  points: [],
  photos: [],
  milestones: [],
  overlayProjects: [],
  sessions: [],
  primarySessionId: null,
  activeStartedAt: null,
};

const els = {
  trackBtn: document.querySelector("#trackBtn"),
  pauseBtn: document.querySelector("#pauseBtn"),
  photoInput: document.querySelector("#photoInput"),
  locateBtn: document.querySelector("#locateBtn"),
  fitBtn: document.querySelector("#fitBtn"),
  autoFollowBtn: document.querySelector("#autoFollowBtn"),
  saveBtn: document.querySelector("#saveBtn"),
  exportBtn: document.querySelector("#exportBtn"),
  clearBtn: document.querySelector("#clearBtn"),
  mapProvider: document.querySelector("#mapProvider"),
  wakeLockToggle: document.querySelector("#wakeLockToggle"),
  photoFilter: document.querySelector("#photoFilter"),
  photoViewToggle: document.querySelector("#photoViewToggle"),
  photoModal: document.querySelector("#photoModal"),
  photoModalClose: document.querySelector("#photoModalClose"),
  photoModalImage: document.querySelector("#photoModalImage"),
  photoModalTitle: document.querySelector("#photoModalTitle"),
  photoModalMeta: document.querySelector("#photoModalMeta"),
  photoModalMemo: document.querySelector("#photoModalMemo"),
  photoModalTags: document.querySelector("#photoModalTags"),
  photoModalMemoBtn: document.querySelector("#photoModalMemoBtn"),
  photoModalTagBtn: document.querySelector("#photoModalTagBtn"),
  photoModalLocateBtn: document.querySelector("#photoModalLocateBtn"),
  projectName: document.querySelector("#projectName"),
  projectCode: document.querySelector("#projectCode"),
  projectBadge: document.querySelector("#projectBadge"),
  projectStatus: document.querySelector("#projectStatus"),
  createProjectBtn: document.querySelector("#createProjectBtn"),
  renameProjectBtn: document.querySelector("#renameProjectBtn"),
  openProjectBtn: document.querySelector("#openProjectBtn"),
  syncProjectBtn: document.querySelector("#syncProjectBtn"),
  recordSection: document.querySelector("#recordSection"),
  recordTitle: document.querySelector("#recordTitle"),
  recordToggleBtn: document.querySelector("#recordToggleBtn"),
  pointEditSection: document.querySelector("#pointEditSection"),
  pointEditToggleBtn: document.querySelector("#pointEditToggleBtn"),
  pointAddBtn: document.querySelector("#pointAddBtn"),
  pointConnectBtn: document.querySelector("#pointConnectBtn"),
  pointDeleteBtn: document.querySelector("#pointDeleteBtn"),
  segmentStartBtn: document.querySelector("#segmentStartBtn"),
  segmentEndBtn: document.querySelector("#segmentEndBtn"),
  segmentDeleteBtn: document.querySelector("#segmentDeleteBtn"),
  undoRouteEditBtn: document.querySelector("#undoRouteEditBtn"),
  pointNumberRow: document.querySelector("#pointNumberRow"),
  segmentStartInput: document.querySelector("#segmentStartInput"),
  segmentEndInput: document.querySelector("#segmentEndInput"),
  pointEditHint: document.querySelector("#pointEditHint"),
  statusText: document.querySelector("#statusText"),
  trackingBadge: document.querySelector("#trackingBadge"),
  distanceValue: document.querySelector("#distanceValue"),
  pointValue: document.querySelector("#pointValue"),
  photoValue: document.querySelector("#photoValue"),
  photoTray: document.querySelector("#photoTray"),
  photoList: document.querySelector("#photoList"),
  historyList: document.querySelector("#historyList"),
  photoItemTemplate: document.querySelector("#photoItemTemplate"),
  followRouteBtn: document.querySelector("#followRouteBtn"),
  shareConstructionToggleBtn: document.querySelector("#shareConstructionToggleBtn"),
  routeFollowStatus: document.querySelector("#routeFollowStatus"),
  addConstructionPinBtn: document.querySelector("#addConstructionPinBtn"),
  milestoneList: document.querySelector("#milestoneList"),
  overlayProjectCode: document.querySelector("#overlayProjectCode"),
  addOverlayProjectBtn: document.querySelector("#addOverlayProjectBtn"),
  overlayProjectList: document.querySelector("#overlayProjectList"),
  colorPickerModal: document.querySelector("#colorPickerModal"),
  colorPickerTitle: document.querySelector("#colorPickerTitle"),
  colorPickerOptions: document.querySelector("#colorPickerOptions"),
  colorPickerCancelBtn: document.querySelector("#colorPickerCancelBtn"),
  colorPickerConfirmBtn: document.querySelector("#colorPickerConfirmBtn"),
};

const map = L.map("map", {
  zoomControl: false,
}).setView([37.5665, 126.978], 15);

L.control.zoom({ position: "bottomleft" }).addTo(map);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap",
}).addTo(map);

const routeLine = L.polyline([], {
  color: ROUTE_COMPLETED_COLOR,
  weight: 6,
  opacity: 0.88,
  lineCap: "round",
  lineJoin: "round",
}).addTo(map);

const routeRemainingLine = L.polyline([], {
  color: ROUTE_REMAINING_COLOR,
  weight: 6,
  opacity: 0.9,
  lineCap: "round",
  lineJoin: "round",
}).addTo(map);

const currentMarker = L.circleMarker([37.5665, 126.978], {
  radius: 8,
  color: "#ffffff",
  weight: 3,
  fillColor: "#1f7a57",
  fillOpacity: 1,
}).addTo(map);

const photoLayer = L.layerGroup().addTo(map);
const milestoneLayer = L.layerGroup().addTo(map);
const projectOverlayLayer = L.layerGroup().addTo(map);
const pointLayer = L.layerGroup().addTo(map);
let programmaticMapMove = false;
let lastFollowMapMoveAt = 0;
let lastLiveStatusAt = 0;
let routeFollowWatcherId = null;
let shareViewTimerId = null;
let colorPickerSelection = DEFAULT_CONSTRUCTION_COLOR;
let colorPickerConfirmHandler = null;
let authEls = {};
let shareEls = {};

if (!initialShareToken) {
  loadState();
}
setupAuthPanel();
setupAdminPanel();
setupSharePanel();
setupColorPicker();
render();
showLocationReadiness();
captureInitialPosition();
refreshServerHealth();
refreshAuth();

map.on("click", (event) => {
  if (state.pointEditMode) {
    if (state.pointAddMode) {
      state.pointAddMode = addManualRoutePoint(event.latlng);
      renderPointEditing();
      return;
    }
    selectNearestRoutePoint(event.latlng);
    return;
  }
  state.selectedPosition = {
    lat: event.latlng.lat,
    lng: event.latlng.lng,
    timestamp: Date.now(),
  };
  setStatus("사진을 추가하면 방금 선택한 지도 위치에 기록됩니다.");
});

map.on("dragstart zoomstart", () => {
  if (programmaticMapMove || (!state.tracking && !state.destinationFollow) || !state.autoFollow) {
    return;
  }
  state.autoFollow = false;
  persist();
  renderTrackingState();
  setStatus("지도를 직접 움직여 자동 따라가기를 잠시 껐습니다. 현재 위치 버튼이나 기록 시작을 누르면 다시 켜집니다.");
});

map.on("moveend zoomend", () => {
  renderPhotoMapMarkers(getVisiblePhotos());
  if (state.pointEditMode) {
    renderPointEditing();
  }
});

els.trackBtn.addEventListener("click", () => {
  if (state.tracking) {
    confirmStopTracking();
    return false;
  }
  startTracking();
});
els.pauseBtn.addEventListener("click", togglePauseTracking);

els.locateBtn.addEventListener("click", async () => {
  await locateCurrentPosition({ status: true });
  return false;
});

els.fitBtn.addEventListener("click", () => {
  state.autoFollow = false;
  persist();
  renderTrackingState();
  fitToData();
});
els.autoFollowBtn?.addEventListener("click", toggleAutoFollow);
els.saveBtn.addEventListener("click", () => saveCurrentSession("manual"));
els.exportBtn.addEventListener("click", exportData);
els.clearBtn.addEventListener("click", clearData);
els.photoInput.addEventListener("change", handlePhotoInput);
els.mapProvider.addEventListener("change", handleMapProviderChange);
els.wakeLockToggle.addEventListener("change", handleWakeLockToggle);
els.photoFilter.addEventListener("change", (event) => {
  state.photoFilter = event.target.value;
  persist();
  renderPhotos();
});
els.photoViewToggle.addEventListener("click", () => {
  state.photoView = state.photoView === "grid" ? "list" : "grid";
  persist();
  renderPhotos();
});
els.photoModalClose.addEventListener("click", closePhotoModal);
els.photoModal.addEventListener("click", (event) => {
  if (event.target.hasAttribute("data-photo-modal-close")) {
    closePhotoModal();
  }
});
els.photoModalMemoBtn.addEventListener("click", () => {
  const photo = getActiveModalPhoto();
  if (photo) {
    editPhotoMemo(photo.id, { keepModalOpen: true });
  }
});
els.photoModalTagBtn.addEventListener("click", () => {
  const photo = getActiveModalPhoto();
  if (photo) {
    editPhotoTags(photo.id, { keepModalOpen: true });
  }
});
els.photoModalLocateBtn.addEventListener("click", () => {
  const photo = getActiveModalPhoto();
  if (photo && hasPhotoPosition(photo)) {
    map.setView([photo.lat, photo.lng], 18);
    closePhotoModal();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !els.photoModal.hidden) {
    closePhotoModal();
  }
  if (event.key === "Escape" && els.colorPickerModal && !els.colorPickerModal.hidden) {
    closeRepresentativeColorPicker();
  }
});
els.createProjectBtn.addEventListener("click", createServerProject);
els.renameProjectBtn?.addEventListener("click", renameCurrentProject);
els.openProjectBtn.addEventListener("click", () => openServerProject(els.projectCode.value));
els.syncProjectBtn.addEventListener("click", () => syncProjectState("manual"));
document.addEventListener("click", (event) => {
  if (event.target?.closest("#recordToggleBtn")) {
    event.preventDefault();
    toggleRecordPanel();
  }
  if (event.target?.closest("#pointEditToggleBtn")) {
    event.preventDefault();
    togglePointEditPanel();
  }
});
els.followRouteBtn?.addEventListener("click", toggleRouteFollow);
els.shareConstructionToggleBtn?.addEventListener("click", toggleSharedConstructionVisibility);
els.addConstructionPinBtn?.addEventListener("click", () => addMapPin("construction"));
els.addOverlayProjectBtn?.addEventListener("click", () => addOverlayProject());
els.overlayProjectCode?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    addOverlayProject();
  }
});
els.pointAddBtn?.addEventListener("click", addManualRoutePointFromSelection);
els.pointConnectBtn?.addEventListener("click", connectSelectedRoutePoints);
els.pointDeleteBtn?.addEventListener("click", deleteSelectedPoint);
els.segmentStartBtn?.addEventListener("click", setSegmentStart);
els.segmentEndBtn?.addEventListener("click", setSegmentEnd);
els.segmentDeleteBtn?.addEventListener("click", deleteSelectedSegment);
els.undoRouteEditBtn?.addEventListener("click", undoRouteEdit);
els.segmentStartInput?.addEventListener("input", applySegmentNumberInputs);
els.segmentEndInput?.addEventListener("input", applySegmentNumberInputs);
els.segmentStartInput?.addEventListener("change", applySegmentNumberInputs);
els.segmentEndInput?.addEventListener("change", applySegmentNumberInputs);
els.projectName.addEventListener("change", () => {
  if (!state.projectCode) {
    state.projectName = els.projectName.value.trim();
    persist();
  }
});
window.addEventListener("beforeunload", persist);
window.addEventListener("online", retryPendingProjectSync);
window.addEventListener("offline", () => {
  if (state.projectCode) {
    state.syncDirty = true;
    state.lastSyncError = "offline";
    persist();
    setProjectStatus("오프라인 상태입니다. 현재 작업은 로컬에 보관 중이며, 온라인 복구 시 서버 동기화를 다시 시도합니다.");
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    persist();
    return;
  }
if (state.wakeLockEnabled) {
    requestWakeLock();
  }
  if (shareToken && state.shareView) {
    verifyShareView(shareToken);
  }
});

const shareToken = initialShareToken;
const urlProjectCode = new URLSearchParams(window.location.search).get("project");
if (shareToken) {
  openShareView(shareToken);
} else if (urlProjectCode) {
  openServerProject(urlProjectCode);
}

function startTracking() {
  if (!canUsePreciseLocation()) {
    return;
  }

  if (!navigator.geolocation) {
    setStatus("이 브라우저는 위치 기록을 지원하지 않습니다. 샘플 동선으로 확인해 보세요.");
    return;
  }

  if (state.destinationFollow) {
    state.destinationFollow = false;
    state.followProgressIndex = 0;
    state.routeOffTrack = false;
    state.routeDeviationSamples = 0;
    state.routeRecoverySamples = 0;
  }
  state.tracking = true;
  stopRouteFollowWatcher();
  state.paused = false;
  state.recordPanelOpen = true;
  state.autoFollow = true;
  state.activeStartedAt = state.activeStartedAt || Date.now();
  if (state.pollerId !== null) {
    window.clearInterval(state.pollerId);
    state.pollerId = null;
  }
  persist();
  if (state.wakeLockEnabled) {
    requestWakeLock();
  }
  renderTrackingState();
  setStatus("현재 위치를 찾는 중입니다.");

  state.watcherId = navigator.geolocation.watchPosition(
    (position) => {
      if (state.paused) {
        setStatus("이동 경로 기록이 일시정지되었습니다.");
        return;
      }
      const arrived = addPointFromCoords(position.coords, position.timestamp);
      if (arrived === false && Date.now() - lastLiveStatusAt > 8000) {
        lastLiveStatusAt = Date.now();
        setStatus("이동 경로를 기록하고 있습니다.");
      }
    },
    (error) => {
      if (error.code === error.TIMEOUT || error.code === error.POSITION_UNAVAILABLE) {
        setStatus(getLocationErrorMessage(error));
        return;
      }
      stopTracking();
      setStatus(`위치 권한 또는 GPS 신호를 확인해 주세요. (${error.message})`);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 20000,
    },
  );

  state.pollerId = window.setInterval(pollCurrentPosition, 10000);
}

function confirmStopTracking() {
  const confirmed = window.confirm(
    "기록을 완료할까요?\n\n현재 위치점과 사진은 기록으로 저장되고, 화면은 다음 기록을 위해 초기화됩니다.",
  );
  if (!confirmed) {
    return;
  }
  stopTracking({ save: true, clearCurrent: true });
}

function stopTracking(options = {}) {
  const { save = true, clearCurrent = false } = options;
  if (state.watcherId !== null) {
    navigator.geolocation.clearWatch(state.watcherId);
  }
  if (state.pollerId !== null) {
    window.clearInterval(state.pollerId);
  }
  state.watcherId = null;
  state.pollerId = null;
  state.tracking = false;
  state.paused = false;
  const saved = save ? saveCurrentSession("completed") : null;
  if (clearCurrent && saved !== false) {
    resetCurrentRecord();
    syncProjectState("completed");
  }
  render();
  if (state.destinationFollow) {
    startRouteFollowWatcher();
  }
  if (clearCurrent) {
    setStatus("기록을 저장하고 현재 화면을 초기화했습니다.");
    return;
  }
  renderTrackingState();
  setStatus("기록을 멈췄습니다. 사진은 마지막 위치 또는 지도에서 선택한 위치에 저장됩니다.");
}

function resetCurrentRecord() {
  state.points = [];
  state.photos = [];
  state.selectedPosition = state.initialPosition || null;
  state.activeStartedAt = null;
  state.continuingSessionId = null;
  state.undoRouteEdit = null;
  if (state.initialPosition) {
    currentMarker.setLatLng([state.initialPosition.lat, state.initialPosition.lng]);
  }
  persist();
}

function pollCurrentPosition() {
  if (!state.tracking || state.paused || !navigator.geolocation) {
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      addPointFromCoords(position.coords, position.timestamp);
    },
    () => {},
    {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 12000,
    },
  );
}

function startRouteFollowWatcher() {
  if (routeFollowWatcherId !== null || state.tracking || !state.destinationFollow || !navigator.geolocation) {
    return;
  }
  routeFollowWatcherId = navigator.geolocation.watchPosition(
    (position) => {
      const point = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: Math.round(position.coords.accuracy || 0),
        timestamp: position.timestamp,
      };
      state.selectedPosition = point;
      currentMarker.setLatLng([point.lat, point.lng]);
      updateRouteFollowing(point);
      followLatestPoint(point);
      persist();
    },
    (error) => {
      setStatus(getLocationErrorMessage(error), "warning");
    },
    {
      enableHighAccuracy: true,
      maximumAge: 2000,
      timeout: 15000,
    },
  );
}

function stopRouteFollowWatcher() {
  if (routeFollowWatcherId === null || !navigator.geolocation) {
    routeFollowWatcherId = null;
    return;
  }
  navigator.geolocation.clearWatch(routeFollowWatcherId);
  routeFollowWatcherId = null;
}

function togglePauseTracking() {
  if (!state.tracking) {
    return;
  }
  state.paused = !state.paused;
  persist();
  renderTrackingState();
  setStatus(state.paused ? "이동 경로 기록을 일시정지했습니다." : "이동 경로 기록을 다시 시작했습니다.");
}

async function startOneShotLocation() {
  if (!canUsePreciseLocation()) {
    return;
  }

  if (!navigator.geolocation) {
    setStatus("이 브라우저는 현재 위치 이동을 지원하지 않습니다.");
    return;
  }

  const position = await locateCurrentPosition({ status: true });
  if (position) {
    addPointFromCoords(
      {
        latitude: position.lat,
        longitude: position.lng,
        accuracy: position.accuracy,
      },
      position.timestamp,
    );
  }
}

function addPointFromCoords(coords, timestamp = Date.now()) {
  const nextPoint = {
    lat: coords.latitude,
    lng: coords.longitude,
    accuracy: Math.round(coords.accuracy || 0),
    timestamp,
  };

  const latest = state.points.at(-1);
  const accepted = shouldAcceptPoint(latest, nextPoint);
  if (!accepted.ok) {
    setStatus(accepted.message);
    return null;
  }

  state.points.push(nextPoint);
  state.selectedPosition = nextPoint;
  persist();
  renderRouteProgress(nextPoint);
  followLatestPoint(nextPoint);
  return updateRouteFollowing(nextPoint);
}

function renderRouteProgress(point = getLatestPosition()) {
  renderRouteLines();
  if (point) {
    currentMarker.setLatLng([point.lat, point.lng]);
  }
  renderStats();
  renderRouteFollowStatus(point);
  renderTrackingState();
  if (state.pointEditMode) {
    renderPointEditing();
  }
}

function updateRouteFollowing(point) {
  if (!state.destinationFollow) {
    return false;
  }
  const routePoints = getRoutePathPoints(state.points);
  const nearest = findNearestRoutePosition(point, routePoints);
  if (!nearest) {
    stopRouteFollowing("기록된 동선을 확인할 수 없어 답사 따라가기를 종료했습니다.");
    return false;
  }

  const nextProgressIndex = nearest.segmentIndex + (nearest.segmentRatio >= 0.5 ? 1 : 0);
  state.followProgressIndex = Math.max(state.followProgressIndex, nextProgressIndex);
  const accuracy = Math.max(0, Number(point.accuracy || 0));
  const threshold = Math.max(ROUTE_DEVIATION_METERS, Math.min(100, accuracy * 1.5));
  const isOffRoute = nearest.distanceMeters > threshold;
  state.routeDeviationSamples = isOffRoute ? state.routeDeviationSamples + 1 : 0;
  state.routeRecoverySamples = isOffRoute ? 0 : state.routeRecoverySamples + 1;

  if (!state.routeOffTrack && state.routeDeviationSamples >= 2) {
    state.routeOffTrack = true;
    speakRouteGuidance("기록된 경로에서 벗어났습니다.");
    setStatus(`경로 이탈 · 기록된 동선에서 약 ${Math.round(nearest.distanceMeters)}m 떨어져 있습니다.`, "warning");
  } else if (state.routeOffTrack && state.routeRecoverySamples >= 2) {
    state.routeOffTrack = false;
    speakRouteGuidance("기록된 경로로 복귀했습니다.");
    setStatus("기록된 경로로 복귀했습니다.", "success");
  }

  renderRouteLines();
  renderRouteFollowStatus(point, nearest);
  return false;
}

function followLatestPoint(point) {
  if ((!state.tracking && !state.destinationFollow) || state.paused || !state.autoFollow || !point) {
    return;
  }
  const now = Date.now();
  if (now - lastFollowMapMoveAt < 1200) {
    return;
  }
  lastFollowMapMoveAt = now;
  const zoom = Math.max(map.getZoom(), 17);
  setMapView([point.lat, point.lng], zoom);
}

function toggleAutoFollow() {
  state.autoFollow = !state.autoFollow;
  persist();
  renderTrackingState();
  const latest = getLatestPosition();
  if (state.autoFollow && latest) {
    setMapView([latest.lat, latest.lng], Math.max(map.getZoom(), 17));
  }
  setStatus(state.autoFollow ? "자동 따라가기를 켰습니다." : "자동 따라가기를 껐습니다.");
}

function setMapView(latLng, zoom) {
  programmaticMapMove = true;
  map.setView(latLng, zoom);
  window.setTimeout(() => {
    programmaticMapMove = false;
  }, 350);
}

function shouldAcceptPoint(latest, nextPoint) {
  if (!latest) {
    return { ok: true };
  }

  const distance = getDistanceMeters(latest, nextPoint);
  const elapsedSeconds = Math.max(1, (nextPoint.timestamp - latest.timestamp) / 1000);
  const speed = distance / elapsedSeconds;
  const combinedAccuracy = (latest.accuracy || 20) + (nextPoint.accuracy || 20);
  const movementThreshold = Math.max(8, Math.min(18, combinedAccuracy * 0.25));

  if (nextPoint.accuracy && nextPoint.accuracy > 120 && distance < 50) {
    return {
      ok: false,
      message: `GPS 정확도가 낮아 작은 이동은 대기 중입니다. (오차 약 ${nextPoint.accuracy}m)`,
    };
  }

  if (distance < movementThreshold) {
    return {
      ok: false,
      message: `GPS 흔들림을 제외했습니다. 실제 이동으로 보이면 조금 더 이동해 주세요. (오차 기준 ${Math.round(movementThreshold)}m)`,
    };
  }

  if (speed > 35) {
    return {
      ok: false,
      message: "순간 위치가 크게 튀어 제외했습니다.",
    };
  }

  return { ok: true };
}

async function handlePhotoInput(event, options = {}) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  setStatus("사진을 저장하고 위치를 확인하는 중입니다.");

  try {
    const fixedPosition = options.position || null;
    const [locationResult, photoSrc] = await Promise.all([
      fixedPosition
        ? Promise.resolve({
            position: fixedPosition,
            source: options.source || "map",
            label: options.label || "지도 선택 위치",
          })
        : getBestPhotoPosition(file),
      resizePhotoForStorage(file),
    ]);
    const position = locationResult.position;
    state.photos.unshift({
      id: crypto.randomUUID(),
      displayName: getNextProjectPhotoName(),
      originalName: file.name || "",
      name: file.name || "현장 사진",
      src: photoSrc,
      lat: position?.lat ?? null,
      lng: position?.lng ?? null,
      locationSource: locationResult.source,
      timestamp: Date.now(),
    });
    if (position) {
      state.selectedPosition = { lat: position.lat, lng: position.lng, timestamp: Date.now() };
    }
    event.target.value = "";
    persist();
    render();
    setStatus(`${locationResult.label}에 사진을 저장했습니다.`);
  } catch {
    setStatus("기록 저장에 실패했습니다. 사진 용량을 줄인 뒤 다시 시도해 주세요.");
    return false;
  } finally {
    event.target.value = "";
  }
}

async function getBestPhotoPosition(file) {
  const exifPosition = await withTimeout(getExifGpsPosition(file), 3500, null);
  if (exifPosition) {
    return {
      position: exifPosition,
      source: "exif",
      label: "사진 파일의 GPS 위치",
    };
  }

  const livePosition = await withTimeout(getCurrentPositionForPhoto(), 6000, null);
  if (livePosition) {
    state.points.push(livePosition);
    return {
      position: livePosition,
      source: "gps",
      label: "현재 GPS 위치",
    };
  }

  const fallback = state.selectedPosition || getLatestPosition() || state.initialPosition;
  if (fallback) {
    return {
      position: {
        lat: fallback.lat,
        lng: fallback.lng,
        timestamp: Date.now(),
      },
      source: fallback === state.initialPosition ? "initial" : "map",
      label: fallback === state.initialPosition ? "접속 위치" : "지도 선택 위치",
    };
  }

  return {
    position: null,
    source: "none",
    label: "위치 정보 없음",
  };
}

function getCurrentPositionForPhoto() {
  if (!navigator.geolocation || !window.isSecureContext) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy || 0),
          timestamp: position.timestamp,
        });
      },
      () => resolve(null),
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 15000,
      },
    );
  });
}

function getCurrentPositionForMap() {
  if (!navigator.geolocation || !window.isSecureContext) {
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy || 0),
          timestamp: position.timestamp,
        });
      },
      (error) => reject(error),
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 15000,
      },
    );
  });
}

async function locateCurrentPosition(options = {}) {
  const { status = false } = options;
  if (!canUsePreciseLocation()) {
    return null;
  }
  if (!navigator.geolocation) {
    setStatus("이 브라우저는 현재 위치 이동을 지원하지 않습니다.");
    return null;
  }
  if (status) {
    setStatus("현재 위치를 확인하는 중입니다.");
  }
  try {
    const position = await getCurrentPositionForMap();
    state.selectedPosition = position;
    state.initialPosition = state.initialPosition || position;
    state.autoFollow = true;
    currentMarker.setLatLng([position.lat, position.lng]);
    persist();
    renderTrackingState();
    renderRouteFollowStatus(position);
    setMapView([position.lat, position.lng], Math.max(map.getZoom(), 17));
    if (status) {
      setStatus("현재 위치를 지도에 반영했습니다.");
    }
    return position;
  } catch (error) {
    const latest = getLatestPosition();
    if (latest) {
      state.autoFollow = true;
      persist();
      renderTrackingState();
      setMapView([latest.lat, latest.lng], Math.max(map.getZoom(), 17));
    }
    setStatus(error?.code ? getLocationErrorMessage(error) : "현재 위치를 확인하지 못했습니다.");
    return null;
  }
}

function resizePhotoForStorage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("File read failed"));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("Image decode failed"));
      image.onload = () => {
        const maxSize = 1280;
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function captureInitialPosition() {
  if (!navigator.geolocation || !window.isSecureContext) {
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      state.initialPosition = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: Math.round(position.coords.accuracy || 0),
        timestamp: position.timestamp,
      };
      const hasActiveRoute = state.points.length > 0 || state.tracking;
      if (!hasActiveRoute) {
        state.selectedPosition = state.initialPosition;
        setMapView([state.initialPosition.lat, state.initialPosition.lng], 17);
        currentMarker.setLatLng([state.initialPosition.lat, state.initialPosition.lng]);
      }
      persist();
      setStatus("접속 위치를 기준으로 지도를 열었습니다.");
    },
    () => {},
    {
      enableHighAccuracy: true,
      maximumAge: 30000,
      timeout: 8000,
    },
  );
}

function withTimeout(promise, timeoutMs, fallback) {
  return Promise.race([
    promise.catch(() => fallback),
    new Promise((resolve) => {
      window.setTimeout(() => resolve(fallback), timeoutMs);
    }),
  ]);
}

async function getExifGpsPosition(file) {
  if (!file.type.includes("jpeg") && !file.type.includes("jpg")) {
    return null;
  }

  try {
    const buffer = await file.arrayBuffer();
    const view = new DataView(buffer);
    if (view.getUint16(0) !== 0xffd8) {
      return null;
    }

    let offset = 2;
    while (offset < view.byteLength) {
      const marker = view.getUint16(offset);
      offset += 2;
      const size = view.getUint16(offset);
      offset += 2;

      if (marker === 0xffe1) {
        return readExifGps(view, offset, size - 2);
      }

      offset += size - 2;
    }
  } catch {
    return null;
  }

  return null;
}

function readExifGps(view, start, length) {
  const exifHeader = "Exif\0\0";
  for (let i = 0; i < exifHeader.length; i += 1) {
    if (view.getUint8(start + i) !== exifHeader.charCodeAt(i)) {
      return null;
    }
  }

  const tiffStart = start + 6;
  const littleEndian = view.getUint16(tiffStart) === 0x4949;
  const firstIfdOffset = readUint32(view, tiffStart + 4, littleEndian);
  const gpsIfdOffset = findIfdValue(view, tiffStart, tiffStart + firstIfdOffset, 0x8825, littleEndian);
  if (!gpsIfdOffset) {
    return null;
  }

  const gpsIfd = tiffStart + gpsIfdOffset;
  const latRef = findAsciiValue(view, tiffStart, gpsIfd, 0x0001, littleEndian);
  const lat = findRationalArrayValue(view, tiffStart, gpsIfd, 0x0002, littleEndian);
  const lngRef = findAsciiValue(view, tiffStart, gpsIfd, 0x0003, littleEndian);
  const lng = findRationalArrayValue(view, tiffStart, gpsIfd, 0x0004, littleEndian);

  if (!latRef || !lat || !lngRef || !lng) {
    return null;
  }

  return {
    lat: convertDmsToDecimal(lat, latRef),
    lng: convertDmsToDecimal(lng, lngRef),
    timestamp: Date.now(),
  };
}

function findIfdValue(view, tiffStart, ifdStart, tagId, littleEndian) {
  const entries = readUint16(view, ifdStart, littleEndian);
  for (let index = 0; index < entries; index += 1) {
    const entry = ifdStart + 2 + index * 12;
    const tag = readUint16(view, entry, littleEndian);
    if (tag === tagId) {
      return readUint32(view, entry + 8, littleEndian);
    }
  }
  return null;
}

function findAsciiValue(view, tiffStart, ifdStart, tagId, littleEndian) {
  const entry = findIfdEntry(view, ifdStart, tagId, littleEndian);
  if (!entry) {
    return null;
  }
  const count = readUint32(view, entry + 4, littleEndian);
  const valueOffset = count <= 4 ? entry + 8 : tiffStart + readUint32(view, entry + 8, littleEndian);
  return String.fromCharCode(view.getUint8(valueOffset));
}

function findRationalArrayValue(view, tiffStart, ifdStart, tagId, littleEndian) {
  const entry = findIfdEntry(view, ifdStart, tagId, littleEndian);
  if (!entry) {
    return null;
  }
  const count = readUint32(view, entry + 4, littleEndian);
  const valueOffset = tiffStart + readUint32(view, entry + 8, littleEndian);
  const values = [];
  for (let index = 0; index < count; index += 1) {
    const item = valueOffset + index * 8;
    const numerator = readUint32(view, item, littleEndian);
    const denominator = readUint32(view, item + 4, littleEndian);
    values.push(denominator ? numerator / denominator : 0);
  }
  return values;
}

function findIfdEntry(view, ifdStart, tagId, littleEndian) {
  const entries = readUint16(view, ifdStart, littleEndian);
  for (let index = 0; index < entries; index += 1) {
    const entry = ifdStart + 2 + index * 12;
    const tag = readUint16(view, entry, littleEndian);
    if (tag === tagId) {
      return entry;
    }
  }
  return null;
}

function convertDmsToDecimal(values, ref) {
  const decimal = values[0] + values[1] / 60 + values[2] / 3600;
  return ref === "S" || ref === "W" ? -decimal : decimal;
}

function readUint16(view, offset, littleEndian) {
  return view.getUint16(offset, littleEndian);
}

function readUint32(view, offset, littleEndian) {
  return view.getUint32(offset, littleEndian);
}

function addSampleRoute() {
  const start = [37.5665, 126.978];
  const samples = [
    [37.5665, 126.978],
    [37.5672, 126.9793],
    [37.568, 126.9811],
    [37.5687, 126.9828],
    [37.5695, 126.9842],
    [37.5703, 126.9855],
  ];

  state.points = samples.map(([lat, lng], index) => ({
    lat,
    lng,
    accuracy: 8,
    timestamp: Date.now() + index * 60000,
  }));
  state.selectedPosition = state.points.at(-1);

  if (state.photos.length === 0) {
    state.photos = [
      createSamplePhoto("교차로 확인", start[0], start[1], "#1f7a57"),
      createSamplePhoto("작업 지점", 37.5687, 126.9828, "#c98c2b"),
    ];
  }

  persist();
  render();
  fitToData();
  setStatus("샘플 동선과 사진 위치를 불러왔습니다.");
}

function createSamplePhoto(name, lat, lng, color) {
  const svg = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="320" height="220" viewBox="0 0 320 220">
      <rect width="320" height="220" fill="${color}"/>
      <path d="M0 150 80 95 130 130 190 70 320 165v55H0z" fill="rgba(255,255,255,.72)"/>
      <circle cx="245" cy="58" r="26" fill="rgba(255,255,255,.84)"/>
      <text x="24" y="42" fill="white" font-family="Arial" font-size="24" font-weight="700">${name}</text>
    </svg>
  `);
  return {
    id: crypto.randomUUID(),
    name,
    src: `data:image/svg+xml;charset=UTF-8,${svg}`,
    lat,
    lng,
    timestamp: Date.now(),
  };
}

function exportData() {
  const payload = {
    exportedAt: new Date().toISOString(),
    points: state.points,
    photos: state.photos.map(({ id, name, displayName, originalName, lat, lng, locationSource, memo, tags, timestamp }) => ({
      id,
      name,
      displayName,
      originalName,
      lat,
      lng,
      locationSource,
      memo,
      tags,
      timestamp,
    })),
    milestones: state.milestones,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `route-photo-map-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function saveCurrentSession(reason = "manual") {
  if (state.points.length === 0 && state.photos.length === 0) {
    setStatus("저장할 위치점이나 사진이 없습니다.");
    return false;
    setStatus("저장할 동선이나 사진이 없습니다.");
    return;
  }

  const startedAt = state.activeStartedAt || state.points[0]?.timestamp || Date.now();
  const signature = getCurrentRecordSignature();
  if (state.continuingSessionId) {
    const index = state.sessions.findIndex((item) => item.id === state.continuingSessionId);
    if (index >= 0) {
      const current = state.sessions[index];
      if (current.signature === signature) {
        setStatus("이어가기 기록은 이미 저장되어 있습니다.");
        return current;
      }
      const updatedSession = {
        ...current,
        reason,
        startedAt: current.startedAt || startedAt,
        endedAt: Date.now(),
        distanceMeters: getTotalDistance(),
        points: structuredClone(state.points),
        photos: structuredClone(state.photos),
        signature,
        continuedAt: Date.now(),
      };
      state.sessions.splice(index, 1);
      state.sessions.unshift(updatedSession);
      if (!state.primarySessionId || state.primarySessionId === current.id) {
        state.primarySessionId = updatedSession.id;
      }
      state.continuingSessionId = updatedSession.id;
      state.activeStartedAt = null;
      persist();
      renderSessions();
      setStatus("이어가기 기록을 저장했습니다.");
      syncProjectState(reason);
      return updatedSession;
    }
    state.continuingSessionId = null;
  }
  if (state.sessions[0]?.signature === signature) {
    setStatus("이미 저장된 기록입니다.");
    return state.sessions[0];
  }
  const session = {
    id: crypto.randomUUID(),
    name: getDefaultSessionName(startedAt),
    memo: "",
    reason,
    startedAt,
    endedAt: Date.now(),
    distanceMeters: getTotalDistance(),
    points: structuredClone(state.points),
    photos: structuredClone(state.photos),
    signature,
  };

  try {
    state.sessions.unshift(session);
    state.sessions = state.sessions.slice(0, 20);
    if (!state.primarySessionId) {
      state.primarySessionId = session.id;
    }
    state.activeStartedAt = null;
    persist();
    renderSessions();
    setStatus("현재 기록을 저장했습니다.");
    syncProjectState(reason);
    return session;
    setStatus("현재 기록을 저장했습니다.");
  } catch {
    setStatus("기록 저장에 실패했습니다. 사진 용량을 줄인 뒤 다시 시도해 주세요.");
    return false;
    setStatus("기록 저장에 실패했습니다. 사진 하나의 용량을 줄인 뒤 다시 시도해 주세요.");
  }
}

function getCurrentRecordSignature() {
  const pointPart = state.points
    .map((point) => `${point.timestamp}:${point.lat.toFixed(6)}:${point.lng.toFixed(6)}`)
    .join("|");
  const photoPart = state.photos.map((photo) => `${photo.id}:${photo.timestamp}`).join("|");
  return `${pointPart}::${photoPart}`;
}

function loadSession(sessionId) {
  const session = state.sessions.find((item) => item.id === sessionId);
  if (!session) {
    return;
  }

  if (state.tracking) {
    stopTracking({ save: false });
  }
  stopRouteFollowWatcher();
  state.destinationFollow = false;
  state.followProgressIndex = 0;

  state.points = structuredClone(session.points || []);
  state.photos = structuredClone(session.photos || []);
  state.selectedPosition = state.points.at(-1) || null;
  state.activeStartedAt = session.startedAt || null;
  state.continuingSessionId = null;
  state.undoRouteEdit = null;
  persist();
  render();
  fitToData();
  setStatus("저장된 기록을 불러왔습니다.");
}

function resumeSession(sessionId) {
  const session = state.sessions.find((item) => item.id === sessionId);
  if (!session) {
    return;
  }

  if (state.tracking) {
    stopTracking({ save: false });
  }
  stopRouteFollowWatcher();
  state.destinationFollow = false;
  state.followProgressIndex = 0;

  const hasCurrentRecord = state.points.length > 0 || state.photos.length > 0;
  const isSameCurrentRecord = state.continuingSessionId === sessionId || getCurrentRecordSignature() === session.signature;
  if (hasCurrentRecord && !isSameCurrentRecord) {
    const ok = window.confirm(
      "현재 화면의 기록을 저장된 기록으로 바꾸고 이어서 기록할까요?\n\n저장하지 않은 현재 작업은 사라질 수 있습니다.",
    );
    if (!ok) {
      return;
    }
  }

  state.points = structuredClone(session.points || []);
  state.photos = structuredClone(session.photos || []);
  state.selectedPosition = state.points.at(-1) || null;
  state.activeStartedAt = session.startedAt || state.points[0]?.timestamp || Date.now();
  state.continuingSessionId = session.id;
  state.undoRouteEdit = null;
  state.recordPanelOpen = true;
  persist();
  render();
  fitToData();
  setStatus("저장된 기록을 이어가기 상태로 불러왔습니다. 기록 시작을 누르면 같은 기록에 계속 추가합니다.");
}

function setPrimarySession(sessionId) {
  const session = state.sessions.find((item) => item.id === sessionId);
  if (!session) {
    return;
  }
  stopRouteFollowWatcher();
  state.destinationFollow = false;
  state.followProgressIndex = 0;
  state.primarySessionId = session.id;
  state.points = structuredClone(session.points || []);
  state.photos = structuredClone(session.photos || []);
  state.selectedPosition = state.points.at(-1) || null;
  state.activeStartedAt = null;
  state.continuingSessionId = null;
  state.undoRouteEdit = null;
  persist();
  render();
  fitToData();
  syncProjectState("primary-session");
  setStatus("대표기록으로 지정했습니다. 프로젝트를 열면 이 기록을 기준으로 보여줍니다.");
}

function editSessionDetails(sessionId) {
  const session = state.sessions.find((item) => item.id === sessionId);
  if (!session) {
    return;
  }
  const defaultName = session.name || getDefaultSessionName(session.startedAt || Date.now());
  const name = window.prompt("기록명", defaultName);
  if (name === null) {
    return;
  }
  const memo = window.prompt("기록 메모", session.memo || "");
  if (memo === null) {
    return;
  }
  session.name = name.trim() || defaultName;
  session.memo = memo.trim();
  session.editedAt = Date.now();
  persist();
  renderSessions();
  syncProjectState("edit-session");
  setStatus("기록명과 메모를 수정했습니다.");
}

function deleteSession(sessionId) {
  const ok = window.confirm(
    "저장된 기록을 삭제할까요?\n\n삭제한 기록은 이 기기와 공유 프로젝트 기록에서 사라집니다.",
  );
  if (!ok) {
    return;
  }
  state.sessions = state.sessions.filter((item) => item.id !== sessionId);
  if (state.continuingSessionId === sessionId) {
    state.continuingSessionId = null;
  }
  if (state.primarySessionId === sessionId) {
    state.primarySessionId = state.sessions[0]?.id || null;
  }
  persist();
  renderSessions();
  syncProjectState("delete");
  setStatus("저장된 기록을 삭제했습니다.");
}

async function createServerProject() {
  const hasCurrentData =
    state.points.length > 0 ||
    state.photos.length > 0 ||
    state.milestones.length > 0 ||
    state.sessions.length > 0;
  if (hasCurrentData) {
    const ok = window.confirm(
      "새 프로젝트를 시작할까요?\n\n현재 화면의 거리, 위치점, 사진, 공사구역, 저장된 기록이 새 프로젝트 기준으로 초기화됩니다.",
    );
    if (!ok) {
      return;
    }
  }
  if (state.tracking) {
    stopTracking({ save: false, clearCurrent: false });
  }
  const name = els.projectName.value.trim() || "프로젝트A";
  resetForNewProject();
  setProjectStatus("프로젝트를 만들고 있습니다.");
  try {
    const project = await requestJson("/api/projects", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    applyProject(project);
    updateProjectUrl(project.code);
    await syncProjectState("create");
    if (state.user) {
      await loadMyProjects();
      await loadProjectShares();
    }
    setProjectStatus(`공유 코드 ${project.code} 프로젝트를 만들었습니다.`);
  } catch {
    setProjectStatus("프로젝트를 만들지 못했습니다. 서버 연결을 확인해 주세요.");
  }
}

async function renameCurrentProject() {
  if (!state.projectCode) {
    setProjectStatus("이름을 변경할 프로젝트를 먼저 만들거나 불러와 주세요.");
    return;
  }
  const nextName = els.projectName.value.trim();
  if (!nextName) {
    setProjectStatus("변경할 프로젝트명을 입력해 주세요.");
    els.projectName.focus();
    return;
  }
  if (nextName === state.projectName) {
    setProjectStatus("현재 프로젝트명과 같습니다.");
    return;
  }
  const previousName = state.projectName;
  state.projectName = nextName;
  persist();
  renderProjectState();
  const saved = await syncProjectState("rename-project");
  if (saved) {
    setProjectStatus(`프로젝트명을 '${nextName}'(으)로 변경했습니다.`);
    return;
  }
  state.projectName = previousName;
  persist();
  renderProjectState();
  setProjectStatus("프로젝트명을 변경하지 못했습니다. 서버 연결을 확인해 주세요.");
}

function resetForNewProject() {
  state.points = [];
  state.photos = [];
  state.milestones = [];
  state.sessions = [];
  state.primarySessionId = null;
  state.continuingSessionId = null;
  state.selectedPosition = state.initialPosition || null;
  state.activeStartedAt = null;
  state.destinationFollow = false;
  state.followProgressIndex = 0;
  state.routeOffTrack = false;
  state.routeDeviationSamples = 0;
  state.routeRecoverySamples = 0;
  state.undoRouteEdit = null;
  state.selectedPointIndex = null;
  state.lastRoutePointIndex = null;
  state.segmentStartIndex = null;
  state.segmentEndIndex = null;
  state.pointAddMode = false;
  state.recordPanelOpen = true;
  stopRouteFollowWatcher();
  if (state.initialPosition) {
    currentMarker.setLatLng([state.initialPosition.lat, state.initialPosition.lng]);
  }
  persist();
  render();
  setStatus("새 프로젝트가 시작됩니다. 현재 화면의 기록 정보를 초기화했습니다.", "warning");
}

async function openServerProject(code) {
  const normalizedCode = normalizeProjectCode(code);
  if (!normalizedCode) {
    setProjectStatus("공유 코드를 입력해 주세요.");
    return;
  }

  setProjectStatus("프로젝트 기록을 불러오는 중입니다.");
  try {
    const project = await requestJson(`/api/projects/${encodeURIComponent(normalizedCode)}`);
    applyProject(project);
    updateProjectUrl(project.code);
    persist();
    render();
    loadProjectShares();
    fitToData();
    setProjectStatus(`${project.code} 기록을 불러왔습니다.`);
  } catch {
    setProjectStatus("프로젝트를 찾지 못했습니다. 공유 코드를 확인해 주세요.");
  }
}

async function syncProjectState(reason = "manual") {
  if (!state.projectCode) {
    setProjectStatus("서버 저장은 공유 프로젝트를 만든 뒤 사용할 수 있습니다.");
    return false;
  }

  state.syncDirty = true;
  state.syncing = true;
  state.lastSyncError = "";
  persist();
  setProjectStatus("서버 동기화 중입니다. 연결이 불안정해도 현재 작업은 로컬에 보관됩니다.");

  try {
    await preparePhotosForProjectSync();
    const project = await requestJson(`/api/projects/${encodeURIComponent(state.projectCode)}`, {
      method: "PUT",
      body: JSON.stringify({
        name: state.projectName || "프로젝트A",
        reason,
        points: state.points,
        photos: state.photos,
        milestones: state.milestones,
        sessions: state.sessions,
        primarySessionId: state.primarySessionId,
      }),
    });
    applyProjectMeta(project);
    state.syncDirty = false;
    state.syncing = false;
    state.lastSyncedAt = Date.now();
    state.lastSyncFailedAt = null;
    state.lastSyncError = "";
    persist();
    if (state.user && reason !== "auto-retry") {
      loadMyProjects();
    }
    setProjectStatus(`${formatDate(Date.now())} 서버에 저장했습니다. 다른 기기에서는 불러오기를 눌러 확인하세요.`);
    return true;
  } catch (error) {
    state.syncDirty = true;
    state.syncing = false;
    state.lastSyncFailedAt = Date.now();
    state.lastSyncError = error?.message || "network";
    persist();
    if (error?.message === "request_body_too_large") {
      setProjectStatus("서버 저장 용량을 초과했습니다. 사진 수를 줄이거나 서버 용량 설정을 확인해 주세요.");
      return false;
    }
    if (error?.message === "server_not_ready") {
      setProjectStatus("운영 서버의 TiDB 또는 R2 설정이 완료되지 않아 저장을 중단했습니다.");
      return false;
    }
    if (error?.message === "photo_upload_failed") {
      setProjectStatus("사진 업로드에 실패했습니다. 네트워크 연결과 R2 설정을 확인해 주세요.");
      return false;
    }
    setProjectStatus("서버 저장에 실패했습니다. 연결 상태를 확인해 주세요.");
    return false;
  }
}

async function preparePhotosForProjectSync() {
  if (!state.serverHealth) {
    await refreshServerHealth();
  }
  if (state.serverHealth?.environment === "production" && !state.serverHealth?.ready) {
    throw new Error("server_not_ready");
  }
  if (state.serverHealth?.files !== "cloudflare-r2") {
    return;
  }

  const photoLists = [state.photos, ...state.sessions.map((session) => session.photos || [])];
  const pending = new Map();
  photoLists.flat().forEach((photo) => {
    if (photo?.src?.startsWith("data:image/")) {
      pending.set(photo.id || photo.src, photo);
    }
  });
  if (pending.size === 0) {
    return;
  }

  let completed = 0;
  for (const [key, photo] of pending) {
    setProjectStatus(`사진을 먼저 업로드하고 있습니다. (${completed + 1}/${pending.size})`);
    let result;
    try {
      result = await uploadProjectPhoto(photo);
    } catch (error) {
      console.warn("Photo upload failed", error);
      throw new Error("photo_upload_failed");
    }
    photoLists.forEach((photos) => {
      photos.forEach((item) => {
        if ((item.id || item.src) === key || item.src === photo.src) {
          item.src = result.src;
          item.uploaded = true;
        }
      });
    });
    completed += 1;
  }
  persist();
}

async function uploadProjectPhoto(photo) {
  const blob = await dataUrlToBlob(photo.src);
  const response = await fetch(
    `/api/projects/${encodeURIComponent(state.projectCode)}/photos`,
    {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": blob.type || "image/jpeg",
        "X-Photo-Id": encodeURIComponent(photo.id || crypto.randomUUID()),
        "X-Photo-Name": encodeURIComponent(getPhotoDisplayName(photo)),
      },
      body: blob,
    },
  );
  if (!response.ok) {
    throw new Error(`Photo upload failed: ${response.status}`);
  }
  return response.json();
}

async function dataUrlToBlob(dataUrl) {
  const response = await fetch(dataUrl);
  if (!response.ok) {
    throw new Error("Invalid photo data");
  }
  return response.blob();
}

function retryPendingProjectSync() {
  if (!state.projectCode || !state.syncDirty || state.syncing) {
    return;
  }
  setProjectStatus("온라인 상태로 돌아왔습니다. 서버 동기화를 다시 시도합니다.");
  syncProjectState("auto-retry");
}

function applyProject(project) {
  stopRouteFollowWatcher();
  applyProjectMeta(project);
  state.sessions = Array.isArray(project.sessions) ? project.sessions : [];
  state.primarySessionId = project.primarySessionId || state.sessions[0]?.id || null;
  const lastState = project.lastState || {};
  state.milestones = normalizeMilestones(
    Array.isArray(lastState.milestones) ? structuredClone(lastState.milestones) : [],
  );
  const primarySession = state.sessions.find((session) => session.id === state.primarySessionId);
  if (primarySession) {
    state.points = Array.isArray(primarySession.points) ? structuredClone(primarySession.points) : [];
    state.photos = Array.isArray(primarySession.photos) ? structuredClone(primarySession.photos) : [];
    state.selectedPosition = state.points.at(-1) || null;
  } else if (project.lastState) {
    state.points = Array.isArray(lastState.points) ? structuredClone(lastState.points) : [];
    state.photos = Array.isArray(lastState.photos) ? structuredClone(lastState.photos) : [];
    state.selectedPosition = state.points.at(-1) || null;
  }
  state.undoRouteEdit = null;
  state.continuingSessionId = null;
  state.destinationFollow = false;
  state.followProgressIndex = 0;
  state.routeOffTrack = false;
  state.routeDeviationSamples = 0;
  state.routeRecoverySamples = 0;
}

function applyProjectMeta(project) {
  state.projectCode = project.code || "";
  state.projectName = project.name || "프로젝트A";
  state.shareLinks = [];
  if (!state.shareView) {
    persist();
  }
  renderProjectState();
  renderSharePanel();
}

function renderProjectState() {
  if (!els.projectCode) {
    return;
  }
  els.projectName.value = state.projectName || "";
  els.projectCode.value = state.projectCode || "";
  if (els.recordTitle) {
    els.recordTitle.textContent = state.shareView ? "노선 보기" : "기록";
  }
  if (els.renameProjectBtn) {
    els.renameProjectBtn.disabled = !state.projectCode || Boolean(state.shareView);
  }
  els.projectBadge.textContent = state.projectCode || getStorageBadgeLabel();
  if (state.shareView) {
    els.projectBadge.textContent = "공유 보기";
  }
  const serverReady = state.serverHealth?.environment !== "production" || state.serverHealth?.ready !== false;
  els.projectBadge.classList.toggle(
    "is-live",
    serverReady && Boolean(state.projectCode || state.serverHealth?.storage === "tidb"),
  );
}

function getStorageBadgeLabel() {
  if (state.serverHealth?.environment === "production" && !state.serverHealth?.ready) {
    return "설정 필요";
  }
  if (state.serverHealth?.storage === "tidb" && state.serverHealth?.files === "cloudflare-r2") {
    return "서버";
  }
  if (state.serverHealth?.storage === "tidb") {
    return "서버";
  }
  return "로컬";
}

async function refreshServerHealth() {
  try {
    state.serverHealth = await requestJson("/api/health");
    renderProjectState();
    if (state.serverHealth.environment === "production" && !state.serverHealth.ready) {
      setProjectStatus("운영 서버 저장소 설정이 미완료되었습니다. 관리자에게 TiDB/R2 설정을 요청하세요.");
    }
  } catch {
    state.serverHealth = null;
    renderProjectState();
  }
}

function setProjectStatus(message) {
  els.projectStatus.textContent = message;
}

function updateProjectUrl(code) {
  const url = new URL(window.location.href);
  if (code) {
    url.searchParams.set("project", code);
  } else {
    url.searchParams.delete("project");
  }
  window.history.replaceState({}, "", url);
}

function normalizeProjectCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "");
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    let errorPayload = null;
    try {
      errorPayload = await response.json();
    } catch {
      errorPayload = null;
    }
    const error = new Error(errorPayload?.message || `Request failed: ${response.status}`);
    error.status = response.status;
    error.payload = errorPayload;
    throw error;
  }
  return response.json();
}

function setupAuthPanel() {
  const projectSection = document.querySelector(".project-section");
  if (!projectSection || document.querySelector("#authSection")) {
    return;
  }

  const section = document.createElement("section");
  section.id = "authSection";
  section.className = "panel-section auth-section";
  section.innerHTML = `
    <div class="section-title">
      <h2>로그인</h2>
      <div class="section-title-actions">
        <span id="authBadge" class="badge">비로그인</span>
        <button id="authToggleBtn" class="section-toggle" type="button">숨기기</button>
      </div>
    </div>
    <div id="authBody" class="collapsible-body auth-body">
      <div class="auth-controls">
        <input id="authEmail" type="text" placeholder="아이디" autocomplete="username" />
        <div id="authPasswordWrap" class="password-field">
          <input id="authPassword" type="password" placeholder="비밀번호" autocomplete="current-password" />
          <button id="authPasswordToggle" type="button" aria-label="비밀번호 보기">보기</button>
        </div>
        <button id="authLoginBtn" type="button">로그인 / 자동가입</button>
        <button id="authLogoutBtn" type="button" hidden>로그아웃</button>
      </div>
      <p id="authStatus" class="status-text">로그인하면 내 프로젝트 목록을 불러올 수 있습니다.</p>
      <div id="myProjectList" class="my-project-list"></div>
    </div>
  `;
  projectSection.before(section);
  authEls = {
    section,
    body: section.querySelector("#authBody"),
    badge: section.querySelector("#authBadge"),
    toggleBtn: section.querySelector("#authToggleBtn"),
    email: section.querySelector("#authEmail"),
    passwordWrap: section.querySelector("#authPasswordWrap"),
    password: section.querySelector("#authPassword"),
    passwordToggle: section.querySelector("#authPasswordToggle"),
    loginBtn: section.querySelector("#authLoginBtn"),
    logoutBtn: section.querySelector("#authLogoutBtn"),
    status: section.querySelector("#authStatus"),
    list: section.querySelector("#myProjectList"),
  };
  authEls.loginBtn.addEventListener("click", loginWithPassword);
  authEls.logoutBtn.addEventListener("click", logout);
  authEls.passwordToggle.addEventListener("click", togglePasswordVisibility);
  authEls.toggleBtn.addEventListener("click", toggleAuthPanel);
}

function setupAdminPanel() {
  const settingsSection = document.querySelector(".settings-section");
  if (!settingsSection || document.querySelector("#adminPanel")) {
    return;
  }
  const panel = document.createElement("div");
  panel.id = "adminPanel";
  panel.className = "admin-panel is-collapsed";
  panel.hidden = true;
  panel.innerHTML = `
    <div class="section-title">
      <h3>사용자 관리</h3>
      <button id="adminToggleBtn" class="section-toggle" type="button">펼치기</button>
    </div>
    <div id="adminBody" class="collapsible-body">
      <div class="admin-toolbar">
        <p id="adminStatus" class="status-text">사용자 목록을 확인할 수 있습니다.</p>
        <button id="adminRefreshBtn" type="button">새로고침</button>
      </div>
      <div id="adminUserList" class="admin-user-list"></div>
    </div>
  `;
  const dataManagement = settingsSection.querySelector(".data-management");
  settingsSection.insertBefore(panel, dataManagement || settingsSection.children[1] || null);
  authEls.adminPanel = panel;
  authEls.adminToggleBtn = panel.querySelector("#adminToggleBtn");
  authEls.adminStatus = panel.querySelector("#adminStatus");
  authEls.adminRefreshBtn = panel.querySelector("#adminRefreshBtn");
  authEls.adminUserList = panel.querySelector("#adminUserList");
  authEls.adminToggleBtn.addEventListener("click", toggleAdminPanel);
  authEls.adminRefreshBtn.addEventListener("click", loadAdminUsers);
}

async function refreshAuth() {
  if (!authEls.section) {
    return;
  }
  try {
    const result = await requestJson("/api/auth/me");
    state.user = result.user || null;
    renderAuthPanel();
    if (state.user) {
      await loadMyProjects();
      await loadAdminUsers();
      await loadProjectShares();
    }
  } catch {
    state.user = null;
    renderAuthPanel();
  }
}

function renderAuthPanel() {
  if (!authEls.section) {
    return;
  }
  const user = state.user;
  authEls.section.classList.toggle("is-collapsed", !state.authPanelOpen);
  authEls.toggleBtn.textContent = state.authPanelOpen ? "숨기기" : "펼치기";
  authEls.badge.textContent = user ? "로그인" : "비로그인";
  authEls.badge.classList.toggle("is-live", Boolean(user));
  authEls.email.hidden = Boolean(user);
  authEls.passwordWrap.hidden = Boolean(user);
  authEls.loginBtn.hidden = Boolean(user);
  authEls.logoutBtn.hidden = !user;
  authEls.status.textContent = user
    ? `${user.email} 계정으로 로그인했습니다.${user.role === "admin" ? " 관리자 권한입니다." : ""}`
    : "아이디와 비밀번호로 로그인하면 내 프로젝트 목록을 불러올 수 있습니다.";
  if (authEls.adminPanel) {
    authEls.adminPanel.hidden = user?.role !== "admin";
    authEls.adminPanel.classList.toggle("is-collapsed", !state.adminPanelOpen);
  }
  if (authEls.adminToggleBtn) {
    authEls.adminToggleBtn.textContent = state.adminPanelOpen ? "숨기기" : "펼치기";
  }
  if (user?.role !== "admin") {
    state.adminUsers = [];
  }
  renderAdminUserList();
  renderMyProjectList();
}

function toggleAuthPanel() {
  state.authPanelOpen = !state.authPanelOpen;
  persist();
  renderAuthPanel();
}

function toggleAdminPanel() {
  state.adminPanelOpen = !state.adminPanelOpen;
  persist();
  renderAuthPanel();
  if (state.adminPanelOpen) {
    loadAdminUsers();
  }
}

function togglePasswordVisibility() {
  const visible = authEls.password.type === "text";
  authEls.password.type = visible ? "password" : "text";
  authEls.passwordToggle.textContent = visible ? "보기" : "숨김";
  authEls.passwordToggle.setAttribute("aria-label", visible ? "비밀번호 보기" : "비밀번호 숨기기");
}

async function loginWithPassword() {
  const email = authEls.email.value.trim();
  const password = authEls.password.value;
  if (!email || password.length < 4) {
    authEls.status.textContent = "아이디와 4자 이상 비밀번호를 입력해 주세요.";
    return;
  }
  authEls.status.textContent = "로그인 중입니다.";
  try {
    const result = await requestJson("/api/auth/session", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    state.user = result.user;
    authEls.password.value = "";
    renderAuthPanel();
    await loadMyProjects();
    await loadAdminUsers();
    await loadProjectShares();
    setStatus("로그인했습니다. 내 프로젝트 목록을 불러왔습니다.", "success");
  } catch (error) {
    const authError = error?.payload?.error;
    const message = authError === "account_disabled"
      ? "비활성화된 계정입니다."
      : authError === "password_too_short"
        ? `새 계정의 비밀번호는 ${error.payload.minPasswordLength || 8}자 이상이어야 합니다.`
        : "로그인에 실패했습니다. 아이디 또는 비밀번호를 확인해 주세요.";
    authEls.status.textContent = message;
  }
}

async function logout() {
  try {
    await requestJson("/api/auth/session", { method: "DELETE" });
  } catch {}
  state.user = null;
  state.myProjects = [];
  state.adminUsers = [];
  renderAuthPanel();
  setStatus("로그아웃했습니다.", "info");
}

async function loadAdminUsers() {
  if (!state.user || state.user.role !== "admin" || !authEls.adminPanel) {
    return;
  }
  authEls.adminStatus.textContent = "사용자 목록을 불러오는 중입니다.";
  try {
    const result = await requestJson("/api/admin/users");
    state.adminUsers = Array.isArray(result.users) ? result.users : [];
    authEls.adminStatus.textContent = `사용자 ${state.adminUsers.length}명을 확인했습니다.`;
  } catch {
    state.adminUsers = [];
    authEls.adminStatus.textContent = "사용자 목록을 불러오지 못했습니다.";
  }
  renderAdminUserList();
}

function renderAdminUserList() {
  if (!authEls.adminUserList) {
    return;
  }
  authEls.adminUserList.innerHTML = "";
  if (!state.user || state.user.role !== "admin") {
    return;
  }
  if (state.adminUsers.length === 0) {
    const empty = document.createElement("p");
    empty.className = "status-text";
    empty.textContent = "아직 표시할 사용자가 없습니다.";
    authEls.adminUserList.append(empty);
    return;
  }

  state.adminUsers.forEach((user) => {
    const item = document.createElement("article");
    item.className = "admin-user-item";
    item.classList.toggle("is-disabled", user.status !== "active");

    const body = document.createElement("div");
    const title = document.createElement("strong");
    const meta = document.createElement("span");
    title.textContent = user.email;
    meta.textContent = `${user.role === "admin" ? "관리자" : "사용자"} · ${user.status === "active" ? "활성" : "비활성"} · 프로젝트 ${user.projectCount || 0}개`;
    body.append(title, meta);

    const actions = document.createElement("div");
    actions.className = "admin-user-actions";

    const statusButton = document.createElement("button");
    statusButton.type = "button";
    statusButton.textContent = user.status === "active" ? "비활성" : "활성";
    statusButton.disabled = user.id === state.user.id && user.status === "active";
    statusButton.addEventListener("click", () => toggleAdminUserStatus(user));

    const resetButton = document.createElement("button");
    resetButton.type = "button";
    resetButton.textContent = "PW 초기화";
    resetButton.addEventListener("click", () => resetAdminUserPassword(user));

    actions.append(statusButton, resetButton);
    item.append(body, actions);
    authEls.adminUserList.append(item);
  });
}

async function toggleAdminUserStatus(user) {
  const nextStatus = user.status === "active" ? "disabled" : "active";
  const ok = window.confirm(
    `${user.email} 계정을 ${nextStatus === "active" ? "활성화" : "비활성화"}할까요?`,
  );
  if (!ok) {
    return;
  }
  try {
    const result = await requestJson(`/api/admin/users/${encodeURIComponent(user.id)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: nextStatus }),
    });
    state.adminUsers = state.adminUsers.map((item) => (item.id === result.user.id ? result.user : item));
    renderAdminUserList();
    authEls.adminStatus.textContent = "사용자 상태를 변경했습니다.";
  } catch {
    authEls.adminStatus.textContent = "사용자 상태를 변경하지 못했습니다.";
  }
}

async function resetAdminUserPassword(user) {
  const password = window.prompt(
    `${user.email} 계정의 새 비밀번호를 입력하세요.\n비워두면 임시 비밀번호를 자동 생성합니다.`,
    "",
  );
  if (password === null) {
    return;
  }
  try {
    const result = await requestJson(`/api/admin/users/${encodeURIComponent(user.id)}/password`, {
      method: "POST",
      body: JSON.stringify({ password }),
    });
    state.adminUsers = state.adminUsers.map((item) => (item.id === result.user.id ? result.user : item));
    renderAdminUserList();
    window.prompt("새 비밀번호입니다. 사용자에게 전달해 주세요.", result.temporaryPassword);
    authEls.adminStatus.textContent = "비밀번호를 초기화했습니다.";
  } catch {
    authEls.adminStatus.textContent = "비밀번호를 초기화하지 못했습니다. 4자 이상으로 입력해 주세요.";
  }
}

async function loadMyProjects() {
  if (!state.user) {
    state.myProjects = [];
    renderMyProjectList();
    return;
  }
  try {
    const result = await requestJson("/api/my/projects");
    state.myProjects = Array.isArray(result.projects) ? result.projects : [];
    renderMyProjectList();
  } catch {
    state.myProjects = [];
    renderMyProjectList();
    authEls.status.textContent = "내 프로젝트 목록을 불러오지 못했습니다.";
  }
}

function renderMyProjectList() {
  if (!authEls.list) {
    return;
  }
  authEls.list.innerHTML = "";
  if (!state.user) {
    return;
  }
  if (state.myProjects.length === 0) {
    const empty = document.createElement("p");
    empty.className = "status-text";
    empty.textContent = "아직 내 프로젝트가 없습니다.";
    authEls.list.append(empty);
    return;
  }
  state.myProjects.forEach((project) => {
    const item = document.createElement("article");
    item.className = "my-project-item";
    const body = document.createElement("div");
    const title = document.createElement("strong");
    const meta = document.createElement("span");
    title.textContent = project.name || "프로젝트";
    meta.textContent = `${project.code} · ${formatDate(getProjectRecordDisplayTime(project))}`;
    body.append(title, meta);
    const actions = document.createElement("div");
    actions.className = "my-project-actions";
    const openButton = document.createElement("button");
    openButton.type = "button";
    openButton.textContent = "열기";
    openButton.addEventListener("click", () => openServerProject(project.code));
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "삭제";
    deleteButton.addEventListener("click", () => deleteMyProject(project));
    actions.append(openButton, deleteButton);
    item.append(body, actions);
    authEls.list.append(item);
  });
}

async function deleteMyProject(project) {
  const ok = window.confirm(
    `${project.name || "프로젝트"} (${project.code}) 프로젝트를 삭제할까요?\n\n저장된 기록과 공유 링크가 삭제됩니다. 이 작업은 되돌릴 수 없습니다.`,
  );
  if (!ok) {
    return;
  }
  try {
    await requestJson(`/api/projects/${encodeURIComponent(project.code)}`, { method: "DELETE" });
    state.myProjects = state.myProjects.filter((item) => item.code !== project.code);
    if (state.projectCode === project.code) {
      state.projectCode = "";
      state.points = [];
      state.photos = [];
      state.milestones = [];
      state.sessions = [];
      state.primarySessionId = null;
      state.shareLinks = [];
      persist();
      render();
    }
    renderMyProjectList();
    setStatus("프로젝트를 삭제했습니다.", "info");
  } catch {
    setStatus("프로젝트를 삭제하지 못했습니다. 로그인과 권한을 확인해 주세요.", "warning");
  }
}

function getProjectRecordDisplayTime(project) {
  const sessions = Array.isArray(project.sessions) ? project.sessions : [];
  const primary = sessions.find((session) => session.id === project.primarySessionId) || sessions[0];
  return primary?.startedAt || primary?.savedAt || primary?.endedAt || project.createdAt || project.updatedAt || Date.now();
}

function setupSharePanel() {
  const historySection = document.querySelector(".history-section");
  const timelineSection = document.querySelector(".timeline-section");
  const projectSection = document.querySelector(".project-section");
  const anchor = historySection || timelineSection || projectSection;
  if (!anchor || document.querySelector("#shareSection")) {
    return;
  }

  const section = document.createElement("section");
  section.id = "shareSection";
  section.className = "panel-section share-section";
  section.innerHTML = `
    <div class="section-title">
      <h2>공유 링크</h2>
      <div class="section-title-actions">
        <span id="shareBadge" class="badge">보기 전용</span>
        <button id="shareToggleBtn" class="section-toggle" type="button">펼치기</button>
      </div>
    </div>
    <div id="shareBody" class="collapsible-body">
      <div class="share-controls">
        <select id="shareExpiry" aria-label="공유 만료 기간">
          <option value="1d">1일</option>
          <option value="5d" selected>5일</option>
          <option value="custom">기간 지정</option>
        </select>
        <input id="shareCustomDate" type="date" aria-label="공유 종료 날짜" hidden />
        <button id="shareCreateBtn" type="button">공유 링크 만들기</button>
      </div>
      <p id="shareStatus" class="status-text">로그인 후 프로젝트를 저장하면 공유 링크를 만들 수 있습니다.</p>
      <div id="shareList" class="share-list"></div>
    </div>
  `;
  anchor.after(section);
  shareEls = {
    section,
    badge: section.querySelector("#shareBadge"),
    toggleBtn: section.querySelector("#shareToggleBtn"),
    expiry: section.querySelector("#shareExpiry"),
    customDate: section.querySelector("#shareCustomDate"),
    createBtn: section.querySelector("#shareCreateBtn"),
    status: section.querySelector("#shareStatus"),
    list: section.querySelector("#shareList"),
  };
  shareEls.createBtn.addEventListener("click", createShareLink);
  shareEls.toggleBtn.addEventListener("click", toggleSharePanel);
  shareEls.expiry.addEventListener("change", renderShareExpiryControls);
  shareEls.customDate.addEventListener("input", renderShareExpiryControls);
  shareEls.customDate.min = new Date().toISOString().slice(0, 10);
}

async function loadProjectShares() {
  if (!state.projectCode || !state.user || state.shareView) {
    state.shareLinks = [];
    renderSharePanel();
    return;
  }
  try {
    const result = await requestJson(`/api/projects/${encodeURIComponent(state.projectCode)}/share`);
    state.shareLinks = Array.isArray(result.shares) ? result.shares : [];
  } catch {
    state.shareLinks = [];
  }
  renderSharePanel();
}

async function createShareLink() {
  if (!state.user) {
    shareEls.status.textContent = "로그인 후 공유 링크를 만들 수 있습니다.";
    return;
  }
  if (!state.projectCode) {
    shareEls.status.textContent = "먼저 새 프로젝트를 만들거나 프로젝트를 불러와 주세요.";
    return;
  }
  await syncProjectState("share");
  const expiresIn = getSelectedShareExpiry();
  if (!expiresIn) {
    return;
  }
  try {
    const share = await requestJson(`/api/projects/${encodeURIComponent(state.projectCode)}/share`, {
      method: "POST",
      body: JSON.stringify({ expiresIn }),
    });
    state.shareLinks = [share, ...state.shareLinks.filter((item) => item.token !== share.token)];
    renderSharePanel();
    await copyShareUrl(share.token);
    shareEls.status.textContent = "공유 링크를 만들고 복사했습니다.";
  } catch {
    shareEls.status.textContent = "공유 링크를 만들지 못했습니다. 로그인과 서버 상태를 확인해 주세요.";
  }
}

async function endShareLink(token) {
  if (!state.projectCode || !token) {
    return;
  }
  const ok = window.confirm(
    "공유를 종료할까요?\n\n링크가 목록에서 삭제되며, 받은 사람도 더 이상 이 링크로 볼 수 없습니다.",
  );
  if (!ok) {
    return;
  }
  try {
    await requestJson(
      `/api/projects/${encodeURIComponent(state.projectCode)}/share/${encodeURIComponent(token)}/delete`,
      { method: "DELETE" },
    );
    state.shareLinks = state.shareLinks.filter((share) => share.token !== token);
    renderSharePanel();
    shareEls.status.textContent = "공유를 종료하고 링크를 삭제했습니다.";
  } catch {
    shareEls.status.textContent = "공유를 종료하지 못했습니다.";
  }
}

async function updateShareExpiry(token) {
  if (!state.projectCode || !token) {
    return;
  }
  const expiresIn = getSelectedShareExpiry();
  if (!expiresIn) {
    return;
  }
  try {
    const share = await requestJson(`/api/projects/${encodeURIComponent(state.projectCode)}/share/${encodeURIComponent(token)}`, {
      method: "PATCH",
      body: JSON.stringify({ expiresIn }),
    });
    state.shareLinks = state.shareLinks.map((item) => (item.token === token ? share : item));
    renderSharePanel();
    shareEls.status.textContent = "공유 만료 기간을 변경했습니다.";
  } catch {
    shareEls.status.textContent = "공유 만료 기간을 변경하지 못했습니다.";
  }
}

async function copyShareUrl(token) {
  const url = `${window.location.origin}/view/${token}`;
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    window.prompt("공유 링크를 복사해 주세요.", url);
  }
}

function renderSharePanel() {
  if (!shareEls.section) {
    return;
  }
  const isShareView = Boolean(state.shareView);
  shareEls.section.hidden = isShareView;
  if (isShareView) {
    return;
  }
  const canShare = Boolean(state.user && state.projectCode);
  shareEls.section.classList.toggle("is-collapsed", !state.sharePanelOpen);
  shareEls.toggleBtn.textContent = state.sharePanelOpen ? "숨기기" : "펼치기";
  shareEls.createBtn.disabled = !canShare;
  shareEls.expiry.disabled = !canShare;
  shareEls.customDate.disabled = !canShare;
  renderShareExpiryControls();
  shareEls.badge.textContent = state.shareLinks.some(isClientShareActive) ? "공유 중" : "보기 전용";
  shareEls.badge.classList.toggle("is-live", state.shareLinks.some(isClientShareActive));
  if (!state.user) {
    shareEls.status.textContent = "로그인 후 프로젝트를 저장하면 공유 링크를 만들 수 있습니다.";
  } else if (!state.projectCode) {
    shareEls.status.textContent = "프로젝트를 만들거나 불러오면 공유 링크를 만들 수 있습니다.";
  } else if (state.shareLinks.length === 0) {
    shareEls.status.textContent = "공유 기간을 선택한 뒤 보기 전용 링크를 만들 수 있습니다.";
  }

  shareEls.list.innerHTML = "";
  state.shareLinks.forEach((share) => {
    const item = document.createElement("article");
    item.className = "share-item";
    const body = document.createElement("div");
    const title = document.createElement("strong");
    const meta = document.createElement("span");
    title.textContent = isClientShareActive(share) ? "공유 링크" : "종료/만료된 링크";
    meta.textContent = getShareMetaText(share);
    body.append(title, meta);

    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.textContent = "복사";
    copyButton.disabled = !isClientShareActive(share);
    copyButton.addEventListener("click", () => copyShareUrl(share.token));

    const updateButton = document.createElement("button");
    updateButton.type = "button";
    updateButton.textContent = "변경";
    updateButton.disabled = !share.active;
    updateButton.addEventListener("click", () => updateShareExpiry(share.token));

    const endButton = document.createElement("button");
    endButton.type = "button";
    endButton.textContent = "공유 종료";
    endButton.addEventListener("click", () => endShareLink(share.token));

    item.append(body, copyButton, updateButton, endButton);
    shareEls.list.append(item);
  });
}

function renderShareExpiryControls() {
  if (!shareEls.customDate || !shareEls.expiry || !shareEls.createBtn) {
    return;
  }
  const usesCustomDate = shareEls.expiry.value === "custom";
  const canShare = Boolean(state.user && state.projectCode);
  shareEls.customDate.hidden = !usesCustomDate;
  shareEls.createBtn.disabled = !canShare || (usesCustomDate && !shareEls.customDate.value);
}

function getSelectedShareExpiry() {
  if (shareEls.expiry.value !== "custom") {
    return shareEls.expiry.value;
  }
  if (!shareEls.customDate.value) {
    shareEls.status.textContent = "공유 종료 날짜를 선택해 주세요.";
    shareEls.customDate.focus();
    return "";
  }
  const expiresAt = new Date(`${shareEls.customDate.value}T23:59:59`);
  if (!Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
    shareEls.status.textContent = "현재보다 이후의 공유 종료 날짜를 선택해 주세요.";
    return "";
  }
  return `custom:${expiresAt.toISOString()}`;
}

function toggleSharePanel() {
  state.sharePanelOpen = !state.sharePanelOpen;
  persist();
  renderSharePanel();
}

async function openShareView(token) {
  setProjectStatus("공유 링크를 여는 중입니다.");
  try {
    const result = await requestJson(`/api/share/${encodeURIComponent(token)}`);
    state.shareView = result.share;
    state.shareConstructionVisible = true;
    applyProject(result.project);
    document.body.classList.add("is-share-view");
    render();
    fitToData();
    document.body.classList.remove("is-share-loading");
    startShareViewVerification(token);
    setProjectStatus("보기 전용 공유 링크입니다. 수정과 저장은 제한됩니다.");
  } catch {
    endSharedView("공유 링크가 만료되었거나 작성자가 공유를 종료했습니다.");
  }
}

function startShareViewVerification(token) {
  if (shareViewTimerId !== null) {
    window.clearInterval(shareViewTimerId);
  }
  shareViewTimerId = window.setInterval(() => verifyShareView(token), 15000);
}

async function verifyShareView(token) {
  if (!token || !state.shareView || document.hidden) {
    return;
  }
  try {
    await requestJson(`/api/share/${encodeURIComponent(token)}`);
  } catch (error) {
    if (error?.status === 404) {
      endSharedView("작성자가 공유를 종료했습니다.");
    }
  }
}

function endSharedView(message) {
  if (shareViewTimerId !== null) {
    window.clearInterval(shareViewTimerId);
    shareViewTimerId = null;
  }
  stopRouteFollowWatcher();
  state.shareView = { active: false, revoked: true };
  state.points = [];
  state.photos = [];
  state.milestones = [];
  state.overlayProjects = [];
  state.sessions = [];
  state.primarySessionId = null;
  state.selectedPosition = null;
  state.projectCode = "";
  state.projectName = "";
  state.destinationFollow = false;
  state.shareConstructionVisible = true;
  state.followProgressIndex = 0;
  currentMarker.setLatLng([37.5665, 126.978]);
  document.body.classList.add("is-share-view", "is-share-ended");
  document.body.classList.remove("is-share-loading");
  render();
  setProjectStatus(message);
  setStatus(message, "warning");
}

function getShareTokenFromPath() {
  const match = window.location.pathname.match(/^\/view\/([A-Za-z0-9_-]+)\/?$/);
  return match ? match[1] : "";
}

function isClientShareActive(share) {
  if (!share || share.active === false) {
    return false;
  }
  return !share.expiresAt || new Date(share.expiresAt).getTime() > Date.now();
}

function getShareMetaText(share) {
  if (!share.active) {
    return "공유 중지됨";
  }
  if (!share.expiresAt) {
    return "만료 없음";
  }
  const expiresAt = new Date(share.expiresAt).getTime();
  if (expiresAt <= Date.now()) {
    return "만료됨";
  }
  return `${formatDate(share.expiresAt)}까지`;
}

async function handleWakeLockToggle(event) {
  state.wakeLockEnabled = event.target.checked;
  if (state.wakeLockEnabled) {
    await requestWakeLock();
  } else {
    await releaseWakeLock();
  }
  persist();
}

async function requestWakeLock() {
  if (!("wakeLock" in navigator)) {
    els.wakeLockToggle.checked = false;
    state.wakeLockEnabled = false;
    setStatus("이 브라우저는 화면 꺼짐 방지를 지원하지 않습니다.");
    return;
  }

  try {
    state.wakeLock = await navigator.wakeLock.request("screen");
    state.wakeLock.addEventListener("release", () => {
      state.wakeLock = null;
    });
    setStatus("화면 자동 꺼짐 방지를 켰습니다.");
  } catch {
    els.wakeLockToggle.checked = false;
    state.wakeLockEnabled = false;
    setStatus("화면 꺼짐 방지를 켤 수 없습니다. 브라우저 권한 또는 안전 설정을 확인해 주세요.");
  }
}

async function releaseWakeLock() {
  if (state.wakeLock) {
    await state.wakeLock.release();
    state.wakeLock = null;
  }
  setStatus("화면 자동 꺼짐 방지를 껐습니다.");
}

function handleMapProviderChange(event) {
  const provider = event.target.value;
  state.mapProvider = provider;
  persist();

  if (provider === "osm") {
    setStatus("OpenStreetMap 지도를 사용합니다.");
    return;
  }

  event.target.value = "osm";
  state.mapProvider = "osm";
  persist();
  const providerLabel = provider === "naver" ? "네이버지도" : "구글지도";
  setStatus(`${providerLabel}는 공식 API 키 설정 후 연결할 수 있습니다. 현재는 OpenStreetMap으로 유지합니다.`);
}

function clearData() {
  const ok = window.confirm(
    "현재 화면을 새 작업 상태로 초기화할까요?\n\n화면의 동선, 사진, 공사구역, 기록, 비교 프로젝트와 현재 프로젝트 연결이 해제됩니다. 서버에 저장된 기존 프로젝트는 삭제되지 않습니다.",
  );
  if (!ok) {
    return;
  }
  if (state.tracking) {
    if (state.watcherId !== null) {
      navigator.geolocation.clearWatch(state.watcherId);
    }
    if (state.pollerId !== null) {
      window.clearInterval(state.pollerId);
    }
    state.watcherId = null;
    state.pollerId = null;
    state.tracking = false;
    state.paused = false;
  }
  stopRouteFollowWatcher();
  window.speechSynthesis?.cancel();
  state.points = [];
  state.photos = [];
  state.milestones = [];
  state.overlayProjects = [];
  state.sessions = [];
  state.primarySessionId = null;
  state.continuingSessionId = null;
  state.selectedPosition = state.initialPosition || null;
  state.activeStartedAt = null;
  state.destinationFollow = false;
  state.followProgressIndex = 0;
  state.routeOffTrack = false;
  state.routeDeviationSamples = 0;
  state.routeRecoverySamples = 0;
  state.undoRouteEdit = null;
  state.selectedPointIndex = null;
  state.lastRoutePointIndex = null;
  state.segmentStartIndex = null;
  state.segmentEndIndex = null;
  state.pointEditMode = false;
  state.pointAddMode = false;
  state.projectCode = "";
  state.projectName = "";
  state.shareLinks = [];
  state.syncDirty = false;
  state.syncing = false;
  state.lastSyncedAt = null;
  state.lastSyncFailedAt = null;
  state.lastSyncError = "";
  state.adminPanelOpen = false;
  state.authPanelOpen = true;
  state.sharePanelOpen = false;
  state.recordPanelOpen = false;
  state.pointEditPanelOpen = false;
  updateProjectUrl("");
  if (state.initialPosition) {
    currentMarker.setLatLng([state.initialPosition.lat, state.initialPosition.lng]);
  }
  persist();
  render();
  setProjectStatus("새 작업 준비 상태입니다. 서버에 저장된 기존 프로젝트는 유지됩니다.");
  setStatus("화면을 초기화하고 로그인 영역을 제외한 작업 영역을 숨겼습니다.");
}

function render() {
  renderRouteLines();

  const latest = getLatestPosition();
  if (latest) {
    currentMarker.setLatLng([latest.lat, latest.lng]);
  }

  renderPointEditing();
  renderPhotos();
  renderMilestones();
  renderProjectOverlays();
  renderRouteFollowStatus();
  renderStats();
  renderTrackingState();
  renderPanelVisibility();
  renderSessions();
  renderProjectState();
  renderSharePanel();
  renderAuthPanel();
}

function toggleRecordPanel() {
  if (state.recordPanelOpen) {
    if (state.tracking) {
      window.alert("기록 중에는 기록 영역을 숨길 수 없습니다. 기록을 완료한 뒤 숨길 수 있습니다.");
      setStatus("기록 중에는 기록 영역을 숨길 수 없습니다.", "warning");
      return;
    }
    const ok = window.confirm("기록 영역을 숨길까요?\n\n기록 시작, 사진 추가, 기록 저장 버튼이 숨겨집니다.");
    if (!ok) {
      return;
    }
    state.recordPanelOpen = false;
    persist();
    renderPanelVisibility();
    setStatus("기록 영역을 숨겼습니다.", "info");
    return;
  }
  state.recordPanelOpen = true;
  persist();
  renderPanelVisibility();
  setStatus("기록 영역을 열었습니다.", "info");
}

function togglePointEditPanel() {
  if (state.pointEditPanelOpen) {
    const ok = window.confirm("위치 편집을 마칠까요?\n\n선택 중인 위치점과 편집 표시가 해제됩니다.");
    if (!ok) {
      return;
    }
    closePointEditPanel();
    setStatus("위치 편집을 종료했습니다.", "info");
    return;
  }
  state.pointEditPanelOpen = true;
  state.pointEditMode = true;
  state.pointAddMode = false;
  state.selectedPointIndex = null;
  state.lastRoutePointIndex = null;
  state.segmentStartIndex = null;
  state.segmentEndIndex = null;
  persist();
  render();
  setStatus("위치 편집을 시작했습니다. 지도 위 위치점, 사진, 공사구역을 드래그해서 이동할 수 있습니다.", "info");
}

function closePointEditPanel() {
  state.pointEditPanelOpen = false;
  state.pointEditMode = false;
  state.pointAddMode = false;
  state.selectedPointIndex = null;
  state.lastRoutePointIndex = null;
  state.segmentStartIndex = null;
  state.segmentEndIndex = null;
  persist();
  render();
}

function renderPanelVisibility() {
  if (els.recordSection) {
    els.recordSection.classList.toggle("is-collapsed", !state.recordPanelOpen);
  }
  if (els.recordToggleBtn) {
    els.recordToggleBtn.textContent = state.recordPanelOpen ? "숨기기" : "펼치기";
  }
  if (els.pointEditSection) {
    els.pointEditSection.classList.toggle("is-collapsed", !state.pointEditPanelOpen);
  }
  if (els.pointEditToggleBtn) {
    els.pointEditToggleBtn.textContent = state.pointEditPanelOpen ? "편집 마치기" : "펼치기";
  }
}

function renderPointEditing() {
  pointLayer.clearLayers();
  if (state.shareView) {
    state.pointEditMode = false;
    state.pointEditPanelOpen = false;
    return;
  }
  if (state.selectedPointIndex !== null && !state.points[state.selectedPointIndex]) {
    state.selectedPointIndex = null;
  }
  if (state.lastRoutePointIndex !== null && !state.points[state.lastRoutePointIndex]) {
    state.lastRoutePointIndex = null;
  }
  if (state.segmentStartIndex !== null && !state.points[state.segmentStartIndex]) {
    state.segmentStartIndex = null;
  }
  if (state.segmentEndIndex !== null && !state.points[state.segmentEndIndex]) {
    state.segmentEndIndex = null;
  }

  if (els.pointAddBtn) {
    els.pointAddBtn.disabled = !state.pointEditMode;
    els.pointAddBtn.textContent = state.pointAddMode ? "추가 위치 클릭" : "위치점 추가";
    els.pointAddBtn.classList.toggle("is-active", state.pointAddMode);
  }
  if (els.pointDeleteBtn) {
    els.pointDeleteBtn.disabled =
      !state.pointEditMode || state.segmentStartIndex === null || state.segmentEndIndex !== null;
  }
  if (els.pointConnectBtn) {
    els.pointConnectBtn.disabled =
      !state.pointEditMode ||
      state.segmentStartIndex === null ||
      state.segmentEndIndex === null ||
      Math.abs(state.segmentStartIndex - state.segmentEndIndex) <= 1;
  }
  const hasSelectedPoint = state.pointEditMode && state.segmentStartIndex !== null;
  if (els.segmentStartBtn) {
    els.segmentStartBtn.disabled = !hasSelectedPoint;
    els.segmentStartBtn.textContent =
      state.segmentStartIndex === null ? "시작점 지정" : `시작 ${state.segmentStartIndex + 1}`;
  }
  if (els.segmentEndBtn) {
    els.segmentEndBtn.disabled = !hasSelectedPoint;
    els.segmentEndBtn.textContent =
      state.segmentEndIndex === null ? "끝점 지정" : `끝 ${state.segmentEndIndex + 1}`;
  }
  if (els.segmentDeleteBtn) {
    els.segmentDeleteBtn.disabled =
      !state.pointEditMode ||
      state.segmentStartIndex === null ||
      state.segmentEndIndex === null ||
      state.segmentStartIndex === state.segmentEndIndex;
  }
  if (els.undoRouteEditBtn) {
    els.undoRouteEditBtn.disabled = !state.pointEditMode || !state.undoRouteEdit;
  }
  if (els.pointNumberRow) {
    els.pointNumberRow.hidden = !state.pointEditMode;
  }
  if (els.segmentStartInput && document.activeElement !== els.segmentStartInput) {
    els.segmentStartInput.value = state.segmentStartIndex === null ? "" : String(state.segmentStartIndex + 1);
    els.segmentStartInput.max = String(state.points.length);
  }
  if (els.segmentEndInput && document.activeElement !== els.segmentEndInput) {
    els.segmentEndInput.value = state.segmentEndIndex === null ? "" : String(state.segmentEndIndex + 1);
    els.segmentEndInput.max = String(state.points.length);
  }
  if (els.pointEditHint) {
    els.pointEditHint.hidden = !state.pointEditMode;
  }
  updatePointEditHint();

  if (!state.pointEditMode) {
    return;
  }

  if (state.destinationFollow) {
    if (els.pointEditHint) {
      els.pointEditHint.textContent = "답사 따라가기 중에는 지도 속도를 위해 위치점 표시를 잠시 줄입니다.";
    }
    return;
  }

  const visibleIndexes = getEditablePointIndexes();
  visibleIndexes.forEach((index) => {
    const point = state.points[index];
    const isSelected = state.selectedPointIndex === index;
    const isSegmentStart = state.segmentStartIndex === index;
    const isSegmentEnd = state.segmentEndIndex === index;
    const isSkipped = point.skipInRoute === true;
    const icon = L.divIcon({
      className: "",
      html: `<span class="route-point-marker${isSelected ? " is-selected" : ""}${isSegmentStart ? " is-segment-start" : ""}${isSegmentEnd ? " is-segment-end" : ""}${isSkipped ? " is-skipped" : ""}">${index + 1}</span>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    const marker = L.marker([point.lat, point.lng], {
      icon,
      draggable: true,
      keyboard: true,
      title: `위치점 ${index + 1}`,
    });
    marker.on("click", (event) => {
      if (event.originalEvent) {
        L.DomEvent.stopPropagation(event.originalEvent);
      }
      selectRoutePoint(index);
    });
    marker.on("dragend", (event) => {
      updateRoutePoint(index, event.target.getLatLng());
    });
    marker.addTo(pointLayer);
  });

  if (state.points.length > visibleIndexes.length) {
    setStatus(
      `위치점 ${state.points.length}개 중 현재 화면 기준 ${visibleIndexes.length}개를 표시합니다. 확대하면 더 정밀하게 선택할 수 있습니다.`,
    );
  }
}

function getEditablePointIndexes() {
  const count = state.points.length;
  const protectedIndexes = getProtectedPointIndexes();
  const bounds = getCurrentMapBounds();
  const candidateIndexes = [];

  state.points.forEach((point, index) => {
    if (!bounds || containsPoint(bounds, point) || protectedIndexes.has(index)) {
      candidateIndexes.push(index);
    }
  });

  if (candidateIndexes.length <= MAX_EDIT_POINT_MARKERS) {
    return candidateIndexes;
  }

  const indexes = new Set(protectedIndexes);
  const step = Math.max(1, Math.ceil((candidateIndexes.length - 1) / (MAX_EDIT_POINT_MARKERS - 1)));
  for (let offset = 0; offset < candidateIndexes.length; offset += step) {
    indexes.add(candidateIndexes[offset]);
  }
  indexes.add(candidateIndexes.at(-1));
  return [...indexes].sort((a, b) => a - b);
}

function getProtectedPointIndexes() {
  const count = state.points.length;
  const indexes = new Set();
  [state.selectedPointIndex, state.lastRoutePointIndex, state.segmentStartIndex, state.segmentEndIndex].forEach((index) => {
    if (index !== null && index >= 0 && index < count) {
      indexes.add(index);
    }
  });
  return indexes;
}

function selectRoutePoint(index) {
  const autoSegmentMessage = applyPointSelection(index);
  renderPointEditing();
  setStatus(autoSegmentMessage);
}

function updatePointEditHint() {
  if (!els.pointEditHint || !state.pointEditMode) {
    return;
  }
  if (state.segmentStartIndex !== null && state.segmentEndIndex !== null) {
    const start = Math.min(state.segmentStartIndex, state.segmentEndIndex);
    const end = Math.max(state.segmentStartIndex, state.segmentEndIndex);
    const canConnect = end - start > 1;
    els.pointEditHint.textContent = `${start + 1}번부터 ${end + 1}번까지 선택했습니다. ${
      canConnect ? "위치점 연결, " : ""
    }구간 삭제 또는 위치점 추가가 가능합니다.`;
    return;
  }
  if (state.segmentStartIndex !== null) {
    els.pointEditHint.textContent = `${state.segmentStartIndex + 1}번 위치점이 선택되었습니다. 선택점 삭제 또는 위치점 추가가 가능합니다.`;
    return;
  }
  els.pointEditHint.textContent =
    "지도 위 위치점, 사진, 공사구역을 누른 상태로 끌어 위치를 수정할 수 있습니다.";
}

function applyPointSelection(index) {
  if (state.lastRoutePointIndex === null) {
    state.lastRoutePointIndex = index;
    state.segmentStartIndex = index;
    state.segmentEndIndex = null;
    state.selectedPointIndex = index;
    return `위치점 ${index + 1}을 선택했습니다. 선택점 삭제 또는 다음 지점 선택이 가능합니다.`;
  }

  if (index === state.lastRoutePointIndex) {
    state.segmentStartIndex = index;
    state.segmentEndIndex = null;
    state.selectedPointIndex = index;
    return `위치점 ${index + 1}이 선택되어 있습니다. 선택점 삭제 또는 위치점 추가가 가능합니다.`;
  }

  const previousIndex = state.lastRoutePointIndex;
  state.segmentStartIndex = previousIndex;
  state.segmentEndIndex = index;
  state.selectedPointIndex = null;
  state.lastRoutePointIndex = index;

  const start = Math.min(previousIndex, index);
  const end = Math.max(previousIndex, index);
  return `위치점 ${start + 1}부터 ${end + 1}까지 구간을 선택했습니다.`;
}

function selectNearestRoutePoint(latlng) {
  if (state.points.length === 0) {
    setStatus("선택할 위치점이 없습니다.");
    return;
  }
  let nearestIndex = 0;
  let nearestDistance = Infinity;
  const target = { lat: latlng.lat, lng: latlng.lng };
  state.points.forEach((point, index) => {
    const distance = getDistanceMeters(target, point);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });
  selectRoutePoint(nearestIndex);
}

function applySegmentNumberInputs() {
  if (!state.pointEditMode) {
    return;
  }
  const startIndex = parsePointNumberInput(els.segmentStartInput?.value);
  const endIndex = parsePointNumberInput(els.segmentEndInput?.value);
  if (startIndex === null && endIndex === null) {
    state.segmentStartIndex = null;
    state.segmentEndIndex = null;
    state.selectedPointIndex = null;
    state.lastRoutePointIndex = null;
    renderPointEditing();
    return;
  }
  if (startIndex !== null && !state.points[startIndex]) {
    setStatus(`시작 번호를 1부터 ${state.points.length} 사이로 입력해 주세요.`);
    return;
  }
  if (endIndex !== null && !state.points[endIndex]) {
    setStatus(`끝 번호를 1부터 ${state.points.length} 사이로 입력해 주세요.`);
    return;
  }
  if (startIndex !== null && endIndex !== null && startIndex === endIndex) {
    state.segmentStartIndex = startIndex;
    state.segmentEndIndex = null;
    state.selectedPointIndex = startIndex;
    state.lastRoutePointIndex = startIndex;
    renderPointEditing();
    setStatus(`위치점 ${startIndex + 1}을 번호로 선택했습니다.`);
    return;
  }
  if (startIndex !== null && endIndex !== null) {
    state.segmentStartIndex = startIndex;
    state.segmentEndIndex = endIndex;
    state.selectedPointIndex = null;
    state.lastRoutePointIndex = endIndex;
    renderPointEditing();
    setStatus(`위치점 ${startIndex + 1}부터 ${endIndex + 1}까지 자동 선택했습니다.`);
    return;
  }
  const onlyIndex = startIndex ?? endIndex;
  state.segmentStartIndex = onlyIndex;
  state.segmentEndIndex = null;
  state.selectedPointIndex = onlyIndex;
  state.lastRoutePointIndex = onlyIndex;
  renderPointEditing();
  setStatus(`위치점 ${onlyIndex + 1}을 번호로 선택했습니다.`);
}

function parsePointNumberInput(value) {
  const number = Number.parseInt(String(value || "").trim(), 10);
  if (!Number.isFinite(number)) {
    return null;
  }
  return number - 1;
}

function setSegmentStart() {
  const index = state.selectedPointIndex ?? state.segmentStartIndex;
  if (index === null) {
    return;
  }
  if (index === state.segmentEndIndex) {
    setStatus("시작점과 끝점은 같은 위치점으로 지정할 수 없습니다. 다른 위치점을 선택해 주세요.");
    return;
  }
  state.segmentStartIndex = index;
  state.lastRoutePointIndex = index;
  if (state.segmentEndIndex !== null) {
    state.selectedPointIndex = null;
  }
  renderPointEditing();
  setStatus(`구간 시작점을 위치점 ${state.segmentStartIndex + 1}로 지정했습니다.`);
}

function setSegmentEnd() {
  const index = state.selectedPointIndex ?? state.segmentStartIndex;
  if (index === null) {
    return;
  }
  if (index === state.segmentStartIndex) {
    setStatus("끝점과 시작점은 같은 위치점으로 지정할 수 없습니다. 다른 위치점을 선택해 주세요.");
    return;
  }
  state.segmentEndIndex = index;
  state.lastRoutePointIndex = index;
  if (state.segmentStartIndex !== null) {
    state.selectedPointIndex = null;
  }
  renderPointEditing();
  setStatus(`구간 끝점을 위치점 ${state.segmentEndIndex + 1}로 지정했습니다.`);
}

function updateRoutePoint(index, latlng) {
  const point = state.points[index];
  if (!point) {
    return;
  }
  state.points[index] = {
    ...point,
    lat: latlng.lat,
    lng: latlng.lng,
    edited: true,
    editedAt: Date.now(),
  };
  state.selectedPosition = state.points[index];
  persist();
  render();
  setStatus(`위치점 ${index + 1}을 이동했습니다.`);
}

function addManualRoutePoint(latlng) {
  const insertAfterIndex = getRoutePointInsertAfterIndex();
  const originalPointCount = state.points.length;
  const insertIndex = insertAfterIndex === null ? state.points.length : insertAfterIndex + 1;
  const selectedRangeEnd =
    state.segmentStartIndex !== null && state.segmentEndIndex !== null
      ? Math.max(state.segmentStartIndex, state.segmentEndIndex)
      : null;
  const shouldKeepInsertRange =
    selectedRangeEnd !== null && insertAfterIndex !== null && selectedRangeEnd > insertAfterIndex + 1;
  const nextPoint = {
    lat: latlng.lat,
    lng: latlng.lng,
    accuracy: 0,
    timestamp: Date.now(),
    source: "manual",
    edited: true,
  };
  state.points.splice(insertIndex, 0, nextPoint);
  if (shouldKeepInsertRange) {
    state.selectedPointIndex = null;
    state.segmentStartIndex = insertIndex;
    state.segmentEndIndex = selectedRangeEnd + 1;
    state.lastRoutePointIndex = selectedRangeEnd + 1;
  } else {
    state.selectedPointIndex = insertIndex;
    state.segmentStartIndex = insertIndex;
    state.segmentEndIndex = null;
    state.lastRoutePointIndex = insertIndex;
  }
  state.selectedPosition = nextPoint;
  persist();
  render();
  const statusMessage = shouldKeepInsertRange
    ? `위치점 ${insertIndex + 1}을 추가했습니다. ${insertIndex + 1}번부터 ${selectedRangeEnd + 2}번까지 계속 보정할 수 있습니다.`
    : `위치점 ${insertIndex + 1}을 추가했습니다. 이후 번호는 자동으로 바뀝니다.`;
  setStatus(statusMessage);
  return shouldKeepInsertRange || insertAfterIndex === null || insertAfterIndex >= originalPointCount - 1;
}

function getRoutePointInsertAfterIndex() {
  const candidates = [state.selectedPointIndex, state.segmentStartIndex, state.segmentEndIndex]
    .filter((index) => index !== null && state.points[index]);
  if (candidates.length === 0) {
    return null;
  }
  return Math.min(...candidates);
}

function addManualRoutePointFromSelection() {
  if (!state.pointEditMode) {
    return;
  }
  state.pointAddMode = !state.pointAddMode;
  renderPointEditing();
  const insertAfterIndex = getRoutePointInsertAfterIndex();
  const message =
    insertAfterIndex === null
      ? "지도에서 추가할 위치를 클릭해 주세요. 새 점은 마지막에 추가됩니다."
      : `지도에서 추가할 위치를 클릭해 주세요. 새 점은 ${insertAfterIndex + 1}번 뒤에 삽입됩니다.`;
  setStatus(state.pointAddMode ? message : "위치점 추가를 취소했습니다.");
}

function connectSelectedRoutePoints() {
  if (
    !state.pointEditMode ||
    state.segmentStartIndex === null ||
    state.segmentEndIndex === null
  ) {
    return;
  }
  const start = Math.min(state.segmentStartIndex, state.segmentEndIndex);
  const end = Math.max(state.segmentStartIndex, state.segmentEndIndex);
  if (end - start <= 1) {
    setStatus("연결에서 제외할 중간 위치점이 없습니다.");
    return;
  }
  const skippedCount = end - start - 1;
  const ok = window.confirm(
    `위치점 ${start + 1}번과 ${end + 1}번을 바로 연결할까요?\n\n중간 ${skippedCount}개 위치점은 삭제하지 않고 동선 표시와 거리 계산에서만 제외합니다.`,
  );
  if (!ok) {
    return;
  }
  rememberRouteEditUndo(`위치점 ${start + 1}-${end + 1} 연결`);
  for (let index = start + 1; index < end; index += 1) {
    state.points[index] = {
      ...state.points[index],
      skipInRoute: true,
      edited: true,
      editedAt: Date.now(),
    };
  }
  persist();
  render();
  setStatus(`위치점 ${start + 1}번과 ${end + 1}번을 바로 연결했습니다. 중간 ${skippedCount}개는 동선에서 제외했습니다.`);
}

function deleteSelectedPoint() {
  if (!state.pointEditMode || state.segmentStartIndex === null || state.segmentEndIndex !== null) {
    return;
  }
  const index = state.segmentStartIndex;
  const ok = window.confirm(`위치점 ${index + 1}을 삭제할까요?\n\n삭제하면 이동거리와 동선 모양을 다시 계산합니다.`);
  if (!ok) {
    return;
  }
  rememberRouteEditUndo(`위치점 ${index + 1} 삭제`);
  state.points.splice(index, 1);
  state.selectedPointIndex = null;
  state.lastRoutePointIndex = null;
  state.segmentStartIndex = null;
  state.segmentEndIndex = null;
  state.selectedPosition = state.points.at(-1) || state.initialPosition || null;
  persist();
  render();
  setStatus(`위치점 ${index + 1}을 삭제했습니다.`);
}

function deleteSelectedSegment() {
  if (state.segmentStartIndex === null || state.segmentEndIndex === null) {
    return;
  }
  const start = Math.min(state.segmentStartIndex, state.segmentEndIndex);
  const end = Math.max(state.segmentStartIndex, state.segmentEndIndex);
  const deleteCount = end - start + 1;
  if (deleteCount <= 0) {
    return;
  }
  const ok = window.confirm(
    `위치점 ${start + 1}부터 ${end + 1}까지 ${deleteCount}개를 삭제할까요?\n\n잘못 이동한 구간을 한 번에 제거합니다.`,
  );
  if (!ok) {
    return;
  }
  rememberRouteEditUndo(`위치점 ${start + 1}-${end + 1} 구간 삭제`);
  state.points.splice(start, deleteCount);
  state.selectedPointIndex = null;
  state.lastRoutePointIndex = null;
  state.segmentStartIndex = null;
  state.segmentEndIndex = null;
  state.selectedPosition = state.points.at(-1) || state.initialPosition || null;
  persist();
  render();
  setStatus(`위치점 ${deleteCount}개 구간을 삭제했습니다.`);
}

function rememberRouteEditUndo(label) {
  state.undoRouteEdit = {
    label,
    points: structuredClone(state.points),
    selectedPosition: state.selectedPosition ? { ...state.selectedPosition } : null,
    timestamp: Date.now(),
  };
}

function undoRouteEdit() {
  if (!state.undoRouteEdit) {
    return;
  }
  const undo = state.undoRouteEdit;
  state.points = structuredClone(undo.points || []);
  state.selectedPosition = undo.selectedPosition || state.points.at(-1) || state.initialPosition || null;
  state.selectedPointIndex = null;
  state.lastRoutePointIndex = null;
  state.segmentStartIndex = null;
  state.segmentEndIndex = null;
  state.undoRouteEdit = null;
  persist();
  render();
  setStatus(`${undo.label} 작업을 되돌렸습니다.`);
}

function adjustPointIndexAfterDelete(index, deletedStart, deletedCount) {
  if (index === null) {
    return null;
  }
  const deletedEnd = deletedStart + deletedCount - 1;
  if (index >= deletedStart && index <= deletedEnd) {
    return null;
  }
  if (index > deletedEnd) {
    return index - deletedCount;
  }
  return index;
}

function renderPhotos() {
  hidePhotoTray();
  photoLayer.clearLayers();
  els.photoList.innerHTML = "";
  els.photoList.classList.toggle("is-grid", state.photoView === "grid");
  els.photoList.classList.toggle("is-photo-move-mode", state.pointEditMode);
  syncPhotoFilterOptions();
  els.photoFilter.value = state.photoFilter;
  els.photoViewToggle.textContent = state.photoView === "grid" ? "목록 보기" : "격자 보기";

  if (state.photoFilter === "hidden") {
    const empty = document.createElement("p");
    empty.className = "status-text";
    empty.textContent = "사진을 숨겼습니다. 이동 동선만 표시합니다.";
    els.photoList.append(empty);
    return;
  }

  const visiblePhotos = getVisiblePhotos();
  if (state.photos.length === 0) {
    const empty = document.createElement("p");
    empty.className = "status-text";
    empty.textContent = "아직 기록된 사진이 없습니다.";
    els.photoList.append(empty);
    return;
  }

  if (visiblePhotos.length === 0) {
    const empty = document.createElement("p");
    empty.className = "status-text";
    empty.textContent = "필터 조건에 맞는 사진이 없습니다.";
    els.photoList.append(empty);
    return;
  }

  renderPhotoMapMarkers(visiblePhotos);

  visiblePhotos.forEach((photo) => {
    const hasPosition = hasPhotoPosition(photo);
    if (false) {
      const icon = L.divIcon({
        className: "",
        html: `<img class="photo-marker" src="${photo.src}" alt="" width="38" height="38" />`,
        iconSize: [38, 38],
        iconAnchor: [19, 38],
        popupAnchor: [0, -32],
      });

      let photoWasDragged = false;
      L.marker([photo.lat, photo.lng], {
        icon,
        title: state.pointEditMode ? `${getPhotoDisplayName(photo)} - 드래그해서 위치 수정` : getPhotoDisplayName(photo),
        draggable: state.pointEditMode,
      })
        .on("dragstart", () => {
          photoWasDragged = true;
        })
        .on("dragend", (event) => {
          movePhotoToLatLng(photo.id, event.target.getLatLng());
          window.setTimeout(() => {
            photoWasDragged = false;
          }, 0);
        })
        .on("click", () => {
          if (state.pointEditMode || photoWasDragged) {
            return;
          }
          openPhotoModal(photo);
        })
        .addTo(photoLayer);
    }

    const item = els.photoItemTemplate.content.firstElementChild.cloneNode(true);
    item.classList.toggle("has-memo", Boolean(photo.memo?.trim()));
    item.classList.toggle("has-tags", Boolean(photo.tags?.trim()));
    const img = item.querySelector("img");
    const title = item.querySelector("strong");
    const meta = item.querySelector("span");
    const button = item.querySelector("button");

    img.src = photo.src;
    img.alt = getPhotoDisplayName(photo);
    img.tabIndex = 0;
    img.role = "button";
    img.title = "사진 크게 보기";
    img.addEventListener("click", () => openPhotoModal(photo));
    img.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openPhotoModal(photo);
      }
    });
    title.textContent = getPhotoDisplayName(photo);
    title.addEventListener("click", () => openPhotoModal(photo));
    meta.textContent = hasPosition
      ? `${formatDate(photo.timestamp)} · ${photo.lat.toFixed(5)}, ${photo.lng.toFixed(5)} · ${getLocationSourceLabel(photo.locationSource)}`
      : `${formatDate(photo.timestamp)} · 위치 없음`;

    if (photo.memo || photo.tags) {
      meta.textContent += ` · ${[photo.memo, photo.tags].filter(Boolean).join(" / ")}`;
    }

    const flags = document.createElement("div");
    flags.className = "photo-flags";
    if (photo.memo?.trim()) {
      const memoFlag = document.createElement("span");
      memoFlag.className = "is-memo";
      memoFlag.textContent = "메모";
      flags.append(memoFlag);
    }
    if (photo.tags?.trim()) {
      const tagFlag = document.createElement("span");
      tagFlag.className = "is-tag";
      tagFlag.textContent = "태그";
      flags.append(tagFlag);
    }

    button.disabled = !hasPosition;
    button.addEventListener("click", () => {
      if (hasPosition) {
        map.setView([photo.lat, photo.lng], 18);
      }
    });

    const actions = document.createElement("div");
    actions.className = "photo-actions";
    const memoButton = document.createElement("button");
    memoButton.type = "button";
    memoButton.textContent = "메모";
    memoButton.addEventListener("click", () => editPhotoMemo(photo.id));
    const previewButton = document.createElement("button");
    previewButton.type = "button";
    previewButton.textContent = "크게";
    previewButton.addEventListener("click", () => openPhotoModal(photo));
    const tagButton = document.createElement("button");
    tagButton.type = "button";
    tagButton.textContent = "태그";
    tagButton.addEventListener("click", () => editPhotoTags(photo.id));
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "수정";
    editButton.addEventListener("click", () => editPhotoMemo(photo.id));
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "삭제";
    deleteButton.addEventListener("click", () => deletePhoto(photo.id));
    actions.append(previewButton, memoButton, tagButton, deleteButton);
    if (flags.childElementCount > 0) {
      item.append(flags);
    }
    item.append(actions);
    els.photoList.append(item);
  });
}

function renderPhotoMapMarkers(photos = getVisiblePhotos()) {
  hidePhotoTray();
  photoLayer.clearLayers();
  if (state.photoFilter === "hidden") {
    hidePhotoTray();
    return;
  }

  const positionedPhotos = photos.filter(hasPhotoPosition);
  if (positionedPhotos.length === 0) {
    hidePhotoTray();
    return;
  }

  const clusters = clusterPhotosForMap(positionedPhotos);
  clusters.forEach((cluster) => {
    if (cluster.photos.length === 1) {
      createSinglePhotoMarker(cluster.photos[0]).addTo(photoLayer);
      return;
    }
    createPhotoClusterMarker(cluster).addTo(photoLayer);
  });
}

function createSinglePhotoMarker(photo) {
  const size = 34;
  const icon = L.divIcon({
    className: "",
    html: `<img class="photo-marker" src="${photo.src}" alt="" width="${size}" height="${size}" />`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -30],
  });

  let photoWasDragged = false;
  return L.marker([photo.lat, photo.lng], {
    icon,
    title: state.pointEditMode ? `${getPhotoDisplayName(photo)} - drag to move` : getPhotoDisplayName(photo),
    draggable: state.pointEditMode,
  })
    .on("dragstart", () => {
      photoWasDragged = true;
    })
    .on("dragend", (event) => {
      movePhotoToLatLng(photo.id, event.target.getLatLng());
      window.setTimeout(() => {
        photoWasDragged = false;
      }, 0);
    })
    .on("click", () => {
      if (state.pointEditMode || photoWasDragged) {
        return;
      }
      openPhotoModal(photo);
    });
}

function createPhotoClusterMarker(cluster) {
  const firstPhoto = cluster.photos[0];
  const size = 42;
  const icon = L.divIcon({
    className: "",
    html: `
      <button class="photo-cluster-marker" type="button" aria-label="photo group ${cluster.photos.length}">
        <img src="${firstPhoto.src}" alt="" />
        <span>${cluster.photos.length}</span>
      </button>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -34],
  });

  return L.marker([cluster.lat, cluster.lng], {
    icon,
    title: `사진 ${cluster.photos.length}장`,
  }).on("click", () => showPhotoTray(cluster.photos));
}

function clusterPhotosForMap(photos) {
  const threshold = getPhotoClusterDistancePx();
  if (threshold <= 0) {
    return photos.map((photo) => ({
      photos: [photo],
      lat: photo.lat,
      lng: photo.lng,
      centerPoint: map.latLngToLayerPoint([photo.lat, photo.lng]),
    }));
  }

  const clusters = [];
  photos.forEach((photo) => {
    const point = map.latLngToLayerPoint([photo.lat, photo.lng]);
    let target = null;
    for (const cluster of clusters) {
      const dx = point.x - cluster.centerPoint.x;
      const dy = point.y - cluster.centerPoint.y;
      if (Math.sqrt(dx * dx + dy * dy) <= threshold) {
        target = cluster;
        break;
      }
    }

    if (!target) {
      clusters.push({
        photos: [photo],
        lat: photo.lat,
        lng: photo.lng,
        centerPoint: point,
      });
      return;
    }

    const count = target.photos.length;
    target.photos.push(photo);
    target.lat = (target.lat * count + photo.lat) / (count + 1);
    target.lng = (target.lng * count + photo.lng) / (count + 1);
    target.centerPoint = {
      x: (target.centerPoint.x * count + point.x) / (count + 1),
      y: (target.centerPoint.y * count + point.y) / (count + 1),
    };
  });

  return clusters;
}

function getPhotoClusterDistancePx() {
  if (state.pointEditMode) {
    return 0;
  }
  const zoom = map.getZoom();
  if (zoom >= 18) {
    return 0;
  }
  if (zoom >= 16) {
    return 44;
  }
  if (zoom >= 14) {
    return 58;
  }
  return 72;
}

function showPhotoTray(photos) {
  if (!els.photoTray) {
    return;
  }
  els.photoTray.innerHTML = "";
  const title = document.createElement("strong");
  title.className = "photo-tray__title";
  title.textContent = `사진 ${photos.length}장`;
  els.photoTray.append(title);

  photos.forEach((photo) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "photo-tray__item";
    button.innerHTML = `
      <img src="${photo.src}" alt="" />
      <span>${getPhotoDisplayName(photo)}</span>
    `;
    button.addEventListener("click", () => openPhotoModal(photo));
    els.photoTray.append(button);
  });
  els.photoTray.hidden = false;
}

function hidePhotoTray() {
  if (els.photoTray) {
    els.photoTray.hidden = true;
    els.photoTray.innerHTML = "";
  }
}

function addMapPin(type = "construction") {
  const position = getPinBasePosition();
  if (!position) {
    setStatus("먼저 지도에서 위치를 선택하거나 현재 위치를 확인해 주세요.");
    return;
  }

  const label = "공사구역";
  const name = window.prompt(`${label} 이름`, `${label} ${state.milestones.length + 1}`);
  if (name === null) {
    return;
  }
  const memo = window.prompt(`${label} 메모`, "");
  if (memo === null) {
    return;
  }
  let displayCode = "";
  const code = window.prompt("지도 표시 코드 (예: C1, D1)", getNextConstructionCode());
  if (code === null) {
    return;
  }
  displayCode = normalizeConstructionCode(code, getNextConstructionCode());

  state.milestones.push({
    id: crypto.randomUUID(),
    type: "construction",
    name: name.trim() || `${label} ${state.milestones.length + 1}`,
    memo: memo.trim(),
    lat: position.lat,
    lng: position.lng,
    priority: null,
    completed: false,
    createdAt: Date.now(),
    displayCode,
    color: DEFAULT_CONSTRUCTION_COLOR,
  });
  persist();
  renderMilestones();
  syncProjectState("pin-construction");
  setStatus(`지도 중앙에 ${displayCode} 공사구역을 추가했습니다. 색상 아이콘에서 대표 색상을 선택할 수 있습니다.`);
}

function getPinBasePosition() {
  return getMapCenterPosition();
}

function getMapCenterPosition() {
  const center = map.getCenter();
  if (!center) {
    return null;
  }
  return {
    lat: center.lat,
    lng: center.lng,
    timestamp: Date.now(),
  };
}

function renderMilestones() {
  milestoneLayer.clearLayers();
  if (!els.milestoneList) {
    return;
  }
  els.milestoneList.innerHTML = "";

  const pins = state.milestones
    .filter((pin) => pin.type === "construction")
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  renderSharedConstructionToggle(pins.length);

  if (pins.length === 0) {
    const empty = document.createElement("p");
    empty.className = "status-text";
    empty.textContent = "아직 등록된 공사구역이 없습니다.";
    els.milestoneList.append(empty);
    return;
  }
  if (state.shareView && !state.shareConstructionVisible) {
    return;
  }

  pins.forEach((pin) => {
    const typeLabel = getPinTypeLabel(pin.type);
    const pinLabel = getMapPinLabel(pin);
    const icon = L.divIcon({
      className: "",
      html: createMapPinHtml("construction", pinLabel, pin.color),
      iconSize: [34, 38],
      iconAnchor: [17, 38],
      popupAnchor: [0, -34],
    });
    let pinWasDragged = false;
    L.marker([pin.lat, pin.lng], {
      icon,
      title: state.pointEditMode ? `${pin.name} - 드래그해서 위치 수정` : `${pin.name} 위치`,
      draggable: state.pointEditMode,
    })
      .on("dragstart", () => {
        pinWasDragged = true;
      })
      .on("dragend", (event) => {
        updateMapPinPosition(pin.id, event.target.getLatLng());
        window.setTimeout(() => {
          pinWasDragged = false;
        }, 0);
      })
      .on("click", () => {
        if (state.pointEditMode || pinWasDragged) {
          return;
        }
        map.setView([pin.lat, pin.lng], Math.max(map.getZoom(), 18));
        setStatus(`${pin.name} 위치로 이동했습니다.`);
      })
      .addTo(milestoneLayer);

    const item = document.createElement("article");
    item.className = "pin-list-item";

    const body = document.createElement("div");
    const title = document.createElement("strong");
    const meta = document.createElement("span");
    title.textContent = `${pinLabel}. ${pin.name || typeLabel}`;
    meta.textContent = `${typeLabel} · ${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}`;
    body.append(title, meta);
    if (pin.memo) {
      const memo = document.createElement("small");
      memo.textContent = pin.memo;
      body.append(memo);
    }

    const actions = document.createElement("div");
    actions.className = "pin-list-actions pin-icon-actions";
    const locateButton = createPinIconButton("보기", "view");
    locateButton.addEventListener("click", () => {
      map.setView([pin.lat, pin.lng], 18);
      setStatus(`${pin.name} 위치로 이동했습니다.`);
    });
    actions.append(locateButton);
    if (!state.shareView) {
      const colorButton = createPinIconButton("색상", "color", normalizeConstructionColor(pin.color));
      colorButton.addEventListener("click", () => {
        openRepresentativeColorPicker({
          title: `${pinLabel} 대표 색상`,
          currentColor: pin.color,
          onConfirm: (color) => updateConstructionPinColor(pin.id, color),
        });
      });
      const editButton = createPinIconButton("수정", "edit");
      editButton.addEventListener("click", () => editMapPin(pin.id));
      const deleteButton = createPinIconButton("삭제", "delete");
      deleteButton.addEventListener("click", () => deleteMapPin(pin.id));
      actions.append(colorButton, editButton, deleteButton);
    }

    item.append(body, actions);
    els.milestoneList.append(item);
  });
}

function updateMapPinPosition(pinId, latlng) {
  const pin = state.milestones.find((item) => item.id === pinId);
  if (!pin) {
    return;
  }
  pin.lat = latlng.lat;
  pin.lng = latlng.lng;
  pin.editedAt = Date.now();
  persist();
  renderMilestones();
  syncProjectState("move-pin");
  setStatus(`${pin.name} 위치를 보정했습니다.`);
}

async function toggleRouteFollow() {
  if (state.destinationFollow) {
    stopRouteFollowing("답사 따라가기를 종료했습니다.");
    return;
  }
  if (state.tracking) {
    setStatus("이동 기록을 완료한 뒤 답사 따라가기를 시작해 주세요.", "warning");
    return;
  }
  const routePoints = getRoutePathPoints(state.points);
  if (routePoints.length < 2) {
    setStatus("답사할 기록 동선을 먼저 불러와 주세요.", "warning");
    return;
  }
  if (!canUsePreciseLocation() || !navigator.geolocation) {
    setStatus("현재 위치 권한을 허용해야 답사 따라가기를 시작할 수 있습니다.", "warning");
    return;
  }

  state.destinationFollow = true;
  state.autoFollow = true;
  state.followProgressIndex = 0;
  state.routeOffTrack = false;
  state.routeDeviationSamples = 0;
  state.routeRecoverySamples = 0;
  persist();
  render();
  const position = await locateCurrentPosition({ status: false });
  if (!position) {
    stopRouteFollowing("현재 위치를 확인하지 못해 답사 따라가기를 시작할 수 없습니다.");
    return;
  }
  updateRouteFollowing(position);
  startRouteFollowWatcher();
  setStatus("답사 따라가기를 시작했습니다. 현재 위치를 따라가며 경로 이탈을 음성으로 안내합니다.", "active");
}

function toggleSharedConstructionVisibility() {
  if (!state.shareView || state.shareView.loading || state.shareView.revoked) {
    return;
  }
  state.shareConstructionVisible = !state.shareConstructionVisible;
  renderMilestones();
}

function renderSharedConstructionToggle(pinCount) {
  if (!els.shareConstructionToggleBtn) {
    return;
  }
  const canToggle = Boolean(state.shareView && !state.shareView.loading && !state.shareView.revoked && pinCount > 0);
  els.shareConstructionToggleBtn.hidden = !canToggle;
  els.shareConstructionToggleBtn.disabled = !canToggle;
  els.shareConstructionToggleBtn.textContent = state.shareConstructionVisible
    ? "공사구역 숨기기"
    : "공사구역 보기";
  els.shareConstructionToggleBtn.setAttribute("aria-pressed", String(state.shareConstructionVisible));
}

function stopRouteFollowing(message = "답사 따라가기를 종료했습니다.") {
  state.destinationFollow = false;
  state.followProgressIndex = 0;
  state.routeOffTrack = false;
  state.routeDeviationSamples = 0;
  state.routeRecoverySamples = 0;
  stopRouteFollowWatcher();
  window.speechSynthesis?.cancel();
  persist();
  renderRouteLines();
  renderRouteFollowStatus();
  renderTrackingState();
  setStatus(message);
}

function renderRouteLines() {
  const points = getRoutePathPoints(state.points);
  if (!state.destinationFollow || points.length < 2) {
    routeLine.setLatLngs(points.map((point) => [point.lat, point.lng]));
    routeRemainingLine.setLatLngs([]);
    return;
  }
  const splitIndex = Math.min(Math.max(0, state.followProgressIndex), points.length - 1);
  const completed = points.slice(0, splitIndex + 1);
  const remaining = points.slice(splitIndex);
  routeLine.setLatLngs(completed.map((point) => [point.lat, point.lng]));
  routeRemainingLine.setLatLngs(remaining.map((point) => [point.lat, point.lng]));
}

function renderRouteFollowStatus(point = getLatestPosition(), nearest = null) {
  if (!els.routeFollowStatus || !els.followRouteBtn) {
    return;
  }
  const routePoints = getRoutePathPoints(state.points);
  els.followRouteBtn.textContent = state.destinationFollow ? "따라가기 종료" : "답사 따라가기";
  els.followRouteBtn.classList.toggle("is-active", state.destinationFollow);
  els.followRouteBtn.disabled = state.shareView ? routePoints.length < 2 : false;
  if (routePoints.length < 2) {
    els.routeFollowStatus.textContent = "기록된 동선을 불러오면 답사 따라가기를 시작할 수 있습니다.";
    els.routeFollowStatus.classList.remove("is-off-route");
    return;
  }
  if (!state.destinationFollow) {
    els.routeFollowStatus.textContent = `답사 대기 · 기록 동선 ${routePoints.length}점`;
    els.routeFollowStatus.classList.remove("is-off-route");
    return;
  }
  const currentNearest = nearest || (point ? findNearestRoutePosition(point, routePoints) : null);
  const distanceText = currentNearest ? ` · 경로와 ${Math.round(currentNearest.distanceMeters)}m` : "";
  els.routeFollowStatus.textContent = state.routeOffTrack
    ? `경로 이탈${distanceText}`
    : `답사 진행 중${distanceText}`;
  els.routeFollowStatus.classList.toggle("is-off-route", state.routeOffTrack);
}

function findNearestRoutePosition(point, routePoints) {
  if (!point || routePoints.length < 2) {
    return null;
  }
  let nearest = null;
  for (let index = 0; index < routePoints.length - 1; index += 1) {
    const candidate = getPointToSegmentDistance(point, routePoints[index], routePoints[index + 1]);
    if (!nearest || candidate.distanceMeters < nearest.distanceMeters) {
      nearest = {
        ...candidate,
        segmentIndex: index,
      };
    }
  }
  return nearest;
}

function getPointToSegmentDistance(point, start, end) {
  const averageLat = toRad((start.lat + end.lat + point.lat) / 3);
  const metersPerDegreeLat = 111320;
  const metersPerDegreeLng = Math.max(1, metersPerDegreeLat * Math.cos(averageLat));
  const bx = (end.lng - start.lng) * metersPerDegreeLng;
  const by = (end.lat - start.lat) * metersPerDegreeLat;
  const px = (point.lng - start.lng) * metersPerDegreeLng;
  const py = (point.lat - start.lat) * metersPerDegreeLat;
  const lengthSquared = bx * bx + by * by;
  const segmentRatio = lengthSquared > 0 ? Math.max(0, Math.min(1, (px * bx + py * by) / lengthSquared)) : 0;
  const nearestX = bx * segmentRatio;
  const nearestY = by * segmentRatio;
  return {
    distanceMeters: Math.hypot(px - nearestX, py - nearestY),
    segmentRatio,
  };
}

function speakRouteGuidance(message) {
  if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(message);
  utterance.lang = "ko-KR";
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
}

function editMapPin(pinId) {
  const pin = state.milestones.find((item) => item.id === pinId);
  if (!pin) {
    return;
  }
  const name = window.prompt("핀 이름", pin.name || getPinTypeLabel(pin.type));
  if (name === null) {
    return;
  }
  const memo = window.prompt("핀 메모", pin.memo || "");
  if (memo === null) {
    return;
  }
  let displayCode = pin.displayCode;
  if (pin.type === "construction") {
    const code = window.prompt("지도 표시 코드 (예: C1, D1)", getMapPinLabel(pin));
    if (code === null) {
      return;
    }
    displayCode = normalizeConstructionCode(code, getMapPinLabel(pin));
  }
  pin.name = name.trim() || getPinTypeLabel(pin.type);
  pin.memo = memo.trim();
  if (pin.type === "construction") {
    pin.displayCode = displayCode;
    pin.color = normalizeConstructionColor(pin.color);
  }
  pin.editedAt = Date.now();
  persist();
  renderMilestones();
  syncProjectState("edit-pin");
  setStatus("핀 정보를 수정했습니다. 위치 편집을 켜면 지도에서 핀을 드래그해 보정할 수 있습니다.");
}

function deleteMapPin(pinId) {
  const pin = state.milestones.find((item) => item.id === pinId);
  const ok = window.confirm(`${pin?.name || "핀"}을 삭제할까요?`);
  if (!ok) {
    return;
  }
  state.milestones = state.milestones.filter((item) => item.id !== pinId);
  persist();
  renderMilestones();
  syncProjectState("delete-pin");
  setStatus("핀을 삭제했습니다.");
}

function getPinTypeLabel(type) {
  return type === "construction" ? "공사구역" : "목적지";
}

function getMapPinLabel(pin) {
  if (pin.type === "construction") {
    return normalizeConstructionCode(pin.displayCode, `C${getConstructionPinNumber(pin)}`);
  }
  return `T${pin.priority || "?"}`;
}

function getConstructionPinNumber(pin) {
  const constructions = state.milestones
    .filter((item) => item.type === "construction")
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  const index = constructions.findIndex((item) => item.id === pin.id);
  return index >= 0 ? index + 1 : "?";
}

function getNextConstructionCode() {
  const usedNumbers = state.milestones
    .filter((pin) => pin.type === "construction")
    .map((pin) => getMapPinLabel(pin).match(/^C(\d+)$/i))
    .filter(Boolean)
    .map((match) => Number(match[1]));
  return `C${Math.max(0, ...usedNumbers) + 1}`;
}

function normalizeConstructionCode(value, fallback = "C?") {
  const normalized = String(value || "")
    .trim()
    .replace(/\s+/g, "")
    .slice(0, 8)
    .toUpperCase();
  return normalized || fallback;
}

function normalizeConstructionColor(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "#c79a00" || normalized === "#a97800") {
    return BRIGHT_YELLOW_COLOR;
  }
  if (normalized === "#5f6b66") {
    return "#3f4a46";
  }
  return /^#[0-9a-f]{6}$/.test(normalized) ? normalized : DEFAULT_CONSTRUCTION_COLOR;
}

function normalizeMilestones(milestones) {
  const normalized = milestones.map((pin) => ({ ...pin }));
  const constructions = normalized
    .filter((pin) => pin.type === "construction")
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  const usedCodes = new Set(
    constructions
      .map((pin) => normalizeConstructionCode(pin.displayCode || pin.code, ""))
      .filter(Boolean),
  );
  let nextNumber = 1;
  constructions.forEach((pin) => {
    let displayCode = normalizeConstructionCode(pin.displayCode || pin.code, "");
    if (!displayCode) {
      while (usedCodes.has(`C${nextNumber}`)) {
        nextNumber += 1;
      }
      displayCode = `C${nextNumber}`;
      usedCodes.add(displayCode);
      nextNumber += 1;
    }
    pin.displayCode = displayCode;
    pin.color = normalizeConstructionColor(pin.color);
  });
  return normalized;
}

function updateConstructionPinColor(pinId, color) {
  const pin = state.milestones.find((item) => item.id === pinId && item.type === "construction");
  if (!pin) {
    return;
  }
  pin.color = normalizeConstructionColor(color);
  pin.editedAt = Date.now();
  persist();
  renderMilestones();
  syncProjectState("edit-construction-color");
  setStatus(`${getMapPinLabel(pin)} 공사구역 색상을 변경했습니다.`);
}

function createMapPinHtml(type, label, color = "") {
  const pinColor = normalizeConstructionColor(color);
  const foreground = pinColor === BRIGHT_YELLOW_COLOR ? ";color:#3b3210" : "";
  const background = type === "construction" ? ` style="background:${pinColor}${foreground}"` : "";
  return `<span class="map-pin map-pin--${type}"${background}><b>${escapeHtml(label)}</b></span>`;
}

function setupColorPicker() {
  if (!els.colorPickerModal) {
    return;
  }
  els.colorPickerCancelBtn?.addEventListener("click", closeRepresentativeColorPicker);
  els.colorPickerModal.querySelector("[data-color-picker-close]")?.addEventListener("click", closeRepresentativeColorPicker);
  els.colorPickerConfirmBtn?.addEventListener("click", () => {
    const handler = colorPickerConfirmHandler;
    const color = colorPickerSelection;
    closeRepresentativeColorPicker();
    handler?.(color);
  });
}

function openRepresentativeColorPicker({ title = "대표 색상 선택", currentColor, onConfirm }) {
  if (!els.colorPickerModal || !els.colorPickerOptions) {
    return;
  }
  const normalizedCurrent = normalizeConstructionColor(currentColor);
  colorPickerSelection =
    REPRESENTATIVE_COLORS.find((color) => color.value === normalizedCurrent)?.value || DEFAULT_CONSTRUCTION_COLOR;
  colorPickerConfirmHandler = onConfirm;
  els.colorPickerTitle.textContent = title;
  renderRepresentativeColorOptions();
  els.colorPickerModal.hidden = false;
}

function renderRepresentativeColorOptions() {
  els.colorPickerOptions.innerHTML = "";
  REPRESENTATIVE_COLORS.forEach((color) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "representative-color";
    button.classList.toggle("is-selected", color.value === colorPickerSelection);
    button.setAttribute("aria-label", color.name);
    button.innerHTML = `<span style="background:${color.value}"></span><b>${color.name}</b>`;
    button.addEventListener("click", () => {
      colorPickerSelection = color.value;
      renderRepresentativeColorOptions();
    });
    els.colorPickerOptions.append(button);
  });
}

function closeRepresentativeColorPicker() {
  if (els.colorPickerModal) {
    els.colorPickerModal.hidden = true;
  }
  colorPickerConfirmHandler = null;
}

function createPinIconButton(label, icon, color = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `pin-icon-button pin-icon-button--${icon}`;
  button.title = label;
  button.setAttribute("aria-label", label);
  if (icon === "color") {
    button.innerHTML = `<span class="pin-color-dot" style="background:${normalizeConstructionColor(color)}"></span>`;
    return button;
  }
  const icons = {
    view: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="3"/></svg>',
    edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 20 4.2-1 10.7-10.7-3.2-3.2L5 15.8 4 20Z"/><path d="m14.8 6 3.2 3.2"/></svg>',
    delete: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5"/></svg>',
  };
  button.innerHTML = icons[icon] || "";
  return button;
}

async function addOverlayProject() {
  const code = normalizeProjectCode(els.overlayProjectCode?.value);
  if (!code) {
    setStatus("비교할 프로젝트 공유 코드를 입력해 주세요.");
    return;
  }
  if (code === state.projectCode) {
    setStatus("현재 프로젝트는 이미 기본 동선으로 표시 중입니다.");
    return;
  }
  if (state.overlayProjects.some((project) => project.code === code)) {
    setStatus("이미 추가한 비교 프로젝트입니다.");
    return;
  }

  setStatus(`${code} 프로젝트를 불러오는 중입니다.`);
  try {
    const project = await requestJson(`/api/projects/${encodeURIComponent(code)}`);
    const overlay = createOverlayProject(project);
    state.overlayProjects.push(overlay);
    if (els.overlayProjectCode) {
      els.overlayProjectCode.value = "";
    }
    persist();
    renderProjectOverlays();
    setStatus(`${overlay.name} 동선을 비교 화면에 추가했습니다.`);
  } catch {
    setStatus("비교 프로젝트를 찾지 못했습니다. 공유 코드를 확인해 주세요.");
  }
}

function createOverlayProject(project) {
  const nextIndex = state.overlayProjects.length;
  const sessions = Array.isArray(project.sessions) ? project.sessions : [];
  const primarySession =
    sessions.find((session) => session.id === project.primarySessionId) ||
    sessions[0] ||
    null;
  const primaryPoints = Array.isArray(primarySession?.points) ? primarySession.points : [];
  const lastStatePoints = Array.isArray(project.lastState?.points) ? project.lastState.points : [];
  return normalizeOverlayProject({
    code: project.code,
    name: project.name || project.code,
    color: OVERLAY_COLORS[nextIndex % OVERLAY_COLORS.length],
    visible: true,
    points: primaryPoints.length > 0 ? primaryPoints : lastStatePoints,
    milestones: Array.isArray(project.lastState?.milestones) ? project.lastState.milestones : [],
  }, nextIndex);
}

function normalizeOverlayProject(project, fallbackIndex = 0) {
  if (!project?.code) {
    return null;
  }
  return {
    code: normalizeProjectCode(project.code),
    name: project.name || project.code,
    color: normalizeConstructionColor(project.color || OVERLAY_COLORS[fallbackIndex % OVERLAY_COLORS.length]),
    visible: project.visible !== false,
    points: Array.isArray(project.points) ? project.points : [],
    milestones: Array.isArray(project.milestones) ? project.milestones : [],
  };
}

function renderProjectOverlays() {
  projectOverlayLayer.clearLayers();
  if (!els.overlayProjectList) {
    return;
  }
  els.overlayProjectList.innerHTML = "";

  if (state.overlayProjects.length === 0) {
    const empty = document.createElement("p");
    empty.className = "status-text";
    empty.textContent = "아직 함께 보는 프로젝트가 없습니다.";
    els.overlayProjectList.append(empty);
    return;
  }

  state.overlayProjects.forEach((project) => {
    const points = Array.isArray(project.points) ? project.points : [];
    if (project.visible !== false && points.length > 0) {
      L.polyline(points.map((point) => [point.lat, point.lng]), {
        color: project.color,
        weight: 5,
        opacity: 0.82,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(projectOverlayLayer);
    }

    const item = document.createElement("article");
    item.className = "overlay-item";

    const toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.checked = project.visible !== false;
    toggle.title = project.visible === false ? "보기" : "숨기기";
    toggle.addEventListener("change", () => {
      project.visible = toggle.checked;
      persist();
      renderProjectOverlays();
    });

    const swatch = document.createElement("button");
    swatch.type = "button";
    swatch.className = "overlay-swatch overlay-color-button";
    swatch.title = `${project.name} 대표 색상`;
    swatch.setAttribute("aria-label", `${project.name} 대표 색상 변경`);
    swatch.style.backgroundColor = project.color;
    swatch.addEventListener("click", () => {
      openRepresentativeColorPicker({
        title: `${project.name} 비교 노선 색상`,
        currentColor: project.color,
        onConfirm: (color) => updateOverlayProjectColor(project.code, color),
      });
    });

    const body = document.createElement("div");
    const title = document.createElement("strong");
    const meta = document.createElement("span");
    title.textContent = project.name;
    meta.textContent = `${project.code} · ${points.length}점`;
    body.append(title, meta);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.textContent = "삭제";
    removeButton.addEventListener("click", () => removeOverlayProject(project.code));

    item.append(toggle, swatch, body, removeButton);
    els.overlayProjectList.append(item);
  });
}

function removeOverlayProject(code) {
  state.overlayProjects = state.overlayProjects.filter((project) => project.code !== code);
  persist();
  renderProjectOverlays();
  setStatus("비교 프로젝트를 화면에서 제거했습니다.");
}

function getPhotoDisplayName(photo) {
  return photo.displayName || photo.name || "사진";
}

function getNextPhotoName() {
  return getNextProjectPhotoName();
}

function updateOverlayProjectColor(code, color) {
  const project = state.overlayProjects.find((item) => item.code === code);
  if (!project) {
    return;
  }
  project.color = normalizeConstructionColor(color);
  persist();
  renderProjectOverlays();
  setStatus(`${project.name} 비교 노선 색상을 변경했습니다.`);
}

function getNextProjectPhotoName() {
  const prefix = getProjectNamePrefix();
  const escapedPrefix = escapeRegExp(prefix);
  const numbers = state.photos
    .map((photo) => photo.displayName || photo.name || "")
    .map((name) => {
      const projectMatch = String(name).match(new RegExp(`^${escapedPrefix}-(\\d+)$`));
      if (projectMatch) {
        return Number(projectMatch[1]);
      }
      const legacyMatch = String(name).match(/(\d+)$/);
      return legacyMatch ? Number(legacyMatch[1]) : 0;
    });
  const nextNumber = Math.max(0, ...numbers) + 1;
  return `${prefix}-${String(nextNumber).padStart(3, "0")}`;
}

function getProjectNamePrefix() {
  return sanitizeLabel(state.projectName || els.projectName?.value || "프로젝트");
}

function sanitizeLabel(value) {
  return (
    String(value || "프로젝트")
      .trim()
      .replace(/[\\/:*?"<>|#%{}[\]^~`]/g, "")
      .replace(/\s+/g, "")
      .slice(0, 24) || "프로젝트"
  );
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getVisiblePhotos() {
  const filter = state.photoFilter || "all";
  const todayKey = new Date().toDateString();
  const bounds = getCurrentMapBounds();

  return state.photos.filter((photo) => {
    if (filter.startsWith("tag:")) {
      const selectedTag = filter.slice(4);
      return getPhotoTags(photo).includes(selectedTag);
    }
    if (filter === "positioned") {
      return hasPhotoPosition(photo);
    }
    if (filter === "missing") {
      return !hasPhotoPosition(photo);
    }
    if (filter === "memo") {
      return Boolean(photo.memo?.trim());
    }
    if (filter === "tagged") {
      return Boolean(photo.tags?.trim());
    }
    if (filter === "today") {
      return new Date(photo.timestamp).toDateString() === todayKey;
    }
    if (filter === "map") {
      return hasPhotoPosition(photo) && bounds && containsPoint(bounds, photo);
    }
    return true;
  });
}

function syncPhotoFilterOptions() {
  const currentValue = state.photoFilter || "all";
  const baseOptions = [
    ["all", "전체"],
    ["hidden", "사진 숨김"],
    ["positioned", "위치 있음"],
    ["missing", "위치 없음"],
    ["map", "현재 지도"],
    ["memo", "메모 있음"],
    ["tagged", "태그 있음"],
  ];
  const tags = getAllPhotoTags();
  els.photoFilter.innerHTML = "";
  baseOptions.forEach(([value, label]) => {
    els.photoFilter.append(new Option(label, value));
  });
  tags.forEach((tag) => {
    els.photoFilter.append(new Option(`태그: ${tag}`, `tag:${tag}`));
  });
  els.photoFilter.append(new Option("오늘", "today"));
  const availableValues = new Set([
    ...baseOptions.map(([value]) => value),
    ...tags.map((tag) => `tag:${tag}`),
    "today",
  ]);
  if (!availableValues.has(currentValue)) {
    state.photoFilter = "all";
  }
}

function getAllPhotoTags() {
  return [...new Set(state.photos.flatMap((photo) => getPhotoTags(photo)))].sort((a, b) =>
    a.localeCompare(b, "ko"),
  );
}

function openPhotoModal(photo) {
  const hasPosition = hasPhotoPosition(photo);
  state.activePhotoId = photo.id;
  els.photoModalImage.src = photo.src;
  els.photoModalImage.alt = getPhotoDisplayName(photo);
  els.photoModalTitle.textContent = getPhotoDisplayName(photo);
  els.photoModalMeta.textContent = hasPosition
    ? `${formatDate(photo.timestamp)} · ${photo.lat.toFixed(5)}, ${photo.lng.toFixed(5)} · ${getLocationSourceLabel(photo.locationSource)}`
    : `${formatDate(photo.timestamp)} · 위치 없음`;
  els.photoModalMemo.textContent = photo.memo?.trim() || "등록된 메모가 없습니다.";
  els.photoModalMemo.classList.toggle("is-empty", !photo.memo?.trim());
  renderModalTags(photo);
  els.photoModalLocateBtn.disabled = !hasPosition;
  els.photoModal.hidden = false;
  document.body.classList.add("is-photo-modal-open");
}

function closePhotoModal() {
  els.photoModal.hidden = true;
  state.activePhotoId = null;
  els.photoModalImage.removeAttribute("src");
  document.body.classList.remove("is-photo-modal-open");
}

function getActiveModalPhoto() {
  return state.photos.find((photo) => photo.id === state.activePhotoId) || null;
}

function renderModalTags(photo) {
  els.photoModalTags.innerHTML = "";
  const tags = getPhotoTags(photo);
  if (tags.length === 0) {
    const empty = document.createElement("span");
    empty.className = "is-empty";
    empty.textContent = "등록된 태그가 없습니다.";
    els.photoModalTags.append(empty);
    return;
  }
  tags.forEach((tag) => {
    const chip = document.createElement("span");
    chip.textContent = tag;
    els.photoModalTags.append(chip);
  });
}

function getPhotoTags(photo) {
  return String(photo.tags || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function getCurrentMapBounds() {
  if (typeof map.getBounds !== "function") {
    return null;
  }
  try {
    return map.getBounds();
  } catch {
    return null;
  }
}

function containsPoint(bounds, point) {
  if (typeof bounds.contains === "function") {
    return bounds.contains([point.lat, point.lng]);
  }
  return true;
}

function editPhotoMemo(photoId, options = {}) {
  const photo = state.photos.find((item) => item.id === photoId);
  if (!photo) {
    return;
  }
  const memo = window.prompt("사진 메모", photo.memo || "");
  if (memo === null) {
    return;
  }
  photo.memo = memo.trim();
  persist();
  renderPhotos();
  if (options.keepModalOpen) {
    openPhotoModal(photo);
  }
}

function editPhotoTags(photoId, options = {}) {
  const photo = state.photos.find((item) => item.id === photoId);
  if (!photo) {
    return;
  }
  const tags = window.prompt("태그를 쉼표로 구분해 입력", photo.tags || "");
  if (tags === null) {
    return;
  }
  photo.tags = tags.trim();
  persist();
  renderPhotos();
  if (options.keepModalOpen) {
    openPhotoModal(photo);
  }
}

function movePhotoToLatLng(photoId, latlng) {
  const photo = state.photos.find((item) => item.id === photoId);
  if (!photo) {
    return;
  }
  photo.lat = latlng.lat;
  photo.lng = latlng.lng;
  photo.locationSource = "map";
  photo.positionEdited = true;
  photo.positionEditedAt = Date.now();
  state.selectedPosition = {
    lat: latlng.lat,
    lng: latlng.lng,
    timestamp: Date.now(),
  };
  persist();
  render();
  setStatus(`${getPhotoDisplayName(photo)} 위치를 현재 지도 위치로 수정했습니다.`, "success");
}

function deletePhoto(photoId) {
  const ok = window.confirm("이 사진을 삭제할까요?");
  if (!ok) {
    return;
  }
  state.photos = state.photos.filter((item) => item.id !== photoId);
  persist();
  render();
  setStatus("사진을 삭제했습니다.");
}

function renderStats() {
  els.distanceValue.textContent = `${(getTotalDistance() / 1000).toFixed(2)} km`;
  els.pointValue.textContent = String(state.points.length);
  els.photoValue.textContent = String(state.photos.length);
}

function renderTrackingState() {
  els.trackBtn.classList.toggle("is-active", state.tracking);
  els.trackBtn.querySelector("span:last-child").textContent = state.tracking ? "기록 완료" : "기록 시작";
  els.pauseBtn.disabled = !state.tracking;
  els.pauseBtn.querySelector("span:last-child").textContent = state.paused ? "재시작" : "일시정지";
  els.trackingBadge.textContent = state.tracking ? (state.paused ? "일시정지" : "기록 중") : "대기";
  els.trackingBadge.classList.toggle("is-live", state.tracking);
  els.trackingBadge.classList.toggle("is-paused", state.paused);
  if (els.autoFollowBtn) {
    els.autoFollowBtn.classList.toggle("is-active", Boolean(state.autoFollow));
    els.autoFollowBtn.title = state.autoFollow ? "자동 따라가기 켜짐" : "자동 따라가기 꺼짐";
    els.autoFollowBtn.setAttribute("aria-label", els.autoFollowBtn.title);
  }
  els.mapProvider.value = state.mapProvider || "osm";
  els.wakeLockToggle.checked = Boolean(state.wakeLockEnabled);
}

function renderSessions() {
  if (!els.historyList) {
    return;
  }

  els.historyList.innerHTML = "";
  if (state.sessions.length === 0) {
    const empty = document.createElement("p");
    empty.className = "status-text";
    empty.textContent = "아직 저장된 기록이 없습니다.";
    els.historyList.append(empty);
    return;
  }

  state.sessions.forEach((session) => {
    const isPrimary = state.primarySessionId === session.id;
    const item = document.createElement("article");
    item.className = "history-item";
    item.classList.toggle("is-continuing", state.continuingSessionId === session.id);
    item.classList.toggle("is-primary", isPrimary);

    const body = document.createElement("div");
    const title = document.createElement("strong");
    const meta = document.createElement("span");
    title.textContent = session.name || `${formatDate(session.startedAt)} 기록`;
    meta.textContent = `${((session.distanceMeters || 0) / 1000).toFixed(2)} km · ${(session.points || []).length}점 · ${(session.photos || []).length}사진`;
    body.append(title, meta);
    if (session.memo?.trim()) {
      const memo = document.createElement("small");
      memo.className = "history-memo";
      memo.textContent = session.memo.trim();
      body.append(memo);
    }

    const actions = document.createElement("div");
    actions.className = "history-actions";
    const primaryButton = document.createElement("button");
    primaryButton.type = "button";
    primaryButton.textContent = isPrimary ? "대표" : "대표 지정";
    primaryButton.disabled = isPrimary;
    primaryButton.className = "history-primary-action";
    primaryButton.addEventListener("click", () => setPrimarySession(session.id));
    const resumeButton = document.createElement("button");
    resumeButton.type = "button";
    resumeButton.textContent = state.continuingSessionId === session.id ? "이어가는 중" : "이어가기";
    resumeButton.disabled = state.continuingSessionId === session.id;
    resumeButton.className = "history-resume-action";
    resumeButton.addEventListener("click", () => resumeSession(session.id));
    const loadButton = document.createElement("button");
    loadButton.type = "button";
    loadButton.textContent = "보기";
    loadButton.addEventListener("click", () => loadSession(session.id));
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "수정";
    editButton.addEventListener("click", () => editSessionDetails(session.id));
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "삭제";
    deleteButton.addEventListener("click", () => deleteSession(session.id));
    actions.append(primaryButton, resumeButton, loadButton, editButton, deleteButton);

    item.append(body, actions);
    els.historyList.append(item);
  });
}

function fitToData() {
  const bounds = L.latLngBounds([]);
  state.points.forEach((point) => bounds.extend([point.lat, point.lng]));
  state.photos.filter(hasPhotoPosition).forEach((photo) => bounds.extend([photo.lat, photo.lng]));
  state.milestones
    .filter((pin) => pin.type === "construction")
    .forEach((pin) => bounds.extend([pin.lat, pin.lng]));
  state.overlayProjects
    .filter((project) => project.visible !== false)
    .forEach((project) => project.points.forEach((point) => bounds.extend([point.lat, point.lng])));

  if (bounds.isValid()) {
    map.fitBounds(bounds, { padding: [42, 42], maxZoom: 17 });
  }
}

function getLatestPosition() {
  return state.selectedPosition || state.points.at(-1) || null;
}

function hasPhotoPosition(photo) {
  return Number.isFinite(photo.lat) && Number.isFinite(photo.lng);
}

function getLocationSourceLabel(source) {
  const labels = {
    exif: "사진 GPS",
    gps: "현재 GPS",
    map: "지도 선택",
    initial: "접속 위치",
    none: "위치 없음",
  };
  return labels[source] || "위치";
}

function getTotalDistance() {
  const routePoints = getRoutePathPoints(state.points);
  return routePoints.reduce((total, point, index, points) => {
    if (index === 0) {
      return total;
    }
    return total + getDistanceMeters(points[index - 1], point);
  }, 0);
}

function getRoutePathPoints(points = []) {
  return points.filter((point) => point && point.skipInRoute !== true);
}

function formatDistance(meters) {
  if (!Number.isFinite(meters)) {
    return "-";
  }
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${Math.round(meters)} m`;
}

function getDistanceMeters(a, b) {
  const earthRadius = 6371000;
  const latA = toRad(a.lat);
  const latB = toRad(b.lat);
  const deltaLat = toRad(b.lat - a.lat);
  const deltaLng = toRad(b.lng - a.lng);
  const hav =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(latA) * Math.cos(latB) * Math.sin(deltaLng / 2) ** 2;
  return 2 * earthRadius * Math.atan2(Math.sqrt(hav), Math.sqrt(1 - hav));
}

function toRad(value) {
  return (value * Math.PI) / 180;
}

function persist() {
  const payload = getPersistPayload();
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(payload),
    );
  } catch (error) {
    console.warn("Storage failed", error);
    const compactPayload = compactLargePhotos(payload);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(compactPayload));
      state.photos = compactPayload.photos;
      state.sessions = compactPayload.sessions;
      setStatus("저장공간 보호를 위해 일부 사진은 가벼운 표시 이미지로 바꿔 저장했습니다.");
      return;
    } catch (fallbackError) {
      console.warn("Compact storage failed", fallbackError);
    }
    setStatus("저장 공간이 부족합니다. 오래된 사진이나 기록을 삭제해 주세요.");
  }
}

function getPersistPayload() {
  return {
    points: state.points,
    photos: state.photos,
    milestones: state.milestones,
    overlayProjects: state.overlayProjects,
    sessions: state.sessions,
    primarySessionId: state.primarySessionId,
    selectedPosition: state.selectedPosition,
    initialPosition: state.initialPosition,
    activeStartedAt: state.activeStartedAt,
    adminPanelOpen: state.adminPanelOpen,
    authPanelOpen: state.authPanelOpen,
    sharePanelOpen: state.sharePanelOpen,
    recordPanelOpen: state.recordPanelOpen,
    pointEditPanelOpen: state.pointEditPanelOpen,
    destinationFollow: state.destinationFollow,
    continuingSessionId: state.continuingSessionId,
    wakeLockEnabled: state.wakeLockEnabled,
    autoFollow: state.autoFollow,
    mapProvider: state.mapProvider,
    photoFilter: state.photoFilter,
    photoView: state.photoView,
    projectCode: state.projectCode,
    projectName: state.projectName,
    syncDirty: state.syncDirty,
    lastSyncedAt: state.lastSyncedAt,
    lastSyncFailedAt: state.lastSyncFailedAt,
    lastSyncError: state.lastSyncError,
  };
}

function compactLargePhotos(payload) {
  return {
    ...payload,
    photos: compactPhotoList(payload.photos),
    sessions: payload.sessions.map((session) => ({
      ...session,
      photos: compactPhotoList(session.photos || []),
    })),
  };
}

function compactPhotoList(photos) {
  return photos.map((photo) => {
    if (!photo.src || photo.src.length <= MAX_STORED_IMAGE_LENGTH) {
      return photo;
    }
    return {
      ...photo,
      src: createPlaceholderPhotoSrc(photo.name),
      compacted: true,
    };
  });
}

function createPlaceholderPhotoSrc(name = "photo") {
  const label = escapeHtml(String(name).slice(0, 24));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240" viewBox="0 0 320 240"><rect width="320" height="240" fill="#e7eee8"/><path d="M64 158l50-54 34 38 24-25 84 86H64z" fill="#8da899"/><circle cx="222" cy="82" r="24" fill="#c98c2b"/><text x="160" y="218" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#52615b">${label}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    state.points = Array.isArray(saved.points) ? saved.points : [];
    state.photos = Array.isArray(saved.photos) ? saved.photos : [];
    state.milestones = normalizeMilestones(Array.isArray(saved.milestones) ? saved.milestones : []);
    state.overlayProjects = Array.isArray(saved.overlayProjects)
      ? saved.overlayProjects.map((project, index) => normalizeOverlayProject(project, index)).filter(Boolean)
      : [];
    state.sessions = Array.isArray(saved.sessions) ? saved.sessions : [];
    state.primarySessionId = saved.primarySessionId || state.sessions[0]?.id || null;
    state.selectedPosition = saved.selectedPosition || state.points.at(-1) || null;
    state.initialPosition = saved.initialPosition || null;
    state.activeStartedAt = saved.activeStartedAt || null;
    state.adminPanelOpen = Boolean(saved.adminPanelOpen);
    state.authPanelOpen = saved.authPanelOpen !== false;
    state.sharePanelOpen = Boolean(saved.sharePanelOpen);
    state.recordPanelOpen = saved.recordPanelOpen !== false;
    state.pointEditPanelOpen = Boolean(saved.pointEditPanelOpen);
    state.pointEditMode = state.pointEditPanelOpen;
    state.destinationFollow = false;
    state.followProgressIndex = 0;
    state.routeOffTrack = false;
    state.routeDeviationSamples = 0;
    state.routeRecoverySamples = 0;
    state.continuingSessionId = saved.continuingSessionId || null;
    state.wakeLockEnabled = Boolean(saved.wakeLockEnabled);
    state.autoFollow = saved.autoFollow !== false;
    state.mapProvider = saved.mapProvider || "osm";
    state.photoFilter = saved.photoFilter || "all";
    state.photoView = saved.photoView || "list";
    state.projectCode = saved.projectCode || "";
    state.projectName = typeof saved.projectName === "string" ? saved.projectName : "프로젝트A";
    state.syncDirty = Boolean(saved.syncDirty);
    state.syncing = false;
    state.lastSyncedAt = saved.lastSyncedAt || null;
    state.lastSyncFailedAt = saved.lastSyncFailedAt || null;
    state.lastSyncError = saved.lastSyncError || "";
  } catch {
    state.points = [];
    state.photos = [];
    state.milestones = [];
    state.overlayProjects = [];
    state.sessions = [];
    state.primarySessionId = null;
    state.selectedPosition = null;
    state.initialPosition = null;
    state.activeStartedAt = null;
    state.adminPanelOpen = false;
    state.authPanelOpen = true;
    state.sharePanelOpen = false;
    state.recordPanelOpen = true;
    state.pointEditPanelOpen = false;
    state.pointEditMode = false;
    state.destinationFollow = false;
    state.followProgressIndex = 0;
    state.routeOffTrack = false;
    state.routeDeviationSamples = 0;
    state.routeRecoverySamples = 0;
    state.continuingSessionId = null;
    state.wakeLockEnabled = false;
    state.autoFollow = true;
    state.mapProvider = "osm";
    state.photoFilter = "all";
    state.photoView = "list";
    state.projectCode = "";
    state.projectName = "프로젝트A";
  }
}

function setStatus(message, type = inferStatusType(message)) {
  els.statusText.textContent = message;
  els.statusText.classList.remove("status-info", "status-active", "status-success", "status-warning", "status-error");
  els.statusText.classList.add(`status-${type}`);
}

function inferStatusType(message = "") {
  const text = String(message);
  if (/실패|오류|거부|초과|부족|못했습니다|없습니다|차단/.test(text)) {
    return "error";
  }
  if (/기록하고 있습니다|확인하는 중|불러오는 중|찾는 중|진행 중|따라갑니다/.test(text)) {
    return "active";
  }
  if (/저장했습니다|추가했습니다|삭제했습니다|완료|도착|반영했습니다|열었습니다|옮겼습니다|보정했습니다|수정했습니다/.test(text)) {
    return "success";
  }
  if (/주의|확인|권한|숨김|기다려|일시정지|직접 움직여/.test(text)) {
    return "warning";
  }
  return "info";
}

function showLocationReadiness() {
  if (!window.isSecureContext && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
    setStatus("현재 주소는 HTTP라서 모바일 GPS 권한이 차단될 수 있습니다. HTTPS 주소로 열면 실제 위치 기록이 가능합니다.");
  }
}

function canUsePreciseLocation() {
  if (!window.isSecureContext && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") {
    setStatus("모바일 GPS는 HTTPS에서만 사용할 수 있습니다. 현재 HTTP 주소에서는 화면 확인과 샘플 동선만 사용할 수 있습니다.");
    return false;
  }
  return true;
}

function getLocationErrorMessage(error) {
  if (error.code === error.PERMISSION_DENIED) {
    return "위치 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해 주세요.";
  }
  if (error.code === error.POSITION_UNAVAILABLE) {
    return "현재 위치를 계산할 수 없습니다. 실외에서 GPS/Wi-Fi/모바일 데이터를 켠 뒤 다시 시도해 주세요.";
  }
  if (error.code === error.TIMEOUT) {
    return "위치 신호를 기다리다 시간이 초과되었습니다. 하늘이 보이는 곳에서 다시 시도해 주세요.";
  }
  return `현재 위치를 가져오지 못했습니다. (${error.message})`;
}

function getDefaultSessionName(timestamp = Date.now()) {
  return `${state.projectName || "프로젝트"} ${formatSessionDateTime(timestamp)}`;
}

function formatSessionDateTime(timestamp) {
  const date = new Date(timestamp);
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDate(timestamp) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[char];
  });
}

function createFallbackMapApi() {
  class MiniMap {
    constructor(id) {
      this.container = document.getElementById(id);
      this.container.classList.add("mini-map");
      this.center = { lat: 37.5665, lng: 126.978 };
      this.zoom = 15;
      this.bounds = this.makeBoundsFromCenter();
      this.handlers = {};
      this.layers = new Set();
      this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      this.svg.classList.add("mini-map-svg");
      this.markerPane = document.createElement("div");
      this.markerPane.className = "mini-map-markers";
      this.container.append(this.svg, this.markerPane);
      this.container.addEventListener("click", (event) => this.handleClick(event));
      this.paintBackdrop();
    }

    setView(latLng, zoom = this.zoom) {
      this.center = { lat: latLng[0], lng: latLng[1] };
      this.zoom = zoom;
      this.bounds = this.makeBoundsFromCenter();
      this.render();
      return this;
    }

    getCenter() {
      return { ...this.center };
    }

    getZoom() {
      return this.zoom;
    }

    fitBounds(bounds) {
      if (!bounds.isValid()) {
        return this;
      }
      this.bounds = bounds.pad(0.18);
      this.center = {
        lat: (this.bounds.minLat + this.bounds.maxLat) / 2,
        lng: (this.bounds.minLng + this.bounds.maxLng) / 2,
      };
      this.render();
      return this;
    }

    on(name, handler) {
      this.handlers[name] = this.handlers[name] || [];
      this.handlers[name].push(handler);
      return this;
    }

    addLayer(layer) {
      layer.map = this;
      this.layers.add(layer);
      layer.render?.();
      return this;
    }

    render() {
      this.paintBackdrop();
      this.layers.forEach((layer) => layer.render?.());
    }

    project(point) {
      const rect = this.container.getBoundingClientRect();
      const x = ((point.lng - this.bounds.minLng) / (this.bounds.maxLng - this.bounds.minLng)) * rect.width;
      const y = ((this.bounds.maxLat - point.lat) / (this.bounds.maxLat - this.bounds.minLat)) * rect.height;
      return { x, y };
    }

    unproject(x, y) {
      const rect = this.container.getBoundingClientRect();
      return {
        lat: this.bounds.maxLat - (y / rect.height) * (this.bounds.maxLat - this.bounds.minLat),
        lng: this.bounds.minLng + (x / rect.width) * (this.bounds.maxLng - this.bounds.minLng),
      };
    }

    makeBoundsFromCenter() {
      const span = 0.09 / 2 ** Math.max(this.zoom - 12, 0);
      return new MiniBounds([
        [this.center.lat - span / 2, this.center.lng - span / 2],
        [this.center.lat + span / 2, this.center.lng + span / 2],
      ]);
    }

    handleClick(event) {
      const rect = this.container.getBoundingClientRect();
      const latlng = this.unproject(event.clientX - rect.left, event.clientY - rect.top);
      (this.handlers.click || []).forEach((handler) => handler({ latlng }));
    }

    paintBackdrop() {
      this.container.style.setProperty("--mini-center", `"${this.center.lat.toFixed(4)}, ${this.center.lng.toFixed(4)}"`);
    }
  }

  class MiniBounds {
    constructor(points = []) {
      this.minLat = Infinity;
      this.maxLat = -Infinity;
      this.minLng = Infinity;
      this.maxLng = -Infinity;
      points.forEach((point) => this.extend(point));
    }

    extend(point) {
      const lat = Array.isArray(point) ? point[0] : point.lat;
      const lng = Array.isArray(point) ? point[1] : point.lng;
      this.minLat = Math.min(this.minLat, lat);
      this.maxLat = Math.max(this.maxLat, lat);
      this.minLng = Math.min(this.minLng, lng);
      this.maxLng = Math.max(this.maxLng, lng);
      return this;
    }

    isValid() {
      return Number.isFinite(this.minLat) && Number.isFinite(this.minLng);
    }

    pad(ratio) {
      const latPad = Math.max((this.maxLat - this.minLat) * ratio, 0.002);
      const lngPad = Math.max((this.maxLng - this.minLng) * ratio, 0.002);
      return new MiniBounds([
        [this.minLat - latPad, this.minLng - lngPad],
        [this.maxLat + latPad, this.maxLng + lngPad],
      ]);
    }
  }

  class MiniPolyline {
    constructor(points, options) {
      this.points = points;
      this.options = options;
      this.path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      this.path.setAttribute("fill", "none");
      this.path.setAttribute("stroke", options.color || "#1f7a57");
      this.path.setAttribute("stroke-width", options.weight || 5);
      this.path.setAttribute("stroke-linecap", "round");
      this.path.setAttribute("stroke-linejoin", "round");
    }

    addTo(map) {
      map.svg.append(this.path);
      map.addLayer(this);
      return this;
    }

    setLatLngs(points) {
      this.points = points.map(([lat, lng]) => ({ lat, lng }));
      this.render();
    }

    render() {
      if (!this.map) {
        return;
      }
      const d = this.points
        .map((point, index) => {
          const { x, y } = this.map.project(point);
          return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
        })
        .join(" ");
      this.path.setAttribute("d", d);
    }
  }

  class MiniCircle {
    constructor(latLng, options) {
      this.point = { lat: latLng[0], lng: latLng[1] };
      this.options = options;
      this.el = document.createElement("div");
      this.el.className = "mini-current-marker";
    }

    addTo(map) {
      map.markerPane.append(this.el);
      map.addLayer(this);
      return this;
    }

    setLatLng(latLng) {
      this.point = { lat: latLng[0], lng: latLng[1] };
      this.render();
    }

    render() {
      if (!this.map) {
        return;
      }
      const { x, y } = this.map.project(this.point);
      this.el.style.transform = `translate(${x}px, ${y}px)`;
    }
  }

  class MiniLayerGroup {
    constructor() {
      this.layers = new Set();
    }

    addTo(map) {
      this.map = map;
      return this;
    }

    addLayer(layer) {
      this.layers.add(layer);
      layer.addTo(this.map);
    }

    clearLayers() {
      this.layers.forEach((layer) => layer.remove?.());
      this.layers.clear();
    }
  }

  class MiniMarker {
    constructor(latLng, options) {
      this.point = { lat: latLng[0], lng: latLng[1] };
      this.options = options;
      this.el = document.createElement("div");
      this.el.className = "mini-photo-marker";
      this.el.innerHTML = options.icon?.html || "";
    }

    addTo(target) {
      const map = target instanceof MiniLayerGroup ? target.map : target;
      target instanceof MiniLayerGroup ? target.addLayer(this) : map.addLayer(this);
      this.map = map;
      map.markerPane.append(this.el);
      this.render();
      return this;
    }

    bindPopup(html) {
      this.el.title = html.replace(/<[^>]*>/g, " ");
      return this;
    }

    remove() {
      this.el.remove();
      this.map?.layers.delete(this);
    }

    render() {
      if (!this.map) {
        return;
      }
      const { x, y } = this.map.project(this.point);
      this.el.style.transform = `translate(${x}px, ${y}px)`;
    }
  }

  return {
    map: (id) => new MiniMap(id),
    control: { zoom: () => ({ addTo: () => {} }) },
    tileLayer: () => ({ addTo: () => {} }),
    polyline: (points, options) => new MiniPolyline(points, options),
    circleMarker: (latLng, options) => new MiniCircle(latLng, options),
    layerGroup: () => new MiniLayerGroup(),
    divIcon: (options) => options,
    marker: (latLng, options) => new MiniMarker(latLng, options),
    latLngBounds: (points) => new MiniBounds(points),
  };
}
