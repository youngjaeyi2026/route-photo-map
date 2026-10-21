const STORAGE_KEY = "route-photo-map-state-v1";
const SESSIONS_KEY = "route-photo-map-sessions-v1";
const PROJECT_RECOVERY_KEY = "route-photo-map-project-recovery-v1";
const MAX_PROJECT_RECOVERY_BACKUPS = 8;
const MAX_STORED_IMAGE_LENGTH = 850000;
const PHOTO_CACHE_DB_NAME = "route-photo-map-photo-cache-v1";
const PHOTO_CACHE_STORE_NAME = "photos";
const MAX_EDIT_POINT_MARKERS = 1000;
const DEFAULT_CONSTRUCTION_COLOR = "#c34236";
const BRIGHT_YELLOW_COLOR = "#f2c400";
const ROUTE_COMPLETED_COLOR = "#1f7a57";
const ROUTE_REMAINING_COLOR = "#315f9e";
const ROUTE_DEVIATION_METERS = 50;
const NAVER_MAP_CLIENT_ID = "pie7hw0qho";
const MAP_PROVIDER_POLICY_VERSION = 1;
const NAVER_MAP_RETRY_DELAY_MS = 60 * 1000;
const FOLLOW_INTERACTION_RESUME_MS = 4000;
const CONSTRUCTION_NAME_ZOOM = 16;
const MAP_MARKER_COLLISION_PX = 46;
const MAP_MARKER_SEPARATION_PX = 20;
const WEB_TRACKING_SYNC_DISTANCE_METERS = 500;
const WEB_TRACKING_SYNC_INTERVAL_MS = 5 * 60 * 1000;
const LIVE_SHARED_SESSION_MAX_AGE_MS = 10 * 60 * 1000;
const PRE_SURVEY_FEATURE_ENABLED = false;
const CANDIDATE_ROUTE_FEATURE_ENABLED = true;
const MAX_PLANNED_ROUTE_WAYPOINTS = 15;
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
const SESSION_OVERLAY_COLORS = ["#315f9e", "#d96c1f", "#6d4aa2", "#c34236", "#8b5a2b", BRIGHT_YELLOW_COLOR, "#3f4a46"];
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
  mapProvider: "naver",
  photoFilter: "all",
  photoTagFilters: [],
  photoSort: "route",
  photoView: "list",
  constructionFilter: "all",
  constructionTagFilters: [],
  activePhotoId: null,
  photoModalSequenceIds: [],
  activeConstructionPinId: null,
  projectCode: "",
  projectName: "프로젝트A",
  projectAccessRole: "",
  projectRevision: "",
  projectMembers: [],
  serverHealth: null,
  syncDirty: false,
  syncing: false,
  lastSyncedAt: null,
  lastSyncFailedAt: null,
  lastSyncError: "",
  lastSyncedPointCount: 0,
  user: null,
  myProjects: [],
  shareLinks: [],
  shareView: initialShareToken ? { loading: true } : null,
  constructionPinsVisible: true,
  photoPinsVisible: true,
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
  segmentRerouteMode: false,
  segmentRerouteWaypointMode: false,
  segmentRerouteWaypoints: [],
  segmentReroutePreview: null,
  segmentRerouteSearching: false,
  selectedPosition: null,
  initialPosition: null,
  points: [],
  photos: [],
  milestones: [],
  plannedRoutes: [],
  activePlannedRouteId: null,
  plannedRouteDraft: null,
  planningMode: false,
  plannedRouteMode: "auto",
  plannedRouteSelection: "",
  plannedRouteSelectionStopId: "",
  plannedRouteSearching: false,
  plannedRouteOutlinePoints: [],
  plannedRouteOutlinePreview: null,
  plannedRoutePlaceResults: [],
  plannedRoutePlaceSearching: false,
  plannedRouteFeedback: null,
  restrictionReviewRouteId: "",
  mapReferences: [],
  activeMapReferenceId: null,
  mapReferenceDraft: null,
  mapAlignmentMode: false,
  pendingMapReferenceImagePoint: null,
  mapColorExtractionMode: false,
  mapColorExtractionReferenceId: null,
  overlayProjects: [],
  overlaySessionIds: [],
  sessions: [],
  pendingSessionDeletes: [],
  primarySessionId: null,
  activeStartedAt: null,
  liveSyncSessionId: null,
};

const els = {
  trackBtn: document.querySelector("#trackBtn"),
  pauseBtn: document.querySelector("#pauseBtn"),
  photoInput: document.querySelector("#photoInput"),
  autoPhotoInput: document.querySelector("#autoPhotoInput"),
  locateBtn: document.querySelector("#locateBtn"),
  fitBtn: document.querySelector("#fitBtn"),
  autoFollowBtn: document.querySelector("#autoFollowBtn"),
  followMapControls: document.querySelector("#followMapControls"),
  followExitBtn: document.querySelector("#followExitBtn"),
  followPhotoToggleBtn: document.querySelector("#followPhotoToggleBtn"),
  followConstructionToggleBtn: document.querySelector("#followConstructionToggleBtn"),
  followSafetyNotice: document.querySelector("#followSafetyNotice"),
  saveBtn: document.querySelector("#saveBtn"),
  exportBtn: document.querySelector("#exportBtn"),
  clearBtn: document.querySelector("#clearBtn"),
  mapProvider: document.querySelector("#mapProvider"),
  naverMapBase: document.querySelector("#naverMapBase"),
  wakeLockToggle: document.querySelector("#wakeLockToggle"),
  photoFilter: document.querySelector("#photoFilter"),
  photoTagFilter: document.querySelector("#photoTagFilter"),
  photoTagFilterSummary: document.querySelector("#photoTagFilterSummary"),
  photoTagFilterMenu: document.querySelector("#photoTagFilterMenu"),
  photoSort: document.querySelector("#photoSort"),
  photoViewToggle: document.querySelector("#photoViewToggle"),
  photoModal: document.querySelector("#photoModal"),
  photoModalClose: document.querySelector("#photoModalClose"),
  photoModalPrevious: document.querySelector("#photoModalPrevious"),
  photoModalNext: document.querySelector("#photoModalNext"),
  photoModalCount: document.querySelector("#photoModalCount"),
  photoModalImage: document.querySelector("#photoModalImage"),
  photoModalTitle: document.querySelector("#photoModalTitle"),
  photoModalMeta: document.querySelector("#photoModalMeta"),
  photoModalMemo: document.querySelector("#photoModalMemo"),
  photoModalTags: document.querySelector("#photoModalTags"),
  photoModalMemoBtn: document.querySelector("#photoModalMemoBtn"),
  photoModalTagBtn: document.querySelector("#photoModalTagBtn"),
  photoModalLocateBtn: document.querySelector("#photoModalLocateBtn"),
  photoModalNaverBtn: document.querySelector("#photoModalNaverBtn"),
  photoModalNaverPanoramaBtn: document.querySelector("#photoModalNaverPanoramaBtn"),
  constructionDetailModal: document.querySelector("#constructionDetailModal"),
  constructionDetailClose: document.querySelector("#constructionDetailClose"),
  constructionDetailCode: document.querySelector("#constructionDetailCode"),
  constructionDetailTitle: document.querySelector("#constructionDetailTitle"),
  constructionDetailMeta: document.querySelector("#constructionDetailMeta"),
  constructionDetailMemo: document.querySelector("#constructionDetailMemo"),
  constructionDetailTags: document.querySelector("#constructionDetailTags"),
  constructionDetailNaverBtn: document.querySelector("#constructionDetailNaverBtn"),
  constructionDetailRoadviewBtn: document.querySelector("#constructionDetailRoadviewBtn"),
  projectName: document.querySelector("#projectName"),
  projectCode: document.querySelector("#projectCode"),
  projectBadge: document.querySelector("#projectBadge"),
  projectStatus: document.querySelector("#projectStatus"),
  syncStatusPanel: document.querySelector("#syncStatusPanel"),
  syncStatusLabel: document.querySelector("#syncStatusLabel"),
  retrySyncBtn: document.querySelector("#retrySyncBtn"),
  projectCollaboration: document.querySelector("#projectCollaboration"),
  projectAccessBadge: document.querySelector("#projectAccessBadge"),
  projectInviteControls: document.querySelector("#projectInviteControls"),
  projectInviteEmail: document.querySelector("#projectInviteEmail"),
  projectInviteBtn: document.querySelector("#projectInviteBtn"),
  projectCollaborationStatus: document.querySelector("#projectCollaborationStatus"),
  projectMemberList: document.querySelector("#projectMemberList"),
  projectTransferBlock: document.querySelector("#projectTransferBlock"),
  projectTransferEmail: document.querySelector("#projectTransferEmail"),
  projectTransferBtn: document.querySelector("#projectTransferBtn"),
  projectTransferStatus: document.querySelector("#projectTransferStatus"),
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
  segmentRerouteControls: document.querySelector("#segmentRerouteControls"),
  segmentRerouteStartBtn: document.querySelector("#segmentRerouteStartBtn"),
  segmentRerouteWaypointBtn: document.querySelector("#segmentRerouteWaypointBtn"),
  segmentRerouteUndoWaypointBtn: document.querySelector("#segmentRerouteUndoWaypointBtn"),
  segmentRerouteSearchBtn: document.querySelector("#segmentRerouteSearchBtn"),
  segmentRerouteApplyBtn: document.querySelector("#segmentRerouteApplyBtn"),
  segmentRerouteCancelBtn: document.querySelector("#segmentRerouteCancelBtn"),
  segmentRerouteWaypointList: document.querySelector("#segmentRerouteWaypointList"),
  segmentRerouteStatus: document.querySelector("#segmentRerouteStatus"),
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
  candidateFollowBlock: document.querySelector("#candidateFollowBlock"),
  recordControls: document.querySelector("#recordControls"),
  shareInfoControls: document.querySelector("#shareInfoControls"),
  sharePhotoToggleBtn: document.querySelector("#sharePhotoToggleBtn"),
  shareConstructionToggleBtn: document.querySelector("#shareConstructionToggleBtn"),
  constructionVisibilityBtn: document.querySelector("#constructionVisibilityBtn"),
  constructionFilter: document.querySelector("#constructionFilter"),
  constructionTagFilter: document.querySelector("#constructionTagFilter"),
  constructionTagFilterSummary: document.querySelector("#constructionTagFilterSummary"),
  constructionTagFilterMenu: document.querySelector("#constructionTagFilterMenu"),
  constructionFilterReset: document.querySelector("#constructionFilterReset"),
  routeFollowStatus: document.querySelector("#routeFollowStatus"),
  addConstructionPinBtn: document.querySelector("#addConstructionPinBtn"),
  addMapMemoBtn: document.querySelector("#addMapMemoBtn"),
  addObstaclePhotoBtn: document.querySelector("#addObstaclePhotoBtn"),
  obstaclePhotoInput: document.querySelector("#obstaclePhotoInput"),
  milestoneList: document.querySelector("#milestoneList"),
  overlayProjectCode: document.querySelector("#overlayProjectCode"),
  addOverlayProjectBtn: document.querySelector("#addOverlayProjectBtn"),
  overlayProjectList: document.querySelector("#overlayProjectList"),
  historyOverlayStatus: document.querySelector("#historyOverlayStatus"),
  clearHistoryOverlaysBtn: document.querySelector("#clearHistoryOverlaysBtn"),
  colorPickerModal: document.querySelector("#colorPickerModal"),
  colorPickerTitle: document.querySelector("#colorPickerTitle"),
  colorPickerOptions: document.querySelector("#colorPickerOptions"),
  colorPickerCancelBtn: document.querySelector("#colorPickerCancelBtn"),
  colorPickerConfirmBtn: document.querySelector("#colorPickerConfirmBtn"),
  plannedRouteSection: document.querySelector("#plannedRouteSection"),
  plannedRouteToggleBtn: document.querySelector("#plannedRouteToggleBtn"),
  plannedRouteControls: document.querySelector("#plannedRouteControls"),
  plannedRouteName: document.querySelector("#plannedRouteName"),
  plannedRouteAutoBtn: document.querySelector("#plannedRouteAutoBtn"),
  plannedRouteManualBtn: document.querySelector("#plannedRouteManualBtn"),
  plannedRouteAutoControls: document.querySelector("#plannedRouteAutoControls"),
  plannedRoutePlaceQuery: document.querySelector("#plannedRoutePlaceQuery"),
  plannedRoutePlaceSearchBtn: document.querySelector("#plannedRoutePlaceSearchBtn"),
  plannedRoutePlaceTarget: document.querySelector("#plannedRoutePlaceTarget"),
  plannedRoutePlaceResults: document.querySelector("#plannedRoutePlaceResults"),
  plannedRouteOutlineControls: document.querySelector("#plannedRouteOutlineControls"),
  plannedRouteOutlineOption: document.querySelector("#plannedRouteOutlineOption"),
  plannedRouteOutlineSearchBtn: document.querySelector("#plannedRouteOutlineSearchBtn"),
  plannedRouteOutlineApplyBtn: document.querySelector("#plannedRouteOutlineApplyBtn"),
  plannedRouteOutlineCancelBtn: document.querySelector("#plannedRouteOutlineCancelBtn"),
  plannedRouteOutlineStatus: document.querySelector("#plannedRouteOutlineStatus"),
  plannedRouteStartPointBtn: document.querySelector("#plannedRouteStartPointBtn"),
  plannedRouteWaypointBtn: document.querySelector("#plannedRouteWaypointBtn"),
  plannedRouteGoalPointBtn: document.querySelector("#plannedRouteGoalPointBtn"),
  plannedRouteStopList: document.querySelector("#plannedRouteStopList"),
  plannedRouteOption: document.querySelector("#plannedRouteOption"),
  plannedRouteSearchBtn: document.querySelector("#plannedRouteSearchBtn"),
  plannedRouteMemo: document.querySelector("#plannedRouteMemo"),
  plannedRouteStatusSelect: document.querySelector("#plannedRouteStatusSelect"),
  restrictionVehicleLength: document.querySelector("#restrictionVehicleLength"),
  restrictionVehicleWidth: document.querySelector("#restrictionVehicleWidth"),
  restrictionVehicleHeight: document.querySelector("#restrictionVehicleHeight"),
  restrictionVehicleTotalWeight: document.querySelector("#restrictionVehicleTotalWeight"),
  restrictionVehicleAxleWeight: document.querySelector("#restrictionVehicleAxleWeight"),
  plannedRouteStartBtn: document.querySelector("#plannedRouteStartBtn"),
  plannedRouteUndoBtn: document.querySelector("#plannedRouteUndoBtn"),
  plannedRouteSaveBtn: document.querySelector("#plannedRouteSaveBtn"),
  plannedRouteCancelBtn: document.querySelector("#plannedRouteCancelBtn"),
  plannedRouteStatus: document.querySelector("#plannedRouteStatus"),
  plannedRouteList: document.querySelector("#plannedRouteList"),
  restrictionReviewDetails: document.querySelector("#restrictionReviewDetails"),
  restrictionReviewBadge: document.querySelector("#restrictionReviewBadge"),
  restrictionRouteSelect: document.querySelector("#restrictionRouteSelect"),
  restrictionDataInput: document.querySelector("#restrictionDataInput"),
  restrictionTemplateBtn: document.querySelector("#restrictionTemplateBtn"),
  restrictionDataStatus: document.querySelector("#restrictionDataStatus"),
  restrictionImportMode: document.querySelector("#restrictionImportMode"),
  restrictionNormalizedExportBtn: document.querySelector("#restrictionNormalizedExportBtn"),
  restrictionDataQuality: document.querySelector("#restrictionDataQuality"),
  restrictionImportedCount: document.querySelector("#restrictionImportedCount"),
  restrictionDuplicateCount: document.querySelector("#restrictionDuplicateCount"),
  restrictionExcludedCount: document.querySelector("#restrictionExcludedCount"),
  restrictionMissingLimitCount: document.querySelector("#restrictionMissingLimitCount"),
  restrictionCorridor: document.querySelector("#restrictionCorridor"),
  restrictionWorkflowStatus: document.querySelector("#restrictionWorkflowStatus"),
  restrictionReviewMemo: document.querySelector("#restrictionReviewMemo"),
  restrictionReviewRunBtn: document.querySelector("#restrictionReviewRunBtn"),
  restrictionReviewExportBtn: document.querySelector("#restrictionReviewExportBtn"),
  restrictionReviewClearBtn: document.querySelector("#restrictionReviewClearBtn"),
  restrictionReviewSummary: document.querySelector("#restrictionReviewSummary"),
  restrictionNearbyCount: document.querySelector("#restrictionNearbyCount"),
  restrictionRiskCount: document.querySelector("#restrictionRiskCount"),
  restrictionPermitCount: document.querySelector("#restrictionPermitCount"),
  restrictionUnknownCount: document.querySelector("#restrictionUnknownCount"),
  restrictionReviewStatus: document.querySelector("#restrictionReviewStatus"),
  restrictionReviewList: document.querySelector("#restrictionReviewList"),
  mapReferenceInput: document.querySelector("#mapReferenceInput"),
  mapReferencePreview: document.querySelector("#mapReferencePreview"),
  mapReferencePreviewImage: document.querySelector("#mapReferencePreviewImage"),
  mapReferencePreviewPoints: document.querySelector("#mapReferencePreviewPoints"),
  mapReferenceUndoBtn: document.querySelector("#mapReferenceUndoBtn"),
  mapReferenceFitBtn: document.querySelector("#mapReferenceFitBtn"),
  mapReferenceResetBtn: document.querySelector("#mapReferenceResetBtn"),
  mapReferenceSaveBtn: document.querySelector("#mapReferenceSaveBtn"),
  mapReferenceCancelBtn: document.querySelector("#mapReferenceCancelBtn"),
  mapReferenceOpacity: document.querySelector("#mapReferenceOpacity"),
  mapReferencePreviewZoom: document.querySelector("#mapReferencePreviewZoom"),
  mapReferenceStatus: document.querySelector("#mapReferenceStatus"),
  mapReferenceList: document.querySelector("#mapReferenceList"),
};

const map = L.map("map", {
  zoomControl: false,
}).setView([37.5665, 126.978], 15);
const defaultMapInertia = map.options.inertia;
const defaultWheelDebounceTime = map.options.wheelDebounceTime;

L.control.zoom({ position: "bottomleft" }).addTo(map);

const osmTileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap",
});

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
const sessionOverlayLayer = L.layerGroup().addTo(map);
const pointLayer = L.layerGroup().addTo(map);
const plannedRouteLayer = L.layerGroup().addTo(map);
const segmentRerouteLayer = L.layerGroup().addTo(map);
const mapReferenceControlLayer = L.layerGroup().addTo(map);
let mapReferenceCanvas = null;
let mapReferenceCanvasContext = null;
let mapReferenceRenderFrame = null;
let mapReferenceRenderRevision = 0;
const mapReferenceImageCache = new Map();
const mapReferenceExtractionCache = new Map();
let mapReferencePreviewDrag = null;
let mapReferenceCornerHistory = [];
let mapReferenceMarkerDragActive = false;
let programmaticMapMove = false;
let lastFollowMapMoveAt = 0;
let followInteractionPauseUntil = 0;
let followInteractionResumeTimer = null;
let constructionNamesExpanded = map.getZoom() >= CONSTRUCTION_NAME_ZOOM;
let lastLiveStatusAt = 0;
let routeFollowWatcherId = null;
let shareViewTimerId = null;
let projectOpenRequestId = 0;
let projectSyncQueue = Promise.resolve();
const pendingProjectSyncs = new Set();
let recordCompletionPending = false;
let trackingCheckpointAt = 0;
let trackingDistanceSinceCheckpoint = 0;
let trackingCheckpointLastPoint = null;
let photoCacheMigrationPromise = null;
let photoModalTouchStartX = null;
let photoModalPhotoPool = [];
let photoModalReadOnly = false;
let photoModalSourceLabel = "";
let naverMapsScriptPromise = null;
let activeNaverBaseMap = null;
let activeMapProvider = "";
let pendingMapProvider = "";
let naverMapRetryAfter = 0;
let naverMapRetryTimerId = null;
let naverMapSyncQueued = false;
let lastNaverSyncCenter = null;
let lastNaverSyncZoom = null;
let naverNativeRenderFrame = null;
let naverNativeOverlays = [];
let activeConstructionDetailPin = null;
let naverExternalWindow = null;
let colorPickerSelection = DEFAULT_CONSTRUCTION_COLOR;
let colorPickerConfirmHandler = null;
let pendingObstaclePhotoOptions = null;
let authEls = {};
let shareEls = {};
let authResolved = Boolean(initialShareToken);
let workspaceActivated = false;

if (!initialShareToken) {
  loadState();
}
setupAuthPanel();
setupAdminPanel();
setupSharePanel();
setupColorPicker();
render();
if (!initialShareToken) {
  void initializeDurablePhotoStorage();
}
refreshServerHealth();
refreshAuth();

map.on("click", (event) => {
  if (state.mapAlignmentMode) {
    if (state.mapReferenceDraft?.alignmentMode === "corners") {
      setMapReferenceStatus("지도 위 네 모서리 또는 가운데 ＋ 표시를 드래그해 위치를 맞춰 주세요.");
      return;
    }
    if (state.pendingMapReferenceImagePoint) {
      addMapReferenceControlPair(event.latlng);
    } else {
      setMapReferenceStatus("먼저 왼쪽의 업로드 지도에서 같은 지점을 선택하세요.");
    }
    return;
  }
  if (state.planningMode) {
    handlePlannedRouteMapClick(event.latlng);
    return;
  }
  if (state.pointEditMode) {
    if (state.segmentRerouteMode && state.segmentRerouteWaypointMode) {
      addSegmentRerouteWaypoint(event.latlng);
      return;
    }
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
  if (state.destinationFollow) {
    temporarilyPauseFollowCamera();
    return;
  }
  state.autoFollow = false;
  persist();
  renderTrackingState();
  setStatus("지도를 직접 움직여 자동 따라가기를 잠시 껐습니다. 현재 위치 버튼이나 기록 시작을 누르면 다시 켜집니다.");
});

map.on("moveend zoomend", (event) => {
  // Panning does not change marker clustering. Let the map engine move the
  // existing markers and rebuild them only when the zoom level changes.
  if (event.type === "zoomend") {
    renderPhotoMapMarkers(getVisiblePhotos());
  }
  const nextConstructionNamesExpanded = map.getZoom() >= CONSTRUCTION_NAME_ZOOM;
  if (
    event.type === "zoomend" ||
    state.constructionFilter === "map" ||
    nextConstructionNamesExpanded !== constructionNamesExpanded
  ) {
    constructionNamesExpanded = nextConstructionNamesExpanded;
    renderMilestones();
    renderProjectOverlays();
  }
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
els.saveBtn.addEventListener("click", saveRecordNow);
els.exportBtn.addEventListener("click", exportData);
els.clearBtn.addEventListener("click", clearData);
els.photoInput.addEventListener("change", handlePhotoInput);
els.autoPhotoInput?.addEventListener("change", (event) => handlePhotoInput(event, { automatic: true }));
window.addEventListener("focus", restoreViewportAfterFilePicker);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) restoreViewportAfterFilePicker();
});
els.mapProvider.addEventListener("change", handleMapProviderChange);
els.wakeLockToggle.addEventListener("change", handleWakeLockToggle);
els.photoFilter.addEventListener("change", (event) => {
  state.photoFilter = event.target.value;
  persistPhotoDisplaySettings();
  renderPhotos();
});
els.constructionFilter?.addEventListener("change", (event) => {
  state.constructionFilter = event.target.value;
  persistPhotoDisplaySettings();
  renderMilestones();
});
els.constructionFilterReset?.addEventListener("click", () => {
  state.constructionFilter = "all";
  state.constructionTagFilters = [];
  persistPhotoDisplaySettings();
  renderMilestones();
});
els.photoSort?.addEventListener("change", (event) => {
  state.photoSort = event.target.value === "captured" ? "captured" : "route";
  persistPhotoDisplaySettings();
  renderPhotos();
});
els.photoViewToggle.addEventListener("click", () => {
  state.photoView = state.photoView === "grid" ? "list" : "grid";
  persist();
  renderPhotos();
});
els.photoModalClose.addEventListener("click", closePhotoModal);
els.photoModalPrevious?.addEventListener("click", () => navigatePhotoModal(-1));
els.photoModalNext?.addEventListener("click", () => navigatePhotoModal(1));
els.photoModalImage?.addEventListener("touchstart", (event) => {
  photoModalTouchStartX = event.changedTouches[0]?.clientX ?? null;
}, { passive: true });
els.photoModalImage?.addEventListener("touchend", (event) => {
  if (photoModalTouchStartX === null) {
    return;
  }
  const touchEndX = event.changedTouches[0]?.clientX ?? photoModalTouchStartX;
  const swipeDistance = touchEndX - photoModalTouchStartX;
  photoModalTouchStartX = null;
  if (Math.abs(swipeDistance) >= 45) {
    navigatePhotoModal(swipeDistance < 0 ? 1 : -1);
  }
}, { passive: true });
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
els.photoModalNaverBtn?.addEventListener("click", () => {
  const photo = getActiveModalPhoto();
  if (photo && hasPhotoPosition(photo)) {
    openNaverMapLocation(photo, getPhotoDisplayName(photo));
  }
});
els.photoModalNaverPanoramaBtn?.addEventListener("click", () => {
  const photo = getActiveModalPhoto();
  if (photo && hasPhotoPosition(photo)) {
    openNaverRoadview(photo, getPhotoDisplayName(photo));
  }
});
els.constructionDetailNaverBtn?.addEventListener("click", () => {
  if (activeConstructionDetailPin) {
    openNaverMapLocation(activeConstructionDetailPin, activeConstructionDetailPin.name || "공사구역");
  }
});
els.constructionDetailRoadviewBtn?.addEventListener("click", () => {
  if (activeConstructionDetailPin) {
    openNaverRoadview(activeConstructionDetailPin, activeConstructionDetailPin.name || "공사구역");
  }
});
els.constructionDetailClose?.addEventListener("click", closeConstructionDetail);
els.constructionDetailModal?.addEventListener("click", (event) => {
  if (event.target.hasAttribute("data-construction-detail-close")) {
    closeConstructionDetail();
  }
});
document.addEventListener("keydown", (event) => {
  if (
    !els.photoModal.hidden &&
    (event.key === "ArrowLeft" || event.key === "ArrowRight")
  ) {
    event.preventDefault();
    navigatePhotoModal(event.key === "ArrowLeft" ? -1 : 1);
  }
  if (event.key === "Escape" && !els.photoModal.hidden) {
    closePhotoModal();
  }
  if (event.key === "Escape" && els.colorPickerModal && !els.colorPickerModal.hidden) {
    closeRepresentativeColorPicker();
  }
  if (event.key === "Escape" && els.constructionDetailModal && !els.constructionDetailModal.hidden) {
    closeConstructionDetail();
  }
});
els.createProjectBtn.addEventListener("click", createServerProject);
els.renameProjectBtn?.addEventListener("click", renameCurrentProject);
els.openProjectBtn.addEventListener("click", () => openServerProject(els.projectCode.value));
els.syncProjectBtn.addEventListener("click", () => syncProjectState("manual"));
els.retrySyncBtn?.addEventListener("click", () => syncProjectState("manual-retry"));
els.projectInviteBtn?.addEventListener("click", inviteProjectEditor);
els.projectInviteEmail?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    inviteProjectEditor();
  }
});
els.projectTransferBtn?.addEventListener("click", transferProjectCopy);
els.projectTransferEmail?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    transferProjectCopy();
  }
});
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
els.plannedRouteToggleBtn?.addEventListener("click", async () => {
  const willOpen = Boolean(els.plannedRouteControls?.hidden);
  if (els.plannedRouteControls) els.plannedRouteControls.hidden = !willOpen;
  els.plannedRouteToggleBtn.textContent = willOpen ? "숨기기" : "펼치기";
  if (willOpen) {
    window.requestAnimationFrame(() => map.invalidateSize());
    if (!state.planningMode && state.projectCode && !state.shareView) {
      await startPlannedRouteEditing();
    }
  }
});
els.followExitBtn?.addEventListener("click", () => stopRouteFollowing("답사 모드를 종료했습니다."));
els.followPhotoToggleBtn?.addEventListener("click", togglePhotoPinVisibility);
els.followConstructionToggleBtn?.addEventListener("click", toggleConstructionVisibility);
els.sharePhotoToggleBtn?.addEventListener("click", togglePhotoPinVisibility);
els.shareConstructionToggleBtn?.addEventListener("click", toggleConstructionVisibility);
els.constructionVisibilityBtn?.addEventListener("click", toggleConstructionVisibility);
els.addConstructionPinBtn?.addEventListener("click", () => addMapPin("construction"));
els.addMapMemoBtn?.addEventListener("click", addMapMemo);
els.addObstaclePhotoBtn?.addEventListener("click", beginObstaclePhotoCapture);
els.obstaclePhotoInput?.addEventListener("change", async (event) => {
  const options = pendingObstaclePhotoOptions;
  pendingObstaclePhotoOptions = null;
  if (!options) {
    event.target.value = "";
    return;
  }
  await handlePhotoInput(event, options);
});
els.addOverlayProjectBtn?.addEventListener("click", () => addOverlayProject());
els.plannedRouteStartBtn?.addEventListener("click", startPlannedRouteEditing);
els.plannedRouteAutoBtn?.addEventListener("click", () => setPlannedRouteMode("auto"));
els.plannedRouteManualBtn?.addEventListener("click", () => setPlannedRouteMode("manual"));
els.plannedRouteStartPointBtn?.addEventListener("click", () => setPlannedRouteSelection("start"));
els.plannedRouteWaypointBtn?.addEventListener("click", () => setPlannedRouteSelection("waypoint"));
els.plannedRouteGoalPointBtn?.addEventListener("click", () => setPlannedRouteSelection("goal"));
els.plannedRouteSearchBtn?.addEventListener("click", searchPlannedRoute);
els.plannedRoutePlaceSearchBtn?.addEventListener("click", searchPlannedRoutePlace);
els.plannedRoutePlaceQuery?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  searchPlannedRoutePlace();
});
els.plannedRouteOutlineSearchBtn?.addEventListener("click", searchPlannedRouteOutline);
els.plannedRouteOutlineApplyBtn?.addEventListener("click", applyPlannedRouteOutlinePreview);
els.plannedRouteOutlineCancelBtn?.addEventListener("click", cancelPlannedRouteOutlinePreview);
els.plannedRouteOption?.addEventListener("change", () => {
  const draft = state.plannedRouteDraft;
  if (!state.planningMode || state.plannedRouteMode !== "auto" || !draft) return;
  draft.routeOption = normalizePlannedRouteOption(els.plannedRouteOption.value);
  if (draft.points.length) {
    draft.points = [];
    draft.routeSummary = { distance: null, duration: null, tollFare: null, provider: "", searchedAt: null };
    setStatus("경로 옵션을 변경했습니다. 후보노선을 다시 검색해 주세요.", "active");
  }
  renderPlannedRoutes();
});
els.plannedRouteOutlineOption?.addEventListener("change", () => {
  const draft = state.plannedRouteDraft;
  if (!state.planningMode || state.plannedRouteMode !== "manual" || !draft) return;
  draft.routeOption = normalizePlannedRouteOption(els.plannedRouteOutlineOption.value);
  state.plannedRouteOutlinePreview = null;
  state.plannedRoutePlaceResults = [];
  state.plannedRoutePlaceSearching = false;
  if (draft.source === "naver-outline") {
    draft.points = state.plannedRouteOutlinePoints.map((point) => ({ ...point }));
    draft.source = "naver-manual";
    draft.routeSummary = { distance: null, duration: null, tollFare: null, provider: "manual", searchedAt: null };
  }
  setStatus("경로 옵션을 변경했습니다. 윤곽으로 노선을 다시 검색해 주세요.", "active");
  renderPlannedRoutes();
});
els.plannedRouteUndoBtn?.addEventListener("click", undoPlannedRoutePoint);
els.plannedRouteSaveBtn?.addEventListener("click", savePlannedRoute);
els.plannedRouteCancelBtn?.addEventListener("click", cancelPlannedRouteEditing);
els.restrictionReviewDetails?.addEventListener("toggle", () => {
  if (els.restrictionReviewDetails.open) selectRestrictionReviewRoute(state.activePlannedRouteId);
});
els.restrictionRouteSelect?.addEventListener("change", () => selectRestrictionReviewRoute(els.restrictionRouteSelect.value));
els.restrictionDataInput?.addEventListener("change", importRestrictionData);
els.restrictionTemplateBtn?.addEventListener("click", downloadRestrictionTemplate);
els.restrictionNormalizedExportBtn?.addEventListener("click", exportNormalizedRestrictionCsv);
els.restrictionReviewRunBtn?.addEventListener("click", runRestrictionReview);
els.restrictionReviewExportBtn?.addEventListener("click", exportRestrictionReviewCsv);
els.restrictionReviewClearBtn?.addEventListener("click", clearRestrictionReviewData);
[
  els.restrictionVehicleLength,
  els.restrictionVehicleWidth,
  els.restrictionVehicleHeight,
  els.restrictionVehicleTotalWeight,
  els.restrictionVehicleAxleWeight,
  els.restrictionCorridor,
].forEach((control) => control?.addEventListener("change", () => saveRestrictionReviewInputs({ invalidateResults: true })));
els.restrictionWorkflowStatus?.addEventListener("change", () => saveRestrictionReviewInputs());
els.restrictionReviewMemo?.addEventListener("change", () => saveRestrictionReviewInputs());
els.mapReferenceInput?.addEventListener("change", handleMapReferenceInput);
els.mapReferencePreview?.addEventListener("pointerdown", beginMapReferencePreviewDrag);
els.mapReferencePreview?.addEventListener("pointermove", moveMapReferencePreviewDrag);
els.mapReferencePreview?.addEventListener("pointerup", endMapReferencePreviewDrag);
els.mapReferencePreview?.addEventListener("pointercancel", cancelMapReferencePreviewDrag);
els.mapReferencePreviewImage?.addEventListener("load", renderMapReferencePreviewPoints);
els.mapReferenceUndoBtn?.addEventListener("click", undoMapReferenceControlPoint);
els.mapReferenceFitBtn?.addEventListener("click", fitMapReferenceDraftToScreen);
els.mapReferenceResetBtn?.addEventListener("click", resetMapReferenceCorners);
els.mapReferenceSaveBtn?.addEventListener("click", saveMapReferenceAlignment);
els.mapReferenceCancelBtn?.addEventListener("click", cancelMapReferenceAlignment);
els.mapReferenceOpacity?.addEventListener("input", updateMapReferenceOpacity);
els.mapReferencePreviewZoom?.addEventListener("input", (event) => {
  updateMapReferencePreviewZoom(event.target.value);
});
els.overlayProjectCode?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    addOverlayProject();
  }
});
els.clearHistoryOverlaysBtn?.addEventListener("click", clearSessionOverlays);
els.pointAddBtn?.addEventListener("click", addManualRoutePointFromSelection);
els.pointConnectBtn?.addEventListener("click", connectSelectedRoutePoints);
els.pointDeleteBtn?.addEventListener("click", deleteSelectedPoint);
els.segmentStartBtn?.addEventListener("click", setSegmentStart);
els.segmentEndBtn?.addEventListener("click", setSegmentEnd);
els.segmentDeleteBtn?.addEventListener("click", deleteSelectedSegment);
els.undoRouteEditBtn?.addEventListener("click", undoRouteEdit);
els.segmentRerouteStartBtn?.addEventListener("click", startSegmentReroute);
els.segmentRerouteWaypointBtn?.addEventListener("click", toggleSegmentRerouteWaypointMode);
els.segmentRerouteUndoWaypointBtn?.addEventListener("click", undoSegmentRerouteWaypoint);
els.segmentRerouteSearchBtn?.addEventListener("click", searchSegmentReroute);
els.segmentRerouteApplyBtn?.addEventListener("click", applySegmentReroute);
els.segmentRerouteCancelBtn?.addEventListener("click", cancelSegmentReroute);
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
window.addEventListener("online", retryPendingSaves);
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

  state.tracking = true;
  stopRouteFollowWatcher();
  state.paused = false;
  state.recordPanelOpen = true;
  state.autoFollow = true;
  state.activeStartedAt = state.activeStartedAt || Date.now();
  state.liveSyncSessionId = state.continuingSessionId || state.liveSyncSessionId || crypto.randomUUID();
  trackingCheckpointAt = 0;
  trackingDistanceSinceCheckpoint = 0;
  trackingCheckpointLastPoint = state.points.at(-1) || null;
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
      void stopTracking();
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

async function confirmStopTracking() {
  const confirmed = window.confirm(
    "기록을 완료할까요?\n\n현재 위치점과 사진을 보관하고 서버 저장이 확인된 후에만 화면을 초기화합니다.",
  );
  if (!confirmed) {
    return;
  }
  await stopTracking({ save: true, clearCurrent: true });
}

async function stopTracking(options = {}) {
  const { save = true, clearCurrent = false } = options;
  if (save && recordCompletionPending) {
    return false;
  }
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
  if (save) {
    recordCompletionPending = true;
    els.trackBtn.disabled = true;
  }
  renderTrackingState();
  if (save) {
    await preparePhotosBeforeRecordSave();
  }
  const saved = save ? saveCurrentSession("completed") : null;
  let serverSaved = !save;
  if (save && saved !== false) {
    setStatus("기록을 보관했습니다. 서버 저장을 확인하는 중입니다.", "active");
    serverSaved = await syncProjectState("completed");
  }
  if (save) {
    recordCompletionPending = false;
    els.trackBtn.disabled = false;
  }
  if (clearCurrent && saved !== false && serverSaved) {
    resetCurrentRecord();
  }
  render();
  if (state.destinationFollow) {
    startRouteFollowWatcher();
  }
  if (clearCurrent && saved !== false && serverSaved) {
    state.liveSyncSessionId = null;
    resetTrackingCheckpointState();
    persist();
    renderSyncStatus();
    setStatus("서버 저장을 확인했습니다. 현재 화면을 다음 기록 상태로 초기화했습니다.", "success");
    return true;
  }
  if (clearCurrent && saved !== false && !serverSaved) {
    setStatus("서버 저장을 확인하지 못했습니다. 기록을 화면과 복구본에 그대로 유지합니다.", "error");
    return false;
  }
  renderTrackingState();
  if (!save) {
    setStatus("기록을 멈췄습니다. 사진은 마지막 위치 또는 지도에서 선택한 위치에 저장됩니다.");
  }
  return serverSaved;
}

async function saveRecordNow() {
  if (els.saveBtn.disabled) {
    return;
  }
  els.saveBtn.disabled = true;
  try {
    await preparePhotosBeforeRecordSave();
    const saved = saveCurrentSession("manual");
    if (saved === false) {
      return;
    }
    setStatus("기록을 보관했습니다. 서버 저장을 확인하는 중입니다.", "active");
    const serverSaved = await syncProjectState("manual");
    setStatus(
      serverSaved
        ? "서버 저장을 확인했습니다. 기록 보기에서 다시 불러올 수 있습니다."
        : "서버 저장을 확인하지 못했습니다. 기록을 화면과 복구본에 그대로 유지합니다.",
      serverSaved ? "success" : "error",
    );
  } finally {
    els.saveBtn.disabled = false;
  }
}

async function preparePhotosBeforeRecordSave() {
  await cacheAllPendingLocalPhotos();
  if (!state.projectCode) {
    return true;
  }
  try {
    await preparePhotosForProjectSync();
    return true;
  } catch (error) {
    console.warn("Photo preparation before record save failed", error);
    setProjectStatus("사진을 서버에 올리지 못했습니다. 원본은 이 기기에 보관하고 서버 저장을 다시 시도합니다.");
    return false;
  }
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
      scheduleNaverNativeOverlayRender();
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
    if (state.tracking) {
      maybeSyncTrackingCheckpoint(latest);
    }
    setStatus(accepted.message);
    return null;
  }

  state.points.push(nextPoint);
  state.selectedPosition = nextPoint;
  if (state.projectCode) {
    state.syncDirty = true;
  }
  if (state.tracking) {
    if (trackingCheckpointLastPoint) {
      trackingDistanceSinceCheckpoint += getDistanceMeters(trackingCheckpointLastPoint, nextPoint);
    }
    trackingCheckpointLastPoint = nextPoint;
  }
  persist();
  renderSyncStatus();
  if (state.tracking) {
    maybeSyncTrackingCheckpoint(nextPoint);
  }
  renderRouteProgress(nextPoint);
  followLatestPoint(nextPoint);
  return updateRouteFollowing(nextPoint);
}

function maybeSyncTrackingCheckpoint(latestPoint, force = false) {
  if (!state.tracking || !state.projectCode || !state.liveSyncSessionId || !latestPoint) return;
  const now = Date.now();
  const firstCheckpoint = trackingCheckpointAt === 0;
  const distanceReached = trackingDistanceSinceCheckpoint >= WEB_TRACKING_SYNC_DISTANCE_METERS;
  const timeReached = !firstCheckpoint && now - trackingCheckpointAt >= WEB_TRACKING_SYNC_INTERVAL_MS;
  if (!force && !firstCheckpoint && !distanceReached && !timeReached) return;

  trackingCheckpointAt = now;
  trackingDistanceSinceCheckpoint = 0;
  void syncProjectState("tracking-checkpoint");
}

function resetTrackingCheckpointState() {
  trackingCheckpointAt = 0;
  trackingDistanceSinceCheckpoint = 0;
  trackingCheckpointLastPoint = null;
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
  scheduleNaverNativeOverlayRender();
}

function updateRouteFollowing(point) {
  if (!state.destinationFollow) {
    return false;
  }
  const routePoints = getRouteFollowPoints();
  const routeLabel = hasCandidateRouteForFollow() ? "후보노선" : "기록된 경로";
  const nearest = findNearestRoutePosition(point, routePoints);
  if (!nearest) {
    stopRouteFollowing(`${routeLabel}를 확인할 수 없어 답사 따라가기를 종료했습니다.`);
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
    speakRouteGuidance(`${routeLabel}에서 벗어났습니다.`);
    setStatus(`경로 이탈 · ${routeLabel}에서 약 ${Math.round(nearest.distanceMeters)}m 떨어져 있습니다.`, "warning");
  } else if (state.routeOffTrack && state.routeRecoverySamples >= 2) {
    state.routeOffTrack = false;
    speakRouteGuidance(`${routeLabel}로 복귀했습니다.`);
    setStatus(`${routeLabel}로 복귀했습니다.`, "success");
  }

  renderRouteLines();
  renderRouteFollowStatus(point, nearest);
  return false;
}

function followLatestPoint(point) {
  if (
    (!state.tracking && !state.destinationFollow) ||
    state.paused ||
    !state.autoFollow ||
    !point ||
    (state.destinationFollow && Date.now() < followInteractionPauseUntil)
  ) {
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

function temporarilyPauseFollowCamera() {
  followInteractionPauseUntil = Date.now() + FOLLOW_INTERACTION_RESUME_MS;
  if (followInteractionResumeTimer !== null) {
    window.clearTimeout(followInteractionResumeTimer);
  }
  followInteractionResumeTimer = window.setTimeout(() => {
    followInteractionResumeTimer = null;
    followInteractionPauseUntil = 0;
    if (!state.destinationFollow || !state.autoFollow) {
      return;
    }
    const latest = getLatestPosition();
    if (latest) {
      followLatestPoint(latest);
      setStatus("답사 자동 따라가기를 계속합니다.");
    }
  }, FOLLOW_INTERACTION_RESUME_MS);
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
  restoreViewportAfterFilePicker();
  const files = Array.from(event.target.files || []);
  if (files.length === 0) {
    return;
  }

  const linkedSessionId = findCurrentRecordSession()?.id || null;
  event.target.value = "";
  let addedCount = 0;
  let failedCount = 0;
  let gpsPlacedCount = 0;
  let timePlacedCount = 0;
  let reviewCount = 0;
  let lastLocationLabel = "지도 화면 중앙";
  for (const [index, file] of files.entries()) {
    setStatus(`사진을 저장하고 위치를 확인하는 중입니다. (${index + 1}/${files.length})`, "active");
    try {
      const usesAutomaticPlacement = options.automatic === true;
      const usesMapCenter = !usesAutomaticPlacement && !options.position && !state.tracking;
      const fixedPosition = options.position || (usesMapCenter ? getMapCenterPosition() : null);
      const [locationResult, photoSrc] = await Promise.all([
        usesAutomaticPlacement
          ? getAutomaticPhotoPosition(file)
          : fixedPosition || usesMapCenter
          ? Promise.resolve({
              position: fixedPosition,
              source: fixedPosition ? options.source || (usesMapCenter ? "map-center" : "map") : "none",
              label: options.label || (fixedPosition ? "지도 화면 중앙" : "위치 정보 없음"),
            })
          : getBestPhotoPosition(file),
        resizePhotoForStorage(file),
      ]);
      const position = locationResult.position;
      const photo = {
        id: crypto.randomUUID(),
        displayName: getNextProjectPhotoName(),
        autoRouteName: true,
        originalName: file.name || "",
        name: file.name || "현장 사진",
        src: photoSrc,
        lat: position?.lat ?? null,
        lng: position?.lng ?? null,
        locationSource: locationResult.source,
        memo: String(options.memo || ""),
        tags: String(options.tags || (usesAutomaticPlacement ? "추가 답사" : "")),
        candidateRouteId: options.candidateRouteId || null,
        obstacleType: options.obstacleType || "",
        timestamp: locationResult.capturedAt || Date.now() + index,
      };
      photo.localPhotoCached = await cacheLocalPhoto(photo);
      state.photos.unshift(photo);
      if (position && state.tracking) {
        state.selectedPosition = { lat: position.lat, lng: position.lng, timestamp: Date.now() };
      }
      lastLocationLabel = locationResult.label;
      if (locationResult.source === "exif") gpsPlacedCount += 1;
      else if (locationResult.source === "route-time") timePlacedCount += 1;
      else if (usesAutomaticPlacement) reviewCount += 1;
      addedCount += 1;
    } catch (error) {
      console.warn("Photo batch item failed", error);
      failedCount += 1;
    }
  }

  reorderPhotosByRouteOrder();
  if (linkedSessionId) {
    replaceSessionRecordFromCurrentState(linkedSessionId);
  }
  const locallySaved = persist();
  render();
  if (addedCount === 0) {
    setStatus("선택한 사진을 추가하지 못했습니다. 사진 파일 형식과 용량을 확인해 주세요.", "error");
    return false;
  }
  const automaticSummary = options.automatic
    ? ` GPS 배치 ${gpsPlacedCount}장 · 촬영시각 배치 ${timePlacedCount}장 · 위치 확인 필요 ${reviewCount}장.`
    : "";
  const resultText = `${lastLocationLabel}에 사진 ${addedCount}장을 추가했습니다.${automaticSummary}${failedCount ? ` ${failedCount}장은 처리하지 못했습니다.` : ""}`;
  setStatus(
    locallySaved
      ? `${resultText} 위치 편집에서 사진별 위치를 조정할 수 있습니다.`
      : `${resultText} 화면을 닫지 말고 기록 저장을 눌러 서버 저장을 완료해 주세요.`,
    locallySaved && failedCount === 0 ? "success" : "warning",
  );
  if (linkedSessionId && !state.tracking && state.projectCode) {
    void syncProjectState("add-photo");
  }
  return true;
}

function beginObstaclePhotoCapture() {
  if (!els.obstaclePhotoInput) return;
  const activeRoute = getActivePlannedRoute();
  if (!activeRoute) {
    setStatus("장애물 사진을 연결할 후보노선을 먼저 만들거나 기준 지정해 주세요.", "warning");
    return;
  }
  const categoryInput = window.prompt(
    "장애물 종류를 입력하세요.\n높이 / 폭 / 교량 / 회전반경 / 경사 / 신호등·표지판 / 전선 / 노면 / 기타",
    "높이",
  );
  if (categoryInput === null) return;
  const category = categoryInput.trim() || "기타";
  const memoInput = window.prompt("실측값과 검토 메모를 입력하세요.", "");
  if (memoInput === null) return;
  const livePosition = state.destinationFollow
    ? state.selectedPosition
    : state.tracking
      ? getLatestPosition()
      : null;
  const position = livePosition && Number.isFinite(Number(livePosition.lat)) && Number.isFinite(Number(livePosition.lng))
    ? { lat: Number(livePosition.lat), lng: Number(livePosition.lng) }
    : getMapCenterPosition();
  pendingObstaclePhotoOptions = {
    position,
    source: livePosition ? "current-location" : "map-center",
    label: livePosition ? "현재 위치" : "지도 화면 중앙",
    tags: `장애물,${category}`,
    memo: memoInput.trim(),
    obstacleType: category,
    candidateRouteId: activeRoute.id,
  };
  els.obstaclePhotoInput.click();
}

async function getAutomaticPhotoPosition(file) {
  const metadata = await withTimeout(getExifPhotoMetadata(file), 5000, null);
  const capturedAt = metadata?.capturedAt || (Number(file.lastModified) > 0 ? file.lastModified : null);
  if (metadata?.position && isPhotoPositionNearRoute(metadata.position)) {
    return {
      position: { ...metadata.position, timestamp: capturedAt || Date.now() },
      capturedAt,
      source: "exif",
      label: "사진 GPS 또는 동선",
    };
  }

  const routePosition = findRoutePointByCaptureTime(capturedAt);
  if (routePosition) {
    return {
      position: routePosition,
      capturedAt,
      source: "route-time",
      label: "사진 GPS 또는 동선",
    };
  }

  return {
    position: null,
    capturedAt,
    source: "review-required",
    label: "사진 GPS 또는 동선",
  };
}

function isPhotoPositionNearRoute(position) {
  const lat = Number(position?.lat);
  const lng = Number(position?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return false;
  if (Math.abs(lat) < 0.001 && Math.abs(lng) < 0.001) return false;
  const route = state.points.filter((point) => Number.isFinite(Number(point?.lat)) && Number.isFinite(Number(point?.lng)));
  if (route.length === 0) return false;
  return route.some((point) => getDistanceMeters(point, { lat, lng }) <= 10_000);
}

function findRoutePointByCaptureTime(capturedAt) {
  if (!Number.isFinite(capturedAt)) return null;
  const candidates = state.points
    .filter((point) => Number.isFinite(Number(point?.timestamp)) && Number.isFinite(Number(point?.lat)) && Number.isFinite(Number(point?.lng)));
  if (candidates.length === 0) return null;
  const nearest = candidates.reduce((best, point) => {
    const difference = Math.abs(Number(point.timestamp) - capturedAt);
    return !best || difference < best.difference ? { point, difference } : best;
  }, null);
  if (!nearest || nearest.difference > 12 * 60 * 60 * 1000) return null;
  return {
    lat: Number(nearest.point.lat),
    lng: Number(nearest.point.lng),
    timestamp: capturedAt,
  };
}

function restoreViewportAfterFilePicker() {
  window.requestAnimationFrame(() => {
    map.invalidateSize(false);
    syncNaverBaseMap(true);
  });
  window.setTimeout(() => {
    map.invalidateSize(false);
    syncNaverBaseMap(true);
  }, 250);
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
  const metadata = await getExifPhotoMetadata(file);
  return metadata?.position || null;
}

async function getExifPhotoMetadata(file) {
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
        const metadata = readExifMetadata(view, offset, size - 2);
        if (metadata) return metadata;
      }

      offset += size - 2;
    }
  } catch {
    return null;
  }

  return null;
}

function readExifMetadata(view, start, length) {
  const exifHeader = "Exif\0\0";
  for (let i = 0; i < exifHeader.length; i += 1) {
    if (view.getUint8(start + i) !== exifHeader.charCodeAt(i)) {
      return null;
    }
  }

  const tiffStart = start + 6;
  const littleEndian = view.getUint16(tiffStart) === 0x4949;
  const firstIfdOffset = readUint32(view, tiffStart + 4, littleEndian);
  const firstIfd = tiffStart + firstIfdOffset;
  const gpsIfdOffset = findIfdValue(view, tiffStart, firstIfd, 0x8825, littleEndian);
  let position = null;
  if (gpsIfdOffset) {
    const gpsIfd = tiffStart + gpsIfdOffset;
    const latRef = findAsciiValue(view, tiffStart, gpsIfd, 0x0001, littleEndian);
    const lat = findRationalArrayValue(view, tiffStart, gpsIfd, 0x0002, littleEndian);
    const lngRef = findAsciiValue(view, tiffStart, gpsIfd, 0x0003, littleEndian);
    const lng = findRationalArrayValue(view, tiffStart, gpsIfd, 0x0004, littleEndian);
    if (latRef && lat && lngRef && lng) {
      position = {
        lat: convertDmsToDecimal(lat, latRef),
        lng: convertDmsToDecimal(lng, lngRef),
      };
    }
  }

  const exifIfdOffset = findIfdValue(view, tiffStart, firstIfd, 0x8769, littleEndian);
  const exifIfd = exifIfdOffset ? tiffStart + exifIfdOffset : null;
  const capturedText = (exifIfd && (
    findAsciiStringValue(view, tiffStart, exifIfd, 0x9003, littleEndian)
    || findAsciiStringValue(view, tiffStart, exifIfd, 0x9004, littleEndian)
  )) || findAsciiStringValue(view, tiffStart, firstIfd, 0x0132, littleEndian);
  const capturedAt = parseExifDateTime(capturedText);
  return position || capturedAt ? { position, capturedAt } : null;
}

function findAsciiStringValue(view, tiffStart, ifdStart, tagId, littleEndian) {
  const entry = findIfdEntry(view, ifdStart, tagId, littleEndian);
  if (!entry) return null;
  const count = readUint32(view, entry + 4, littleEndian);
  if (!count || count > 128) return null;
  const valueOffset = count <= 4 ? entry + 8 : tiffStart + readUint32(view, entry + 8, littleEndian);
  let value = "";
  for (let index = 0; index < count; index += 1) {
    const code = view.getUint8(valueOffset + index);
    if (code === 0) break;
    value += String.fromCharCode(code);
  }
  return value.trim() || null;
}

function parseExifDateTime(value) {
  const match = String(value || "").match(/^(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match;
  const timestamp = new Date(
    Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second),
  ).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
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

  reorderPhotosByRouteOrder();
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
      const updatedAt = Date.now();
      const updatedSession = {
        ...current,
        reason,
        startedAt: current.startedAt || startedAt,
        endedAt: updatedAt,
        distanceMeters: getTotalDistance(),
        points: structuredClone(state.points),
        photos: structuredClone(state.photos),
        signature,
        continuedAt: updatedAt,
        updatedAt,
        recordingActive: false,
      };
      state.sessions.splice(index, 1);
      state.sessions.unshift(updatedSession);
      if (!state.primarySessionId || state.primarySessionId === current.id) {
        state.primarySessionId = updatedSession.id;
      }
      state.continuingSessionId = updatedSession.id;
      state.activeStartedAt = null;
      persist();
      saveProjectRecoveryBackup("session-updated");
      renderSessions();
      setStatus("이어가기 기록을 이 기기에 보관했습니다.");
      return updatedSession;
    }
    state.continuingSessionId = null;
  }
  const existingSession = state.sessions.find((session) => session.signature === signature);
  if (existingSession) {
    setStatus("이미 저장된 기록입니다.");
    return existingSession;
  }
  const completedAt = Date.now();
  const session = {
    id: state.liveSyncSessionId || crypto.randomUUID(),
    name: getDefaultSessionName(startedAt),
    memo: "",
    reason,
    startedAt,
    endedAt: completedAt,
    updatedAt: completedAt,
    distanceMeters: getTotalDistance(),
    points: structuredClone(state.points),
    photos: structuredClone(state.photos),
    signature,
    recordingActive: false,
  };

  try {
    state.sessions.unshift(session);
    state.sessions = state.sessions.slice(0, 20);
    if (!state.primarySessionId) {
      state.primarySessionId = session.id;
    }
    state.activeStartedAt = null;
    persist();
    saveProjectRecoveryBackup("session-created");
    renderSessions();
    setStatus("현재 기록을 이 기기에 보관했습니다.");
    return session;
    setStatus("현재 기록을 저장했습니다.");
  } catch {
    setStatus("기록 저장에 실패했습니다. 사진 용량을 줄인 뒤 다시 시도해 주세요.");
    return false;
    setStatus("기록 저장에 실패했습니다. 사진 하나의 용량을 줄인 뒤 다시 시도해 주세요.");
  }
}

function getRecordSignature(points = [], photos = []) {
  const pointPart = points
    .map((point) => `${point.timestamp}:${point.lat.toFixed(6)}:${point.lng.toFixed(6)}`)
    .join("|");
  const photoPart = photos.map((photo) => `${photo.id}:${photo.timestamp}`).join("|");
  return `${pointPart}::${photoPart}`;
}

function getCurrentRecordSignature() {
  return getRecordSignature(state.points, state.photos);
}

function findCurrentRecordSession() {
  if (state.continuingSessionId) {
    const continuingSession = state.sessions.find((session) => session.id === state.continuingSessionId);
    if (continuingSession) {
      return continuingSession;
    }
  }
  const signature = getCurrentRecordSignature();
  return state.sessions.find(
    (session) =>
      session.signature === signature ||
      getRecordSignature(session.points || [], session.photos || []) === signature,
  ) || null;
}

function replaceSessionRecordFromCurrentState(sessionId) {
  const session = state.sessions.find((item) => item.id === sessionId);
  if (!session) {
    return false;
  }
  const updatedAt = Date.now();
  session.points = structuredClone(state.points);
  session.photos = structuredClone(state.photos);
  session.distanceMeters = getTotalDistance();
  session.signature = getCurrentRecordSignature();
  session.endedAt = Math.max(Number(session.endedAt) || 0, updatedAt);
  session.updatedAt = updatedAt;
  return true;
}

function updatePrimarySessionFromCurrentState() {
  const sessionId = state.primarySessionId || findCurrentRecordSession()?.id || null;
  if (!sessionId) return false;
  return replaceSessionRecordFromCurrentState(sessionId);
}

function updatePhotoCopies(photoId, updater) {
  const touchedSessions = new Set();
  const photoLists = [
    { photos: state.photos, session: null },
    ...state.sessions.map((session) => ({ photos: session.photos || [], session })),
  ];
  let currentPhoto = null;
  photoLists.forEach(({ photos, session }) => {
    photos.forEach((photo) => {
      if (photo.id !== photoId) {
        return;
      }
      updater(photo);
      if (!session) {
        currentPhoto = photo;
      } else {
        touchedSessions.add(session);
      }
    });
  });
  const updatedAt = Date.now();
  touchedSessions.forEach((session) => {
    session.signature = getRecordSignature(session.points || [], session.photos || []);
    session.updatedAt = updatedAt;
  });
  return { currentPhoto, touchedSessionCount: touchedSessions.size };
}

function deletePhotoCopies(photoId) {
  const beforeCurrentCount = state.photos.length;
  state.photos = state.photos.filter((photo) => photo.id !== photoId);
  let touchedSessionCount = 0;
  const updatedAt = Date.now();
  state.sessions.forEach((session) => {
    const photos = Array.isArray(session.photos) ? session.photos : [];
    const filtered = photos.filter((photo) => photo.id !== photoId);
    if (filtered.length === photos.length) {
      return;
    }
    session.photos = filtered;
    session.signature = getRecordSignature(session.points || [], filtered);
    session.updatedAt = updatedAt;
    touchedSessionCount += 1;
  });
  return {
    removedCurrent: state.photos.length !== beforeCurrentCount,
    touchedSessionCount,
  };
}

function loadSession(sessionId) {
  const session = state.sessions.find((item) => item.id === sessionId);
  if (!session) {
    return;
  }
  removeSessionOverlay(sessionId);

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
  removeSessionOverlay(sessionId);

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
  removeSessionOverlay(sessionId);
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
  session.updatedAt = session.editedAt;
  persist();
  renderSessions();
  syncProjectState("edit-session");
  setStatus("기록명과 메모를 수정했습니다.");
}

async function deleteSession(sessionId) {
  const session = state.sessions.find((item) => item.id === sessionId);
  if (!session || !state.projectCode) {
    return;
  }
  const ok = window.confirm(
    "저장된 기록을 삭제할까요?\n\n확인한 삭제는 서버에 명시적으로 전달되며, 일반 저장 오류와 구분하여 처리합니다.",
  );
  if (!ok) {
    return;
  }
  removeSessionOverlay(sessionId);
  renderSessionOverlays();
  queuePendingSessionDelete(state.projectCode, sessionId);
  persist();
  renderSessions();
  setStatus("기록 삭제를 서버에서 확인하는 중입니다.", "active");
  await performPendingSessionDelete(state.projectCode, sessionId);
}

function queuePendingSessionDelete(projectCode, sessionId) {
  if (state.pendingSessionDeletes.some((item) => item.projectCode === projectCode && item.sessionId === sessionId)) {
    return;
  }
  state.pendingSessionDeletes.push({
    id: crypto.randomUUID(),
    projectCode,
    sessionId,
    userId: state.user?.id || "",
    requestedAt: Date.now(),
  });
}

async function performPendingSessionDelete(projectCode, sessionId) {
  const pending = state.pendingSessionDeletes.find(
    (item) => item.projectCode === projectCode && item.sessionId === sessionId,
  );
  if (!pending) {
    return true;
  }
  const session = state.sessions.find((item) => item.id === sessionId);
  const wasCurrentRecord = Boolean(
    session &&
    (state.continuingSessionId === sessionId || getCurrentRecordSignature() === session.signature),
  );
  try {
    const project = await requestJson(
      `/api/projects/${encodeURIComponent(projectCode)}/sessions/${encodeURIComponent(sessionId)}`,
      { method: "DELETE" },
    );
    state.pendingSessionDeletes = state.pendingSessionDeletes.filter((item) => item.id !== pending.id);
    if (state.projectCode === projectCode) {
      applyConfirmedSessionDeletion(project, sessionId, wasCurrentRecord);
      void cleanupUnreferencedCachedPhotos((session?.photos || []).map((photo) => photo.id));
      saveProjectRecoveryBackup("session-deleted", true);
      setStatus("서버에서 기록 삭제를 확인했습니다.", "success");
    }
    persist();
    return true;
  } catch (error) {
    if (!error?.status || error.status >= 500) {
      pending.lastAttemptAt = Date.now();
      pending.lastError = error?.message || "network";
      persist();
      renderSessions();
      setStatus("통신이 불안정해 삭제 대기 중입니다. 온라인이 되면 자동으로 다시 시도합니다.", "warning");
      return false;
    }
    state.pendingSessionDeletes = state.pendingSessionDeletes.filter((item) => item.id !== pending.id);
    persist();
    renderSessions();
    setStatus("서버가 삭제 요청을 거부하여 기록을 다시 표시했습니다.", "error");
    return false;
  }
}

function applyConfirmedSessionDeletion(project, sessionId, wasCurrentRecord) {
  state.sessions = Array.isArray(project.sessions) ? project.sessions : [];
  state.overlaySessionIds = state.overlaySessionIds.filter((id) => id !== sessionId);
  state.primarySessionId = project.primarySessionId || state.sessions[0]?.id || null;
  if (state.continuingSessionId === sessionId) {
    state.continuingSessionId = null;
  }
  if (wasCurrentRecord) {
    const primarySession = state.sessions.find((item) => item.id === state.primarySessionId) || state.sessions[0];
    state.points = structuredClone(primarySession?.points || []);
    state.photos = structuredClone(primarySession?.photos || []);
    state.selectedPosition = state.points.at(-1) || null;
    state.activeStartedAt = null;
  }
  applyProjectMeta(project);
  render();
}

async function createServerProject() {
  const hasCurrentData =
    state.points.length > 0 ||
    state.photos.length > 0 ||
    state.milestones.length > 0 ||
    state.plannedRoutes.length > 0 ||
    state.mapReferences.length > 0 ||
    state.sessions.length > 0;
  if (hasCurrentData) {
    const ok = window.confirm(
      "새 프로젝트를 시작할까요?\n\n현재 화면의 거리, 위치점, 사진, 공사구역, 참고 지도, 사전 답사, 저장된 기록이 새 프로젝트 기준으로 초기화됩니다.",
    );
    if (!ok) {
      return;
    }
  }
  if (state.tracking) {
    await stopTracking({ save: false, clearCurrent: false });
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
      await loadProjectMembers();
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
  const confirmed = window.confirm(
    `프로젝트명을 변경할까요?\n\n기존 이름: ${previousName}\n새 이름: ${nextName}`,
  );
  if (!confirmed) {
    els.projectName.value = previousName;
    setProjectStatus("프로젝트명 변경을 취소했습니다.");
    return;
  }
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
  resetSegmentRerouteState();
  state.points = [];
  state.photos = [];
  state.milestones = [];
  state.plannedRoutes = [];
  state.activePlannedRouteId = null;
  state.planningMode = false;
  state.plannedRouteDraft = null;
  state.mapReferences = [];
  state.activeMapReferenceId = null;
  state.mapAlignmentMode = false;
  state.mapReferenceDraft = null;
  state.pendingMapReferenceImagePoint = null;
  mapReferenceCornerHistory = [];
  state.constructionPinsVisible = true;
  state.photoPinsVisible = true;
  state.sessions = [];
  state.overlaySessionIds = [];
  state.primarySessionId = null;
  state.continuingSessionId = null;
  state.selectedPosition = state.initialPosition || null;
  state.activeStartedAt = null;
  state.liveSyncSessionId = null;
  state.lastSyncedPointCount = 0;
  resetTrackingCheckpointState();
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
  state.projectAccessRole = "";
  state.projectRevision = "";
  state.projectMembers = [];
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

  const requestId = ++projectOpenRequestId;
  if (state.projectCode === normalizedCode) {
    saveProjectRecoveryBackup("before-server-open");
  }
  if (pendingProjectSyncs.size > 0) {
    setProjectStatus("현재 프로젝트의 변경사항을 저장한 뒤 불러옵니다.");
    await Promise.allSettled([...pendingProjectSyncs]);
  }
  if (requestId !== projectOpenRequestId) {
    return;
  }
  setProjectStatus("프로젝트 기록을 불러오는 중입니다.");
  try {
    const project = await requestJson(`/api/projects/${encodeURIComponent(normalizedCode)}`);
    if (requestId !== projectOpenRequestId) {
      return;
    }
    const recoveryBackup = getProjectRecoveryBackup(normalizedCode);
    if (shouldOfferProjectRecovery(project, recoveryBackup)) {
      const recover = window.confirm(
        "서버 기록보다 이 PC의 복구본에 더 많은 기록이 있습니다.\n\nPC 복구본을 불러와 서버에 다시 저장할까요?",
      );
      if (recover) {
        applyProjectRecoveryBackup(project, recoveryBackup);
        updateProjectUrl(project.code);
        persist();
        render();
        fitToData();
        const recovered = await syncProjectState("local-recovery");
        setProjectStatus(
          recovered
            ? `${project.code} PC 복구본을 서버에 다시 저장했습니다.`
            : `${project.code} PC 복구본을 불러왔지만 서버 저장은 실패했습니다. 화면을 닫지 말고 다시 저장해 주세요.`,
        );
        return;
      }
    }
    applyProject(project);
    updateProjectUrl(project.code);
    persist();
    render();
    if (state.projectAccessRole === "owner") {
      loadProjectShares();
      loadProjectMembers();
    } else {
      state.shareLinks = [];
      state.projectMembers = [];
      renderSharePanel();
      renderProjectCollaboration();
    }
    fitToData();
    setProjectStatus(`${project.code} 기록을 불러왔습니다.`);
  } catch (error) {
    if (error?.status === 403 || error?.payload?.error === "project_access_denied") {
      setProjectStatus("다른 사용자의 프로젝트이므로 열 수 없습니다. 작성자에게 공유 링크나 편집자 초대를 요청해 주세요.");
      return;
    }
    setProjectStatus("프로젝트를 찾지 못했습니다. 공유 코드를 확인해 주세요.");
  }
}

function syncProjectState(reason = "manual") {
  if (!state.projectCode) {
    setProjectStatus("서버 저장은 공유 프로젝트를 만든 뒤 사용할 수 있습니다.");
    return Promise.resolve(false);
  }
  const hasPendingDelete = state.pendingSessionDeletes.some(
    (item) => item.projectCode === state.projectCode && (!item.userId || item.userId === state.user?.id),
  );
  if (hasPendingDelete && reason !== "delete-session-confirmed") {
    setProjectStatus("기록 삭제를 먼저 확인한 뒤 프로젝트 저장을 계속합니다.");
    return retryPendingSessionDeletes().then((completed) =>
      completed ? syncProjectState("delete-session-confirmed") : false,
    );
  }
  const job = {
    projectCode: state.projectCode,
    reason,
    payload: createProjectSyncPayload(reason),
  };
  const operation = projectSyncQueue.then(() => performProjectSync(job));
  projectSyncQueue = operation.catch(() => false);
  pendingProjectSyncs.add(operation);
  operation.then(
    () => pendingProjectSyncs.delete(operation),
    () => pendingProjectSyncs.delete(operation),
  );
  return operation;
}

async function performProjectSync(job) {
  const { projectCode: syncProjectCode, reason, payload: initialPayload } = job;
  if (state.projectCode === syncProjectCode) {
    state.syncDirty = true;
    state.syncing = true;
    state.lastSyncError = "";
    persist();
    setProjectStatus("서버 동기화 중입니다. 연결이 불안정해도 현재 작업은 로컬에 보관됩니다.");
    renderSyncStatus();
  }

  try {
    let payload = initialPayload;
    if (state.projectCode === syncProjectCode) {
      await preparePhotosForProjectSync();
      if (state.projectCode === syncProjectCode) {
        payload = createProjectSyncPayload(reason);
      }
    }
    const project = await requestJson(`/api/projects/${encodeURIComponent(syncProjectCode)}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    if (state.projectCode === syncProjectCode) {
      if (Array.isArray(project.lastState?.plannedRoutes)) {
        state.plannedRoutes = normalizePlannedRoutes(project.lastState.plannedRoutes);
        state.activePlannedRouteId = project.lastState.activePlannedRouteId || state.plannedRoutes[0]?.id || null;
      }
      if (Array.isArray(project.lastState?.mapReferences)) {
        state.mapReferences = normalizeMapReferences(project.lastState.mapReferences);
        state.activeMapReferenceId = project.lastState.activeMapReferenceId || state.mapReferences[0]?.id || null;
        renderMapReferenceTools();
        scheduleMapReferenceRender();
      }
      applyProjectMeta(project);
      state.syncDirty = false;
      state.syncing = false;
      state.lastSyncedAt = Date.now();
      state.lastSyncFailedAt = null;
      state.lastSyncError = "";
      state.lastSyncedPointCount = state.points.length;
      persist();
      renderSyncStatus();
      saveProjectRecoveryBackup("server-confirmed", true);
      if (state.user && reason !== "auto-retry") {
        loadMyProjects();
      }
      setProjectStatus(`${formatDate(Date.now())} 서버에 저장했습니다. 다른 기기에서는 불러오기를 눌러 확인하세요.`);
    }
    return true;
  } catch (error) {
    if (state.projectCode === syncProjectCode) {
      state.syncDirty = true;
      state.syncing = false;
      state.lastSyncFailedAt = Date.now();
      state.lastSyncError = error?.message || "network";
      persist();
      renderSyncStatus();
    }
    if (state.projectCode === syncProjectCode) {
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
      if (error?.status === 409 || error?.payload?.error === "project_conflict") {
        if (error?.payload?.error === "record_loss_guard") {
          setProjectStatus("서버가 저장된 기록 감소를 감지해 덮어쓰기를 차단했습니다. 프로젝트를 다시 불러와 복구본을 확인해 주세요.");
          return false;
        }
        setProjectStatus("다른 편집자가 먼저 저장했습니다. 기존 내용을 덮어쓰지 않도록 저장을 중단했습니다. 프로젝트를 다시 불러와 최신 내용을 확인해 주세요.");
        return false;
      }
      setProjectStatus("서버 저장에 실패했습니다. 연결 상태를 확인해 주세요.");
    }
    return false;
  }
}

function createProjectSyncPayload(reason) {
  reorderConstructionPinsByRouteOrder();
  const sessions = createSessionsForSync(reason);
  return {
    name: state.projectName || "프로젝트A",
    reason,
    points: structuredClone(state.points),
    photos: structuredClone(state.photos),
    milestones: structuredClone(state.milestones),
    plannedRoutes: structuredClone(state.plannedRoutes),
    activePlannedRouteId: state.activePlannedRouteId,
    mapReferences: structuredClone(state.mapReferences),
    activeMapReferenceId: state.activeMapReferenceId,
    sessions,
    primarySessionId: state.primarySessionId,
    baseUpdatedAt: state.projectRevision || null,
    allowSessionReduction: reason === "delete-session",
  };
}

function createSessionsForSync(reason) {
  const sessions = structuredClone(state.sessions);
  if (!state.tracking || !state.liveSyncSessionId || state.points.length === 0) return sessions;

  const existing = sessions.find((session) => session.id === state.liveSyncSessionId);
  const startedAt = existing?.startedAt || state.activeStartedAt || state.points[0]?.timestamp || Date.now();
  const updatedAt = Date.now();
  const liveSession = {
    ...existing,
    id: state.liveSyncSessionId,
    name: existing?.name || getDefaultSessionName(startedAt),
    memo: existing?.memo || "",
    reason,
    startedAt,
    endedAt: state.points.at(-1)?.timestamp || updatedAt,
    updatedAt,
    distanceMeters: getTotalDistance(),
    points: structuredClone(state.points),
    photos: structuredClone(state.photos),
    signature: getCurrentRecordSignature(),
    recordingActive: true,
  };
  return [liveSession, ...sessions.filter((session) => session.id !== liveSession.id)].slice(0, 50);
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
          item.localPhotoCached = false;
          delete item.localPhotoCacheKey;
          delete item.pendingUpload;
        }
      });
    });
    await deleteCachedLocalPhoto(photo.id || key);
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

async function retryPendingProjectSync() {
  if (!state.projectCode || !state.syncDirty || state.syncing) {
    return false;
  }
  setProjectStatus("온라인 상태로 돌아왔습니다. 서버 동기화를 다시 시도합니다.");
  return syncProjectState("auto-retry");
}

async function retryPendingSessionDeletes() {
  const pendingItems = state.pendingSessionDeletes.filter(
    (item) => item?.projectCode && item?.sessionId && (!item.userId || item.userId === state.user?.id),
  );
  let allCompleted = true;
  for (const pending of pendingItems) {
    const completed = await performPendingSessionDelete(pending.projectCode, pending.sessionId);
    allCompleted = completed && allCompleted;
  }
  return allCompleted;
}

async function retryPendingSaves() {
  const deletesCompleted = await retryPendingSessionDeletes();
  const hasCurrentUserPendingDelete = state.pendingSessionDeletes.some(
    (item) => !item.userId || item.userId === state.user?.id,
  );
  if (!deletesCompleted || hasCurrentUserPendingDelete) {
    return false;
  }
  return retryPendingProjectSync();
}

function applyProject(project) {
  stopRouteFollowWatcher();
  resetSegmentRerouteState();
  milestoneLayer.clearLayers();
  state.sessions = Array.isArray(project.sessions) ? project.sessions : [];
  state.overlaySessionIds = [];
  const liveSharedSession = state.shareView
    ? state.sessions.find(isRecentlyActiveSharedSession)
    : null;
  state.primarySessionId = liveSharedSession?.id || project.primarySessionId || state.sessions[0]?.id || null;
  const lastState = project.lastState || {};
  state.milestones = normalizeMilestones(
    Array.isArray(lastState.milestones) ? structuredClone(lastState.milestones) : [],
  );
  state.plannedRoutes = normalizePlannedRoutes(lastState.plannedRoutes || project.plannedRoutes);
  state.activePlannedRouteId =
    lastState.activePlannedRouteId || project.activePlannedRouteId || state.plannedRoutes[0]?.id || null;
  state.mapReferences = normalizeMapReferences(lastState.mapReferences || project.mapReferences);
  state.activeMapReferenceId =
    lastState.activeMapReferenceId || project.activeMapReferenceId || state.mapReferences[0]?.id || null;
  state.mapAlignmentMode = false;
  state.mapReferenceDraft = null;
  state.pendingMapReferenceImagePoint = null;
  mapReferenceCornerHistory = [];
  state.planningMode = false;
  state.plannedRouteDraft = null;
  state.constructionPinsVisible = true;
  state.photoPinsVisible = true;
  state.points = [];
  state.photos = [];
  state.selectedPosition = null;
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
  state.liveSyncSessionId = null;
  state.lastSyncedPointCount = state.points.length;
  state.syncDirty = false;
  state.syncing = false;
  state.lastSyncFailedAt = null;
  state.lastSyncError = "";
  resetTrackingCheckpointState();
  applyProjectMeta(project);
}

function applyProjectMeta(project) {
  state.projectCode = project.code || "";
  state.projectName = project.name || "프로젝트A";
  state.projectAccessRole = project.accessRole || (project.ownerUserId === state.user?.id ? "owner" : "");
  state.projectRevision = project.updatedAt || "";
  state.shareLinks = [];
  if (!state.shareView) {
    persist();
  }
  renderProjectState();
  renderSharePanel();
  renderProjectCollaboration();
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
    els.renameProjectBtn.disabled =
      !state.projectCode || Boolean(state.shareView) || state.projectAccessRole !== "owner";
  }
  els.projectBadge.textContent = state.projectCode || getStorageBadgeLabel();
  if (state.shareView) {
    els.projectBadge.textContent = "공유 보기";
  } else if (state.projectAccessRole === "editor") {
    els.projectBadge.textContent = "공유받음";
  }
  const serverReady = state.serverHealth?.environment !== "production" || state.serverHealth?.ready !== false;
  els.projectBadge.classList.toggle(
    "is-live",
    serverReady && Boolean(state.projectCode || state.serverHealth?.storage === "tidb"),
  );
  renderSyncStatus();
}

function renderSyncStatus() {
  if (!els.syncStatusPanel || !els.syncStatusLabel || !els.retrySyncBtn) return;
  els.syncStatusPanel.classList.remove("is-pending", "is-error");
  if (!state.projectCode) {
    els.syncStatusLabel.textContent = "프로젝트를 선택하면 서버 저장 상태를 표시합니다.";
    els.retrySyncBtn.hidden = true;
    return;
  }
  const pendingPointCount = Math.max(0, state.points.length - Number(state.lastSyncedPointCount || 0));
  if (state.syncing) {
    els.syncStatusPanel.classList.add("is-pending");
    els.syncStatusLabel.textContent = `서버 전송 중${pendingPointCount ? ` · 위치점 ${pendingPointCount}개` : ""}`;
    els.retrySyncBtn.hidden = true;
    return;
  }
  if (state.syncDirty) {
    const failed = Boolean(state.lastSyncFailedAt);
    els.syncStatusPanel.classList.add(failed ? "is-error" : "is-pending");
    els.syncStatusLabel.textContent = failed
      ? `서버 전송 지연 · 휴대폰에 보관 중${pendingPointCount ? ` · 위치점 ${pendingPointCount}개` : ""}`
      : `서버 전송 대기${pendingPointCount ? ` · 위치점 ${pendingPointCount}개` : " · 변경사항 있음"}`;
    els.retrySyncBtn.hidden = false;
    return;
  }
  els.syncStatusLabel.textContent = state.lastSyncedAt
    ? `서버 저장 완료 · ${new Date(state.lastSyncedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
    : "서버 저장 전 · 기록 저장 또는 동기화를 실행해 주세요.";
  els.retrySyncBtn.hidden = true;
}

async function loadProjectMembers() {
  if (!state.projectCode || state.projectAccessRole !== "owner" || state.shareView) {
    state.projectMembers = [];
    renderProjectCollaboration();
    return;
  }
  try {
    const result = await requestJson(
      `/api/projects/${encodeURIComponent(state.projectCode)}/members`,
    );
    state.projectMembers = Array.isArray(result.members) ? result.members : [];
    els.projectCollaborationStatus.textContent =
      state.projectMembers.length > 0
        ? `편집자 ${state.projectMembers.length}명이 함께 작업할 수 있습니다.`
        : "가입된 아이디를 편집자로 초대할 수 있습니다.";
  } catch {
    state.projectMembers = [];
    els.projectCollaborationStatus.textContent = "공동 편집 사용자 목록을 불러오지 못했습니다.";
  }
  renderProjectCollaboration();
}

async function inviteProjectEditor() {
  if (!state.projectCode || state.projectAccessRole !== "owner") {
    return;
  }
  const email = els.projectInviteEmail?.value.trim();
  if (!email) {
    els.projectCollaborationStatus.textContent = "초대할 가입 아이디를 입력해 주세요.";
    els.projectInviteEmail?.focus();
    return;
  }
  els.projectCollaborationStatus.textContent = "편집자를 추가하는 중입니다.";
  try {
    const result = await requestJson(
      `/api/projects/${encodeURIComponent(state.projectCode)}/members`,
      {
        method: "POST",
        body: JSON.stringify({ email }),
      },
    );
    state.projectMembers = [
      ...state.projectMembers.filter((member) => member.id !== result.member.id),
      result.member,
    ];
    els.projectInviteEmail.value = "";
    els.projectCollaborationStatus.textContent = `${result.member.email} 사용자를 편집자로 추가했습니다.`;
    renderProjectCollaboration();
  } catch (error) {
    const reason = error?.payload?.error;
    els.projectCollaborationStatus.textContent =
      reason === "member_not_found"
        ? "가입되어 있고 활성화된 사용자를 찾지 못했습니다."
        : reason === "member_is_owner"
          ? "프로젝트 소유자는 편집자로 다시 추가할 수 없습니다."
          : "편집자를 추가하지 못했습니다.";
  }
}

async function removeProjectEditor(member) {
  if (!state.projectCode || state.projectAccessRole !== "owner") {
    return;
  }
  const ok = window.confirm(`${member.email} 사용자의 공동 편집 권한을 해제할까요?`);
  if (!ok) {
    return;
  }
  try {
    await requestJson(
      `/api/projects/${encodeURIComponent(state.projectCode)}/members/${encodeURIComponent(member.id)}`,
      { method: "DELETE" },
    );
    state.projectMembers = state.projectMembers.filter((item) => item.id !== member.id);
    els.projectCollaborationStatus.textContent = `${member.email} 사용자의 편집 권한을 해제했습니다.`;
    renderProjectCollaboration();
  } catch {
    els.projectCollaborationStatus.textContent = "편집 권한을 해제하지 못했습니다.";
  }
}

async function transferProjectCopy() {
  if (
    !state.projectCode ||
    state.projectAccessRole !== "owner" ||
    els.projectTransferBtn?.disabled
  ) {
    return;
  }
  const email = els.projectTransferEmail?.value.trim();
  if (!email) {
    els.projectTransferStatus.textContent = "프로젝트를 전달받을 가입 아이디를 입력해 주세요.";
    els.projectTransferEmail?.focus();
    return;
  }
  const confirmed = window.confirm(
    `${email} 사용자에게 프로젝트 사본을 전달할까요?\n\n현재 프로젝트는 원본으로 그대로 보관되고, 상대방 소유의 새 프로젝트 코드가 만들어집니다. 공유 링크와 편집자 목록은 복사되지 않습니다.`,
  );
  if (!confirmed) {
    return;
  }
  els.projectTransferBtn.disabled = true;
  els.projectTransferStatus.textContent = "최신 기록을 저장한 뒤 프로젝트 사본을 만듭니다.";
  const saved = await syncProjectState("transfer");
  if (!saved) {
    els.projectTransferStatus.textContent = "최신 기록을 저장하지 못해 프로젝트 전달을 중단했습니다.";
    els.projectTransferBtn.disabled = false;
    return;
  }
  els.projectTransferStatus.textContent = "프로젝트 사본을 만드는 중입니다.";
  try {
    const result = await requestJson(
      `/api/projects/${encodeURIComponent(state.projectCode)}/transfer`,
      {
        method: "POST",
        body: JSON.stringify({ email }),
      },
    );
    els.projectTransferEmail.value = "";
    els.projectTransferStatus.textContent =
      `${result.recipientEmail} 사용자에게 ${result.project.code} 프로젝트를 전달했습니다. 원본은 현재 계정에 유지됩니다.`;
  } catch (error) {
    const reason = error?.payload?.error;
    els.projectTransferStatus.textContent =
      reason === "recipient_not_found"
        ? "가입되어 있고 활성화된 사용자를 찾지 못했습니다."
        : reason === "recipient_is_owner"
          ? "현재 프로젝트 소유자에게는 다시 전달할 수 없습니다."
          : "프로젝트를 전달하지 못했습니다.";
  } finally {
    els.projectTransferBtn.disabled = false;
  }
}

function renderProjectCollaboration() {
  if (!els.projectCollaboration) {
    return;
  }
  const hasProject = Boolean(state.projectCode && !state.shareView);
  els.projectCollaboration.hidden = !hasProject;
  if (!hasProject) {
    return;
  }
  const isOwner = state.projectAccessRole === "owner";
  els.projectAccessBadge.textContent = isOwner ? "소유자" : "편집자";
  els.projectInviteControls.hidden = !isOwner;
  els.projectTransferBlock.hidden = !isOwner;
  if (!isOwner) {
    els.projectCollaborationStatus.textContent =
      "소유자가 편집 권한을 공유했습니다. 공유 링크 관리와 프로젝트 삭제는 소유자만 할 수 있습니다.";
  }
  els.projectMemberList.innerHTML = "";
  if (!isOwner) {
    return;
  }
  state.projectMembers.forEach((member) => {
    const item = document.createElement("article");
    item.className = "project-member-item";
    const body = document.createElement("div");
    const title = document.createElement("strong");
    const role = document.createElement("span");
    title.textContent = member.email;
    role.textContent = "편집자";
    body.append(title, role);
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.textContent = "해제";
    removeButton.addEventListener("click", () => removeProjectEditor(member));
    item.append(body, removeButton);
    els.projectMemberList.append(item);
  });
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
    authResolved = true;
    if (!state.user && !initialShareToken) {
      resetWorkspaceForSignedOut();
      render();
      return;
    }
    renderAuthPanel();
    if (state.user) {
      activateWorkspaceAfterLogin();
      await retryPendingSaves();
      await loadMyProjects();
      await loadAdminUsers();
      await loadProjectShares();
    }
  } catch {
    state.user = null;
    authResolved = true;
    if (!initialShareToken) {
      resetWorkspaceForSignedOut();
      render();
      return;
    }
    renderAuthPanel();
  }
}

function renderAuthPanel() {
  if (!authEls.section) {
    return;
  }
  const user = state.user;
  renderAuthAccessState();
  if (!user) {
    state.authPanelOpen = true;
  }
  authEls.section.classList.toggle("is-collapsed", !state.authPanelOpen);
  authEls.toggleBtn.textContent = state.authPanelOpen ? "숨기기" : "펼치기";
  authEls.toggleBtn.hidden = !user;
  authEls.badge.textContent = user ? "로그인" : "비로그인";
  authEls.badge.classList.toggle("is-live", Boolean(user));
  authEls.email.hidden = Boolean(user);
  authEls.passwordWrap.hidden = Boolean(user);
  authEls.loginBtn.hidden = Boolean(user);
  authEls.logoutBtn.hidden = !user;
  authEls.status.textContent = user
    ? `${user.email} 계정으로 로그인했습니다.${user.role === "admin" ? " 관리자 권한입니다." : ""}`
    : "아이디와 비밀번호로 로그인하면 지도와 전체 작업 기능을 사용할 수 있습니다.";
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

function renderAuthAccessState() {
  if (initialShareToken || state.shareView) {
    document.body.classList.remove("is-auth-pending", "is-logged-out", "is-authenticated");
    return;
  }
  document.body.classList.toggle("is-auth-pending", !authResolved);
  document.body.classList.toggle("is-logged-out", authResolved && !state.user);
  document.body.classList.toggle("is-authenticated", authResolved && Boolean(state.user));
  if (authResolved && state.user) {
    window.requestAnimationFrame(() => map.invalidateSize());
  }
}

function activateWorkspaceAfterLogin() {
  if (workspaceActivated || !state.user || initialShareToken) {
    return;
  }
  workspaceActivated = true;
  showLocationReadiness();
  captureInitialPosition();
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      map.invalidateSize(false);
      const desiredMapProvider = state.mapProvider === "naver" ? "naver" : "osm";
      void applyMapProvider(desiredMapProvider, { quiet: true });
    });
  });
  window.setTimeout(() => {
    map.invalidateSize(false);
    if (map.hasLayer(osmTileLayer)) {
      osmTileLayer.redraw();
    }
    syncNaverBaseMap(true);
  }, 250);
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
    authResolved = true;
    authEls.password.value = "";
    renderAuthPanel();
    activateWorkspaceAfterLogin();
    await retryPendingSaves();
    await loadMyProjects();
    await loadAdminUsers();
    await loadProjectShares();
    setStatus("로그인했습니다. 내 프로젝트 목록을 불러왔습니다.", "success");
  } catch (error) {
    const authError = error?.payload?.error;
    const message = authError === "account_pending"
      ? "가입 신청이 접수되었습니다. 관리자 승인 후 로그인할 수 있습니다."
      : authError === "account_disabled"
        ? "비활성화된 계정입니다."
        : authError === "password_too_short"
        ? `새 계정의 비밀번호는 ${error.payload.minPasswordLength || 4}자 이상이어야 합니다.`
        : "로그인에 실패했습니다. 아이디 또는 비밀번호를 확인해 주세요.";
    authEls.status.textContent = message;
  }
}

async function logout() {
  if (state.tracking) {
    await stopTracking({ save: true, clearCurrent: false });
  }
  stopRouteFollowWatcher();
  state.destinationFollow = false;
  window.speechSynthesis?.cancel();
  if (state.syncDirty && pendingProjectSyncs.size === 0) {
    await syncProjectState("logout");
  }
  if (pendingProjectSyncs.size > 0) {
    await Promise.allSettled([...pendingProjectSyncs]);
  }
  try {
    await requestJson("/api/auth/session", { method: "DELETE" });
  } catch {}
  state.user = null;
  state.myProjects = [];
  state.adminUsers = [];
  authResolved = true;
  workspaceActivated = false;
  await releaseWakeLock();
  resetWorkspaceForSignedOut();
  render();
}

function resetWorkspaceForSignedOut() {
  if (state.watcherId !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(state.watcherId);
  }
  if (state.pollerId !== null) {
    window.clearInterval(state.pollerId);
  }
  stopRouteFollowWatcher();
  resetSegmentRerouteState();
  state.watcherId = null;
  state.pollerId = null;
  state.tracking = false;
  state.paused = false;
  state.destinationFollow = false;
  state.points = [];
  state.photos = [];
  state.milestones = [];
  state.plannedRoutes = [];
  state.activePlannedRouteId = null;
  state.planningMode = false;
  state.plannedRouteDraft = null;
  state.overlayProjects = [];
  state.mapReferences = [];
  state.activeMapReferenceId = null;
  state.mapAlignmentMode = false;
  state.mapReferenceDraft = null;
  state.pendingMapReferenceImagePoint = null;
  state.sessions = [];
  state.overlaySessionIds = [];
  state.primarySessionId = null;
  state.continuingSessionId = null;
  state.selectedPosition = null;
  state.initialPosition = null;
  state.projectCode = "";
  state.projectName = "";
  state.projectAccessRole = "";
  state.projectRevision = "";
  state.projectMembers = [];
  state.shareLinks = [];
  state.syncDirty = false;
  state.syncing = false;
  state.activeStartedAt = null;
  state.followProgressIndex = 0;
  state.routeOffTrack = false;
  state.routeDeviationSamples = 0;
  state.routeRecoverySamples = 0;
  state.adminPanelOpen = false;
  state.sharePanelOpen = false;
  state.recordPanelOpen = true;
  state.pointEditPanelOpen = false;
  state.pointEditMode = false;
  updateProjectUrl("");
  currentMarker.setLatLng([37.5665, 126.978]);
  persist();
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
    body.className = "admin-user-info";
    const title = document.createElement("strong");
    const meta = document.createElement("span");
    title.textContent = user.email;
    const joinedAt = formatAdminUserDate(user.createdAt);
    const lastLoginAt = formatAdminUserDate(user.lastLoginAt, true);
    meta.textContent = [
      user.role === "admin" ? "관리자" : "사용자",
      getUserStatusLabel(user.status),
      `가입 ${joinedAt}`,
      user.lastLoginAt ? `최근 접속 ${lastLoginAt}` : "최근 접속 없음",
      `프로젝트 ${user.projectCount || 0}개`,
    ].join(" · ");
    body.append(title, meta);

    const actions = document.createElement("div");
    actions.className = "admin-user-actions";

    const statusButton = document.createElement("button");
    statusButton.type = "button";
    statusButton.textContent = user.status === "pending" ? "승인" : user.status === "active" ? "비활성" : "활성";
    statusButton.disabled = user.id === state.user.id && user.status === "active";
    statusButton.addEventListener("click", () => toggleAdminUserStatus(user));

    const resetButton = document.createElement("button");
    resetButton.type = "button";
    resetButton.textContent = "PW 초기화";
    resetButton.addEventListener("click", () => resetAdminUserPassword(user));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "계정 삭제";
    deleteButton.disabled = user.id === state.user.id || user.role === "admin";
    deleteButton.addEventListener("click", () => deleteAdminUser(user));

    actions.append(statusButton, resetButton, deleteButton);
    item.append(body, actions);
    authEls.adminUserList.append(item);
  });
}

function formatAdminUserDate(timestamp, includeTime = false) {
  if (!timestamp) {
    return "정보 없음";
  }
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) {
    return "정보 없음";
  }
  const pad = (value) => String(value).padStart(2, "0");
  const dateText = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return includeTime ? `${dateText} ${pad(date.getHours())}:${pad(date.getMinutes())}` : dateText;
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

function getUserStatusLabel(status) {
  return status === "pending" ? "승인 대기" : status === "active" ? "활성" : "비활성";
}

async function deleteAdminUser(user) {
  if (user.id === state.user?.id || user.role === "admin") {
    return;
  }
  const ok = window.confirm(
    `${user.email} 계정을 삭제할까요?\n로그인 정보와 공동편집 권한은 삭제됩니다. 소유 프로젝트가 있으면 먼저 프로젝트를 이전하거나 삭제해야 합니다.`,
  );
  if (!ok) {
    return;
  }
  try {
    await requestJson(`/api/admin/users/${encodeURIComponent(user.id)}`, { method: "DELETE" });
    state.adminUsers = state.adminUsers.filter((item) => item.id !== user.id);
    renderAdminUserList();
    authEls.adminStatus.textContent = "계정을 삭제했습니다.";
  } catch (error) {
    authEls.adminStatus.textContent = error?.payload?.error === "user_owns_projects"
      ? `소유 프로젝트 ${error.payload.projectCount || 0}개가 있어 삭제할 수 없습니다. 프로젝트 이전 또는 삭제 후 다시 시도하세요.`
      : "계정을 삭제하지 못했습니다.";
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
  const normalizedPassword = password.trim();
  if (normalizedPassword && normalizedPassword.length < 4) {
    authEls.adminStatus.textContent = "새 비밀번호는 4자 이상으로 입력해 주세요.";
    return;
  }
  try {
    const result = await requestJson(`/api/admin/users/${encodeURIComponent(user.id)}/password`, {
      method: "POST",
      body: JSON.stringify({ password: normalizedPassword }),
    });
    state.adminUsers = state.adminUsers.map((item) => (item.id === result.user.id ? result.user : item));
    renderAdminUserList();
    window.prompt("새 비밀번호입니다. 사용자에게 전달해 주세요.", result.temporaryPassword);
    authEls.adminStatus.textContent = "비밀번호를 초기화했습니다.";
  } catch (error) {
    const minLength = error?.payload?.minPasswordLength || 4;
    authEls.adminStatus.textContent =
      error?.payload?.error === "password_too_short"
        ? `비밀번호는 ${minLength}자 이상으로 입력해 주세요.`
        : "비밀번호를 초기화하지 못했습니다. 다시 시도해 주세요.";
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
    item.classList.toggle("is-shared-project", project.accessRole === "editor");
    const body = document.createElement("div");
    const title = document.createElement("strong");
    const meta = document.createElement("span");
    title.textContent = project.name || "프로젝트";
    title.title = project.name || "프로젝트";
    const accessLabel = project.transferredAt
      ? "전달받음 · "
      : project.accessRole === "editor"
        ? "공유받음 · "
        : "";
    meta.textContent = `${accessLabel}${project.code} · ${formatDate(getProjectRecordDisplayTime(project))}`;
    body.append(title, meta);
    const actions = document.createElement("div");
    actions.className = "my-project-actions";
    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.className = "project-list-action project-list-action--copy";
    copyButton.textContent = "코드 복사";
    copyButton.setAttribute("aria-label", `${project.code} 프로젝트 코드 복사`);
    copyButton.addEventListener("click", () => copyProjectCode(project.code));
    const openButton = document.createElement("button");
    openButton.type = "button";
    openButton.className = "project-list-action project-list-action--open";
    openButton.textContent = "열기";
    openButton.addEventListener("click", () => openServerProject(project.code));
    actions.append(copyButton, openButton);
    if (project.accessRole !== "editor") {
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "project-list-action project-list-action--delete";
      deleteButton.textContent = "삭제";
      deleteButton.addEventListener("click", () => deleteMyProject(project));
      actions.append(deleteButton);
    }
    item.append(body, actions);
    authEls.list.append(item);
  });
}

async function copyProjectCode(code) {
  const normalizedCode = normalizeProjectCode(code);
  if (!normalizedCode) {
    return;
  }
  try {
    await navigator.clipboard.writeText(normalizedCode);
  } catch {
    window.prompt("프로젝트 코드를 복사해 주세요.", normalizedCode);
  }
  setStatus(`${normalizedCode} 프로젝트 코드를 복사했습니다.`);
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
    removeProjectRecoveryBackup(project.code);
    state.myProjects = state.myProjects.filter((item) => item.code !== project.code);
    if (state.projectCode === project.code) {
      state.projectCode = "";
      state.projectAccessRole = "";
      state.projectRevision = "";
      state.projectMembers = [];
      state.points = [];
      state.photos = [];
      state.milestones = [];
      state.plannedRoutes = [];
      state.activePlannedRouteId = null;
      state.planningMode = false;
      state.plannedRouteDraft = null;
      state.mapReferences = [];
      state.activeMapReferenceId = null;
      state.mapAlignmentMode = false;
      state.mapReferenceDraft = null;
      state.pendingMapReferenceImagePoint = null;
      state.sessions = [];
      state.overlaySessionIds = [];
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
      <div class="share-content-options" aria-label="공유 정보 선택">
        <label><input id="shareIncludePhotos" type="checkbox" /> 사진 공유</label>
        <label><input id="shareIncludeConstruction" type="checkbox" /> 공사구역 공유</label>
      </div>
      <p class="hint">노선 확인과 답사 따라가기는 항상 포함되며, 사진과 공사구역만 선택하여 공유합니다.</p>
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
    includePhotos: section.querySelector("#shareIncludePhotos"),
    includeConstruction: section.querySelector("#shareIncludeConstruction"),
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
  if (
    !state.projectCode ||
    !state.user ||
    state.shareView ||
    state.projectAccessRole !== "owner"
  ) {
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
      body: JSON.stringify({
        expiresIn,
        includePhotos: shareEls.includePhotos.checked,
        includeConstruction: shareEls.includeConstruction.checked,
      }),
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
  const isEditor = Boolean(state.projectCode && state.projectAccessRole === "editor");
  shareEls.section.hidden = isShareView || isEditor;
  if (isShareView || isEditor) {
    return;
  }
  const canShare = Boolean(state.user && state.projectCode && state.projectAccessRole === "owner");
  shareEls.section.classList.toggle("is-collapsed", !state.sharePanelOpen);
  shareEls.toggleBtn.textContent = state.sharePanelOpen ? "숨기기" : "펼치기";
  shareEls.createBtn.disabled = !canShare;
  shareEls.expiry.disabled = !canShare;
  shareEls.customDate.disabled = !canShare;
  shareEls.includePhotos.disabled = !canShare;
  shareEls.includeConstruction.disabled = !canShare;
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
    const sharedContents = [
      "노선 확인",
      share.includePhotos ? "사진" : "",
      share.includeConstruction ? "공사구역" : "",
      "답사 따라가기",
    ].filter(Boolean).join(" · ");
    meta.textContent = `${getShareMetaText(share)} · ${sharedContents}`;
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
    state.constructionPinsVisible = true;
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
    const result = await requestJson(`/api/share/${encodeURIComponent(token)}`);
    if (result.project?.updatedAt && result.project.updatedAt !== state.projectRevision) {
      refreshSharedProject(result.project);
      setProjectStatus("공유 운송 위치를 최신 상태로 갱신했습니다.");
    }
  } catch (error) {
    if (error?.status === 404) {
      endSharedView("작성자가 공유를 종료했습니다.");
    }
  }
}

function refreshSharedProject(project) {
  const lastState = project.lastState || {};
  state.sessions = Array.isArray(project.sessions) ? project.sessions : [];
  state.overlaySessionIds = state.overlaySessionIds.filter((sessionId) =>
    state.sessions.some((session) => session.id === sessionId));
  const liveSession = state.sessions.find(isRecentlyActiveSharedSession);
  state.primarySessionId = liveSession?.id || project.primarySessionId || state.sessions[0]?.id || null;
  state.milestones = normalizeMilestones(
    Array.isArray(lastState.milestones) ? structuredClone(lastState.milestones) : [],
  );
  state.plannedRoutes = normalizePlannedRoutes(lastState.plannedRoutes || project.plannedRoutes);
  state.activePlannedRouteId =
    lastState.activePlannedRouteId || project.activePlannedRouteId || state.plannedRoutes[0]?.id || null;
  state.mapReferences = normalizeMapReferences(lastState.mapReferences || project.mapReferences);
  state.activeMapReferenceId =
    lastState.activeMapReferenceId || project.activeMapReferenceId || state.mapReferences[0]?.id || null;
  const primarySession = state.sessions.find((session) => session.id === state.primarySessionId);
  state.points = Array.isArray(primarySession?.points)
    ? structuredClone(primarySession.points)
    : (Array.isArray(lastState.points) ? structuredClone(lastState.points) : []);
  state.photos = Array.isArray(primarySession?.photos)
    ? structuredClone(primarySession.photos)
    : (Array.isArray(lastState.photos) ? structuredClone(lastState.photos) : []);
  state.selectedPosition = state.points.at(-1) || state.selectedPosition;
  state.projectRevision = project.updatedAt;
  render();
  scheduleMapReferenceRender();
}

function isRecentlyActiveSharedSession(session) {
  if (session?.recordingActive !== true) return false;
  const lastActivityAt = Math.max(
    Number(session.updatedAt) || 0,
    Number(session.endedAt) || 0,
    Number(session.points?.at?.(-1)?.timestamp) || 0,
  );
  return lastActivityAt > 0 && Date.now() - lastActivityAt <= LIVE_SHARED_SESSION_MAX_AGE_MS;
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
  state.plannedRoutes = [];
  state.activePlannedRouteId = null;
  state.planningMode = false;
  state.plannedRouteDraft = null;
  state.overlayProjects = [];
  state.mapReferences = [];
  state.activeMapReferenceId = null;
  state.mapAlignmentMode = false;
  state.mapReferenceDraft = null;
  state.pendingMapReferenceImagePoint = null;
  state.sessions = [];
  state.overlaySessionIds = [];
  state.primarySessionId = null;
  state.selectedPosition = null;
  state.projectCode = "";
  state.projectName = "";
  state.projectAccessRole = "";
  state.projectRevision = "";
  state.projectMembers = [];
  state.destinationFollow = false;
  state.constructionPinsVisible = true;
  state.photoPinsVisible = true;
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

async function handleMapProviderChange(event) {
  const provider = event.target.value;
  if (provider === "google") {
    event.target.value = state.mapProvider || activeMapProvider;
    setStatus("구글지도는 아직 연결되지 않았습니다.", "warning");
    return;
  }
  if (provider === "naver") {
    naverMapRetryAfter = 0;
  } else if (naverMapRetryTimerId !== null) {
    window.clearTimeout(naverMapRetryTimerId);
    naverMapRetryTimerId = null;
  }
  await applyMapProvider(provider);
}

async function applyMapProvider(provider, options = {}) {
  const nextProvider = provider === "naver" ? "naver" : "osm";
  if (pendingMapProvider === nextProvider) {
    return;
  }
  if (activeMapProvider === nextProvider) {
    state.mapProvider = nextProvider;
    els.mapProvider.value = nextProvider;
    persist();
    return;
  }
  pendingMapProvider = nextProvider;
  state.mapProvider = nextProvider;
  els.mapProvider.value = nextProvider;
  persist();
  if (nextProvider === "osm") {
    activateOpenStreetMap();
    pendingMapProvider = "";
    if (!options.quiet) {
      setStatus("OpenStreetMap 지도를 사용합니다.");
    }
    return;
  }
  if (!options.quiet) {
    setStatus("네이버지도를 불러오는 중입니다.", "active");
  }
  try {
    const naverMaps = await loadNaverMapsApi();
    if (state.mapProvider !== "naver") {
      pendingMapProvider = "";
      return;
    }
    await activateNaverMap(naverMaps);
    naverMapRetryAfter = 0;
    if (naverMapRetryTimerId !== null) {
      window.clearTimeout(naverMapRetryTimerId);
      naverMapRetryTimerId = null;
    }
    pendingMapProvider = "";
    if (!options.quiet) {
      setStatus("네이버지도로 전환했습니다.", "success");
    }
  } catch {
    pendingMapProvider = "";
    naverMapRetryAfter = Date.now() + NAVER_MAP_RETRY_DELAY_MS;
    state.mapProvider = "naver";
    els.mapProvider.value = "naver";
    activateOpenStreetMap();
    setStatus("네이버지도를 불러오지 못해 OpenStreetMap을 임시로 표시합니다. 잠시 후 다시 시도합니다.", "warning");
    if (naverMapRetryTimerId !== null) window.clearTimeout(naverMapRetryTimerId);
    naverMapRetryTimerId = window.setTimeout(() => {
      naverMapRetryTimerId = null;
      naverMapRetryAfter = 0;
      if (state.mapProvider === "naver" && activeMapProvider !== "naver") {
        void applyMapProvider("naver", { quiet: true });
      }
    }, NAVER_MAP_RETRY_DELAY_MS);
  }
}

function activateOpenStreetMap() {
  if (!map.hasLayer(osmTileLayer)) {
    osmTileLayer.addTo(map);
  }
  if (els.naverMapBase) {
    els.naverMapBase.hidden = true;
  }
  document.body.classList.remove("is-naver-map");
  clearNaverNativeOverlays();
  lastNaverSyncCenter = null;
  lastNaverSyncZoom = null;
  map.options.inertia = defaultMapInertia;
  map.options.wheelDebounceTime = defaultWheelDebounceTime;
  activeMapProvider = "osm";
  map.invalidateSize(false);
}

async function activateNaverMap(naverMaps) {
  if (!els.naverMapBase) {
    throw new Error("naver_map_container_missing");
  }
  els.naverMapBase.hidden = false;
  document.body.classList.add("is-naver-map");
  map.options.inertia = false;
  map.options.wheelDebounceTime = 16;
  await waitForVisibleMapContainer(els.naverMapBase);
  const center = map.getCenter();
  if (!activeNaverBaseMap) {
    activeNaverBaseMap = new naverMaps.Map(els.naverMapBase, {
      center: new naverMaps.LatLng(center.lat, center.lng),
      zoom: map.getZoom(),
      mapTypeId: naverMaps.MapTypeId.NORMAL,
      draggable: false,
      pinchZoom: false,
      scrollWheel: false,
      keyboardShortcuts: false,
      disableDoubleClickZoom: true,
      disableDoubleTapZoom: true,
      disableKineticPan: true,
      zoomControl: false,
      mapDataControl: true,
      scaleControl: true,
      logoControl: true,
    });
  }
  activeMapProvider = "naver";
  syncNaverBaseMap(true);
  await new Promise((resolve) => window.setTimeout(resolve, 300));
  syncNaverBaseMap(true);
  if (els.naverMapBase.childElementCount === 0) {
    activeMapProvider = "osm";
    activeNaverBaseMap = null;
    els.naverMapBase.innerHTML = "";
    throw new Error("naver_map_render_failed");
  }
  if (map.hasLayer(osmTileLayer)) {
    map.removeLayer(osmTileLayer);
  }
  map.invalidateSize(false);
  scheduleNaverNativeOverlayRender();
}

function waitForAnimationFrame() {
  return new Promise((resolve) => window.requestAnimationFrame(resolve));
}

async function waitForVisibleMapContainer(element, timeoutMs = 3000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const bounds = element.getBoundingClientRect();
    if (bounds.width >= 2 && bounds.height >= 2) {
      return;
    }
    await waitForAnimationFrame();
  }
  throw new Error("naver_map_container_not_visible");
}

function scheduleNaverBaseMapSync() {
  if (activeMapProvider !== "naver" || !activeNaverBaseMap || naverMapSyncQueued) {
    return;
  }
  naverMapSyncQueued = true;
  window.queueMicrotask(() => {
    naverMapSyncQueued = false;
    syncNaverBaseMap();
  });
}

function syncNaverBaseMap(resize = false) {
  if (activeMapProvider !== "naver" || !activeNaverBaseMap || !window.naver?.maps) {
    return;
  }
  const center = map.getCenter();
  const nextCenter = new window.naver.maps.LatLng(center.lat, center.lng);
  const nextZoom = map.getZoom();
  const zoomChanged = lastNaverSyncZoom !== nextZoom;
  const centerChanged = !lastNaverSyncCenter
    || Math.abs(lastNaverSyncCenter.lat - center.lat) > 1e-9
    || Math.abs(lastNaverSyncCenter.lng - center.lng) > 1e-9;

  if (zoomChanged && typeof activeNaverBaseMap.morph === "function") {
    activeNaverBaseMap.morph(nextCenter, nextZoom);
  } else if (zoomChanged) {
    activeNaverBaseMap.setCenter(nextCenter);
    activeNaverBaseMap.setZoom(nextZoom, true);
  } else if (centerChanged) {
    activeNaverBaseMap.setCenter(nextCenter);
  }
  lastNaverSyncCenter = { lat: center.lat, lng: center.lng };
  lastNaverSyncZoom = nextZoom;
  if (resize) {
    window.naver.maps.Event.trigger(activeNaverBaseMap, "resize");
  }
}

function scheduleNaverNativeOverlayRender() {
  if (activeMapProvider !== "naver" || !activeNaverBaseMap || naverNativeRenderFrame !== null) {
    return;
  }
  naverNativeRenderFrame = window.requestAnimationFrame(() => {
    naverNativeRenderFrame = null;
    renderNaverNativeOverlays();
  });
}

function clearNaverNativeOverlays() {
  naverNativeOverlays.forEach((overlay) => overlay?.setMap?.(null));
  naverNativeOverlays = [];
}

function addNaverNativeOverlay(overlay) {
  if (overlay) naverNativeOverlays.push(overlay);
  return overlay;
}

function renderNaverNativeOverlays() {
  clearNaverNativeOverlays();
  const naverMaps = window.naver?.maps;
  if (activeMapProvider !== "naver" || !activeNaverBaseMap || !naverMaps) return;

  renderNaverNativeRoute(naverMaps);
  renderNaverNativeSessionOverlays(naverMaps);
  renderNaverNativeCurrentPosition(naverMaps);
  renderNaverNativePhotos(naverMaps);
  renderNaverNativeMilestones(naverMaps);
  renderNaverNativeProjectOverlays(naverMaps);
  renderNaverNativeEditPoints(naverMaps);
}

function renderNaverNativeSessionOverlays(naverMaps) {
  getVisibleSessionOverlays().forEach(({ session, color }) => {
    createNaverNativePolyline(
      session.points,
      { color, weight: 5, opacity: 0.82, zIndex: 17 },
      naverMaps,
    );
  });
}

function createNaverLatLngPath(points, naverMaps) {
  return (Array.isArray(points) ? points : [])
    .filter((point) => Number.isFinite(Number(point?.lat)) && Number.isFinite(Number(point?.lng)))
    .map((point) => new naverMaps.LatLng(Number(point.lat), Number(point.lng)));
}

function createNaverNativePolyline(points, options, naverMaps) {
  const path = createNaverLatLngPath(points, naverMaps);
  if (path.length < 2) return null;
  return addNaverNativeOverlay(new naverMaps.Polyline({
    map: activeNaverBaseMap,
    path,
    clickable: false,
    strokeColor: options.color,
    strokeOpacity: options.opacity ?? 0.88,
    strokeWeight: options.weight ?? 6,
    strokeStyle: options.style || "solid",
    strokeLineCap: "round",
    strokeLineJoin: "round",
    zIndex: options.zIndex ?? 20,
  }));
}

function renderNaverNativeRoute(naverMaps) {
  const points = getRoutePathPoints(state.points);
  const followsCandidate = Boolean(getVisibleActivePlannedRoute()?.points?.length >= 2);
  if (!state.destinationFollow || followsCandidate || points.length < 2) {
    createNaverNativePolyline(points, { color: ROUTE_COMPLETED_COLOR, weight: 6, zIndex: 20 }, naverMaps);
  } else {
    const splitIndex = Math.min(Math.max(0, state.followProgressIndex), points.length - 1);
    createNaverNativePolyline(points.slice(0, splitIndex + 1), { color: ROUTE_COMPLETED_COLOR, weight: 6, zIndex: 20 }, naverMaps);
    createNaverNativePolyline(points.slice(splitIndex), { color: ROUTE_REMAINING_COLOR, weight: 6, opacity: 0.9, zIndex: 19 }, naverMaps);
  }

  const activePlan = state.planningMode
    ? state.plannedRouteDraft
    : getVisibleActivePlannedRoute();
  const outlinePreview = state.planningMode && state.plannedRouteMode === "manual"
    ? state.plannedRouteOutlinePreview
    : null;
  const activePlanPoints = state.planningMode && state.plannedRouteMode === "manual" && outlinePreview
    ? state.plannedRouteOutlinePoints
    : activePlan?.points;
  if (activePlanPoints?.length > 1) {
    createNaverNativePolyline(
      activePlanPoints,
      { color: "#d96c1f", weight: 5, opacity: 0.94, style: "shortdash", zIndex: 22 },
      naverMaps,
    );
  }
  if (outlinePreview?.points?.length > 1) {
    createNaverNativePolyline(
      outlinePreview.points,
      { color: "#315f9e", weight: 7, opacity: 0.96, zIndex: 23 },
      naverMaps,
    );
  }
  if (activePlanPoints?.length || activePlan?.stops?.length) {
    const routeStops = orderPlannedRouteStops(activePlan.stops || []);
    const markerPoints = routeStops.length > 0
      ? routeStops
      : state.planningMode
        ? (state.plannedRouteMode === "manual" ? state.plannedRouteOutlinePoints : activePlan.points)
        : [activePlan.points[0], activePlan.points.at(-1)];
    const waypointStops = markerPoints.filter((point) => point.kind === "waypoint");
    markerPoints.forEach((point, index) => {
      const sourceIndex = routeStops.length >= 2
        ? index
        : state.planningMode ? index : index === 0 ? 0 : activePlan.points.length - 1;
      const label = point.kind === "start"
        ? "S"
        : point.kind === "goal"
          ? "E"
          : point.kind === "waypoint"
            ? waypointStops.findIndex((stop) => stop.id === point.id) + 1
            : sourceIndex === 0 ? "S" : index === markerPoints.length - 1 ? "E" : sourceIndex + 1;
      createNaverNativeMarker(
        point,
        `<span class="planned-route-native-point">${label}</span>`,
        [28, 28],
        [14, 14],
        `후보노선 ${label}`,
        naverMaps,
        530,
      );
    });
  }
  if (
    state.pointEditMode &&
    state.segmentRerouteMode &&
    state.segmentStartIndex !== null &&
    state.segmentEndIndex !== null
  ) {
    const startIndex = Math.min(state.segmentStartIndex, state.segmentEndIndex);
    const endIndex = Math.max(state.segmentStartIndex, state.segmentEndIndex);
    createNaverNativePolyline(
      state.points.slice(startIndex, endIndex + 1),
      { color: "#d96c1f", weight: 7, opacity: 0.9, style: "shortdash", zIndex: 34 },
      naverMaps,
    );
    createNaverNativePolyline(
      state.segmentReroutePreview?.points || [],
      { color: "#315f9e", weight: 7, opacity: 0.95, zIndex: 35 },
      naverMaps,
    );
    state.segmentRerouteWaypoints.forEach((point, index) => {
      createNaverNativeMarker(
        point,
        `<span class="planned-route-native-point">${index + 1}</span>`,
        [28, 28],
        [14, 14],
        `구간 경유지 ${index + 1}`,
        naverMaps,
        540,
      );
    });
  }
  getRestrictionReviewEntries().slice(0, 500).forEach(({ facility, result }) => {
    createNaverNativeMarker(
      facility,
      `<span class="restriction-map-marker is-${result.status}">${getRestrictionMarkerLabel(result.status)}</span>`,
      [26, 26],
      [13, 13],
      `${facility.name} · ${getRestrictionStatusLabel(result.status)}`,
      naverMaps,
      525,
    );
  });
}

function createNaverNativeMarker(position, html, size, anchor, title, naverMaps, zIndex = 100) {
  if (!hasPhotoPosition(position)) return null;
  const width = Math.max(1, Number(size?.[0] ?? size?.x) || 34);
  const height = Math.max(1, Number(size?.[1] ?? size?.y) || 38);
  const anchorX = Number(anchor?.[0] ?? anchor?.x);
  const anchorY = Number(anchor?.[1] ?? anchor?.y);
  return addNaverNativeOverlay(new naverMaps.Marker({
    map: activeNaverBaseMap,
    position: new naverMaps.LatLng(Number(position.lat), Number(position.lng)),
    title: String(title || ""),
    clickable: false,
    zIndex,
    icon: {
      content: `<span class="naver-native-marker">${html}</span>`,
      size: new naverMaps.Size(width, height),
      anchor: new naverMaps.Point(
        Number.isFinite(anchorX) ? anchorX : width / 2,
        Number.isFinite(anchorY) ? anchorY : height,
      ),
    },
  }));
}

function renderNaverNativeCurrentPosition(naverMaps) {
  const latest = getLatestPosition() || state.initialPosition || currentMarker.getLatLng();
  createNaverNativeMarker(
    latest,
    '<span class="naver-current-position" aria-hidden="true"></span>',
    [22, 22],
    [11, 11],
    "현재 위치",
    naverMaps,
    500,
  );
}

function renderNaverNativePhotos(naverMaps) {
  if (!state.photoPinsVisible || state.photoFilter === "hidden") return;
  const photos = getVisiblePhotos().filter(hasPhotoPosition);
  clusterPhotosForMap(photos).forEach((cluster) => {
    const firstPhoto = cluster.photos[0];
    const isCluster = cluster.photos.length > 1;
    const html = isCluster
      ? `<span class="photo-cluster-marker"><img src="${firstPhoto.src}" alt="" /><span>${cluster.photos.length}</span></span>`
      : `<span class="photo-single-marker"><img src="${firstPhoto.src}" alt="" /></span>`;
    createNaverNativeMarker(
      cluster,
      html,
      [42, 42],
      getSeparatedMarkerAnchor("photo", 42, 42, cluster),
      isCluster ? `사진 ${cluster.photos.length}장` : getPhotoDisplayName(firstPhoto),
      naverMaps,
      220,
    );
  });
}

function getLeafletDivIconDisplay(icon) {
  const options = icon?.options || {};
  const className = String(options.className || "").trim();
  return {
    html: className ? `<span class="${escapeHtml(className)}">${options.html || ""}</span>` : (options.html || ""),
    size: [Number(options.iconSize?.x ?? options.iconSize?.[0]) || 34, Number(options.iconSize?.y ?? options.iconSize?.[1]) || 38],
    anchor: [Number(options.iconAnchor?.x ?? options.iconAnchor?.[0]) || 17, Number(options.iconAnchor?.y ?? options.iconAnchor?.[1]) || 38],
  };
}

function renderNaverNativeMilestones(naverMaps) {
  if (!state.constructionPinsVisible) return;
  const pins = getVisibleMapInfoPins(state.milestones.filter(isMapInfoPin).sort(compareMapInfoPinsForList));
  pins.forEach((pin) => {
    const icon = pin.type === "memo" ? createMemoMarkerIcon(pin) : createConstructionMarkerIcon(pin);
    const display = getLeafletDivIconDisplay(icon);
    createNaverNativeMarker(pin, display.html, display.size, display.anchor, pin.name || getMapPinLabel(pin), naverMaps, 240);
  });
}

function renderNaverNativeProjectOverlays(naverMaps) {
  state.overlayProjects.forEach((project) => {
    if (project.visible === false) return;
    if (project.routeVisible !== false) {
      createNaverNativePolyline(project.points, { color: project.color, weight: 5, opacity: 0.82, zIndex: 16 }, naverMaps);
    }
    if (project.photosVisible !== false && state.photoPinsVisible) {
      const photos = (project.photos || []).filter(hasPhotoPosition);
      clusterPhotosForMap(photos).forEach((cluster) => {
        const firstPhoto = cluster.photos[0];
        const isCluster = cluster.photos.length > 1;
        const countMarkup = isCluster ? `<span>${cluster.photos.length}</span>` : "";
        const html = `<span class="${isCluster ? "photo-cluster-marker" : "photo-single-marker"} overlay-photo-marker" style="--overlay-photo-color:${project.color}"><img src="${firstPhoto.src}" alt="" />${countMarkup}</span>`;
        createNaverNativeMarker(cluster, html, [42, 42], getSeparatedMarkerAnchor("photo", 42, 42, cluster), project.name, naverMaps, 210);
      });
    }
    if (project.constructionVisible !== false && state.constructionPinsVisible) {
      (project.milestones || []).filter(isMapInfoPin).forEach((pin) => {
        const icon = pin.type === "memo" ? createMemoMarkerIcon(pin) : createConstructionMarkerIcon(pin);
        const display = getLeafletDivIconDisplay(icon);
        createNaverNativeMarker(pin, display.html, display.size, display.anchor, `${project.name} · ${pin.name || getMapPinLabel(pin)}`, naverMaps, 230);
      });
    }
  });
}

function renderNaverNativeEditPoints(naverMaps) {
  if (!state.pointEditMode || state.destinationFollow || state.shareView) return;
  getEditablePointIndexes().forEach((index) => {
    const point = state.points[index];
    const classes = [
      "route-point-marker",
      state.selectedPointIndex === index ? "is-selected" : "",
      state.segmentStartIndex === index ? "is-segment-start" : "",
      state.segmentEndIndex === index ? "is-segment-end" : "",
      point.skipInRoute === true ? "is-skipped" : "",
    ].filter(Boolean).join(" ");
    createNaverNativeMarker(point, `<span class="${classes}">${index + 1}</span>`, [28, 28], [14, 14], `위치점 ${index + 1}`, naverMaps, 300);
  });
}

map.on("move zoom", scheduleNaverBaseMapSync);
map.on("move zoom resize", scheduleMapReferenceRender);
map.on("resize", () => syncNaverBaseMap(true));

function clearData() {
  const ok = window.confirm(
    "현재 화면을 새 작업 상태로 초기화할까요?\n\n화면의 동선, 사진, 공사구역, 참고 지도, 사전 답사, 기록, 비교 프로젝트와 현재 프로젝트 연결이 해제됩니다. 서버에 저장된 기존 프로젝트는 삭제되지 않습니다.",
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
  state.plannedRoutes = [];
  state.activePlannedRouteId = null;
  state.planningMode = false;
  state.plannedRouteDraft = null;
  state.constructionPinsVisible = true;
  state.mapReferences = [];
  state.activeMapReferenceId = null;
  state.mapAlignmentMode = false;
  state.mapReferenceDraft = null;
  state.pendingMapReferenceImagePoint = null;
  state.photoPinsVisible = true;
  state.overlayProjects = [];
  state.sessions = [];
  state.overlaySessionIds = [];
  state.primarySessionId = null;
  state.continuingSessionId = null;
  state.selectedPosition = state.initialPosition || null;
  state.activeStartedAt = null;
  state.liveSyncSessionId = null;
  state.lastSyncedPointCount = 0;
  resetTrackingCheckpointState();
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
  state.projectAccessRole = "";
  state.projectRevision = "";
  state.projectMembers = [];
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

function normalizeMapReferences(references) {
  if (!Array.isArray(references)) return [];
  return references
    .map((reference, index) => ({
      id: String(reference?.id || `map-reference-${index + 1}`),
      name: String(reference?.name || `참고 지도 ${index + 1}`).trim(),
      src: String(reference?.src || ""),
      width: Math.max(1, Number(reference?.width || 1)),
      height: Math.max(1, Number(reference?.height || 1)),
      opacity: Math.min(0.85, Math.max(0.15, Number(reference?.opacity || 0.48))),
      visible: reference?.visible !== false,
      sourceType: reference?.sourceType === "pdf" ? "pdf" : "image",
      alignmentMode: reference?.alignmentMode === "corners" ? "corners" : "points",
      pageNumber: Number(reference?.pageNumber || 1),
      createdAt: reference?.createdAt || Date.now(),
      updatedAt: reference?.updatedAt || reference?.createdAt || Date.now(),
      displayMode: reference?.displayMode === "color" ? "color" : "source",
      colorExtraction: normalizeMapReferenceColorExtraction(reference?.colorExtraction),
      controlPoints: (Array.isArray(reference?.controlPoints) ? reference.controlPoints : [])
        .map((point) => ({
          imageX: Number(point?.imageX),
          imageY: Number(point?.imageY),
          lat: Number(point?.lat),
          lng: Number(point?.lng),
        }))
        .filter((point) =>
          Number.isFinite(point.imageX) && Number.isFinite(point.imageY) &&
          Number.isFinite(point.lat) && Number.isFinite(point.lng)),
    }))
    .filter((reference) => reference.src && reference.controlPoints.length >= 3);
}

function normalizeMapReferenceColorExtraction(value) {
  if (!value) return null;
  const r = Number(value.r);
  const g = Number(value.g);
  const b = Number(value.b);
  if (![r, g, b].every(Number.isFinite)) return null;
  return {
    r: Math.round(Math.min(255, Math.max(0, r))),
    g: Math.round(Math.min(255, Math.max(0, g))),
    b: Math.round(Math.min(255, Math.max(0, b))),
    tolerance: Math.round(Math.min(120, Math.max(20, Number(value.tolerance || 58)))),
  };
}

async function handleMapReferenceInput(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  if (state.shareView || !state.projectCode) {
    setMapReferenceStatus("참고 지도를 저장할 프로젝트를 먼저 만들거나 불러와 주세요.");
    return;
  }
  if (state.tracking || state.destinationFollow || state.pointEditMode || state.planningMode) {
    setMapReferenceStatus("진행 중인 기록이나 편집을 마친 뒤 참고 지도를 올려 주세요.");
    return;
  }
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  const isImage = file.type.startsWith("image/");
  if (!isPdf && !isImage) {
    setMapReferenceStatus("JPG, PNG, WEBP 또는 PDF 파일을 선택해 주세요.");
    return;
  }
  if (file.size > 50 * 1024 * 1024) {
    setMapReferenceStatus("파일이 너무 큽니다. 50MB 이하 이미지 또는 PDF를 사용해 주세요.");
    return;
  }
  try {
    setMapReferenceStatus(isPdf ? "PDF 첫 페이지를 지도 이미지로 변환하고 있습니다." : "지도 이미지를 준비하고 있습니다.");
    const source = isPdf ? await renderPdfMapReference(file) : await readFileAsDataUrl(file);
    const prepared = await resizeMapReferenceImage(source, 2400);
    await applyMapProvider("naver");
    state.mapAlignmentMode = true;
    state.mapColorExtractionMode = false;
    state.mapColorExtractionReferenceId = null;
    state.pendingMapReferenceImagePoint = null;
    const draft = {
      id: crypto.randomUUID(),
      name: file.name.replace(/\.[^.]+$/, "") || "참고 지도",
      src: prepared.src,
      width: prepared.width,
      height: prepared.height,
      opacity: 0.48,
      visible: true,
      sourceType: isPdf ? "pdf" : "image",
      alignmentMode: "corners",
      pageNumber: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      displayMode: "source",
      colorExtraction: null,
      controlPoints: createScreenCornerControlPoints(),
    };
    draft.initialControlPoints = structuredClone(draft.controlPoints);
    state.mapReferenceDraft = draft;
    mapReferenceCornerHistory = [];
    els.mapReferenceOpacity.value = "48";
    els.mapReferencePreviewZoom.value = "100";
    els.mapReferencePreviewImage.style.width = "100%";
    renderMapReferenceTools();
    scheduleMapReferenceRender();
    setMapReferenceStatus("지도를 화면에 올렸습니다. 네 모서리와 가운데 이동점을 드래그해 네이버지도에 맞춰 주세요.");
  } catch (error) {
    console.warn("Map reference preparation failed", error);
    setMapReferenceStatus(isPdf
      ? "PDF를 변환하지 못했습니다. 인터넷 연결을 확인하거나 첫 페이지를 이미지로 저장해 올려 주세요."
      : "지도 이미지를 읽지 못했습니다.");
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("file_read_failed"));
    reader.readAsDataURL(file);
  });
}

async function renderPdfMapReference(file) {
  const pdfjs = await import("/vendor/pdfjs/pdf.min.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = "/vendor/pdfjs/pdf.worker.min.mjs";
  const documentTask = pdfjs.getDocument({ data: await file.arrayBuffer() });
  const pdfDocument = await documentTask.promise;
  const page = await pdfDocument.getPage(1);
  const baseViewport = page.getViewport({ scale: 1 });
  const scale = Math.min(3, 2400 / Math.max(baseViewport.width, baseViewport.height));
  const viewport = page.getViewport({ scale: Math.max(1.25, scale) });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const context = canvas.getContext("2d", { alpha: false });
  await page.render({ canvasContext: context, viewport }).promise;
  return canvas.toDataURL("image/jpeg", 0.9);
}

async function resizeMapReferenceImage(src, maxDimension) {
  const image = await loadMapReferenceImage(src);
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  if (scale === 1 && src.startsWith("data:image/") && src.length < 2_500_000) {
    return { src, width, height };
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: false });
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  return { src: canvas.toDataURL("image/jpeg", 0.88), width, height };
}

function loadMapReferenceImage(src) {
  if (mapReferenceImageCache.has(src)) return mapReferenceImageCache.get(src);
  const promise = new Promise((resolve, reject) => {
    const image = new Image();
    if (/^https?:\/\//i.test(src)) image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("map_reference_image_failed"));
    image.src = src;
  });
  mapReferenceImageCache.set(src, promise);
  promise.catch(() => mapReferenceImageCache.delete(src));
  return promise;
}

function beginMapReferencePreviewDrag(event) {
  if (!els.mapReferencePreview || event.button !== 0) return;
  mapReferencePreviewDrag = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    scrollLeft: els.mapReferencePreview.scrollLeft,
    scrollTop: els.mapReferencePreview.scrollTop,
    moved: false,
  };
  els.mapReferencePreview.setPointerCapture?.(event.pointerId);
}

function moveMapReferencePreviewDrag(event) {
  const drag = mapReferencePreviewDrag;
  if (!drag || drag.pointerId !== event.pointerId) return;
  const deltaX = event.clientX - drag.startX;
  const deltaY = event.clientY - drag.startY;
  if (!drag.moved && Math.hypot(deltaX, deltaY) >= 5) {
    drag.moved = true;
    els.mapReferencePreview.classList.add("is-panning");
  }
  if (!drag.moved) return;
  event.preventDefault();
  els.mapReferencePreview.scrollLeft = drag.scrollLeft - deltaX;
  els.mapReferencePreview.scrollTop = drag.scrollTop - deltaY;
}

function endMapReferencePreviewDrag(event) {
  const drag = mapReferencePreviewDrag;
  if (!drag || drag.pointerId !== event.pointerId) return;
  mapReferencePreviewDrag = null;
  els.mapReferencePreview.classList.remove("is-panning");
  els.mapReferencePreview.releasePointerCapture?.(event.pointerId);
  if (!drag.moved) selectMapReferenceImagePoint(event);
}

function cancelMapReferencePreviewDrag(event) {
  if (!mapReferencePreviewDrag || mapReferencePreviewDrag.pointerId !== event.pointerId) return;
  mapReferencePreviewDrag = null;
  els.mapReferencePreview.classList.remove("is-panning");
}

function updateMapReferencePreviewZoom(value) {
  const preview = els.mapReferencePreview;
  const image = els.mapReferencePreviewImage;
  if (!preview || !image) return;
  const horizontalCenter = preview.scrollWidth
    ? (preview.scrollLeft + preview.clientWidth / 2) / preview.scrollWidth
    : 0.5;
  const verticalCenter = preview.scrollHeight
    ? (preview.scrollTop + preview.clientHeight / 2) / preview.scrollHeight
    : 0.5;
  image.style.width = `${value}%`;
  window.requestAnimationFrame(() => {
    preview.scrollLeft = horizontalCenter * preview.scrollWidth - preview.clientWidth / 2;
    preview.scrollTop = verticalCenter * preview.scrollHeight - preview.clientHeight / 2;
    renderMapReferencePreviewPoints();
  });
}

function createScreenCornerControlPoints(insetRatio = 0.08) {
  if (typeof map.getSize !== "function" || typeof map.containerPointToLatLng !== "function") return [];
  const size = map.getSize();
  if (!size?.x || !size?.y) return [];
  const insetX = Math.max(24, size.x * insetRatio);
  const insetY = Math.max(24, size.y * insetRatio);
  const imageCorners = [
    { imageX: 0, imageY: 0, x: insetX, y: insetY },
    { imageX: 1, imageY: 0, x: size.x - insetX, y: insetY },
    { imageX: 1, imageY: 1, x: size.x - insetX, y: size.y - insetY },
    { imageX: 0, imageY: 1, x: insetX, y: size.y - insetY },
  ];
  return imageCorners.map((corner) => {
    const latlng = map.containerPointToLatLng([corner.x, corner.y]);
    return { imageX: corner.imageX, imageY: corner.imageY, lat: latlng.lat, lng: latlng.lng };
  });
}

function pushMapReferenceCornerHistory() {
  const draft = state.mapReferenceDraft;
  if (!draft || draft.alignmentMode !== "corners") return;
  mapReferenceCornerHistory.push(structuredClone(draft.controlPoints));
  if (mapReferenceCornerHistory.length > 20) mapReferenceCornerHistory.shift();
  renderMapReferenceTools();
}

function fitMapReferenceDraftToScreen() {
  const draft = state.mapReferenceDraft;
  if (!state.mapAlignmentMode || draft?.alignmentMode !== "corners") return;
  const next = createScreenCornerControlPoints();
  if (next.length !== 4) return;
  pushMapReferenceCornerHistory();
  draft.controlPoints = next;
  draft.updatedAt = Date.now();
  renderMapReferenceTools();
  scheduleMapReferenceRender();
  setMapReferenceStatus("업로드 지도를 현재 화면에 다시 맞췄습니다. 네 모서리를 조절해 주세요.");
}

function resetMapReferenceCorners() {
  const draft = state.mapReferenceDraft;
  if (!state.mapAlignmentMode || draft?.alignmentMode !== "corners" || !draft.initialControlPoints?.length) return;
  pushMapReferenceCornerHistory();
  draft.controlPoints = structuredClone(draft.initialControlPoints);
  draft.updatedAt = Date.now();
  renderMapReferenceTools();
  scheduleMapReferenceRender();
  setMapReferenceStatus("이번 맞춤 작업을 시작했던 위치로 되돌렸습니다.");
}

function selectMapReferenceImagePoint(event) {
  if (state.mapColorExtractionMode) {
    void selectMapReferenceRouteColor(event);
    return;
  }
  if (!state.mapAlignmentMode || !state.mapReferenceDraft || state.mapReferenceDraft.alignmentMode === "corners" || state.pendingMapReferenceImagePoint) return;
  if (state.mapReferenceDraft.controlPoints.length >= 6) {
    setMapReferenceStatus("정합점은 최대 6개입니다. 위치 맞춤을 저장해 주세요.");
    return;
  }
  const bounds = els.mapReferencePreviewImage.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return;
  state.pendingMapReferenceImagePoint = {
    imageX: Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width)),
    imageY: Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height)),
  };
  renderMapReferencePreviewPoints();
  setMapReferenceStatus(`네이버지도에서 같은 지점을 선택하세요 · 정합점 ${state.mapReferenceDraft.controlPoints.length + 1}`);
}

async function selectMapReferenceRouteColor(event) {
  const reference = state.mapReferences.find((item) => item.id === state.mapColorExtractionReferenceId);
  if (!reference) return;
  const bounds = els.mapReferencePreviewImage.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return;
  const imageX = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
  const imageY = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height));
  try {
    const image = await loadMapReferenceImage(reference.src);
    const sample = document.createElement("canvas");
    sample.width = 9;
    sample.height = 9;
    const context = sample.getContext("2d", { willReadFrequently: true });
    const sourceX = Math.max(0, Math.round(imageX * image.naturalWidth) - 4);
    const sourceY = Math.max(0, Math.round(imageY * image.naturalHeight) - 4);
    context.drawImage(image, sourceX, sourceY, 9, 9, 0, 0, 9, 9);
    const pixels = context.getImageData(0, 0, 9, 9).data;
    let selected = null;
    for (let index = 0; index < pixels.length; index += 4) {
      const r = pixels[index];
      const g = pixels[index + 1];
      const b = pixels[index + 2];
      const chroma = Math.max(r, g, b) - Math.min(r, g, b);
      const score = chroma - Math.abs(135 - (r + g + b) / 3) * 0.08;
      if (!selected || score > selected.score) selected = { r, g, b, score };
    }
    if (!selected || selected.score < 35) {
      setMapReferenceStatus("색이 뚜렷한 노선의 중앙을 다시 선택해 주세요.");
      return;
    }
    reference.colorExtraction = { r: selected.r, g: selected.g, b: selected.b, tolerance: 58 };
    reference.displayMode = "color";
    reference.updatedAt = Date.now();
    state.mapColorExtractionMode = false;
    state.mapColorExtractionReferenceId = null;
    mapReferenceExtractionCache.clear();
    persist();
    renderMapReferenceTools();
    scheduleMapReferenceRender();
    const serverSaved = await syncProjectState("map-reference-color-extraction");
    setMapReferenceStatus(serverSaved
      ? `선 색상 RGB(${selected.r}, ${selected.g}, ${selected.b})만 추출해 지도에 표시했습니다.`
      : "선 색상 추출 결과를 이 기기에 보관했습니다. 서버 연결 후 다시 동기화해 주세요.");
  } catch (error) {
    console.warn("Map reference color extraction failed", error);
    setMapReferenceStatus("이미지 색상을 읽지 못했습니다. 원본 지도를 다시 올린 뒤 시도해 주세요.");
  }
}

function addMapReferenceControlPair(latlng) {
  const draft = state.mapReferenceDraft;
  const imagePoint = state.pendingMapReferenceImagePoint;
  if (!draft || !imagePoint) return;
  draft.controlPoints.push({ ...imagePoint, lat: latlng.lat, lng: latlng.lng });
  draft.updatedAt = Date.now();
  state.pendingMapReferenceImagePoint = null;
  renderMapReferenceTools();
  scheduleMapReferenceRender();
  const count = draft.controlPoints.length;
  setMapReferenceStatus(count < 3
    ? `정합점 ${count}개 완료 · 업로드 지도에서 다음 기준점을 선택하세요.`
    : `정합점 ${count}개 완료 · 겹침을 확인하고 저장하거나 최대 6개까지 추가하세요.`);
}

function undoMapReferenceControlPoint() {
  if (!state.mapAlignmentMode || !state.mapReferenceDraft) return;
  if (state.mapReferenceDraft.alignmentMode === "corners") {
    const previous = mapReferenceCornerHistory.pop();
    if (!previous) return;
    state.mapReferenceDraft.controlPoints = previous;
    state.mapReferenceDraft.updatedAt = Date.now();
    renderMapReferenceTools();
    scheduleMapReferenceRender();
    setMapReferenceStatus("이전 모서리 위치로 되돌렸습니다.");
    return;
  }
  if (state.pendingMapReferenceImagePoint) {
    state.pendingMapReferenceImagePoint = null;
  } else {
    state.mapReferenceDraft.controlPoints.pop();
  }
  renderMapReferenceTools();
  scheduleMapReferenceRender();
}

function cancelMapReferenceAlignment() {
  if (state.mapColorExtractionMode) {
    state.mapColorExtractionMode = false;
    state.mapColorExtractionReferenceId = null;
    renderMapReferenceTools();
    setMapReferenceStatus("선 색상 선택을 취소했습니다.");
    return;
  }
  state.mapAlignmentMode = false;
  state.mapReferenceDraft = null;
  state.pendingMapReferenceImagePoint = null;
  mapReferenceCornerHistory = [];
  mapReferenceMarkerDragActive = false;
  renderMapReferenceTools();
  scheduleMapReferenceRender();
  setMapReferenceStatus("위치 맞춤을 취소했습니다.");
}

async function saveMapReferenceAlignment() {
  const draft = state.mapReferenceDraft;
  if (!draft || draft.controlPoints.length < 3) {
    setMapReferenceStatus(draft?.alignmentMode === "corners"
      ? "네 모서리 위치를 확인해 주세요."
      : "서로 떨어진 기준점을 최소 3개 지정해 주세요.");
    return;
  }
  const validAlignment = draft.alignmentMode === "corners"
    ? isValidMapReferenceCorners(draft)
    : Boolean(calculateMapReferenceTransform(draft));
  if (!validAlignment) {
    setMapReferenceStatus(draft.alignmentMode === "corners"
      ? "모서리가 서로 교차하거나 지도 영역이 너무 작습니다. 네 모서리를 다시 조절해 주세요."
      : "기준점이 한쪽에 몰려 위치를 계산할 수 없습니다. 넓게 떨어진 지점으로 다시 지정해 주세요.");
    return;
  }
  try {
    if (draft.src.startsWith("data:image/") && state.serverHealth?.files === "cloudflare-r2") {
      setMapReferenceStatus("참고 지도 원본을 서버에 올리고 있습니다.");
      const uploaded = await uploadProjectPhoto({ id: draft.id, displayName: draft.name, src: draft.src });
      mapReferenceImageCache.delete(draft.src);
      draft.src = uploaded.src;
    }
  } catch (error) {
    console.warn("Map reference upload failed", error);
    setMapReferenceStatus("참고 지도 업로드에 실패했습니다. 네트워크 연결을 확인한 뒤 다시 저장해 주세요.");
    return;
  }
  const existingIndex = state.mapReferences.findIndex((reference) => reference.id === draft.id);
  delete draft.initialControlPoints;
  if (existingIndex >= 0) state.mapReferences[existingIndex] = structuredClone(draft);
  else state.mapReferences.unshift(structuredClone(draft));
  state.activeMapReferenceId = draft.id;
  state.mapAlignmentMode = false;
  state.mapReferenceDraft = null;
  state.pendingMapReferenceImagePoint = null;
  mapReferenceCornerHistory = [];
  mapReferenceMarkerDragActive = false;
  persist();
  saveProjectRecoveryBackup("map-reference");
  renderMapReferenceTools();
  scheduleMapReferenceRender();
  const serverSaved = await syncProjectState("map-reference");
  setMapReferenceStatus(serverSaved
    ? "참고 지도의 위치 맞춤을 프로젝트에 저장했습니다. 이제 위에 사전동선을 그릴 수 있습니다."
    : "위치 맞춤을 이 기기에 보관했습니다. 서버 연결 후 다시 동기화해 주세요.");
}

function updateMapReferenceOpacity(event) {
  const opacity = Number(event.target.value) / 100;
  const target = state.mapAlignmentMode
    ? state.mapReferenceDraft
    : state.mapReferences.find((reference) => reference.id === state.activeMapReferenceId);
  if (!target) return;
  target.opacity = opacity;
  target.updatedAt = Date.now();
  if (!state.mapAlignmentMode) {
    persist();
    void syncProjectState("map-reference-opacity");
  }
  scheduleMapReferenceRender();
}

function editMapReference(referenceId) {
  if (state.shareView) return;
  if (state.planningMode || state.tracking || state.destinationFollow || state.pointEditMode) {
    setMapReferenceStatus("진행 중인 기록이나 사전 답사 편집을 마친 뒤 다시 맞춰 주세요.");
    return;
  }
  const reference = state.mapReferences.find((item) => item.id === referenceId);
  if (!reference) return;
  state.mapAlignmentMode = true;
  state.mapColorExtractionMode = false;
  state.mapColorExtractionReferenceId = null;
  const draft = structuredClone(reference);
  draft.controlPoints = createCornerControlPointsFromReference(reference);
  draft.alignmentMode = "corners";
  draft.initialControlPoints = structuredClone(draft.controlPoints);
  state.mapReferenceDraft = draft;
  mapReferenceCornerHistory = [];
  state.pendingMapReferenceImagePoint = null;
  els.mapReferenceOpacity.value = String(Math.round(reference.opacity * 100));
  void applyMapProvider("naver");
  renderMapReferenceTools();
  scheduleMapReferenceRender();
  setMapReferenceStatus("네 모서리와 가운데 이동점을 드래그해 기존 지도를 다시 맞출 수 있습니다.");
}

function createCornerControlPointsFromReference(reference) {
  if (reference.alignmentMode === "corners" && reference.controlPoints.length === 4) {
    return structuredClone(reference.controlPoints);
  }
  const transform = calculateMapReferenceTransform(reference);
  if (!transform || typeof map.containerPointToLatLng !== "function") return createScreenCornerControlPoints();
  return [
    { imageX: 0, imageY: 0 },
    { imageX: 1, imageY: 0 },
    { imageX: 1, imageY: 1 },
    { imageX: 0, imageY: 1 },
  ].map((corner) => {
    const imageX = corner.imageX * reference.width;
    const imageY = corner.imageY * reference.height;
    const point = [
      transform.a * imageX + transform.c * imageY + transform.e,
      transform.b * imageX + transform.d * imageY + transform.f,
    ];
    const latlng = map.containerPointToLatLng(point);
    return { ...corner, lat: latlng.lat, lng: latlng.lng };
  });
}

function isValidMapReferenceCorners(reference) {
  if (reference?.controlPoints?.length !== 4 || typeof map.latLngToContainerPoint !== "function") return false;
  const points = reference.controlPoints.map((point) => map.latLngToContainerPoint([point.lat, point.lng]));
  const area = Math.abs(points.reduce((total, point, index) => {
    const next = points[(index + 1) % points.length];
    return total + point.x * next.y - next.x * point.y;
  }, 0) / 2);
  return area >= 800 && !segmentsIntersect(points[0], points[1], points[2], points[3]) &&
    !segmentsIntersect(points[1], points[2], points[3], points[0]);
}

function segmentsIntersect(a, b, c, d) {
  const cross = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const first = cross(a, b, c);
  const second = cross(a, b, d);
  const third = cross(c, d, a);
  const fourth = cross(c, d, b);
  return first * second < 0 && third * fourth < 0;
}

function startMapReferenceColorExtraction(referenceId) {
  if (state.shareView || state.tracking || state.destinationFollow || state.pointEditMode || state.planningMode || state.mapAlignmentMode) {
    setMapReferenceStatus("진행 중인 기록이나 편집을 마친 뒤 선 색상을 선택해 주세요.");
    return;
  }
  const reference = state.mapReferences.find((item) => item.id === referenceId);
  if (!reference) return;
  state.mapColorExtractionMode = true;
  state.mapColorExtractionReferenceId = referenceId;
  els.mapReferencePreviewZoom.value = "100";
  els.mapReferencePreviewImage.style.width = "100%";
  renderMapReferenceTools();
  setMapReferenceStatus("미리보기에서 추출할 노선 색상의 굵은 선 중앙을 한 번 선택하세요.");
}

function toggleMapReferenceDisplayMode(referenceId) {
  const reference = state.mapReferences.find((item) => item.id === referenceId);
  if (!reference?.colorExtraction) return;
  reference.displayMode = reference.displayMode === "color" ? "source" : "color";
  reference.updatedAt = Date.now();
  persist();
  renderMapReferenceTools();
  scheduleMapReferenceRender();
  void syncProjectState("map-reference-display-mode");
  setMapReferenceStatus(reference.displayMode === "color" ? "선만 지도에 표시합니다." : "원본 지도를 표시합니다.");
}

function toggleMapReference(referenceId) {
  const reference = state.mapReferences.find((item) => item.id === referenceId);
  if (!reference) return;
  if (state.activeMapReferenceId !== referenceId) {
    state.activeMapReferenceId = referenceId;
    reference.visible = true;
  } else {
    reference.visible = reference.visible === false;
  }
  persist();
  renderMapReferenceTools();
  scheduleMapReferenceRender();
  void syncProjectState("map-reference-visibility");
}

function deleteMapReference(referenceId) {
  const reference = state.mapReferences.find((item) => item.id === referenceId);
  if (!reference || !window.confirm(`'${reference.name}' 참고 지도를 삭제할까요?`)) return;
  state.mapReferences = state.mapReferences.filter((item) => item.id !== referenceId);
  if (state.activeMapReferenceId === referenceId) {
    state.activeMapReferenceId = state.mapReferences[0]?.id || null;
  }
  persist();
  renderMapReferenceTools();
  scheduleMapReferenceRender();
  void syncProjectState("delete-map-reference");
}

function setMapReferenceStatus(message) {
  if (els.mapReferenceStatus) els.mapReferenceStatus.textContent = message;
}

function renderMapReferenceTools() {
  if (!PRE_SURVEY_FEATURE_ENABLED || !els.mapReferenceInput) return;
  const draft = state.mapAlignmentMode ? state.mapReferenceDraft : null;
  const extractionReference = state.mapColorExtractionMode
    ? state.mapReferences.find((item) => item.id === state.mapColorExtractionReferenceId)
    : null;
  const previewReference = extractionReference || (draft?.alignmentMode === "points" ? draft : null);
  els.mapReferencePreview.hidden = !previewReference;
  if (previewReference) {
    if (els.mapReferencePreviewImage.src !== previewReference.src) els.mapReferencePreviewImage.src = previewReference.src;
  }
  if (draft) {
    els.mapReferenceOpacity.value = String(Math.round(draft.opacity * 100));
  } else if (!extractionReference) {
    els.mapReferencePreviewImage.removeAttribute("src");
  }
  renderMapReferencePreviewPoints();
  const isCornerDraft = draft?.alignmentMode === "corners";
  els.mapReferenceFitBtn.disabled = !isCornerDraft;
  els.mapReferenceResetBtn.disabled = !isCornerDraft;
  els.mapReferenceUndoBtn.disabled = !draft || (isCornerDraft
    ? mapReferenceCornerHistory.length === 0
    : (!draft.controlPoints.length && !state.pendingMapReferenceImagePoint));
  els.mapReferenceSaveBtn.disabled = !draft || (isCornerDraft ? !isValidMapReferenceCorners(draft) : draft.controlPoints.length < 3);
  els.mapReferenceCancelBtn.disabled = !draft && !extractionReference;
  els.mapReferenceInput.disabled = Boolean(state.shareView || state.mapAlignmentMode || state.mapColorExtractionMode);
  els.mapReferenceList.replaceChildren();
  updateMapPointSelectionCursor();
  state.mapReferences.forEach((reference) => {
    const item = document.createElement("article");
    item.className = "map-reference-item";
    item.classList.toggle("is-active", reference.id === state.activeMapReferenceId);
    const info = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = reference.name;
    const meta = document.createElement("span");
    const extractionLabel = reference.colorExtraction ? " · 선 색상 추출됨" : "";
    const alignmentLabel = reference.alignmentMode === "corners" ? "네 모서리 맞춤" : `정합점 ${reference.controlPoints.length}개`;
    meta.textContent = `${reference.sourceType === "pdf" ? "PDF 1쪽" : "지도 이미지"} · ${alignmentLabel}${extractionLabel}`;
    info.append(title, meta);
    const actions = document.createElement("div");
    actions.className = "map-reference-item__actions";
    const actionItems = [
      [reference.id === state.activeMapReferenceId && reference.visible !== false ? "숨기기" : "지도에 보기", () => toggleMapReference(reference.id), reference.id === state.activeMapReferenceId && reference.visible !== false],
      ...(reference.colorExtraction
        ? [[reference.displayMode === "color" ? "원본 보기" : "선만 보기", () => toggleMapReferenceDisplayMode(reference.id), reference.displayMode === "color"]]
        : []),
      ["선 색상 선택", () => startMapReferenceColorExtraction(reference.id), false],
      ["다시 맞춤", () => editMapReference(reference.id), false],
      ["삭제", () => deleteMapReference(reference.id), false],
    ];
    actionItems.forEach(([label, handler, active]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.classList.toggle("is-active", active);
      button.disabled = Boolean(state.shareView);
      button.addEventListener("click", handler);
      actions.append(button);
    });
    item.append(info, actions);
    els.mapReferenceList.append(item);
  });
}

function updateMapPointSelectionCursor() {
  document.body.classList.toggle(
    "is-map-point-selection",
    Boolean(
      state.mapAlignmentMode ||
      state.planningMode ||
      state.pointAddMode ||
      (state.segmentRerouteMode && state.segmentRerouteWaypointMode)
    ),
  );
}

function renderMapReferencePreviewPoints() {
  if (!els.mapReferencePreviewPoints) return;
  els.mapReferencePreviewPoints.replaceChildren();
  const draft = state.mapReferenceDraft;
  if (!draft) return;
  els.mapReferencePreviewPoints.style.width = `${els.mapReferencePreviewImage.offsetWidth}px`;
  els.mapReferencePreviewPoints.style.height = `${els.mapReferencePreviewImage.offsetHeight}px`;
  const points = [...draft.controlPoints.map((point) => ({ ...point, pending: false }))];
  if (state.pendingMapReferenceImagePoint) points.push({ ...state.pendingMapReferenceImagePoint, pending: true });
  points.forEach((point, index) => {
    const marker = document.createElement("span");
    marker.className = "map-reference-preview__point";
    marker.classList.toggle("is-pending", point.pending);
    marker.style.left = `${point.imageX * 100}%`;
    marker.style.top = `${point.imageY * 100}%`;
    marker.textContent = String(index + 1);
    els.mapReferencePreviewPoints.append(marker);
  });
}

function ensureMapReferenceCanvas() {
  if (mapReferenceCanvas || typeof map.getContainer !== "function") return;
  mapReferenceCanvas = document.createElement("canvas");
  mapReferenceCanvas.className = "map-reference-overlay-canvas";
  map.getContainer().append(mapReferenceCanvas);
  mapReferenceCanvasContext = mapReferenceCanvas.getContext("2d");
}

function scheduleMapReferenceRender() {
  if (!PRE_SURVEY_FEATURE_ENABLED) return;
  if (mapReferenceRenderFrame !== null) return;
  mapReferenceRenderFrame = window.requestAnimationFrame(() => {
    mapReferenceRenderFrame = null;
    void renderMapReferenceOverlay();
  });
}

async function renderMapReferenceOverlay() {
  const renderRevision = ++mapReferenceRenderRevision;
  ensureMapReferenceCanvas();
  if (!mapReferenceCanvas || !mapReferenceCanvasContext || typeof map.getSize !== "function") return;
  const size = map.getSize();
  const pixelRatio = Math.min(2, window.devicePixelRatio || 1);
  const width = Math.max(1, Math.round(size.x * pixelRatio));
  const height = Math.max(1, Math.round(size.y * pixelRatio));
  if (mapReferenceCanvas.width !== width || mapReferenceCanvas.height !== height) {
    mapReferenceCanvas.width = width;
    mapReferenceCanvas.height = height;
  }
  mapReferenceCanvas.style.width = `${size.x}px`;
  mapReferenceCanvas.style.height = `${size.y}px`;
  const context = mapReferenceCanvasContext;
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, width, height);
  const reference = state.mapAlignmentMode && state.mapReferenceDraft?.controlPoints.length >= 3
    ? state.mapReferenceDraft
    : state.mapReferences.find((item) => item.id === state.activeMapReferenceId && item.visible !== false);
  if (!reference || reference.controlPoints.length < 3) {
    renderMapReferenceControlMarkers(null);
    return;
  }
  const isCornerMode = reference.alignmentMode === "corners" && reference.controlPoints.length === 4;
  const transform = isCornerMode ? null : calculateMapReferenceTransform(reference);
  if (!isCornerMode && !transform) return;
  try {
    const image = reference.displayMode === "color" && reference.colorExtraction
      ? await createMapReferenceColorCanvas(reference)
      : await loadMapReferenceImage(reference.src);
    if (renderRevision !== mapReferenceRenderRevision) return;
    context.save();
    context.globalAlpha = reference.opacity;
    if (isCornerMode) {
      drawMapReferenceCornerMesh(context, image, reference, pixelRatio);
    } else {
      context.setTransform(
        pixelRatio * transform.a,
        pixelRatio * transform.b,
        pixelRatio * transform.c,
        pixelRatio * transform.d,
        pixelRatio * transform.e,
        pixelRatio * transform.f,
      );
      context.drawImage(image, 0, 0, reference.width, reference.height);
    }
    context.restore();
  } catch (error) {
    console.warn("Map reference render failed", error);
  }
  if (!mapReferenceMarkerDragActive) {
    renderMapReferenceControlMarkers(state.mapAlignmentMode ? reference : null);
  }
}

function drawMapReferenceCornerMesh(context, image, reference, pixelRatio) {
  const targets = reference.controlPoints.map((point) => {
    const screen = map.latLngToContainerPoint([point.lat, point.lng]);
    return { x: screen.x * pixelRatio, y: screen.y * pixelRatio };
  });
  const gridSize = 12;
  const interpolate = (u, v) => ({
    x: (1 - u) * (1 - v) * targets[0].x + u * (1 - v) * targets[1].x + u * v * targets[2].x + (1 - u) * v * targets[3].x,
    y: (1 - u) * (1 - v) * targets[0].y + u * (1 - v) * targets[1].y + u * v * targets[2].y + (1 - u) * v * targets[3].y,
  });
  for (let row = 0; row < gridSize; row += 1) {
    const v0 = row / gridSize;
    const v1 = (row + 1) / gridSize;
    for (let column = 0; column < gridSize; column += 1) {
      const u0 = column / gridSize;
      const u1 = (column + 1) / gridSize;
      const source00 = { x: u0 * reference.width, y: v0 * reference.height };
      const source10 = { x: u1 * reference.width, y: v0 * reference.height };
      const source11 = { x: u1 * reference.width, y: v1 * reference.height };
      const source01 = { x: u0 * reference.width, y: v1 * reference.height };
      const target00 = interpolate(u0, v0);
      const target10 = interpolate(u1, v0);
      const target11 = interpolate(u1, v1);
      const target01 = interpolate(u0, v1);
      drawMapReferenceTriangle(context, image, reference, [source00, source10, source11], [target00, target10, target11]);
      drawMapReferenceTriangle(context, image, reference, [source00, source11, source01], [target00, target11, target01]);
    }
  }
}

function drawMapReferenceTriangle(context, image, reference, source, target) {
  const rows = source.map((point) => [point.x, point.y, 1]);
  const x = solveLeastSquares3(rows, target.map((point) => point.x));
  const y = solveLeastSquares3(rows, target.map((point) => point.y));
  if (!x || !y) return;
  context.save();
  context.beginPath();
  context.moveTo(target[0].x, target[0].y);
  context.lineTo(target[1].x, target[1].y);
  context.lineTo(target[2].x, target[2].y);
  context.closePath();
  context.clip();
  context.setTransform(x[0], y[0], x[1], y[1], x[2], y[2]);
  const sourceLeft = Math.max(0, Math.floor(Math.min(...source.map((point) => point.x))) - 1);
  const sourceTop = Math.max(0, Math.floor(Math.min(...source.map((point) => point.y))) - 1);
  const sourceRight = Math.min(reference.width, Math.ceil(Math.max(...source.map((point) => point.x))) + 1);
  const sourceBottom = Math.min(reference.height, Math.ceil(Math.max(...source.map((point) => point.y))) + 1);
  const sourceWidth = Math.max(1, sourceRight - sourceLeft);
  const sourceHeight = Math.max(1, sourceBottom - sourceTop);
  context.drawImage(
    image,
    sourceLeft,
    sourceTop,
    sourceWidth,
    sourceHeight,
    sourceLeft,
    sourceTop,
    sourceWidth,
    sourceHeight,
  );
  context.restore();
}

async function createMapReferenceColorCanvas(reference) {
  const extraction = normalizeMapReferenceColorExtraction(reference.colorExtraction);
  if (!extraction) return loadMapReferenceImage(reference.src);
  const key = `${reference.src}|${extraction.r},${extraction.g},${extraction.b}|${extraction.tolerance}`;
  if (mapReferenceExtractionCache.has(key)) return mapReferenceExtractionCache.get(key);
  const promise = (async () => {
    const image = await loadMapReferenceImage(reference.src);
    const canvas = document.createElement("canvas");
    canvas.width = reference.width;
    canvas.height = reference.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(image, 0, 0, reference.width, reference.height);
    const imageData = context.getImageData(0, 0, reference.width, reference.height);
    const pixels = imageData.data;
    const thresholdSquared = extraction.tolerance * extraction.tolerance;
    for (let index = 0; index < pixels.length; index += 4) {
      const redDelta = pixels[index] - extraction.r;
      const greenDelta = pixels[index + 1] - extraction.g;
      const blueDelta = pixels[index + 2] - extraction.b;
      const distanceSquared = redDelta * redDelta + greenDelta * greenDelta + blueDelta * blueDelta;
      if (distanceSquared > thresholdSquared) {
        pixels[index + 3] = 0;
      } else {
        pixels[index] = extraction.r;
        pixels[index + 1] = extraction.g;
        pixels[index + 2] = extraction.b;
        pixels[index + 3] = 245;
      }
    }
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.putImageData(imageData, 0, 0);
    return canvas;
  })();
  mapReferenceExtractionCache.set(key, promise);
  promise.catch(() => mapReferenceExtractionCache.delete(key));
  return promise;
}

function renderMapReferenceControlMarkers(reference) {
  mapReferenceControlLayer.clearLayers();
  if (!reference) return;
  const isCornerMode = reference.alignmentMode === "corners" && reference.controlPoints.length === 4;
  reference.controlPoints.forEach((point, index) => {
    const marker = L.marker([point.lat, point.lng], {
      draggable: isCornerMode,
      icon: L.divIcon({
        className: `map-reference-control-icon${isCornerMode ? " is-corner" : ""}`,
        html: `<span>${isCornerMode ? ["↖", "↗", "↘", "↙"][index] : index + 1}</span>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      }),
      interactive: isCornerMode,
    }).addTo(mapReferenceControlLayer);
    if (isCornerMode) {
      marker.on("dragstart", () => {
        mapReferenceMarkerDragActive = true;
        pushMapReferenceCornerHistory();
      });
      marker.on("drag", (event) => {
        const next = event.target.getLatLng();
        reference.controlPoints[index].lat = next.lat;
        reference.controlPoints[index].lng = next.lng;
        reference.updatedAt = Date.now();
        scheduleMapReferenceRender();
      });
      marker.on("dragend", () => {
        mapReferenceMarkerDragActive = false;
        renderMapReferenceTools();
        scheduleMapReferenceRender();
        setMapReferenceStatus("모서리를 이동했습니다. 도로가 일치하는지 확인해 주세요.");
      });
    }
  });
  if (!isCornerMode) return;
  const center = reference.controlPoints.reduce(
    (value, point) => ({ lat: value.lat + point.lat / 4, lng: value.lng + point.lng / 4 }),
    { lat: 0, lng: 0 },
  );
  let dragStart = null;
  const centerMarker = L.marker([center.lat, center.lng], {
    draggable: true,
    icon: L.divIcon({
      className: "map-reference-control-icon is-center",
      html: "<span>＋</span>",
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    }),
  }).addTo(mapReferenceControlLayer);
  centerMarker.on("dragstart", () => {
    mapReferenceMarkerDragActive = true;
    pushMapReferenceCornerHistory();
    dragStart = {
      center,
      points: structuredClone(reference.controlPoints),
    };
  });
  centerMarker.on("drag", (event) => {
    if (!dragStart) return;
    const next = event.target.getLatLng();
    const latDelta = next.lat - dragStart.center.lat;
    const lngDelta = next.lng - dragStart.center.lng;
    reference.controlPoints = dragStart.points.map((point) => ({
      ...point,
      lat: point.lat + latDelta,
      lng: point.lng + lngDelta,
    }));
    reference.updatedAt = Date.now();
    scheduleMapReferenceRender();
  });
  centerMarker.on("dragend", () => {
    mapReferenceMarkerDragActive = false;
    dragStart = null;
    renderMapReferenceTools();
    scheduleMapReferenceRender();
    setMapReferenceStatus("업로드 지도 전체를 이동했습니다.");
  });
}

function calculateMapReferenceTransform(reference) {
  if (!reference || reference.controlPoints.length < 3 || typeof map.latLngToContainerPoint !== "function") return null;
  const rows = reference.controlPoints.map((point) => [
    point.imageX * reference.width,
    point.imageY * reference.height,
    1,
  ]);
  const targets = reference.controlPoints.map((point) => map.latLngToContainerPoint([point.lat, point.lng]));
  const xCoefficients = solveLeastSquares3(rows, targets.map((point) => point.x));
  const yCoefficients = solveLeastSquares3(rows, targets.map((point) => point.y));
  if (!xCoefficients || !yCoefficients) return null;
  return {
    a: xCoefficients[0], c: xCoefficients[1], e: xCoefficients[2],
    b: yCoefficients[0], d: yCoefficients[1], f: yCoefficients[2],
  };
}

function solveLeastSquares3(rows, values) {
  const normal = Array.from({ length: 3 }, () => [0, 0, 0]);
  const right = [0, 0, 0];
  rows.forEach((row, rowIndex) => {
    for (let i = 0; i < 3; i += 1) {
      right[i] += row[i] * values[rowIndex];
      for (let j = 0; j < 3; j += 1) normal[i][j] += row[i] * row[j];
    }
  });
  for (let column = 0; column < 3; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < 3; row += 1) {
      if (Math.abs(normal[row][column]) > Math.abs(normal[pivot][column])) pivot = row;
    }
    if (Math.abs(normal[pivot][column]) < 1e-8) return null;
    [normal[column], normal[pivot]] = [normal[pivot], normal[column]];
    [right[column], right[pivot]] = [right[pivot], right[column]];
    const divisor = normal[column][column];
    for (let j = column; j < 3; j += 1) normal[column][j] /= divisor;
    right[column] /= divisor;
    for (let row = 0; row < 3; row += 1) {
      if (row === column) continue;
      const factor = normal[row][column];
      for (let j = column; j < 3; j += 1) normal[row][j] -= factor * normal[column][j];
      right[row] -= factor * right[column];
    }
  }
  return right;
}

function normalizePlannedRoutes(routes) {
  if (!Array.isArray(routes)) {
    return [];
  }
  return routes
    .map((route, index) => ({
      id: String(route?.id || `planned-${index + 1}`),
      name: String(route?.name || `후보 ${String.fromCharCode(65 + index)}`).trim(),
      memo: String(route?.memo || ""),
      source: ["image", "naver-manual", "naver-directions", "naver-outline"].includes(route?.source)
        ? route.source
        : "naver-manual",
      routeOption: normalizePlannedRouteOption(route?.routeOption),
      routeSummary: {
        distance: normalizeNonNegativeNumber(route?.routeSummary?.distance),
        duration: normalizeNonNegativeNumber(route?.routeSummary?.duration),
        tollFare: normalizeNonNegativeNumber(route?.routeSummary?.tollFare),
        provider: String(route?.routeSummary?.provider || "").slice(0, 40),
        searchedAt: route?.routeSummary?.searchedAt || null,
      },
      status: ["draft", "surveying", "review", "approved"].includes(route?.status) ? route.status : "draft",
      confirmedAt: route?.confirmedAt || null,
      confirmedProjectName: String(route?.confirmedProjectName || "").trim().slice(0, 120),
      confirmedPointCount: Math.max(0, Number(route?.confirmedPointCount) || 0),
      confirmationSessionId: String(route?.confirmationSessionId || ""),
      vehicleSpec: {
        length: normalizePositiveNumber(route?.vehicleSpec?.length),
        width: normalizePositiveNumber(route?.vehicleSpec?.width),
        height: normalizePositiveNumber(route?.vehicleSpec?.height),
        totalWeight: normalizePositiveNumber(route?.vehicleSpec?.totalWeight),
        axleWeight: normalizePositiveNumber(route?.vehicleSpec?.axleWeight),
      },
      restrictionReview: normalizeRestrictionReview(route?.restrictionReview),
      visible: route?.visible !== false,
      createdAt: route?.createdAt || Date.now(),
      updatedAt: route?.updatedAt || route?.createdAt || Date.now(),
      points: (Array.isArray(route?.points) ? route.points : [])
        .map((point) => ({ lat: Number(point?.lat), lng: Number(point?.lng) }))
        .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng)),
      outlinePoints: (Array.isArray(route?.outlinePoints) ? route.outlinePoints : [])
        .map((point) => ({ lat: Number(point?.lat), lng: Number(point?.lng) }))
        .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng)),
      stops: normalizePlannedRouteStops(route?.stops, route?.points),
    }))
    .filter((route) => route.points.length >= 2);
}

function normalizePlannedRouteOption(value) {
  return ["traoptimal", "trafast", "tracomfort", "traavoidtoll", "traavoidcaronly"].includes(value)
    ? value
    : "traoptimal";
}

function normalizeNonNegativeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function normalizePlannedRouteStops(stops, points = []) {
  const normalized = (Array.isArray(stops) ? stops : [])
    .slice(0, MAX_PLANNED_ROUTE_WAYPOINTS + 2)
    .map((stop, index) => ({
      id: String(stop?.id || `stop-${index + 1}`),
      kind: ["start", "waypoint", "goal"].includes(stop?.kind) ? stop.kind : "waypoint",
      label: String(stop?.label || "").trim().slice(0, 120),
      lat: Number(stop?.lat),
      lng: Number(stop?.lng),
    }))
    .filter((stop) => Number.isFinite(stop.lat) && Number.isFinite(stop.lng));
  if (normalized.some((stop) => stop.kind === "start") && normalized.some((stop) => stop.kind === "goal")) {
    return orderPlannedRouteStops(normalized);
  }
  const validPoints = (Array.isArray(points) ? points : [])
    .map((point) => ({ lat: Number(point?.lat), lng: Number(point?.lng) }))
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
  if (validPoints.length < 2) return normalized;
  return [
    { id: crypto.randomUUID(), kind: "start", label: "출발지", ...validPoints[0] },
    { id: crypto.randomUUID(), kind: "goal", label: "도착지", ...validPoints.at(-1) },
  ];
}

function orderPlannedRouteStops(stops) {
  const start = stops.find((stop) => stop.kind === "start");
  const goal = stops.find((stop) => stop.kind === "goal");
  const waypoints = stops.filter((stop) => stop.kind === "waypoint");
  return [start, ...waypoints, goal].filter(Boolean);
}

function normalizePositiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function normalizeRestrictionReview(review) {
  const facilities = (Array.isArray(review?.facilities) ? review.facilities : [])
    .slice(0, 10000)
    .map((facility, index) => normalizeRestrictionFacility(facility, index))
    .filter(Boolean);
  const unresolvedFacilities = (Array.isArray(review?.unresolvedFacilities) ? review.unresolvedFacilities : [])
    .slice(0, 10000)
    .map((facility, index) => normalizeUnresolvedRestrictionFacility(facility, index));
  const facilityIds = new Set(facilities.map((facility) => facility.id));
  const results = (Array.isArray(review?.results) ? review.results : [])
    .slice(0, facilities.length)
    .map((result) => ({
      facilityId: String(result?.facilityId || "").slice(0, 100),
      distanceMeters: normalizeNonNegativeNumber(result?.distanceMeters),
      status: ["risk", "permit", "pass", "unknown"].includes(result?.status) ? result.status : "unknown",
      issues: (Array.isArray(result?.issues) ? result.issues : []).slice(0, 10).map((issue) => String(issue).slice(0, 160)),
    }))
    .filter((result) => facilityIds.has(result.facilityId));
  return {
    dataName: String(review?.dataName || "").slice(0, 180),
    importStats: normalizeRestrictionImportStats(review?.importStats),
    corridorMeters: Math.min(5000, Math.max(10, Number(review?.corridorMeters) || 300)),
    workflowStatus: ["data", "screening", "consultation", "permit", "complete"].includes(review?.workflowStatus)
      ? review.workflowStatus
      : "data",
    memo: String(review?.memo || "").slice(0, 2000),
    facilities,
    unresolvedFacilities,
    results,
    reviewedAt: review?.reviewedAt || null,
  };
}

function normalizeRestrictionFacility(facility, index = 0) {
  const lat = facility?.lat == null || facility?.lat === "" ? Number.NaN : Number(facility.lat);
  const lng = facility?.lng == null || facility?.lng === "" ? Number.NaN : Number(facility.lng);
  if (!isKoreanRestrictionCoordinate(lat, lng)) return null;
  return {
    id: String(facility?.id || `restriction-${index + 1}`).slice(0, 100),
    name: String(facility?.name || `제한시설 ${index + 1}`).trim().slice(0, 160),
    type: String(facility?.type || "기타").trim().slice(0, 80),
    lat,
    lng,
    maxLength: normalizePositiveNumber(facility?.maxLength),
    maxWidth: normalizePositiveNumber(facility?.maxWidth),
    maxHeight: normalizePositiveNumber(facility?.maxHeight),
    maxTotalWeight: normalizePositiveNumber(facility?.maxTotalWeight),
    maxAxleWeight: normalizePositiveNumber(facility?.maxAxleWeight),
    permitRequired: facility?.permitRequired === true,
    source: String(facility?.source || "").slice(0, 240),
    address: String(facility?.address || "").slice(0, 300),
    note: String(facility?.note || "").slice(0, 500),
    updatedAt: String(facility?.updatedAt || "").slice(0, 80),
  };
}

function isKoreanRestrictionCoordinate(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= 32 && lat <= 40 && lng >= 123 && lng <= 133;
}

function normalizeUnresolvedRestrictionFacility(facility, index = 0) {
  return {
    id: String(facility?.id || `unresolved-${index + 1}`).slice(0, 100),
    name: String(facility?.name || `좌표 미확인 시설 ${index + 1}`).trim().slice(0, 160),
    type: String(facility?.type || "기타").trim().slice(0, 80),
    lat: null,
    lng: null,
    maxLength: normalizePositiveNumber(facility?.maxLength),
    maxWidth: normalizePositiveNumber(facility?.maxWidth),
    maxHeight: normalizePositiveNumber(facility?.maxHeight),
    maxTotalWeight: normalizePositiveNumber(facility?.maxTotalWeight),
    maxAxleWeight: normalizePositiveNumber(facility?.maxAxleWeight),
    permitRequired: facility?.permitRequired === true,
    source: String(facility?.source || "").slice(0, 240),
    address: String(facility?.address || "").slice(0, 300),
    note: String(facility?.note || "").slice(0, 500),
    updatedAt: String(facility?.updatedAt || "").slice(0, 80),
  };
}

function normalizeRestrictionImportStats(stats) {
  return {
    totalRows: Math.max(0, Number(stats?.totalRows) || 0),
    importedRows: Math.max(0, Number(stats?.importedRows) || 0),
    duplicateRows: Math.max(0, Number(stats?.duplicateRows) || 0),
    excludedRows: Math.max(0, Number(stats?.excludedRows) || 0),
    missingLimitRows: Math.max(0, Number(stats?.missingLimitRows) || 0),
    importedAt: stats?.importedAt || null,
  };
}

function getActivePlannedRoute() {
  return state.plannedRoutes.find((route) => route.id === state.activePlannedRouteId)
    || state.plannedRoutes[0]
    || null;
}

function getVisibleActivePlannedRoute() {
  const route = getActivePlannedRoute();
  return route?.visible !== false ? route : null;
}

function getCandidateStatusLabel(status) {
  return {
    draft: "미검토",
    surveying: "답사 중",
    review: "수정 필요",
    approved: "노선 확정",
  }[status] || "미검토";
}

function isPlannedRouteConfirmed(route) {
  return route?.status === "approved" && Number(route?.confirmedPointCount) >= 2;
}

function writePlannedRouteForm(route = null) {
  if (!els.plannedRouteName) return;
  els.plannedRouteName.value = route?.name || "";
  els.plannedRouteName.dataset.routeId = route?.id || "";
  els.plannedRouteMemo.value = route?.memo || "";
  els.plannedRouteStatusSelect.value = route?.status || "draft";
  if (els.plannedRouteOption) els.plannedRouteOption.value = normalizePlannedRouteOption(route?.routeOption);
  if (els.plannedRouteOutlineOption) els.plannedRouteOutlineOption.value = normalizePlannedRouteOption(route?.routeOption);
}

function readPlannedRouteVehicleSpec() {
  return {
    length: normalizePositiveNumber(els.restrictionVehicleLength?.value),
    width: normalizePositiveNumber(els.restrictionVehicleWidth?.value),
    height: normalizePositiveNumber(els.restrictionVehicleHeight?.value),
    totalWeight: normalizePositiveNumber(els.restrictionVehicleTotalWeight?.value),
    axleWeight: normalizePositiveNumber(els.restrictionVehicleAxleWeight?.value),
  };
}

async function startPlannedRouteEditing(routeId = null, options = {}) {
  if (state.shareView) {
    setStatus("공유 화면에서는 후보노선을 수정할 수 없습니다.", "warning");
    return;
  }
  if (!state.projectCode) {
    setProjectStatus("후보노선을 저장할 프로젝트를 먼저 만들거나 불러와 주세요.");
    els.projectName?.focus();
    return;
  }
  if (state.tracking || state.destinationFollow || state.pointEditMode || state.mapAlignmentMode) {
    setStatus("기록·따라가기·위치 편집을 마친 뒤 후보노선을 만들어 주세요.", "warning");
    return;
  }
  const sourceRoute = state.plannedRoutes.find((route) => route.id === routeId);
  const isRevision = options.revision === true;
  const isClone = options.clone === true;
  if (isPlannedRouteConfirmed(sourceRoute) && !isRevision && !isClone) {
    setStatus("확정된 노선은 후보노선에서 다시 수정하지 않습니다. 위치 편집에서 위치점을 보정해 주세요.", "warning");
    return;
  }
  const existing = sourceRoute && !isClone ? sourceRoute : null;
  state.planningMode = true;
  state.plannedRouteDraft = sourceRoute
    ? structuredClone(sourceRoute)
    : {
        id: crypto.randomUUID(),
        name: `후보 ${String.fromCharCode(65 + Math.min(25, state.plannedRoutes.length))}`,
        memo: "",
        source: "naver-manual",
        routeOption: "traoptimal",
        routeSummary: { distance: null, duration: null, tollFare: null, provider: "", searchedAt: null },
        status: "draft",
        vehicleSpec: {
          length: null,
          width: null,
          height: null,
          totalWeight: null,
          axleWeight: null,
        },
        visible: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        points: [],
        outlinePoints: [],
        stops: [],
      };
  if (isRevision || isClone) {
    const base = sourceRoute;
    state.plannedRouteDraft.id = crypto.randomUUID();
    state.plannedRouteDraft.name = isClone ? `${base.name} · 새 후보` : `${base.name} · 수정본`;
    state.plannedRouteDraft.status = isClone ? "draft" : "review";
    state.plannedRouteDraft.visible = true;
    state.plannedRouteDraft.confirmedAt = null;
    state.plannedRouteDraft.confirmedProjectName = "";
    state.plannedRouteDraft.confirmedPointCount = 0;
    state.plannedRouteDraft.confirmationSessionId = "";
    state.plannedRouteDraft.revisionOfRouteId = base.id;
    state.plannedRouteDraft.revisionBaseSessionId = base.confirmationSessionId || state.primarySessionId || "";
    state.plannedRouteDraft.revisionStartedAt = new Date().toISOString();
  }
  state.plannedRouteMode = ["naver-manual", "naver-outline"].includes(sourceRoute?.source) ? "manual" : "auto";
  state.plannedRouteSelection = state.plannedRouteMode === "auto" ? "start" : "manual";
  state.plannedRouteSearching = false;
  state.plannedRouteOutlinePoints = state.plannedRouteMode === "manual"
    ? (sourceRoute?.outlinePoints?.length ? sourceRoute.outlinePoints : sourceRoute?.points || []).map((point) => ({ ...point }))
    : [];
  state.plannedRouteOutlinePreview = null;
  state.plannedRoutePlaceResults = [];
  state.plannedRoutePlaceSearching = false;
  if (els.plannedRoutePlaceQuery) els.plannedRoutePlaceQuery.value = "";
  state.plannedRouteFeedback = null;
  writePlannedRouteForm(state.plannedRouteDraft);
  await applyMapProvider("naver");
  renderPlannedRoutes();
  if (sourceRoute?.points?.length) {
    fitPlannedRoute(sourceRoute.points);
  }
  setStatus(
    state.plannedRouteMode === "auto"
      ? "출발지 선택 중입니다. 지도에서 출발 위치를 선택하세요."
      : "윤곽 기반 검색 중입니다. 지도 위 도로를 따라 대략적인 윤곽점을 순서대로 선택하세요.",
    "active",
  );
}

async function startConfirmedRouteRevision(routeId) {
  const route = state.plannedRoutes.find((item) => item.id === routeId);
  if (!isPlannedRouteConfirmed(route)) return;
  const accepted = window.confirm(
    `확정노선을 다시 수정할까요?\n\n프로젝트명: ${state.projectName || "프로젝트"}\n확정노선명: ${route.name}\n위치점: ${route.confirmedPointCount || route.points.length}개\n\n현재 확정 위치점은 기준동선으로 유지되고 이전 확정 기록도 보관됩니다. 수정본을 다시 확정할 때만 기준동선이 교체됩니다.`,
  );
  if (!accepted) return;
  await startPlannedRouteEditing(routeId, { revision: true });
  state.plannedRouteFeedback = {
    message: "확정노선 수정본을 만들었습니다. 기존 경유지를 조정하거나 새 경유지를 추가한 뒤 다시 검색·저장·확정하세요.",
    type: "active",
  };
  renderPlannedRoutes();
}

async function startPlannedRouteClone(routeId) {
  const route = state.plannedRoutes.find((item) => item.id === routeId);
  if (!route) return;
  await startPlannedRouteEditing(routeId, { clone: true });
  state.plannedRouteFeedback = {
    message: "기존 노선을 새 후보로 복제했습니다. 원본 확정노선은 그대로 유지됩니다.",
    type: "active",
  };
  renderPlannedRoutes();
}

function handlePlannedRouteMapClick(latlng) {
  if (!state.planningMode || !state.plannedRouteDraft) {
    return;
  }
  if (state.plannedRouteSearching) {
    setStatus("노선 검색이 끝난 뒤 윤곽점이나 지점을 수정해 주세요.", "warning");
    return;
  }
  if (state.plannedRouteMode === "manual") {
    addPlannedRoutePoint(latlng);
    return;
  }
  addPlannedRouteStop(latlng, state.plannedRouteSelection || "start");
}

function addPlannedRoutePoint(latlng) {
  if (state.plannedRouteDraft.source === "naver-outline") {
    state.plannedRouteDraft.points = state.plannedRouteOutlinePoints.map((point) => ({ ...point }));
  }
  state.plannedRouteOutlinePreview = null;
  state.plannedRouteOutlinePoints.push({ lat: latlng.lat, lng: latlng.lng });
  state.plannedRouteDraft.points = state.plannedRouteOutlinePoints.map((point) => ({ ...point }));
  state.plannedRouteDraft.outlinePoints = [];
  state.plannedRouteDraft.source = "naver-manual";
  state.plannedRouteDraft.routeSummary = {
    distance: null, duration: null, tollFare: null, provider: "manual", searchedAt: null,
  };
  state.plannedRouteDraft.updatedAt = Date.now();
  renderPlannedRoutes();
  setStatus(`윤곽점 ${state.plannedRouteOutlinePoints.length}개를 지정했습니다. 계속 그리거나 윤곽으로 노선을 검색하세요.`, "active");
}

function addPlannedRouteStop(latlng, kind) {
  const draft = state.plannedRouteDraft;
  if (!draft) return false;
  const existing = state.plannedRouteSelectionStopId
    ? draft.stops.find((stop) => stop.id === state.plannedRouteSelectionStopId)
    : draft.stops.find((stop) => stop.kind === kind && kind !== "waypoint");
  if (
    !existing
    && kind === "waypoint"
    && draft.stops.filter((stop) => stop.kind === "waypoint").length >= MAX_PLANNED_ROUTE_WAYPOINTS
  ) {
    setStatus(`경유지는 최대 ${MAX_PLANNED_ROUTE_WAYPOINTS}개까지 지정할 수 있습니다.`, "warning");
    return false;
  }
  const nextStop = {
    id: existing?.id || crypto.randomUUID(),
    kind,
    label: existing?.label || (kind === "start" ? "출발지" : kind === "goal" ? "도착지" : `경유지 ${draft.stops.filter((stop) => stop.kind === "waypoint").length + 1}`),
    lat: latlng.lat,
    lng: latlng.lng,
  };
  draft.stops = existing
    ? draft.stops.map((stop) => (stop.id === existing.id ? nextStop : stop))
    : [...draft.stops, nextStop];
  draft.stops = orderPlannedRouteStops(draft.stops);
  draft.points = [];
  draft.routeSummary = { distance: null, duration: null, tollFare: null, provider: "", searchedAt: null };
  draft.updatedAt = Date.now();
  state.plannedRouteFeedback = null;
  state.plannedRoutePlaceResults = [];
  if (els.plannedRoutePlaceQuery) els.plannedRoutePlaceQuery.value = "";
  state.plannedRouteSelection = kind === "start" ? "goal" : kind;
  state.plannedRouteSelectionStopId = "";
  renderPlannedRoutes();
  const label = kind === "start" ? "출발지" : kind === "goal" ? "도착지" : nextStop.label;
  setStatus(`${label}를 지정했습니다.${kind === "start" ? " 이제 도착지를 선택하거나 경유지를 추가하세요." : " 후보노선 검색을 눌러 경로를 계산하세요."}`, "active");
  return true;
}

function setPlannedRouteMode(mode) {
  if (!state.planningMode || !state.plannedRouteDraft || !["auto", "manual"].includes(mode)) return;
  if (state.plannedRouteMode === mode) return;
  const draft = state.plannedRouteDraft;
  if (draft.points.length > 1) {
    const ok = window.confirm(
      mode === "manual"
        ? "현재 지점 기반 노선을 지우고 윤곽 기반 검색으로 전환할까요?"
        : "현재 윤곽 기반 노선을 지우고 지점 기반 검색으로 전환할까요?",
    );
    if (!ok) return;
  }
  draft.points = [];
  draft.outlinePoints = [];
  draft.stops = mode === "auto" ? normalizePlannedRouteStops(draft.stops) : [];
  draft.source = mode === "auto" ? "naver-directions" : "naver-manual";
  draft.routeSummary = { distance: null, duration: null, tollFare: null, provider: "", searchedAt: null };
  state.plannedRouteMode = mode;
  state.plannedRouteSelection = mode === "auto" ? "start" : "manual";
  state.plannedRouteSelectionStopId = "";
  state.plannedRouteOutlinePoints = [];
  state.plannedRouteOutlinePreview = null;
  state.plannedRoutePlaceResults = [];
  state.plannedRoutePlaceSearching = false;
  renderPlannedRoutes();
  setStatus(
    mode === "auto"
      ? "출발지를 선택한 뒤 경유지와 도착지를 지정하세요."
      : "지도 위 도로를 따라 출발지부터 도착지까지 대략적인 윤곽점을 순서대로 선택하세요.",
    "active",
  );
}

function setPlannedRouteSelection(kind, stopId = "") {
  if (!state.planningMode || state.plannedRouteMode !== "auto") return;
  state.plannedRouteSelection = kind;
  state.plannedRouteSelectionStopId = stopId;
  state.plannedRouteFeedback = null;
  renderPlannedRoutes();
  setStatus(`${kind === "start" ? "출발지" : kind === "goal" ? "도착지" : "추가할 경유지"}를 지도에서 선택하거나 주소·지명으로 검색하세요.`, "active");
}

function getPlannedRouteSelectionLabel() {
  if (state.plannedRouteSelectionStopId) {
    const stop = state.plannedRouteDraft?.stops?.find((item) => item.id === state.plannedRouteSelectionStopId);
    if (stop) return `${stop.label || "선택 지점"} 재지정`;
  }
  return state.plannedRouteSelection === "goal"
    ? "도착지"
    : state.plannedRouteSelection === "waypoint"
      ? "새 경유지"
      : "출발지";
}

async function searchPlannedRoutePlace() {
  const query = String(els.plannedRoutePlaceQuery?.value || "").trim();
  if (!state.planningMode || state.plannedRouteMode !== "auto" || state.plannedRoutePlaceSearching) return;
  if (query.length < 2) {
    setStatus("검색할 주소나 지명을 두 글자 이상 입력해 주세요.", "warning");
    els.plannedRoutePlaceQuery?.focus();
    return;
  }
  state.plannedRoutePlaceSearching = true;
  state.plannedRoutePlaceResults = [];
  renderPlannedRoutePlaceResults();
  setStatus(`‘${query}’ 위치를 검색하는 중입니다.`, "active");
  try {
    const result = await requestJson(`/api/locations/search?q=${encodeURIComponent(query)}`);
    state.plannedRoutePlaceResults = Array.isArray(result.results) ? result.results : [];
    if (state.plannedRoutePlaceResults.length) {
      setStatus(`검색 결과 ${state.plannedRoutePlaceResults.length}건을 찾았습니다. ${getPlannedRouteSelectionLabel()}로 등록할 위치를 선택하세요.`, "success");
    } else {
      setStatus("검색 결과가 없습니다. 건물명과 함께 도로명·지번 주소를 더 자세히 입력해 주세요.", "warning");
    }
  } catch (error) {
    const code = error?.payload?.error;
    const message = code === "geocoding_not_configured"
      ? "주소 검색 API 설정이 필요합니다. Railway의 네이버 Client ID·Secret을 확인해 주세요."
      : code === "geocoding_auth_failed"
        ? "네이버 주소 검색 인증에 실패했습니다. 네이버클라우드의 Geocoding 사용 설정을 확인해 주세요."
        : code === "login_required"
          ? "로그인 상태가 만료되었습니다. 다시 로그인한 뒤 검색해 주세요."
          : "주소·지명 검색에 실패했습니다. 잠시 후 다시 시도해 주세요.";
    setStatus(message, "warning");
  } finally {
    state.plannedRoutePlaceSearching = false;
    renderPlannedRoutePlaceResults();
    renderPlannedRoutes();
  }
}

function selectPlannedRoutePlace(result) {
  if (!state.planningMode || state.plannedRouteMode !== "auto" || !hasPhotoPosition(result)) return;
  const kind = ["start", "waypoint", "goal"].includes(state.plannedRouteSelection)
    ? state.plannedRouteSelection
    : "start";
  const selectionStopId = state.plannedRouteSelectionStopId;
  if (!addPlannedRouteStop({ lat: result.lat, lng: result.lng }, kind)) return;
  const draft = state.plannedRouteDraft;
  const target = selectionStopId
    ? draft?.stops?.find((stop) => stop.id === selectionStopId)
    : null;
  const selectedStop = target || (kind === "waypoint"
    ? draft?.stops?.filter((stop) => stop.kind === "waypoint").at(-1)
    : draft?.stops?.find((stop) => stop.kind === kind));
  if (selectedStop) selectedStop.label = String(result.name || result.roadAddress || result.jibunAddress || selectedStop.label).slice(0, 120);
  map.setView([Number(result.lat), Number(result.lng)], Math.max(map.getZoom(), 15));
  renderPlannedRoutes();
}

function renderPlannedRoutePlaceResults() {
  if (!els.plannedRoutePlaceResults) return;
  els.plannedRoutePlaceResults.replaceChildren();
  if (state.plannedRoutePlaceSearching) {
    const loading = document.createElement("p");
    loading.className = "planned-route-place-empty";
    loading.textContent = "검색 중…";
    els.plannedRoutePlaceResults.append(loading);
    return;
  }
  state.plannedRoutePlaceResults.forEach((result) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "planned-route-place-result";
    const name = document.createElement("strong");
    name.textContent = result.name || result.roadAddress || result.jibunAddress || "검색 위치";
    const address = document.createElement("span");
    address.textContent = [result.roadAddress, result.jibunAddress]
      .filter(Boolean)
      .filter((value, index, values) => values.indexOf(value) === index)
      .join(" · ");
    const action = document.createElement("em");
    action.textContent = `${getPlannedRouteSelectionLabel()}로 등록`;
    button.append(name, address, action);
    button.addEventListener("click", () => selectPlannedRoutePlace(result));
    els.plannedRoutePlaceResults.append(button);
  });
}

async function searchPlannedRoute() {
  const draft = state.plannedRouteDraft;
  if (!state.planningMode || state.plannedRouteMode !== "auto" || !draft || state.plannedRouteSearching) return;
  const stops = orderPlannedRouteStops(draft.stops || []);
  if (!stops.some((stop) => stop.kind === "start") || !stops.some((stop) => stop.kind === "goal")) {
    setStatus("출발지와 도착지를 먼저 지정해 주세요.", "warning");
    return;
  }
  state.plannedRouteSearching = true;
  state.plannedRouteFeedback = {
    message: "네이버 지도에서 후보노선을 계산하는 중입니다. 잠시 기다려 주세요.",
    type: "active",
  };
  renderPlannedRoutes();
  setStatus("일반 자동차 기준 후보노선을 검색하는 중입니다.", "active");
  try {
    const result = await requestJson("/api/routes/preview", {
      method: "POST",
      body: JSON.stringify({
        stops: stops.map(({ kind, lat, lng }) => ({ kind, lat, lng })),
        option: normalizePlannedRouteOption(els.plannedRouteOption?.value),
      }),
    });
    draft.points = result.points;
    draft.stops = stops;
    draft.source = "naver-directions";
    draft.routeOption = normalizePlannedRouteOption(els.plannedRouteOption?.value);
    draft.routeSummary = {
      distance: normalizeNonNegativeNumber(result.summary?.distance),
      duration: normalizeNonNegativeNumber(result.summary?.duration),
      tollFare: normalizeNonNegativeNumber(result.summary?.tollFare),
      provider: String(result.provider || "naver"),
      searchedAt: new Date().toISOString(),
    };
    draft.updatedAt = Date.now();
    fitPlannedRoute(draft.points);
    const successMessage = `후보노선을 계산했습니다 · ${formatDistance(draft.routeSummary.distance || 0)} · ${formatRouteDuration(draft.routeSummary.duration)}`;
    state.plannedRouteFeedback = { message: successMessage, type: "success" };
    setStatus(successMessage, "success");
  } catch (error) {
    const code = error?.payload?.error;
    const message = code === "directions_not_configured"
      ? "자동 경로 API 설정이 필요합니다. 설정 전에는 전체 수동 그리기로 후보노선을 작성할 수 있습니다."
      : code === "directions_auth_failed"
        ? "네이버 Directions 인증에 실패했습니다. Railway의 Client ID·Secret과 네이버클라우드의 Directions 5·15 사용 설정을 확인해 주세요."
        : code === "directions_rate_limited"
          ? "네이버 Directions 요청 한도에 도달했습니다. 잠시 후 다시 검색해 주세요."
          : code === "login_required"
            ? "로그인 상태가 만료되었습니다. 다시 로그인한 뒤 후보노선을 검색해 주세요."
      : code === "route_not_found"
        ? "선택한 출발지·경유지·도착지를 연결하는 자동차 경로를 찾지 못했습니다. 위치를 도로 가까이 다시 지정해 주세요."
        : "후보노선 검색에 실패했습니다. 연결 상태와 선택 위치를 확인한 뒤 다시 시도해 주세요.";
    state.plannedRouteFeedback = { message, type: "error" };
    setStatus(message, "warning");
  } finally {
    state.plannedRouteSearching = false;
    renderPlannedRoutes();
  }
}

function simplifyOutlinePoints(points, toleranceMeters) {
  const source = (Array.isArray(points) ? points : []).filter(hasPhotoPosition);
  if (source.length <= 2) return source.map((point) => ({ lat: Number(point.lat), lng: Number(point.lng) }));
  const latitudeScale = 111320;
  const longitudeScale = latitudeScale * Math.cos((source.reduce((sum, point) => sum + Number(point.lat), 0) / source.length) * Math.PI / 180);
  const projected = source.map((point) => ({
    source: { lat: Number(point.lat), lng: Number(point.lng) },
    x: Number(point.lng) * longitudeScale,
    y: Number(point.lat) * latitudeScale,
  }));
  const keep = new Set([0, projected.length - 1]);
  const visit = (start, end) => {
    const left = projected[start];
    const right = projected[end];
    const dx = right.x - left.x;
    const dy = right.y - left.y;
    const lengthSquared = dx * dx + dy * dy;
    let farthestIndex = -1;
    let farthestDistance = -1;
    for (let index = start + 1; index < end; index += 1) {
      const point = projected[index];
      const ratio = lengthSquared > 0
        ? Math.max(0, Math.min(1, ((point.x - left.x) * dx + (point.y - left.y) * dy) / lengthSquared))
        : 0;
      const nearestX = left.x + ratio * dx;
      const nearestY = left.y + ratio * dy;
      const distance = Math.hypot(point.x - nearestX, point.y - nearestY);
      if (distance > farthestDistance) {
        farthestDistance = distance;
        farthestIndex = index;
      }
    }
    if (farthestIndex > start && farthestDistance > toleranceMeters) {
      keep.add(farthestIndex);
      visit(start, farthestIndex);
      visit(farthestIndex, end);
    }
  };
  visit(0, projected.length - 1);
  return [...keep].sort((left, right) => left - right).map((index) => projected[index].source);
}

function extractOutlineRouteAnchors(points) {
  const source = (Array.isArray(points) ? points : [])
    .filter(hasPhotoPosition)
    .filter((point, index, values) => index === 0 || getDistanceMeters(values[index - 1], point) >= 12)
    .map((point) => ({ lat: Number(point.lat), lng: Number(point.lng) }));
  if (source.length <= 2) return source;
  const maxAnchors = (MAX_PLANNED_ROUTE_WAYPOINTS + 1) * 8 + 1;
  let toleranceMeters = 15;
  let simplified = simplifyOutlinePoints(source, toleranceMeters);
  while (simplified.length > maxAnchors && toleranceMeters < 2000) {
    toleranceMeters *= 1.6;
    simplified = simplifyOutlinePoints(source, toleranceMeters);
  }
  return simplified;
}

function createOutlineRouteChunks(anchors) {
  const chunks = [];
  const maxStops = MAX_PLANNED_ROUTE_WAYPOINTS + 2;
  for (let startIndex = 0; startIndex < anchors.length - 1; startIndex += maxStops - 1) {
    const points = anchors.slice(startIndex, Math.min(anchors.length, startIndex + maxStops));
    if (points.length >= 2) chunks.push(points);
    if (startIndex + maxStops >= anchors.length) break;
  }
  return chunks;
}

function createDirectionsStops(points) {
  return points.map((point, index) => ({
    kind: index === 0 ? "start" : index === points.length - 1 ? "goal" : "waypoint",
    lat: Number(point.lat),
    lng: Number(point.lng),
  }));
}

function appendRoutePoints(target, incoming) {
  const next = (Array.isArray(incoming) ? incoming : []).filter(hasPhotoPosition).map((point) => ({
    lat: Number(point.lat), lng: Number(point.lng),
  }));
  if (!next.length) return target;
  if (target.length && getDistanceMeters(target.at(-1), next[0]) < 5) next.shift();
  target.push(...next);
  return target;
}

function getDirectionsSearchErrorMessage(error, fallbackPrefix = "후보노선") {
  const code = error?.payload?.error;
  return code === "directions_not_configured"
    ? "자동 경로 API 설정이 필요합니다. Railway의 네이버 Directions 환경변수를 확인해 주세요."
    : code === "directions_auth_failed"
      ? "네이버 Directions 인증에 실패했습니다. Railway의 Client ID·Secret과 네이버클라우드의 Directions 5·15 사용 설정을 확인해 주세요."
      : code === "directions_rate_limited"
        ? "네이버 Directions 요청 한도에 도달했습니다. 잠시 후 다시 검색해 주세요."
        : code === "login_required"
          ? "로그인 상태가 만료되었습니다. 다시 로그인한 뒤 검색해 주세요."
          : code === "route_not_found"
            ? "윤곽의 일부 구간에서 자동차 경로를 찾지 못했습니다. 해당 윤곽점을 도로 가까이 옮겨 다시 검색해 주세요."
            : `${fallbackPrefix} 검색에 실패했습니다. 연결 상태와 윤곽 위치를 확인한 뒤 다시 시도해 주세요.`;
}

async function searchPlannedRouteOutline() {
  const draft = state.plannedRouteDraft;
  const outlinePoints = state.plannedRouteOutlinePoints;
  if (!state.planningMode || state.plannedRouteMode !== "manual" || !draft || state.plannedRouteSearching) return;
  if (outlinePoints.length < 2) {
    setStatus("지도에 윤곽점을 2개 이상 지정해 주세요.", "warning");
    return;
  }
  const anchors = extractOutlineRouteAnchors(outlinePoints);
  const chunks = createOutlineRouteChunks(anchors);
  if (!chunks.length) return;
  state.plannedRouteSearching = true;
  state.plannedRouteOutlinePreview = null;
  state.plannedRouteFeedback = {
    message: `윤곽 ${outlinePoints.length}점에서 핵심점 ${anchors.length}개를 추출했습니다. ${chunks.length}개 구간의 도로 노선을 검색합니다.`,
    type: "active",
  };
  renderPlannedRoutes();
  const option = normalizePlannedRouteOption(els.plannedRouteOutlineOption?.value);
  const combinedPoints = [];
  const summary = { distance: 0, duration: 0, tollFare: 0 };
  try {
    for (const [index, chunk] of chunks.entries()) {
      state.plannedRouteFeedback = {
        message: `윤곽 기반 노선 검색 중 · ${index + 1}/${chunks.length}구간`,
        type: "active",
      };
      renderPlannedRoutes();
      const result = await requestJson("/api/routes/preview", {
        method: "POST",
        body: JSON.stringify({ stops: createDirectionsStops(chunk), option }),
      });
      appendRoutePoints(combinedPoints, result.points);
      summary.distance += Number(result.summary?.distance) || 0;
      summary.duration += Number(result.summary?.duration) || 0;
      summary.tollFare += Number(result.summary?.tollFare) || 0;
    }
    if (combinedPoints.length < 2) throw new Error("outline_route_empty");
    state.plannedRouteOutlinePreview = {
      points: combinedPoints,
      anchors,
      chunkCount: chunks.length,
      option,
      summary: { ...summary, provider: "naver", searchedAt: new Date().toISOString() },
    };
    const message = `검색 결과를 확인하세요 · 핵심점 ${anchors.length}개 · ${chunks.length}구간 · ${formatDistance(summary.distance)} · ${formatRouteDuration(summary.duration)}`;
    state.plannedRouteFeedback = { message, type: "success" };
    fitPlannedRoute([...outlinePoints, ...combinedPoints]);
    setStatus("주황색 점선은 입력 윤곽, 파란 실선은 도로 검색 결과입니다. 확인 후 검색 결과 적용을 눌러 주세요.", "success");
  } catch (error) {
    const message = getDirectionsSearchErrorMessage(error, "윤곽 기반 노선");
    state.plannedRouteFeedback = { message, type: "error" };
    setStatus(message, "warning");
  } finally {
    state.plannedRouteSearching = false;
    renderPlannedRoutes();
  }
}

function applyPlannedRouteOutlinePreview() {
  const draft = state.plannedRouteDraft;
  const preview = state.plannedRouteOutlinePreview;
  if (!state.planningMode || state.plannedRouteMode !== "manual" || !draft || !preview?.points?.length) return;
  const accepted = window.confirm(
    `윤곽 기반 검색 결과를 후보노선에 적용할까요?\n\n입력 윤곽점: ${state.plannedRouteOutlinePoints.length}개\n핵심점: ${preview.anchors.length}개\n자동 분할: ${preview.chunkCount}구간\n도로 위치점: ${preview.points.length}개\n\n적용 후에도 후보노선을 저장하기 전까지 편집을 취소할 수 있습니다.`,
  );
  if (!accepted) return;
  draft.outlinePoints = state.plannedRouteOutlinePoints.map((point) => ({ ...point }));
  draft.points = preview.points.map((point) => ({ ...point }));
  draft.stops = [];
  draft.source = "naver-outline";
  draft.routeOption = preview.option;
  draft.routeSummary = { ...preview.summary };
  draft.updatedAt = Date.now();
  state.plannedRouteOutlinePreview = null;
  state.plannedRouteFeedback = {
    message: `윤곽 검색 결과를 적용했습니다 · 도로 위치점 ${draft.points.length}개 · 후보노선 저장을 눌러 완료하세요.`,
    type: "success",
  };
  renderPlannedRoutes();
  setStatus("윤곽 검색 결과를 후보노선에 적용했습니다. 후보노선 저장 전까지 윤곽을 다시 그려 재검색할 수 있습니다.", "success");
}

function cancelPlannedRouteOutlinePreview() {
  if (!state.plannedRouteOutlinePreview) return;
  state.plannedRouteOutlinePreview = null;
  state.plannedRouteFeedback = {
    message: "도로 검색 미리보기를 취소했습니다. 윤곽점을 수정한 뒤 다시 검색할 수 있습니다.",
    type: "warning",
  };
  renderPlannedRoutes();
}

function formatRouteDuration(durationMs) {
  const minutes = Math.max(0, Math.round((Number(durationMs) || 0) / 60000));
  if (minutes < 60) return `약 ${minutes}분`;
  return `약 ${Math.floor(minutes / 60)}시간 ${minutes % 60}분`;
}

function undoPlannedRoutePoint() {
  if (!state.planningMode || !state.plannedRouteDraft) {
    return;
  }
  if (state.plannedRouteMode === "auto") {
    const waypoints = state.plannedRouteDraft.stops.filter((stop) => stop.kind === "waypoint");
    const target = waypoints.at(-1)
      || state.plannedRouteDraft.stops.find((stop) => stop.kind === "goal")
      || state.plannedRouteDraft.stops.find((stop) => stop.kind === "start");
    if (!target) return;
    state.plannedRouteDraft.stops = state.plannedRouteDraft.stops.filter((stop) => stop.id !== target.id);
    state.plannedRouteDraft.points = [];
  } else {
    if (state.plannedRouteOutlinePreview) {
      state.plannedRouteOutlinePreview = null;
    } else {
      if (!state.plannedRouteOutlinePoints.length) return;
      state.plannedRouteOutlinePoints.pop();
      state.plannedRouteDraft.points = state.plannedRouteOutlinePoints.map((point) => ({ ...point }));
      state.plannedRouteDraft.outlinePoints = [];
      state.plannedRouteDraft.source = "naver-manual";
      state.plannedRouteDraft.routeSummary = { distance: null, duration: null, tollFare: null, provider: "manual", searchedAt: null };
    }
  }
  state.plannedRouteDraft.updatedAt = Date.now();
  renderPlannedRoutes();
}

function cancelPlannedRouteEditing() {
  state.planningMode = false;
  state.plannedRouteDraft = null;
  state.plannedRouteSelection = "";
  state.plannedRouteSelectionStopId = "";
  state.plannedRouteSearching = false;
  state.plannedRouteOutlinePoints = [];
  state.plannedRouteOutlinePreview = null;
  state.plannedRoutePlaceResults = [];
  state.plannedRoutePlaceSearching = false;
  state.plannedRouteFeedback = {
    message: "후보노선 편집을 취소했습니다.",
    type: "warning",
  };
  writePlannedRouteForm(getActivePlannedRoute());
  renderPlannedRoutes();
  setStatus("후보노선 편집을 취소했습니다.", "warning");
}

async function savePlannedRoute() {
  if (!state.planningMode) {
    const activeRoute = getActivePlannedRoute();
    if (!activeRoute || state.shareView) {
      setStatus("저장할 후보노선을 먼저 선택해 주세요.", "warning");
      return;
    }
    const nextName = els.plannedRouteName.value.trim() || activeRoute.name || "후보노선";
    const nextMemo = els.plannedRouteMemo.value.trim();
    const nextStatus = els.plannedRouteStatusSelect.value;
    if (!isPlannedRouteConfirmed(activeRoute) && nextStatus === "approved") {
      const confirmed = confirmPlannedRoute(activeRoute, { name: nextName, memo: nextMemo });
      if (!confirmed) {
        writePlannedRouteForm(activeRoute);
        renderPlannedRoutes();
        return;
      }
      finishPlannedRouteSave(persist(), { confirmed: true, pointCount: state.points.length });
      return;
    }
    activeRoute.name = nextName;
    activeRoute.memo = nextMemo;
    activeRoute.status = nextStatus;
    activeRoute.updatedAt = Date.now();
    state.plannedRouteFeedback = {
      message: "후보노선명·검토 상태·검토사항을 저장했습니다. 노선 선형을 바꾸려면 아래 수정 버튼을 누르세요.",
      type: "success",
    };
    writePlannedRouteForm(activeRoute);
    renderPlannedRoutes();
    finishPlannedRouteSave(persist());
    return;
  }
  const draft = state.plannedRouteDraft;
  if (!draft || draft.points.length < 2) {
    setStatus("후보노선은 출발지와 도착지를 포함해 위치점을 2개 이상 지정해야 저장할 수 있습니다.", "warning");
    return;
  }
  draft.name = els.plannedRouteName.value.trim() || `후보 ${String.fromCharCode(65 + Math.min(25, state.plannedRoutes.length))}`;
  draft.memo = els.plannedRouteMemo.value.trim();
  const nextStatus = els.plannedRouteStatusSelect.value;
  const previousStatus = draft.status;
  draft.status = nextStatus === "approved" ? previousStatus : nextStatus;
  draft.routeOption = normalizePlannedRouteOption(els.plannedRouteOption?.value);
  if (state.plannedRouteMode === "manual") {
    draft.routeOption = normalizePlannedRouteOption(els.plannedRouteOutlineOption?.value);
  }
  draft.updatedAt = Date.now();
  const existingIndex = state.plannedRoutes.findIndex((route) => route.id === draft.id);
  if (existingIndex >= 0) {
    state.plannedRoutes[existingIndex] = structuredClone(draft);
  } else {
    state.plannedRoutes.unshift(structuredClone(draft));
  }
  state.activePlannedRouteId = draft.id;
  state.planningMode = false;
  state.plannedRouteDraft = null;
  state.plannedRouteSelection = "";
  state.plannedRouteSelectionStopId = "";
  state.plannedRouteSearching = false;
  state.plannedRouteOutlinePoints = [];
  state.plannedRouteOutlinePreview = null;
  state.plannedRoutePlaceResults = [];
  state.plannedRoutePlaceSearching = false;
  if (nextStatus === "approved") {
    const savedRoute = state.plannedRoutes.find((route) => route.id === draft.id);
    const confirmed = confirmPlannedRoute(savedRoute, { name: draft.name, memo: draft.memo });
    if (!confirmed) {
      writePlannedRouteForm(savedRoute);
      state.plannedRouteFeedback = {
        message: "후보노선은 저장했고 노선 확정은 취소했습니다. 검토를 계속할 수 있습니다.",
        type: "warning",
      };
      renderPlannedRoutes();
      finishPlannedRouteSave(persist());
      return;
    }
    finishPlannedRouteSave(persist(), { confirmed: true, pointCount: state.points.length });
    return;
  }
  state.plannedRouteFeedback = {
    message: "후보노선을 저장했습니다. 노선명·검토 상태·검토사항은 위 입력란에서 계속 변경할 수 있습니다.",
    type: "success",
  };
  writePlannedRouteForm(getActivePlannedRoute());
  renderPlannedRoutes();
  finishPlannedRouteSave(persist());
}

function confirmPlannedRoute(route, updates = {}) {
  if (!route || route.points.length < 2) return false;
  const routeName = String(updates.name || route.name || "후보노선").trim();
  const projectName = String(state.projectName || els.projectName?.value || "프로젝트").trim();
  const existingPointCount = state.points.length;
  const replacementNotice = existingPointCount
    ? `\n현재 위치점 ${existingPointCount}개는 새 기준동선으로 교체되며, 기존 동선은 저장 기록으로 보관됩니다.\n`
    : "\n";
  const accepted = window.confirm(
    `노선을 확정할까요?\n\n프로젝트명: ${projectName}\n사전노선명: ${routeName}\n전환 위치점: ${route.points.length}개\n${replacementNotice}\n확정하면 더 이상 사전노선 검토와 후보노선 수정을 진행할 수 없습니다.\n후보노선은 프로젝트 위치점으로 전환되며, 이후에는 '위치 편집'에서 수정합니다.`,
  );
  if (!accepted) {
    setStatus("노선 확정을 취소했습니다. 후보노선 검토를 계속할 수 있습니다.", "warning");
    return false;
  }

  preserveCurrentRecordBeforeRouteConfirmation(projectName);
  const confirmedAt = Date.now();
  const confirmedPoints = createConfirmedRoutePoints(route, confirmedAt);
  route.name = routeName;
  route.memo = String(updates.memo ?? route.memo ?? "").trim();
  route.status = "approved";
  route.confirmedAt = new Date(confirmedAt).toISOString();
  route.confirmedProjectName = projectName;
  route.confirmedPointCount = confirmedPoints.length;
  route.visible = false;
  route.updatedAt = confirmedAt;

  state.points = confirmedPoints;
  state.selectedPosition = confirmedPoints.at(-1) || state.initialPosition || null;
  state.activeStartedAt = null;
  state.continuingSessionId = null;
  state.liveSyncSessionId = null;
  state.lastSyncedPointCount = confirmedPoints.length;
  state.undoRouteEdit = null;
  state.selectedPointIndex = null;
  state.lastRoutePointIndex = null;
  state.segmentStartIndex = null;
  state.segmentEndIndex = null;

  const session = createConfirmedRouteSession(route, projectName, confirmedAt);
  route.confirmationSessionId = session.id;
  state.sessions = [session, ...state.sessions.filter((item) => item.id !== session.id)].slice(0, 50);
  state.primarySessionId = session.id;
  state.plannedRouteFeedback = {
    message: `노선을 확정해 위치점 ${confirmedPoints.length}개로 전환했습니다. 이후 수정은 위치 편집에서 진행하세요.`,
    type: "success",
  };
  writePlannedRouteForm(route);
  render();
  fitPlannedRoute(confirmedPoints);
  return true;
}

function preserveCurrentRecordBeforeRouteConfirmation(projectName) {
  if (!state.points.length && !state.photos.length) return;
  const signature = getCurrentRecordSignature();
  if (state.sessions.some((session) => session.signature === signature)) return;
  const savedAt = Date.now();
  const startedAt = state.points[0]?.timestamp || savedAt;
  state.sessions.unshift({
    id: crypto.randomUUID(),
    name: `${projectName} · 노선 확정 전 기록`,
    memo: "후보노선을 기준동선으로 전환하기 전에 자동 보관한 기록",
    reason: "before-planned-route-confirmation",
    startedAt,
    endedAt: state.points.at(-1)?.timestamp || savedAt,
    updatedAt: savedAt,
    distanceMeters: getTotalDistance(),
    points: structuredClone(state.points),
    photos: structuredClone(state.photos),
    signature,
    recordingActive: false,
  });
}

function createConfirmedRoutePoints(route, confirmedAt) {
  const pointCount = route.points.length;
  const duration = Math.max(0, Number(route.routeSummary?.duration) || 0);
  const fallbackDuration = Math.max(0, pointCount - 1) * 1000;
  const timelineDuration = duration || fallbackDuration;
  const startedAt = confirmedAt - timelineDuration;
  const interval = pointCount > 1 ? timelineDuration / (pointCount - 1) : 0;
  return route.points.map((point, index) => ({
    lat: Number(point.lat),
    lng: Number(point.lng),
    accuracy: 0,
    timestamp: Math.round(startedAt + interval * index),
    source: "planned-route",
    plannedRouteId: route.id,
  }));
}

function createConfirmedRouteSession(route, projectName, confirmedAt) {
  const distanceMeters = route.routeSummary?.distance ?? state.points.reduce((total, point, index, points) =>
    index ? total + getDistanceMeters(points[index - 1], point) : total, 0);
  const session = {
    id: crypto.randomUUID(),
    name: `${route.name} · 확정노선`,
    memo: `프로젝트: ${projectName}${route.memo ? ` · ${route.memo}` : ""}`,
    reason: "planned-route-confirmed",
    plannedRouteId: route.id,
    routeConfirmation: true,
    startedAt: state.points[0]?.timestamp || confirmedAt,
    endedAt: state.points.at(-1)?.timestamp || confirmedAt,
    updatedAt: confirmedAt,
    distanceMeters,
    points: structuredClone(state.points),
    photos: structuredClone(state.photos),
    recordingActive: false,
  };
  session.signature = getRecordSignature(session.points, session.photos);
  return session;
}

function finishPlannedRouteSave(localSaved, options = {}) {
  const confirmed = Boolean(options.confirmed);
  const pointCount = Math.max(0, Number(options.pointCount) || 0);
  setStatus(
    localSaved
      ? confirmed
        ? `확정노선을 위치점 ${pointCount}개로 전환해 기기에 저장했습니다. 서버 동기화를 시작합니다.`
        : "후보노선을 기기에 저장했습니다. 서버 동기화를 시작합니다."
      : "후보노선 화면은 반영했지만 기기 저장공간이 부족합니다. 서버 동기화를 확인해 주세요.",
    localSaved ? "active" : "warning",
  );
  window.setTimeout(() => {
    try {
      saveProjectRecoveryBackup("planned-route");
      void syncProjectState(confirmed ? "planned-route-confirmed" : "planned-route").then((serverSaved) => {
        setStatus(
          serverSaved
            ? confirmed
              ? `노선을 확정했습니다. 위치점 ${pointCount}개를 위치 편집에서 수정할 수 있습니다.`
              : "후보노선을 프로젝트에 저장했습니다. PC와 모바일에서 함께 확인할 수 있습니다."
            : "후보노선을 이 기기에 보관했습니다. 서버 연결 후 다시 동기화해 주세요.",
          serverSaved ? "success" : "warning",
        );
      });
    } catch (error) {
      console.warn("Planned route background sync failed", error);
      setStatus("후보노선을 이 기기에 보관했습니다. 서버 연결 후 다시 동기화해 주세요.", "warning");
    }
  }, 50);
}

function updatePlannedRouteStop(stopId, changes) {
  const draft = state.plannedRouteDraft;
  if (!draft) return;
  draft.stops = orderPlannedRouteStops(draft.stops.map((stop) =>
    stop.id === stopId ? { ...stop, ...changes } : stop));
  if (Object.prototype.hasOwnProperty.call(changes, "lat") || Object.prototype.hasOwnProperty.call(changes, "lng")) {
    draft.points = [];
    draft.routeSummary = { distance: null, duration: null, tollFare: null, provider: "", searchedAt: null };
  }
  draft.updatedAt = Date.now();
  renderPlannedRoutes();
}

function movePlannedRouteWaypoint(stopId, direction) {
  const draft = state.plannedRouteDraft;
  if (!draft) return;
  const waypoints = draft.stops.filter((stop) => stop.kind === "waypoint");
  const currentIndex = waypoints.findIndex((stop) => stop.id === stopId);
  const nextIndex = currentIndex + direction;
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= waypoints.length) return;
  [waypoints[currentIndex], waypoints[nextIndex]] = [waypoints[nextIndex], waypoints[currentIndex]];
  const start = draft.stops.find((stop) => stop.kind === "start");
  const goal = draft.stops.find((stop) => stop.kind === "goal");
  draft.stops = [start, ...waypoints, goal].filter(Boolean);
  draft.points = [];
  draft.routeSummary = { distance: null, duration: null, tollFare: null, provider: "", searchedAt: null };
  draft.updatedAt = Date.now();
  renderPlannedRoutes();
  setStatus("경유지 순서를 변경했습니다. 후보노선을 다시 검색해 주세요.", "active");
}

function deletePlannedRouteStop(stopId) {
  const draft = state.plannedRouteDraft;
  if (!draft) return;
  draft.stops = draft.stops.filter((stop) => stop.id !== stopId);
  draft.points = [];
  draft.routeSummary = { distance: null, duration: null, tollFare: null, provider: "", searchedAt: null };
  draft.updatedAt = Date.now();
  renderPlannedRoutes();
}

function renderPlannedRouteStopList(draft) {
  if (!els.plannedRouteStopList) return;
  els.plannedRouteStopList.replaceChildren();
  const stops = orderPlannedRouteStops(draft?.stops || []);
  if (stops.length === 0) {
    const empty = document.createElement("p");
    empty.className = "status-text";
    empty.textContent = "지도에서 출발지와 도착지를 선택하세요. 경유지는 필요할 때 추가할 수 있습니다.";
    els.plannedRouteStopList.append(empty);
    return;
  }
  const waypoints = stops.filter((stop) => stop.kind === "waypoint");
  stops.forEach((stop) => {
    const row = document.createElement("div");
    row.className = `planned-route-stop is-${stop.kind}`;
    const badge = document.createElement("span");
    badge.className = "planned-route-stop__badge";
    const waypointIndex = waypoints.findIndex((item) => item.id === stop.id);
    badge.textContent = stop.kind === "start" ? "S" : stop.kind === "goal" ? "E" : String(waypointIndex + 1);
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 120;
    input.value = stop.label || (stop.kind === "start" ? "출발지" : stop.kind === "goal" ? "도착지" : `경유지 ${waypointIndex + 1}`);
    input.setAttribute("aria-label", `${badge.textContent} 위치 이름`);
    input.addEventListener("change", () => updatePlannedRouteStop(stop.id, { label: input.value.trim() }));
    const coordinate = document.createElement("small");
    coordinate.textContent = `${stop.lat.toFixed(5)}, ${stop.lng.toFixed(5)}`;
    const actions = document.createElement("div");
    actions.className = "planned-route-stop__actions";
    if (stop.kind === "waypoint") {
      [["↑", -1], ["↓", 1]].forEach(([label, direction]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = label;
        button.title = direction < 0 ? "앞 경유지로 이동" : "뒤 경유지로 이동";
        button.disabled = (direction < 0 && waypointIndex === 0) || (direction > 0 && waypointIndex === waypoints.length - 1);
        button.addEventListener("click", () => movePlannedRouteWaypoint(stop.id, direction));
        actions.append(button);
      });
    }
    const selectButton = document.createElement("button");
    selectButton.type = "button";
    selectButton.textContent = "재지정";
    selectButton.addEventListener("click", () => setPlannedRouteSelection(stop.kind, stop.id));
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "삭제";
    deleteButton.addEventListener("click", () => deletePlannedRouteStop(stop.id));
    actions.append(selectButton, deleteButton);
    const body = document.createElement("div");
    body.className = "planned-route-stop__body";
    body.append(input, coordinate);
    row.append(badge, body, actions);
    els.plannedRouteStopList.append(row);
  });
}

function setActivePlannedRoute(routeId) {
  state.activePlannedRouteId = routeId;
  persist();
  renderPlannedRoutes();
  void syncProjectState("planned-route-active");
}

function togglePlannedRouteVisibility(routeId) {
  const route = state.plannedRoutes.find((item) => item.id === routeId);
  if (!route) return;
  route.visible = route.visible === false;
  route.updatedAt = Date.now();
  persist();
  renderPlannedRoutes();
  void syncProjectState("planned-route-visibility");
}

function deletePlannedRoute(routeId) {
  const route = state.plannedRoutes.find((item) => item.id === routeId);
  if (!route) {
    return;
  }
  const routeConfirmed = isPlannedRouteConfirmed(route);
  const pointCount = route.points?.length || 0;
  const waypointCount = route.stops?.filter((stop) => stop.kind === "waypoint").length || 0;
  const activeWarning = state.activePlannedRouteId === routeId
    ? "\n\n현재 기준 노선입니다. 삭제하면 남아 있는 다른 후보노선이 새 기준으로 지정됩니다."
    : "";
  const confirmedWarning = routeConfirmed
    ? `\n\n이 노선은 프로젝트 위치점 ${route.confirmedPointCount || pointCount}개로 이미 확정되었습니다. 후보노선 카드와 검토 정보만 삭제되며, 프로젝트 위치점과 저장된 확정 기록은 보존됩니다.`
    : "";
  const accepted = window.confirm(
    `'${route.name}' 후보노선을 삭제하시겠습니까?\n\n위치점: ${pointCount}개\n경유지: ${waypointCount}개${confirmedWarning}${activeWarning}\n\n후보노선 카드와 검토 정보가 서버에서도 삭제되며 복구할 수 없습니다. 다음 단계에서 '삭제'를 입력해야 최종 삭제됩니다.`,
  );
  if (!accepted) return;
  const verification = window.prompt(`최종 확인\n\n'${route.name}'을 삭제하려면 아래 입력란에 삭제를 입력하세요.`);
  if (verification?.trim() !== "삭제") {
    setStatus("후보노선 삭제를 취소했습니다. 자료는 그대로 유지됩니다.", "warning");
    return;
  }
  state.plannedRoutes = state.plannedRoutes.filter((item) => item.id !== routeId);
  if (state.activePlannedRouteId === routeId) {
    state.activePlannedRouteId = state.plannedRoutes[0]?.id || null;
  }
  persist();
  renderPlannedRoutes();
  void syncProjectState("delete-planned-route");
  setStatus(
    routeConfirmed
      ? `'${route.name}' 후보노선 카드를 삭제했습니다. 프로젝트 위치점과 확정 기록은 보존했습니다.`
      : `'${route.name}' 후보노선을 삭제했습니다.`,
    "success",
  );
}

function getRestrictionReviewRoute() {
  return state.plannedRoutes.find((route) => route.id === state.restrictionReviewRouteId)
    || state.plannedRoutes.find((route) => route.id === state.activePlannedRouteId)
    || state.plannedRoutes[0]
    || null;
}

function ensureRestrictionReview(route) {
  if (!route) return null;
  route.restrictionReview = normalizeRestrictionReview(route.restrictionReview);
  return route.restrictionReview;
}

function selectRestrictionReviewRoute(routeId = "") {
  const route = state.plannedRoutes.find((item) => item.id === routeId)
    || state.plannedRoutes.find((item) => item.id === state.activePlannedRouteId)
    || state.plannedRoutes[0]
    || null;
  state.restrictionReviewRouteId = route?.id || "";
  if (els.restrictionRouteSelect) els.restrictionRouteSelect.dataset.loadedRouteId = "";
  renderPlannedRoutes();
}

function loadRestrictionReviewForm(route) {
  const review = ensureRestrictionReview(route);
  const spec = route?.vehicleSpec || {};
  els.restrictionVehicleLength.value = spec.length || "";
  els.restrictionVehicleWidth.value = spec.width || "";
  els.restrictionVehicleHeight.value = spec.height || "";
  els.restrictionVehicleTotalWeight.value = spec.totalWeight || "";
  els.restrictionVehicleAxleWeight.value = spec.axleWeight || "";
  if (els.restrictionCorridor) els.restrictionCorridor.value = review?.corridorMeters || 300;
  if (els.restrictionWorkflowStatus) els.restrictionWorkflowStatus.value = review?.workflowStatus || "data";
  if (els.restrictionReviewMemo) els.restrictionReviewMemo.value = review?.memo || "";
  if (els.restrictionRouteSelect) els.restrictionRouteSelect.dataset.loadedRouteId = route?.id || "";
}

async function importRestrictionData(event) {
  const files = Array.from(event.target.files || []);
  event.target.value = "";
  if (!files.length) return;
  const route = getRestrictionReviewRoute();
  if (!route) {
    setRestrictionReviewStatus("먼저 간편 노선 발굴에서 후보노선을 저장해 주세요.", "warning");
    return;
  }
  try {
    const importedRows = [];
    for (const file of files) {
      const text = await readRestrictionFileText(file);
      const extension = file.name.split(".").pop()?.toLowerCase();
      const payload = extension === "json" || String(text).trimStart().startsWith("{") || String(text).trimStart().startsWith("[")
        ? JSON.parse(String(text).replace(/^\uFEFF/, ""))
        : parseRestrictionCsv(text);
      extractRestrictionRows(payload).forEach((row) => importedRows.push({ row, fileName: file.name }));
    }
    if (!importedRows.length) throw new Error("no_rows");
    const normalizedRows = importedRows.map(({ row, fileName }, index) => normalizeImportedRestrictionFacility(row, index, fileName));
    const validFacilities = normalizedRows.map((entry) => entry.facility).filter(Boolean);
    const unresolvedFacilities = normalizedRows.map((entry) => entry.unresolved).filter(Boolean);
    const excludedRows = unresolvedFacilities.length;
    if (!validFacilities.length && !unresolvedFacilities.length) throw new Error("no_valid_facilities");
    const review = ensureRestrictionReview(route);
    const importMode = els.restrictionImportMode?.value === "replace" ? "replace" : "merge";
    const merged = mergeRestrictionFacilities(importMode === "replace" ? [] : review.facilities, validFacilities);
    review.unresolvedFacilities = mergeUnresolvedRestrictionFacilities(
      importMode === "replace" ? [] : review.unresolvedFacilities,
      unresolvedFacilities,
      validFacilities,
    );
    review.dataName = files.map((file) => file.name).join(" + ").slice(0, 180);
    review.facilities = merged.facilities.slice(0, 10000);
    review.importStats = normalizeRestrictionImportStats({
      totalRows: normalizedRows.length,
      importedRows: validFacilities.length,
      duplicateRows: merged.duplicateRows,
      excludedRows,
      missingLimitRows: [...validFacilities, ...unresolvedFacilities].filter((facility) => !hasRestrictionLimit(facility)).length,
      importedAt: new Date().toISOString(),
    });
    review.results = [];
    review.reviewedAt = null;
    route.updatedAt = Date.now();
    persist();
    renderPlannedRoutes();
    const messages = [
      `${files.length}개 파일 · 전체 ${normalizedRows.length}행`,
      `좌표 유효 ${validFacilities.length}건`,
      merged.duplicateRows ? `중복 ${merged.duplicateRows}건 정리` : "",
      excludedRows ? `좌표 없음 ${excludedRows}건 별도 보관` : "",
    ].filter(Boolean);
    setRestrictionReviewStatus(messages.join(" · "), excludedRows ? "warning" : "success");
    void syncProjectState("restriction-data-import");
  } catch (error) {
    console.warn("Restriction data import failed", error);
    setRestrictionReviewStatus(
      error?.message === "no_valid_facilities"
        ? "시설로 변환할 수 있는 행을 찾지 못했습니다. 원본 열 이름과 값을 확인해 주세요."
        : "자료를 읽지 못했습니다. CSV·JSON 형식과 첫 행의 열 이름을 확인해 주세요.",
      "error",
    );
  }
}

async function readRestrictionFileText(file) {
  const buffer = await file.arrayBuffer();
  const utf8 = new TextDecoder("utf-8").decode(buffer);
  if (!utf8.includes("�")) return utf8;
  try {
    const eucKr = new TextDecoder("euc-kr").decode(buffer);
    const utf8Errors = (utf8.match(/�/g) || []).length;
    const eucKrErrors = (eucKr.match(/�/g) || []).length;
    return eucKrErrors < utf8Errors ? eucKr : utf8;
  } catch {
    return utf8;
  }
}

function extractRestrictionRows(payload) {
  if (Array.isArray(payload)) return payload;
  const candidates = [
    payload?.facilities,
    payload?.data,
    payload?.items,
    payload?.items?.item,
    payload?.response?.body?.items,
    payload?.response?.body?.items?.item,
    payload?.response?.body?.data,
  ];
  const found = candidates.find(Array.isArray);
  if (found) return found;
  const single = candidates.find((value) => value && typeof value === "object");
  return single ? [single] : [];
}

function parseRestrictionCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  const source = String(text || "").replace(/^\uFEFF/, "");
  const delimiter = detectRestrictionDelimiter(source);
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === '"') {
      if (quoted && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === delimiter && !quoted) {
      row.push(field.trim());
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && source[index + 1] === "\n") index += 1;
      row.push(field.trim());
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  row.push(field.trim());
  if (row.some((value) => value !== "")) rows.push(row);
  if (rows.length < 2) return [];
  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

function detectRestrictionDelimiter(text) {
  const header = String(text || "").split(/\r?\n/, 1)[0] || "";
  const candidates = [",", "\t", ";"];
  return candidates.sort((left, right) => header.split(right).length - header.split(left).length)[0];
}

function normalizeRestrictionColumnName(value) {
  return String(value || "").trim().toLowerCase().replace(/[\s_()[\]{}./\\-]+/g, "");
}

function getRestrictionValue(row, aliases) {
  const entries = Object.entries(row || {});
  const normalizedEntries = new Map(entries.map(([key, value]) => [normalizeRestrictionColumnName(key), value]));
  for (const alias of aliases) {
    if (Object.prototype.hasOwnProperty.call(row || {}, alias) && String(row[alias] ?? "").trim() !== "") return row[alias];
    const value = normalizedEntries.get(normalizeRestrictionColumnName(alias));
    if (String(value ?? "").trim() !== "") return value;
  }
  return "";
}

function normalizeImportedRestrictionFacility(row, index, fileName = "") {
  const rawId = getRestrictionValue(row, ["id", "ID", "관리번호", "시설ID", "시설물관리번호", "지형지물번호", "도로구간번호"]);
  const type = getRestrictionValue(row, ["type", "시설유형", "시설물종류", "시설물구분명", "시설물종별", "종류", "구분"]) || "기타";
  const address = getRestrictionValue(row, ["address", "주소", "지번주소", "도로명주소", "시설물위치", "설치지점", "위치"]);
  const district = getRestrictionValue(row, ["행정읍면동", "시군명", "읍면동", "지역"]);
  const name = getRestrictionValue(row, ["name", "시설명", "시설물명", "교량명", "터널명", "도로명", "주변시설"])
    || [type, district || address].filter(Boolean).join(" · ")
    || `제한시설 ${index + 1}`;
  let lat = parseRestrictionNumber(getRestrictionValue(row, ["lat", "latitude", "위도", "Y", "y", "수량_위도", "Y좌표", "좌표Y", "좌표정보(Y)"]));
  let lng = parseRestrictionNumber(getRestrictionValue(row, ["lng", "lon", "longitude", "경도", "X", "x", "수량_경도", "X좌표", "좌표X", "좌표정보(X)"]));
  if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) > 90 && Math.abs(lng) <= 90) [lat, lng] = [lng, lat];
  const normalized = {
    id: rawId || createRestrictionFacilityId([name, address, lat, lng]),
    name,
    type,
    lat,
    lng,
    maxLength: parseRestrictionNumber(getRestrictionValue(row, ["maxLength", "제한길이", "허용길이", "길이제한"])),
    maxWidth: parseRestrictionNumber(getRestrictionValue(row, ["maxWidth", "제한너비", "허용너비", "폭제한", "가로(미터)", "가로", "폭원", "유효폭"])),
    maxHeight: parseRestrictionNumber(getRestrictionValue(row, ["maxHeight", "제한높이", "허용높이", "높이제한", "통과높이(미터)", "통행제한높이(미터)", "통과높이", "통행제한높이"])),
    maxTotalWeight: parseRestrictionNumber(getRestrictionValue(row, ["maxTotalWeight", "제한총중량", "허용총중량", "총중량제한", "제한중량", "운행제한하중"])),
    maxAxleWeight: parseRestrictionNumber(getRestrictionValue(row, ["maxAxleWeight", "제한축중", "허용축중", "축중제한"])),
    permitRequired: parseRestrictionBoolean(getRestrictionValue(row, ["permitRequired", "허가필요", "허가여부"])),
    source: getRestrictionValue(row, ["source", "출처", "자료출처", "관리기관", "제공기관"]) || fileName,
    address,
    note: getRestrictionValue(row, ["note", "메모", "비고"]),
    updatedAt: getRestrictionValue(row, ["updatedAt", "기준일", "기준일자", "데이터기준일", "갱신일", "수정일"]),
  };
  const facility = normalizeRestrictionFacility(normalized, index);
  return {
    facility,
    unresolved: facility ? null : normalizeUnresolvedRestrictionFacility(normalized, index),
  };
}

function parseRestrictionNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const match = String(value ?? "").replaceAll(",", "").match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function createRestrictionFacilityId(parts) {
  const source = parts.map((value) => String(value ?? "").trim().toLowerCase()).join("|");
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `restriction-${(hash >>> 0).toString(16)}`;
}

function getRestrictionFacilityKey(facility) {
  const name = String(facility?.name || "").trim().toLowerCase().replace(/\s+/g, "");
  const lat = Number(facility?.lat).toFixed(5);
  const lng = Number(facility?.lng).toFixed(5);
  return `${name}|${lat}|${lng}`;
}

function mergeRestrictionFacilities(existing, incoming) {
  const facilities = (Array.isArray(existing) ? existing : []).map((facility) => ({ ...facility }));
  const indexes = new Map(facilities.map((facility, index) => [getRestrictionFacilityKey(facility), index]));
  let duplicateRows = 0;
  incoming.forEach((facility) => {
    const key = getRestrictionFacilityKey(facility);
    const existingIndex = indexes.get(key);
    if (existingIndex == null) {
      indexes.set(key, facilities.length);
      facilities.push(facility);
      return;
    }
    duplicateRows += 1;
    const previous = facilities[existingIndex];
    facilities[existingIndex] = Object.fromEntries(Object.entries({ ...previous, ...facility }).map(([field, value]) => [
      field,
      value === "" || value == null ? previous[field] ?? value : value,
    ]));
  });
  return { facilities, duplicateRows };
}

function getUnresolvedRestrictionKey(facility) {
  const name = String(facility?.name || "").trim().toLowerCase().replace(/\s+/g, "");
  const address = String(facility?.address || "").trim().toLowerCase().replace(/\s+/g, "");
  return `${name}|${address}`;
}

function mergeUnresolvedRestrictionFacilities(existing, incoming, resolvedIncoming = []) {
  const resolvedKeys = new Set(resolvedIncoming.map(getUnresolvedRestrictionKey));
  const merged = new Map();
  [...(existing || []), ...(incoming || [])].forEach((facility) => {
    const key = getUnresolvedRestrictionKey(facility);
    if (!resolvedKeys.has(key)) merged.set(key, facility);
  });
  return [...merged.values()].slice(0, 10000);
}

function hasRestrictionLimit(facility) {
  return [facility.maxLength, facility.maxWidth, facility.maxHeight, facility.maxTotalWeight, facility.maxAxleWeight]
    .some((value) => value != null);
}

function parseRestrictionBoolean(value) {
  return ["true", "1", "yes", "y", "필요", "허가필요", "대상"].includes(String(value || "").trim().toLowerCase());
}

function downloadRestrictionTemplate() {
  const rows = [
    ["시설ID", "시설명", "시설유형", "위도", "경도", "주소", "제한길이", "제한너비", "제한높이", "제한총중량", "제한축중", "허가필요", "출처", "기준일", "메모"],
    [
      "BR-001", "예시교량", "교량", formatCsvFixedNumber(35.95, 6), formatCsvFixedNumber(126.72, 6),
      "전북특별자치도 예시주소", "", formatCsvFixedNumber(4), formatCsvFixedNumber(5),
      formatCsvFixedNumber(100), formatCsvFixedNumber(10), "필요", "기관자료", "2026-10-15", "현장 재확인",
    ],
  ];
  downloadTextFile(`제한시설-자료양식-${new Date().toISOString().slice(0, 10)}.csv`, `\uFEFF${rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n")}`, "text/csv;charset=utf-8");
}

function exportNormalizedRestrictionCsv() {
  const route = getRestrictionReviewRoute();
  const review = route ? ensureRestrictionReview(route) : null;
  if (!review || (!review.facilities.length && !review.unresolvedFacilities.length)) {
    setRestrictionReviewStatus("정리해서 저장할 제한시설 자료가 없습니다.", "warning");
    return;
  }
  const rows = [["시설ID", "시설명", "시설유형", "위도", "경도", "주소", "제한길이", "제한너비", "제한높이", "제한총중량", "제한축중", "허가필요", "출처", "기준일", "메모"]];
  [...review.facilities, ...(review.unresolvedFacilities || [])].forEach((facility) => rows.push([
    facility.id, facility.name, facility.type, formatCsvFixedNumber(facility.lat, 6), formatCsvFixedNumber(facility.lng, 6), facility.address,
    formatCsvFixedNumber(facility.maxLength), formatCsvFixedNumber(facility.maxWidth), formatCsvFixedNumber(facility.maxHeight),
    formatCsvFixedNumber(facility.maxTotalWeight), formatCsvFixedNumber(facility.maxAxleWeight),
    facility.permitRequired ? "필요" : "", facility.source, facility.updatedAt, facility.note,
  ]));
  downloadTextFile(`제한시설-정리자료-${new Date().toISOString().slice(0, 10)}.csv`, `\uFEFF${rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n")}`, "text/csv;charset=utf-8");
}

function runRestrictionReview() {
  const route = getRestrictionReviewRoute();
  if (!route?.points?.length || route.points.length < 2) {
    setRestrictionReviewStatus("검토할 후보노선을 간편 또는 심층 노선 발굴에서 먼저 저장해 주세요.", "warning");
    return;
  }
  const review = ensureRestrictionReview(route);
  if (!review.facilities.length) {
    setRestrictionReviewStatus(
      review.unresolvedFacilities.length
        ? `좌표를 보완해야 하는 시설이 ${review.unresolvedFacilities.length}건 있습니다. 정리된 자료 CSV에서 위도·경도를 입력한 뒤 다시 불러와 주세요.`
        : "제한시설 CSV 또는 JSON 자료를 먼저 불러와 주세요.",
      "warning",
    );
    return;
  }
  const vehicleSpec = readPlannedRouteVehicleSpec();
  if (!Object.values(vehicleSpec).some((value) => value != null)) {
    setRestrictionReviewStatus("비교할 차량제원을 한 항목 이상 입력해 주세요.", "warning");
    return;
  }
  route.vehicleSpec = vehicleSpec;
  review.corridorMeters = Math.min(5000, Math.max(10, Number(els.restrictionCorridor?.value) || 300));
  review.workflowStatus = els.restrictionWorkflowStatus?.value || "screening";
  review.memo = els.restrictionReviewMemo?.value.trim() || "";
  review.results = review.facilities
    .map((facility) => evaluateRestrictionFacility(facility, route.points, vehicleSpec, review.corridorMeters))
    .filter(Boolean)
    .sort((left, right) => restrictionStatusRank(left.status) - restrictionStatusRank(right.status) || left.distanceMeters - right.distanceMeters);
  review.reviewedAt = new Date().toISOString();
  route.updatedAt = Date.now();
  persist();
  renderPlannedRoutes();
  const riskCount = review.results.filter((result) => result.status === "risk").length;
  const permitCount = review.results.filter((result) => result.status === "permit").length;
  setRestrictionReviewStatus(
    `조건검토 완료 · 주변 ${review.results.length}건 · 제한 초과 ${riskCount}건 · 허가 확인 ${permitCount}건`,
    riskCount ? "error" : permitCount ? "warning" : "success",
  );
  void syncProjectState("restriction-review");
}

function saveRestrictionReviewInputs(options = {}) {
  const route = getRestrictionReviewRoute();
  if (!route || state.shareView) return;
  const review = ensureRestrictionReview(route);
  route.vehicleSpec = readPlannedRouteVehicleSpec();
  review.corridorMeters = Math.min(5000, Math.max(10, Number(els.restrictionCorridor?.value) || 300));
  review.workflowStatus = els.restrictionWorkflowStatus?.value || "data";
  review.memo = els.restrictionReviewMemo?.value.trim() || "";
  if (options.invalidateResults && review.reviewedAt) {
    review.results = [];
    review.reviewedAt = null;
  }
  route.updatedAt = Date.now();
  persist();
  renderPlannedRoutes();
  setRestrictionReviewStatus(
    options.invalidateResults ? "조건이 변경되어 기존 판정을 지웠습니다. 조건검토를 다시 실행해 주세요." : "검토 진행단계와 메모를 저장했습니다.",
    options.invalidateResults ? "warning" : "success",
  );
  void syncProjectState(options.invalidateResults ? "restriction-review-input" : "restriction-review-meta");
}

function evaluateRestrictionFacility(facility, routePoints, vehicleSpec, corridorMeters) {
  const distanceMeters = distanceToRouteMeters(facility, routePoints);
  if (!Number.isFinite(distanceMeters) || distanceMeters > corridorMeters) return null;
  const checks = [
    ["길이", vehicleSpec.length, facility.maxLength, "m"],
    ["너비", vehicleSpec.width, facility.maxWidth, "m"],
    ["높이", vehicleSpec.height, facility.maxHeight, "m"],
    ["총중량", vehicleSpec.totalWeight, facility.maxTotalWeight, "t"],
    ["축중", vehicleSpec.axleWeight, facility.maxAxleWeight, "t"],
  ];
  const issues = checks
    .filter(([, vehicleValue, limitValue]) => vehicleValue != null && limitValue != null && vehicleValue > limitValue)
    .map(([label, vehicleValue, limitValue, unit]) => `${label} ${vehicleValue}${unit} > 제한 ${limitValue}${unit}`);
  const hasComparableLimit = checks.some(([, vehicleValue, limitValue]) => vehicleValue != null && limitValue != null);
  const status = issues.length ? "risk" : facility.permitRequired ? "permit" : hasComparableLimit ? "pass" : "unknown";
  return { facilityId: facility.id, distanceMeters: Math.round(distanceMeters), status, issues };
}

function distanceToRouteMeters(point, routePoints) {
  let minimum = Number.POSITIVE_INFINITY;
  const metersPerLng = 111320 * Math.cos(toRad(point.lat));
  const metersPerLat = 110540;
  for (let index = 1; index < routePoints.length; index += 1) {
    const start = routePoints[index - 1];
    const end = routePoints[index];
    const ax = (start.lng - point.lng) * metersPerLng;
    const ay = (start.lat - point.lat) * metersPerLat;
    const bx = (end.lng - point.lng) * metersPerLng;
    const by = (end.lat - point.lat) * metersPerLat;
    const dx = bx - ax;
    const dy = by - ay;
    const lengthSquared = dx * dx + dy * dy;
    const ratio = lengthSquared ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lengthSquared)) : 0;
    minimum = Math.min(minimum, Math.hypot(ax + ratio * dx, ay + ratio * dy));
  }
  return minimum;
}

function restrictionStatusRank(status) {
  return { risk: 0, permit: 1, unknown: 2, pass: 3 }[status] ?? 4;
}

function clearRestrictionReviewData() {
  const route = getRestrictionReviewRoute();
  if (!route) return;
  const review = ensureRestrictionReview(route);
  if ((review.facilities.length || review.unresolvedFacilities.length || review.results.length || review.memo) && !window.confirm("불러온 제한시설 자료와 검토결과를 초기화할까요?")) return;
  route.restrictionReview = normalizeRestrictionReview(null);
  route.updatedAt = Date.now();
  if (els.restrictionRouteSelect) els.restrictionRouteSelect.dataset.loadedRouteId = "";
  persist();
  renderPlannedRoutes();
  setRestrictionReviewStatus("불러온 제한자료와 검토결과를 초기화했습니다.", "warning");
  void syncProjectState("restriction-review-clear");
}

function exportRestrictionReviewCsv() {
  const route = getRestrictionReviewRoute();
  const review = route ? ensureRestrictionReview(route) : null;
  if (!route || !review?.results?.length) {
    setRestrictionReviewStatus("먼저 조건검토를 실행해 결과를 만들어 주세요.", "warning");
    return;
  }
  const facilityMap = new Map(review.facilities.map((facility) => [facility.id, facility]));
  const spec = route.vehicleSpec || {};
  const stopSummary = orderPlannedRouteStops(route.stops || [])
    .map((stop) => `${stop.label || (stop.kind === "start" ? "출발지" : stop.kind === "goal" ? "도착지" : "경유지")}(${Number(stop.lat).toFixed(6)},${Number(stop.lng).toFixed(6)})`)
    .join(" → ");
  const rows = [[
    "후보노선", "출발·경유·도착", "노선거리(km)", "예상시간(분)", "검토일시", "차량길이(m)", "차량너비(m)", "차량높이(m)", "차량총중량(t)", "차량축중(t)",
    "시설명", "시설유형", "노선거리(m)", "판정", "초과·검토사항", "허가필요", "위도", "경도", "주소", "출처", "기준일", "메모",
  ]];
  review.results.forEach((result) => {
    const facility = facilityMap.get(result.facilityId);
    if (!facility) return;
    rows.push([
      route.name, stopSummary, formatCsvFixedNumber(route.routeSummary?.distance != null ? route.routeSummary.distance / 1000 : null),
      formatCsvFixedNumber(route.routeSummary?.duration != null ? route.routeSummary.duration / 60000 : null),
      review.reviewedAt || "", formatCsvFixedNumber(spec.length), formatCsvFixedNumber(spec.width), formatCsvFixedNumber(spec.height),
      formatCsvFixedNumber(spec.totalWeight), formatCsvFixedNumber(spec.axleWeight),
      facility.name, facility.type, formatCsvFixedNumber(result.distanceMeters),
      getRestrictionStatusLabel(result.status), result.issues.join(" / "), facility.permitRequired ? "필요" : "",
      formatCsvFixedNumber(facility.lat, 6), formatCsvFixedNumber(facility.lng, 6),
      facility.address, facility.source, facility.updatedAt, facility.note,
    ]);
  });
  downloadTextFile(`제한차량-조건검토-${route.name}-${new Date().toISOString().slice(0, 10)}.csv`, `\uFEFF${rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n")}`, "text/csv;charset=utf-8");
}

function formatCsvFixedNumber(value, digits = 2) {
  if (value == null || String(value).trim() === "") return "";
  const number = Number(value);
  if (!Number.isFinite(number)) return "";
  return `="${number.toFixed(digits)}"`;
}

function escapeCsvCell(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function downloadTextFile(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name.replace(/[\\/:*?"<>|]/g, "-");
  link.click();
  URL.revokeObjectURL(url);
}

function getRestrictionStatusLabel(status) {
  return { risk: "제한 초과", permit: "허가 확인", pass: "입력조건 통과", unknown: "자료 부족" }[status] || "자료 부족";
}

function getRestrictionMarkerLabel(status) {
  return { risk: "!", permit: "P", pass: "✓", unknown: "?" }[status] || "?";
}

function getRestrictionReviewEntries(route = getRestrictionReviewRoute()) {
  const review = route?.restrictionReview;
  if (!review?.reviewedAt || !Array.isArray(review.results)) return [];
  const facilityMap = new Map((review.facilities || []).map((facility) => [facility.id, facility]));
  return review.results
    .map((result) => ({ result, facility: facilityMap.get(result.facilityId) }))
    .filter((entry) => entry.facility);
}

function setRestrictionReviewStatus(message, type = "info") {
  if (!els.restrictionReviewStatus) return;
  els.restrictionReviewStatus.textContent = message;
  els.restrictionReviewStatus.classList.remove("status-info", "status-active", "status-success", "status-warning", "status-error");
  els.restrictionReviewStatus.classList.add(`status-${type}`);
}

function renderRestrictionReview() {
  if (!els.restrictionRouteSelect) return;
  const currentId = state.restrictionReviewRouteId || state.activePlannedRouteId || state.plannedRoutes[0]?.id || "";
  els.restrictionRouteSelect.replaceChildren();
  if (!state.plannedRoutes.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "저장된 후보노선 없음";
    els.restrictionRouteSelect.append(option);
  } else {
    state.plannedRoutes.forEach((route) => {
      const option = document.createElement("option");
      option.value = route.id;
      option.textContent = route.name;
      option.selected = route.id === currentId;
      els.restrictionRouteSelect.append(option);
    });
  }
  state.restrictionReviewRouteId = state.plannedRoutes.some((route) => route.id === currentId) ? currentId : state.plannedRoutes[0]?.id || "";
  const route = getRestrictionReviewRoute();
  const review = route ? ensureRestrictionReview(route) : null;
  if (route && els.restrictionRouteSelect.dataset.loadedRouteId !== route.id) loadRestrictionReviewForm(route);
  const readOnly = !route || Boolean(state.shareView);
  [
    els.restrictionVehicleLength, els.restrictionVehicleWidth, els.restrictionVehicleHeight, els.restrictionVehicleTotalWeight, els.restrictionVehicleAxleWeight,
    els.restrictionDataInput, els.restrictionImportMode, els.restrictionCorridor, els.restrictionWorkflowStatus, els.restrictionReviewMemo,
    els.restrictionReviewRunBtn, els.restrictionReviewClearBtn,
  ].forEach((control) => { if (control) control.disabled = readOnly; });
  els.restrictionReviewExportBtn.disabled = !review?.results?.length;
  els.restrictionNormalizedExportBtn.disabled = !review || (!review.facilities.length && !review.unresolvedFacilities.length);
  els.restrictionRouteSelect.disabled = !state.plannedRoutes.length;
  if (els.restrictionDataStatus) {
    els.restrictionDataStatus.textContent = review && (review.facilities.length || review.unresolvedFacilities.length)
      ? `${review.dataName || "불러온 자료"} · 좌표 유효 ${review.facilities.length}건${review.unresolvedFacilities.length ? ` · 좌표 보완 ${review.unresolvedFacilities.length}건` : ""}`
      : "CSV 또는 JSON으로 교량·터널·도로 제한자료를 불러오세요.";
  }
  const importStats = normalizeRestrictionImportStats(review?.importStats);
  if (els.restrictionDataQuality) els.restrictionDataQuality.hidden = !importStats.importedAt;
  if (els.restrictionImportedCount) els.restrictionImportedCount.textContent = String(importStats.importedRows);
  if (els.restrictionDuplicateCount) els.restrictionDuplicateCount.textContent = String(importStats.duplicateRows);
  if (els.restrictionExcludedCount) els.restrictionExcludedCount.textContent = String(importStats.excludedRows);
  if (els.restrictionMissingLimitCount) els.restrictionMissingLimitCount.textContent = String(importStats.missingLimitRows);
  const counts = { risk: 0, permit: 0, pass: 0, unknown: 0 };
  (review?.results || []).forEach((result) => { counts[result.status] = (counts[result.status] || 0) + 1; });
  els.restrictionReviewSummary.hidden = !review?.reviewedAt;
  els.restrictionNearbyCount.textContent = String(review?.results?.length || 0);
  els.restrictionRiskCount.textContent = String(counts.risk);
  els.restrictionPermitCount.textContent = String(counts.permit);
  els.restrictionUnknownCount.textContent = String(counts.unknown);
  if (els.restrictionReviewBadge) {
    els.restrictionReviewBadge.textContent = !review?.facilities?.length
      ? review?.unresolvedFacilities?.length ? `좌표 보완 ${review.unresolvedFacilities.length}` : "자료 준비"
      : !review.reviewedAt ? "검토 대기" : counts.risk ? `초과 ${counts.risk}` : counts.permit ? `허가 ${counts.permit}` : "검토 완료";
  }
  els.restrictionReviewList.replaceChildren();
  const facilityMap = new Map((review?.facilities || []).map((facility) => [facility.id, facility]));
  (review?.results || []).slice(0, 500).forEach((result) => {
    const facility = facilityMap.get(result.facilityId);
    if (!facility) return;
    const item = document.createElement("article");
    item.className = `restriction-review-item is-${result.status}`;
    const body = document.createElement("div");
    body.className = "restriction-review-item__body";
    const title = document.createElement("strong");
    title.textContent = `${facility.name} · ${facility.type}`;
    const meta = document.createElement("span");
    meta.textContent = `노선에서 ${formatDistance(result.distanceMeters)}${result.issues.length ? ` · ${result.issues.join(" / ")}` : facility.note ? ` · ${facility.note}` : ""}`;
    body.append(title, meta);
    const badge = document.createElement("button");
    badge.type = "button";
    badge.className = "restriction-review-item__badge";
    badge.textContent = getRestrictionStatusLabel(result.status);
    badge.title = "지도에서 위치 보기";
    badge.addEventListener("click", () => map.setView([facility.lat, facility.lng], Math.max(16, map.getZoom())));
    item.append(body, badge);
    els.restrictionReviewList.append(item);
  });
  if ((review?.results?.length || 0) > 500) {
    const notice = document.createElement("p");
    notice.className = "status-text status-warning";
    notice.textContent = `화면 성능을 위해 가까운 결과 500건만 표시합니다. 전체 ${review.results.length}건은 결과 CSV에서 확인하세요.`;
    els.restrictionReviewList.append(notice);
  }
  if (!review?.results?.length && review?.reviewedAt) {
    const empty = document.createElement("p");
    empty.className = "status-text status-success";
    empty.textContent = `설정한 ${review.corridorMeters}m 범위 안에서 제한시설을 찾지 못했습니다.`;
    els.restrictionReviewList.append(empty);
  }
  if (!review?.reviewedAt) {
    setRestrictionReviewStatus(route ? "차량제원과 제한자료를 준비한 뒤 조건검토를 실행하세요." : "먼저 간편 노선 발굴에서 후보노선을 저장해 주세요.", route ? "info" : "warning");
  } else {
    setRestrictionReviewStatus(`최근 검토 ${formatDate(review.reviewedAt)} · ${review.results.length}건 확인`, counts.risk ? "error" : counts.permit ? "warning" : "success");
  }
}

function fitPlannedRoute(points) {
  const bounds = L.latLngBounds([]);
  points.forEach((point) => bounds.extend([point.lat, point.lng]));
  if (bounds.isValid()) {
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 17 });
  }
}

function renderPlannedRoutes() {
  updateMapPointSelectionCursor();
  plannedRouteLayer.clearLayers();
  scheduleNaverNativeOverlayRender();
  if (!CANDIDATE_ROUTE_FEATURE_ENABLED) return;
  const routesToDraw = state.plannedRoutes.filter((route) => route.visible !== false);
  routesToDraw.forEach((route) => {
    L.polyline(route.points.map((point) => [point.lat, point.lng]), {
      color: route.id === state.activePlannedRouteId ? "#d96c1f" : "#c98c2b",
      weight: route.id === state.activePlannedRouteId ? 6 : 4,
      opacity: 0.9,
      dashArray: "12 9",
      lineCap: "round",
      lineJoin: "round",
    }).addTo(plannedRouteLayer);
  });
  getRestrictionReviewEntries().slice(0, 500).forEach(({ facility, result }) => {
    L.marker([facility.lat, facility.lng], {
      interactive: false,
      icon: L.divIcon({
        className: "restriction-map-marker-shell",
        html: `<span class="restriction-map-marker is-${result.status}">${getRestrictionMarkerLabel(result.status)}</span>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      }),
    }).addTo(plannedRouteLayer);
  });

  const draft = state.planningMode ? state.plannedRouteDraft : null;
  if (draft) {
    const draftDisplayPoints = state.plannedRouteMode === "manual" && state.plannedRouteOutlinePreview
      ? state.plannedRouteOutlinePoints
      : draft.points;
    if (draftDisplayPoints.length > 0) {
      L.polyline(draftDisplayPoints.map((point) => [point.lat, point.lng]), {
        color: "#ee7b22",
        weight: 6,
        opacity: 0.95,
        dashArray: "10 7",
        lineCap: "round",
        lineJoin: "round",
      }).addTo(plannedRouteLayer);
    }
    if (state.plannedRouteMode === "manual" && state.plannedRouteOutlinePreview?.points?.length > 1) {
      L.polyline(state.plannedRouteOutlinePreview.points.map((point) => [point.lat, point.lng]), {
        color: "#315f9e",
        weight: 7,
        opacity: 0.96,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(plannedRouteLayer);
    }
    const draftMarkers = state.plannedRouteMode === "auto"
      ? orderPlannedRouteStops(draft.stops || [])
      : state.plannedRouteOutlinePoints;
    const waypointStops = draftMarkers.filter((point) => point.kind === "waypoint");
    draftMarkers.forEach((point, index) => {
      const markerLabel = state.plannedRouteMode === "auto"
        ? point.kind === "start"
          ? "S"
          : point.kind === "goal"
            ? "E"
            : String(waypointStops.findIndex((stop) => stop.id === point.id) + 1)
        : index === 0 ? "S" : index === draftMarkers.length - 1 ? "E" : index + 1;
      const marker = L.marker([point.lat, point.lng], {
        draggable: true,
        icon: L.divIcon({
          className: "planned-route-point-icon",
          html: `<span>${markerLabel}</span>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
      }).addTo(plannedRouteLayer);
      marker.on("dragend", (event) => {
        const next = event.target.getLatLng();
        if (state.plannedRouteMode === "auto") {
          updatePlannedRouteStop(point.id, { lat: next.lat, lng: next.lng });
          setStatus("위치를 변경했습니다. 후보노선을 다시 검색해 주세요.", "active");
        } else {
          state.plannedRouteOutlinePoints[index] = { lat: next.lat, lng: next.lng };
          draft.points = state.plannedRouteOutlinePoints.map((item) => ({ ...item }));
          draft.outlinePoints = [];
          draft.source = "naver-manual";
          draft.routeSummary = { distance: null, duration: null, tollFare: null, provider: "manual", searchedAt: null };
          state.plannedRouteOutlinePreview = null;
          draft.updatedAt = Date.now();
          renderPlannedRoutes();
        }
      });
    });
  }

  if (!els.plannedRouteList) return;
  const activeRoute = getActivePlannedRoute();
  if (!state.planningMode && (els.plannedRouteName.dataset.routeId || "") !== (activeRoute?.id || "")) {
    writePlannedRouteForm(activeRoute);
  }
  els.plannedRouteList.replaceChildren();
  state.plannedRoutes.forEach((route) => {
    const item = document.createElement("article");
    item.className = "planned-route-item";
    item.classList.toggle("is-active", route.id === state.activePlannedRouteId);
    const info = document.createElement("div");
    info.className = "planned-route-item__info";
    const title = document.createElement("strong");
    title.textContent = route.name;
    const meta = document.createElement("span");
    const calculatedDistance = route.points.reduce((total, point, index, points) =>
      index ? total + getDistanceMeters(points[index - 1], point) : total, 0);
    const distance = route.routeSummary?.distance ?? calculatedDistance;
    const spec = route.vehicleSpec || {};
    const specParts = [
      spec.length ? `L ${spec.length}m` : "",
      spec.width ? `W ${spec.width}m` : "",
      spec.height ? `H ${spec.height}m` : "",
      spec.totalWeight ? `${spec.totalWeight}t` : "",
    ].filter(Boolean);
    const waypointCount = route.stops?.filter((stop) => stop.kind === "waypoint").length || 0;
    const routeMethod = route.source === "naver-directions"
      ? `지점 검색${waypointCount ? ` · 경유 ${waypointCount}` : ""}`
      : route.source === "naver-outline"
        ? "윤곽 도로맞춤"
        : "윤곽노선";
    const durationText = route.routeSummary?.duration != null ? ` · ${formatRouteDuration(route.routeSummary.duration)}` : "";
    const routeConfirmed = isPlannedRouteConfirmed(route);
    const statusLabel = route.status === "approved" && !routeConfirmed
      ? "노선 확정 대기"
      : getCandidateStatusLabel(route.status);
    const confirmedProject = routeConfirmed && route.confirmedProjectName
      ? ` · 프로젝트 ${route.confirmedProjectName}`
      : "";
    const confirmedPoints = routeConfirmed
      ? ` · 위치점 ${route.confirmedPointCount}개`
      : "";
    meta.textContent = `${statusLabel}${confirmedProject}${confirmedPoints} · ${routeMethod} · ${formatDistance(distance)}${durationText}${specParts.length ? ` · ${specParts.join(" / ")}` : ""}${route.memo ? ` · ${route.memo}` : ""}`;
    info.append(title, meta);
    const actions = document.createElement("div");
    actions.className = "planned-route-item__actions";
    const actionItems = [
      [route.visible === false ? "보기" : "숨기기", () => togglePlannedRouteVisibility(route.id), false],
      [route.id === state.activePlannedRouteId ? "기준" : "기준 지정", () => setActivePlannedRoute(route.id), route.id === state.activePlannedRouteId],
      ["지도\n보기", () => fitPlannedRoute(route.points), false],
      [routeConfirmed ? "확정노선\n수정" : "수정", () => routeConfirmed ? startConfirmedRouteRevision(route.id) : startPlannedRouteEditing(route.id), false],
      ["새 후보\n복제", () => startPlannedRouteClone(route.id), false],
      ["삭제", () => deletePlannedRoute(route.id), false, false],
    ];
    actionItems.forEach(([label, handler, active, disabled]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.classList.toggle("is-two-line", label.includes("\n"));
      button.classList.toggle("is-active", active);
      button.disabled = Boolean(state.shareView) || Boolean(disabled);
      button.addEventListener("click", handler);
      actions.append(button);
    });
    item.append(info, actions);
    els.plannedRouteList.append(item);
  });
  if (state.plannedRoutes.length === 0 && !state.planningMode) {
    const empty = document.createElement("p");
    empty.className = "status-text";
    empty.textContent = "저장된 후보노선이 없습니다.";
    els.plannedRouteList.append(empty);
  }
  els.plannedRouteStartBtn.textContent = state.planningMode ? "후보노선 작성 중" : "새 후보노선";
  els.plannedRouteStartBtn.disabled = state.planningMode || state.mapAlignmentMode || state.mapColorExtractionMode || Boolean(state.shareView);
  const editableCount = state.plannedRouteMode === "auto" ? draft?.stops?.length || 0 : state.plannedRouteOutlinePoints.length;
  els.plannedRouteUndoBtn.disabled = !state.planningMode || editableCount === 0 || state.plannedRouteSearching;
  const activeRouteConfirmed = isPlannedRouteConfirmed(activeRoute);
  els.plannedRouteSaveBtn.textContent = state.planningMode
    ? "후보노선 저장"
    : activeRouteConfirmed
      ? "노선 확정 완료"
      : activeRoute
        ? "정보 저장"
        : "후보노선 저장";
  els.plannedRouteSaveBtn.disabled = state.planningMode
    ? (draft?.points.length || 0) < 2 || state.plannedRouteSearching || Boolean(state.plannedRouteOutlinePreview)
    : !activeRoute || activeRouteConfirmed || Boolean(state.shareView);
  els.plannedRouteCancelBtn.disabled = !state.planningMode || state.plannedRouteSearching;
  const canEditRouteInfo = !state.shareView && Boolean(state.planningMode || (activeRoute && !activeRouteConfirmed));
  els.plannedRouteName.disabled = !canEditRouteInfo;
  els.plannedRouteMemo.disabled = !canEditRouteInfo;
  els.plannedRouteStatusSelect.disabled = !canEditRouteInfo;
  if (els.plannedRouteAutoBtn) {
    els.plannedRouteAutoBtn.disabled = !state.planningMode || state.plannedRouteSearching;
    els.plannedRouteAutoBtn.classList.toggle("is-active", state.plannedRouteMode === "auto");
  }
  if (els.plannedRouteManualBtn) {
    els.plannedRouteManualBtn.disabled = !state.planningMode || state.plannedRouteSearching;
    els.plannedRouteManualBtn.classList.toggle("is-active", state.plannedRouteMode === "manual");
  }
  if (els.plannedRouteAutoControls) els.plannedRouteAutoControls.hidden = state.plannedRouteMode !== "auto";
  if (els.plannedRouteOutlineControls) els.plannedRouteOutlineControls.hidden = state.plannedRouteMode !== "manual";
  if (els.plannedRoutePlaceQuery) {
    els.plannedRoutePlaceQuery.disabled = !state.planningMode
      || state.plannedRouteMode !== "auto"
      || state.plannedRouteSearching
      || state.plannedRoutePlaceSearching;
  }
  if (els.plannedRoutePlaceSearchBtn) {
    els.plannedRoutePlaceSearchBtn.disabled = !state.planningMode
      || state.plannedRouteMode !== "auto"
      || state.plannedRouteSearching
      || state.plannedRoutePlaceSearching;
    els.plannedRoutePlaceSearchBtn.textContent = state.plannedRoutePlaceSearching ? "검색 중…" : "검색";
  }
  if (els.plannedRoutePlaceTarget) {
    els.plannedRoutePlaceTarget.textContent = `검색 결과를 ${getPlannedRouteSelectionLabel()}로 등록합니다.`;
  }
  renderPlannedRoutePlaceResults();
  [
    [els.plannedRouteStartPointBtn, "start"],
    [els.plannedRouteWaypointBtn, "waypoint"],
    [els.plannedRouteGoalPointBtn, "goal"],
  ].forEach(([button, kind]) => {
    if (!button) return;
    button.disabled = !state.planningMode || state.plannedRouteMode !== "auto" || state.plannedRouteSearching;
    button.classList.toggle("is-active", state.plannedRouteSelection === kind);
  });
  if (els.plannedRouteOption) els.plannedRouteOption.disabled = !state.planningMode || state.plannedRouteSearching;
  if (els.plannedRouteOutlineOption) {
    els.plannedRouteOutlineOption.disabled = !state.planningMode || state.plannedRouteMode !== "manual" || state.plannedRouteSearching;
  }
  if (els.plannedRouteSearchBtn) {
    const hasStart = draft?.stops?.some((stop) => stop.kind === "start");
    const hasGoal = draft?.stops?.some((stop) => stop.kind === "goal");
    els.plannedRouteSearchBtn.disabled = !state.planningMode || state.plannedRouteMode !== "auto" || !hasStart || !hasGoal || state.plannedRouteSearching;
    els.plannedRouteSearchBtn.textContent = state.plannedRouteSearching ? "검색 중…" : draft?.points?.length ? "노선 다시 검색" : "후보노선 검색";
  }
  if (els.plannedRouteOutlineSearchBtn) {
    els.plannedRouteOutlineSearchBtn.disabled = !state.planningMode
      || state.plannedRouteMode !== "manual"
      || state.plannedRouteOutlinePoints.length < 2
      || state.plannedRouteSearching;
    els.plannedRouteOutlineSearchBtn.textContent = state.plannedRouteSearching
      ? "구간 검색 중…"
      : state.plannedRouteOutlinePreview ? "윤곽으로 다시 검색" : "윤곽으로 노선 검색";
  }
  if (els.plannedRouteOutlineApplyBtn) {
    els.plannedRouteOutlineApplyBtn.disabled = !state.plannedRouteOutlinePreview || state.plannedRouteSearching;
  }
  if (els.plannedRouteOutlineCancelBtn) {
    els.plannedRouteOutlineCancelBtn.disabled = !state.plannedRouteOutlinePreview || state.plannedRouteSearching;
  }
  if (els.plannedRouteOutlineStatus) {
    const preview = state.plannedRouteOutlinePreview;
    els.plannedRouteOutlineStatus.textContent = preview
      ? `주황 점선: 입력 윤곽 · 파란 실선: 도로 검색 결과 · 핵심점 ${preview.anchors.length}개 · 자동 분할 ${preview.chunkCount}구간`
      : draft?.source === "naver-outline"
        ? `도로 검색 결과 적용 완료 · 위치점 ${draft.points.length}개 · 저장 전 윤곽 재검색 가능`
        : `입력 윤곽점 ${state.plannedRouteOutlinePoints.length}개 · 2개 이상 지정하면 검색할 수 있습니다.`;
  }
  renderPlannedRouteStopList(state.plannedRouteMode === "auto" ? draft : null);
  const plannedRouteStatusMessage = state.plannedRouteFeedback?.message || (state.planningMode
    ? state.plannedRouteMode === "auto"
      ? `${state.plannedRouteSelection === "start" ? "출발지" : state.plannedRouteSelection === "goal" ? "도착지" : "경유지"} 선택 중 · 위치표시를 드래그하거나 경유지 순서를 바꾼 뒤 노선을 다시 검색할 수 있습니다.`
      : state.plannedRouteOutlinePreview
        ? "윤곽 기반 검색 결과 미리보기 · 주황 점선과 파란 실선을 비교한 뒤 적용하거나 취소하세요."
        : `윤곽 기반 검색 중 · 윤곽점 ${state.plannedRouteOutlinePoints.length}개 · 점을 드래그해 위치를 보정할 수 있습니다.`
    : state.activePlannedRouteId
      ? "주황색 점선은 제한차량 허가판정이 아닌 사전검토용 후보노선입니다."
      : "새 후보노선을 누르고 지점 기반 검색 또는 윤곽 기반 검색을 선택하세요.");
  els.plannedRouteStatus.textContent = plannedRouteStatusMessage;
  els.plannedRouteStatus.classList.remove("status-info", "status-active", "status-success", "status-warning", "status-error");
  els.plannedRouteStatus.classList.add(`status-${state.plannedRouteFeedback?.type || "info"}`);
  renderRestrictionReview();
}

function render() {
  renderShareOnlyLayout();
  renderRouteLines();
  renderSessionOverlays();
  renderMapReferenceTools();
  scheduleMapReferenceRender();
  renderPlannedRoutes();

  const latest = getLatestPosition();
  if (latest) {
    currentMarker.setLatLng([latest.lat, latest.lng]);
  }

  renderPointEditing();
  renderPhotos();
  renderMilestones();
  renderProjectOverlays();
  renderRouteFollowStatus();
  renderFollowMode();
  renderStats();
  renderTrackingState();
  renderPanelVisibility();
  renderSessions();
  renderProjectState();
  renderSharePanel();
  renderAuthPanel();
}

function renderShareOnlyLayout() {
  if (!els.candidateFollowBlock || !els.plannedRouteControls || !els.recordControls) {
    return;
  }
  const target = state.shareView ? els.recordControls : els.plannedRouteControls;
  if (els.candidateFollowBlock.parentElement !== target) {
    target.append(els.candidateFollowBlock);
  }
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
  resetSegmentRerouteState();
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

function resetSegmentRerouteState() {
  state.segmentRerouteMode = false;
  state.segmentRerouteWaypointMode = false;
  state.segmentRerouteWaypoints = [];
  state.segmentReroutePreview = null;
  state.segmentRerouteSearching = false;
  segmentRerouteLayer.clearLayers();
  updateMapPointSelectionCursor();
}

function startSegmentReroute() {
  if (
    !state.pointEditMode ||
    state.segmentStartIndex === null ||
    state.segmentEndIndex === null ||
    state.segmentStartIndex === state.segmentEndIndex
  ) {
    setStatus("도로를 다시 검색할 시작 위치점과 종료 위치점을 먼저 선택해 주세요.", "warning");
    return;
  }
  const startIndex = Math.min(state.segmentStartIndex, state.segmentEndIndex);
  const endIndex = Math.max(state.segmentStartIndex, state.segmentEndIndex);
  state.segmentStartIndex = startIndex;
  state.segmentEndIndex = endIndex;
  state.segmentRerouteMode = true;
  state.segmentRerouteWaypointMode = true;
  state.segmentRerouteWaypoints = [];
  state.segmentReroutePreview = null;
  state.pointAddMode = false;
  renderPointEditing();
  setStatus(`위치점 ${startIndex + 1}~${endIndex + 1} 구간 재검색을 시작했습니다. 지도에서 경유지를 순서대로 선택하세요.`, "active");
}

function toggleSegmentRerouteWaypointMode() {
  if (!state.segmentRerouteMode || state.segmentRerouteSearching) return;
  if (state.segmentRerouteWaypoints.length >= MAX_PLANNED_ROUTE_WAYPOINTS) {
    setStatus(`경유지는 구간마다 최대 ${MAX_PLANNED_ROUTE_WAYPOINTS}개까지 지정할 수 있습니다.`, "warning");
    return;
  }
  state.segmentRerouteWaypointMode = !state.segmentRerouteWaypointMode;
  renderPointEditing();
  setStatus(
    state.segmentRerouteWaypointMode
      ? "지도에서 새 구간이 지나갈 경유지를 순서대로 선택하세요."
      : "경유지 선택을 잠시 멈췄습니다. 도로 경로 검색을 누르거나 다시 경유지를 추가하세요.",
    "active",
  );
}

function addSegmentRerouteWaypoint(latlng) {
  if (!state.segmentRerouteMode || !state.segmentRerouteWaypointMode) return;
  if (state.segmentRerouteWaypoints.length >= MAX_PLANNED_ROUTE_WAYPOINTS) {
    state.segmentRerouteWaypointMode = false;
    renderPointEditing();
    setStatus(`경유지 ${MAX_PLANNED_ROUTE_WAYPOINTS}개를 모두 지정했습니다. 도로 경로 검색을 눌러 주세요.`, "warning");
    return;
  }
  state.segmentRerouteWaypoints.push({
    id: crypto.randomUUID(),
    lat: Number(latlng.lat),
    lng: Number(latlng.lng),
    label: `새 경유지 ${state.segmentRerouteWaypoints.length + 1}`,
  });
  state.segmentReroutePreview = null;
  if (state.segmentRerouteWaypoints.length >= MAX_PLANNED_ROUTE_WAYPOINTS) {
    state.segmentRerouteWaypointMode = false;
  }
  renderPointEditing();
  setStatus(`새 경유지 ${state.segmentRerouteWaypoints.length}개를 지정했습니다.`, "active");
}

function undoSegmentRerouteWaypoint() {
  if (!state.segmentRerouteMode || !state.segmentRerouteWaypoints.length || state.segmentRerouteSearching) return;
  state.segmentRerouteWaypoints.pop();
  state.segmentReroutePreview = null;
  renderPointEditing();
  setStatus(`마지막 경유지를 취소했습니다. 현재 ${state.segmentRerouteWaypoints.length}개입니다.`, "active");
}

async function searchSegmentReroute() {
  if (!state.segmentRerouteMode || state.segmentRerouteSearching) return;
  const startIndex = Math.min(state.segmentStartIndex, state.segmentEndIndex);
  const endIndex = Math.max(state.segmentStartIndex, state.segmentEndIndex);
  const start = state.points[startIndex];
  const goal = state.points[endIndex];
  if (!start || !goal || startIndex === endIndex) {
    setStatus("재검색할 구간의 시작점과 종료점을 다시 선택해 주세요.", "warning");
    return;
  }
  state.segmentRerouteSearching = true;
  state.segmentRerouteWaypointMode = false;
  state.segmentReroutePreview = null;
  renderPointEditing();
  setSegmentRerouteStatus("선택구간의 도로 경로를 계산하는 중입니다.", "active");
  try {
    const activeRoute = getActivePlannedRoute();
    const result = await requestJson("/api/routes/preview", {
      method: "POST",
      body: JSON.stringify({
        stops: [
          { kind: "start", lat: start.lat, lng: start.lng },
          ...state.segmentRerouteWaypoints.map((point) => ({ kind: "waypoint", lat: point.lat, lng: point.lng })),
          { kind: "goal", lat: goal.lat, lng: goal.lng },
        ],
        option: normalizePlannedRouteOption(activeRoute?.routeOption || "tracomfort"),
      }),
    });
    state.segmentReroutePreview = {
      startIndex,
      endIndex,
      points: result.points,
      summary: result.summary || {},
      searchedAt: new Date().toISOString(),
    };
    const message = `새 구간 ${result.points.length}점을 찾았습니다 · ${formatDistance(result.summary?.distance || 0)} · ${formatRouteDuration(result.summary?.duration)}`;
    setSegmentRerouteStatus(`${message} · 지도의 파란 경로를 확인한 뒤 변경 구간 적용을 누르세요.`, "success");
    setStatus(message, "success");
  } catch (error) {
    const code = error?.payload?.error;
    const message = code === "directions_auth_failed"
      ? "네이버 Directions 인증에 실패했습니다. API 설정을 확인해 주세요."
      : code === "route_not_found"
        ? "선택한 시작점·경유지·종료점을 연결하는 도로 경로를 찾지 못했습니다. 경유지를 도로 가까이 다시 지정해 주세요."
        : code === "directions_rate_limited"
          ? "경로 검색 요청 한도에 도달했습니다. 잠시 후 다시 시도해 주세요."
          : "구간 도로 검색에 실패했습니다. 연결 상태와 선택 위치를 확인해 주세요.";
    setSegmentRerouteStatus(message, "error");
    setStatus(message, "warning");
  } finally {
    state.segmentRerouteSearching = false;
    renderPointEditing();
  }
}

function applySegmentReroute() {
  const preview = state.segmentReroutePreview;
  if (!state.segmentRerouteMode || !preview?.points?.length) return;
  const replacedCount = preview.endIndex - preview.startIndex + 1;
  const accepted = window.confirm(
    `선택구간을 새 도로 경로로 교체할까요?\n\n기존 위치점: ${replacedCount}개\n새 위치점: ${preview.points.length}개\n경유지: ${state.segmentRerouteWaypoints.length}개\n\n변경 전 동선은 되돌리기에 보관됩니다. 사진과 공사구역 좌표는 유지됩니다.`,
  );
  if (!accepted) return;
  rememberRouteEditUndo(`위치점 ${preview.startIndex + 1}-${preview.endIndex + 1} 구간 재검색`);
  const oldStart = state.points[preview.startIndex];
  const oldEnd = state.points[preview.endIndex];
  const startTime = Number(oldStart?.timestamp) || Date.now();
  const endTime = Math.max(startTime, Number(oldEnd?.timestamp) || startTime + preview.points.length - 1);
  const replacement = preview.points.map((point, index, points) => ({
    lat: Number(point.lat),
    lng: Number(point.lng),
    accuracy: 0,
    timestamp: Math.round(interpolateTimestamp(startTime, endTime, points.length <= 1 ? 0 : index / (points.length - 1))),
    source: "segment-reroute",
    edited: true,
    editedAt: Date.now(),
  }));
  state.points.splice(preview.startIndex, replacedCount, ...replacement);
  state.selectedPosition = state.points.at(-1) || state.initialPosition || null;
  state.selectedPointIndex = null;
  state.lastRoutePointIndex = null;
  state.segmentStartIndex = null;
  state.segmentEndIndex = null;
  updatePrimarySessionFromCurrentState();
  resetSegmentRerouteState();
  persist();
  render();
  void syncProjectState("segment-reroute");
  setStatus(`선택구간을 새 위치점 ${replacement.length}개로 교체했습니다. 전체 노선을 확인한 뒤 필요하면 다른 구간도 재검색하세요.`, "success");
}

function cancelSegmentReroute() {
  if (!state.segmentRerouteMode) return;
  resetSegmentRerouteState();
  renderPointEditing();
  setStatus("구간 재검색을 취소했습니다. 확정 위치점은 변경하지 않았습니다.", "warning");
}

function setSegmentRerouteStatus(message, type = "info") {
  if (!els.segmentRerouteStatus) return;
  els.segmentRerouteStatus.textContent = message;
  els.segmentRerouteStatus.classList.remove("status-info", "status-active", "status-success", "status-warning", "status-error");
  els.segmentRerouteStatus.classList.add(`status-${type}`);
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
  segmentRerouteLayer.clearLayers();
  scheduleNaverNativeOverlayRender();
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
    els.pointAddBtn.disabled = !state.pointEditMode || state.segmentRerouteMode;
    els.pointAddBtn.textContent = state.pointAddMode ? "추가 위치 클릭" : "위치점 추가";
    els.pointAddBtn.classList.toggle("is-active", state.pointAddMode);
  }
  if (els.pointDeleteBtn) {
    els.pointDeleteBtn.disabled =
      !state.pointEditMode || state.segmentRerouteMode || state.segmentStartIndex === null || state.segmentEndIndex !== null;
  }
  if (els.pointConnectBtn) {
    els.pointConnectBtn.disabled =
      !state.pointEditMode ||
      state.segmentRerouteMode ||
      state.segmentStartIndex === null ||
      state.segmentEndIndex === null ||
      Math.abs(state.segmentStartIndex - state.segmentEndIndex) <= 1;
  }
  const hasSelectedPoint = state.pointEditMode && state.segmentStartIndex !== null;
  if (els.segmentStartBtn) {
    els.segmentStartBtn.disabled = !hasSelectedPoint || state.segmentRerouteMode;
    els.segmentStartBtn.textContent =
      state.segmentStartIndex === null ? "시작점 지정" : `시작 ${state.segmentStartIndex + 1}`;
  }
  if (els.segmentEndBtn) {
    els.segmentEndBtn.disabled = !hasSelectedPoint || state.segmentRerouteMode;
    els.segmentEndBtn.textContent =
      state.segmentEndIndex === null ? "끝점 지정" : `끝 ${state.segmentEndIndex + 1}`;
  }
  if (els.segmentDeleteBtn) {
    els.segmentDeleteBtn.disabled =
      !state.pointEditMode ||
      state.segmentRerouteMode ||
      state.segmentStartIndex === null ||
      state.segmentEndIndex === null ||
      state.segmentStartIndex === state.segmentEndIndex;
  }
  if (els.undoRouteEditBtn) {
    els.undoRouteEditBtn.disabled = !state.pointEditMode || state.segmentRerouteMode || !state.undoRouteEdit;
  }
  if (els.pointNumberRow) {
    els.pointNumberRow.hidden = !state.pointEditMode;
  }
  if (els.segmentStartInput && document.activeElement !== els.segmentStartInput) {
    els.segmentStartInput.value = state.segmentStartIndex === null ? "" : String(state.segmentStartIndex + 1);
    els.segmentStartInput.max = String(state.points.length);
    els.segmentStartInput.disabled = state.segmentRerouteMode;
  }
  if (els.segmentEndInput && document.activeElement !== els.segmentEndInput) {
    els.segmentEndInput.value = state.segmentEndIndex === null ? "" : String(state.segmentEndIndex + 1);
    els.segmentEndInput.max = String(state.points.length);
    els.segmentEndInput.disabled = state.segmentRerouteMode;
  }
  if (els.pointEditHint) {
    els.pointEditHint.hidden = !state.pointEditMode;
  }
  updatePointEditHint();
  renderSegmentRerouteControls();

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
      draggable: !state.segmentRerouteMode,
      keyboard: true,
      title: `위치점 ${index + 1}`,
    });
    marker.on("click", (event) => {
      if (event.originalEvent) {
        L.DomEvent.stopPropagation(event.originalEvent);
      }
      if (!state.segmentRerouteMode) selectRoutePoint(index);
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
  renderSegmentRerouteMap();
}

function renderSegmentRerouteControls() {
  if (!els.segmentRerouteControls) return;
  els.segmentRerouteControls.hidden = !state.pointEditMode;
  if (!state.pointEditMode) return;
  const hasRange = state.segmentStartIndex !== null
    && state.segmentEndIndex !== null
    && state.segmentStartIndex !== state.segmentEndIndex;
  els.segmentRerouteStartBtn.disabled = !hasRange || state.segmentRerouteSearching;
  els.segmentRerouteStartBtn.textContent = state.segmentRerouteMode ? "선택구간 다시 시작" : "구간 재검색";
  els.segmentRerouteWaypointBtn.disabled = !state.segmentRerouteMode
    || state.segmentRerouteSearching
    || state.segmentRerouteWaypoints.length >= MAX_PLANNED_ROUTE_WAYPOINTS;
  els.segmentRerouteWaypointBtn.textContent = state.segmentRerouteWaypointMode ? "경유지 선택 중" : "경유지 추가";
  els.segmentRerouteWaypointBtn.classList.toggle("is-active", state.segmentRerouteWaypointMode);
  els.segmentRerouteUndoWaypointBtn.disabled = !state.segmentRerouteMode
    || !state.segmentRerouteWaypoints.length
    || state.segmentRerouteSearching;
  els.segmentRerouteSearchBtn.disabled = !state.segmentRerouteMode || !hasRange || state.segmentRerouteSearching;
  els.segmentRerouteSearchBtn.textContent = state.segmentRerouteSearching ? "도로 검색 중…" : "도로 경로 검색";
  els.segmentRerouteApplyBtn.disabled = !state.segmentReroutePreview?.points?.length || state.segmentRerouteSearching;
  els.segmentRerouteCancelBtn.disabled = !state.segmentRerouteMode || state.segmentRerouteSearching;
  if (els.segmentRerouteWaypointList) {
    els.segmentRerouteWaypointList.textContent = state.segmentRerouteWaypoints.length
      ? state.segmentRerouteWaypoints.map((point, index) => `${index + 1}. ${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`).join("  ·  ")
      : "";
  }
  if (!state.segmentRerouteMode) {
    setSegmentRerouteStatus(
      hasRange
        ? `위치점 ${Math.min(state.segmentStartIndex, state.segmentEndIndex) + 1}~${Math.max(state.segmentStartIndex, state.segmentEndIndex) + 1} 구간을 재검색할 수 있습니다.`
        : "위치점 두 개를 선택하면 구간 재검색을 시작할 수 있습니다.",
      "info",
    );
  }
  updateMapPointSelectionCursor();
}

function renderSegmentRerouteMap() {
  if (!state.pointEditMode || !state.segmentRerouteMode) return;
  const startIndex = Math.min(state.segmentStartIndex, state.segmentEndIndex);
  const endIndex = Math.max(state.segmentStartIndex, state.segmentEndIndex);
  const originalPoints = state.points.slice(startIndex, endIndex + 1);
  if (originalPoints.length > 1) {
    L.polyline(originalPoints.map((point) => [point.lat, point.lng]), {
      color: "#d96c1f",
      weight: 7,
      opacity: 0.9,
      dashArray: "10 8",
      lineCap: "round",
      lineJoin: "round",
    }).addTo(segmentRerouteLayer);
  }
  if (state.segmentReroutePreview?.points?.length > 1) {
    L.polyline(state.segmentReroutePreview.points.map((point) => [point.lat, point.lng]), {
      color: "#315f9e",
      weight: 7,
      opacity: 0.95,
      lineCap: "round",
      lineJoin: "round",
    }).addTo(segmentRerouteLayer);
  }
  state.segmentRerouteWaypoints.forEach((point, index) => {
    L.marker([point.lat, point.lng], {
      interactive: false,
      icon: L.divIcon({
        className: "planned-route-point-icon",
        html: `<span>${index + 1}</span>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      }),
    }).addTo(segmentRerouteLayer);
  });
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
  updatePrimarySessionFromCurrentState();
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
  updatePrimarySessionFromCurrentState();
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
  updatePrimarySessionFromCurrentState();
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
  updatePrimarySessionFromCurrentState();
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
  updatePrimarySessionFromCurrentState();
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
  updatePrimarySessionFromCurrentState();
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
  if (els.photoSort) {
    els.photoSort.value = state.photoSort;
  }
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
  scheduleNaverNativeOverlayRender();
  if (!state.photoPinsVisible || state.photoFilter === "hidden") {
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
  const size = 42;
  const icon = L.divIcon({
    className: "",
    html: `<span class="photo-single-marker"><img src="${photo.src}" alt="" /></span>`,
    iconSize: [size, size],
    iconAnchor: getSeparatedMarkerAnchor("photo", size, size, photo),
    popupAnchor: [0, -34],
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
    iconAnchor: getSeparatedMarkerAnchor("photo", size, size, cluster),
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

function getSeparatedMarkerAnchor(type, width, height, position) {
  if (state.pointEditMode || !hasPhotoPosition(position)) {
    return [width / 2, height];
  }
  const comparisonPositions = type === "construction"
    ? getVisiblePhotoMarkerPositions()
    : getVisibleConstructionMarkerPositions();
  const sourcePositions = type === "photo" && Array.isArray(position.photos)
    ? position.photos.filter(hasPhotoPosition)
    : [position];
  const collides = sourcePositions.some((source) => {
    const left = map.latLngToLayerPoint([source.lat, source.lng]);
    return comparisonPositions.some((item) => {
      const right = map.latLngToLayerPoint([item.lat, item.lng]);
      return left.distanceTo(right) <= MAP_MARKER_COLLISION_PX;
    });
  });
  if (!collides) {
    return [width / 2, height];
  }
  const direction = type === "construction" ? 1 : -1;
  return [width / 2 + direction * MAP_MARKER_SEPARATION_PX, height];
}

function getVisiblePhotoMarkerPositions() {
  if (!state.photoPinsVisible || state.photoFilter === "hidden") {
    return [];
  }
  const currentPhotos = getVisiblePhotos().filter(hasPhotoPosition);
  const overlayPhotos = state.overlayProjects
    .filter((project) => project.visible !== false && project.photosVisible !== false)
    .flatMap((project) => (project.photos || []).filter(hasPhotoPosition));
  return [...currentPhotos, ...overlayPhotos];
}

function getVisibleConstructionMarkerPositions() {
  if (!state.constructionPinsVisible) {
    return [];
  }
  const currentPins = state.milestones.filter((pin) => isMapInfoPin(pin) && hasPhotoPosition(pin));
  const overlayPins = state.overlayProjects
    .filter((project) => project.visible !== false && project.constructionVisible !== false)
    .flatMap((project) => (project.milestones || []).filter(
      (pin) => isMapInfoPin(pin) && hasPhotoPosition(pin),
    ));
  return [...currentPins, ...overlayPins];
}

function isMapInfoPin(pin) {
  return pin?.type === "construction" || pin?.type === "memo";
}

function showPhotoTray(photos, options = {}) {
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
    button.addEventListener("click", () => openPhotoModal(photo, {
      preferredPhotos: photos,
      photoPool: options.photoPool || photos,
      readOnly: Boolean(options.readOnly),
      sourceLabel: options.sourceLabel || "",
    }));
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
  const tags = window.prompt(`${label} 태그 (쉼표로 구분)`, "");
  if (tags === null) {
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
    tags: normalizeTagValues(tags).join(", "),
    lat: position.lat,
    lng: position.lng,
    priority: null,
    completed: false,
    createdAt: Date.now(),
    displayCode,
    autoRouteCode: /^C\d+/i.test(displayCode),
    color: DEFAULT_CONSTRUCTION_COLOR,
  });
  reorderConstructionPinsByRouteOrder();
  state.constructionPinsVisible = true;
  persist();
  renderMilestones();
  syncProjectState("pin-construction");
  setStatus(`지도 중앙에 ${displayCode} 공사구역을 추가했습니다. 색상 아이콘에서 대표 색상을 선택할 수 있습니다.`);
}

function addMapMemo() {
  const position = getMapCenterPosition();
  if (!position) {
    setStatus("지도 중앙 위치를 확인한 뒤 다시 시도해 주세요.");
    return;
  }
  const memo = window.prompt("현장 메모", "");
  if (memo === null) {
    return;
  }
  const content = memo.trim();
  if (!content) {
    setStatus("현장 메모 내용을 입력해 주세요.");
    return;
  }
  const tags = window.prompt("현장 메모 태그 (쉼표로 구분)", "");
  if (tags === null) {
    return;
  }
  const code = getNextMemoCode();
  state.milestones.push({
    id: crypto.randomUUID(),
    type: "memo",
    displayCode: code,
    code,
    lat: position.lat,
    lng: position.lng,
    memo: content,
    tags: normalizeTagValues(tags).join(", "),
    createdAt: Date.now(),
  });
  state.constructionPinsVisible = true;
  persist();
  renderMilestones();
  syncProjectState("add-map-memo");
  setStatus(`${code} 현장 메모를 지도 중앙에 등록했습니다.`);
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
  scheduleNaverNativeOverlayRender();
  if (!els.milestoneList) {
    return;
  }
  els.milestoneList.innerHTML = "";

  const allPins = state.milestones
    .filter(isMapInfoPin)
    .sort(compareMapInfoPinsForList);
  const pins = getVisibleMapInfoPins(allPins);
  renderConstructionFilterControls();
  renderConstructionVisibilityControls(allPins.length);

  if (allPins.length === 0) {
    const empty = document.createElement("p");
    empty.className = "status-text";
    empty.textContent = "아직 등록된 공사구역 또는 현장 메모가 없습니다.";
    els.milestoneList.append(empty);
    return;
  }
  if (pins.length === 0) {
    const empty = document.createElement("p");
    empty.className = "status-text";
    empty.textContent = "필터 조건에 맞는 공사구역 또는 현장 메모가 없습니다.";
    els.milestoneList.append(empty);
    return;
  }
  pins.forEach((pin) => {
    const typeLabel = getPinTypeLabel(pin.type);
    const pinLabel = getMapPinLabel(pin);
    if (state.constructionPinsVisible) {
      const icon = pin.type === "memo" ? createMemoMarkerIcon(pin) : createConstructionMarkerIcon(pin);
      let pinWasDragged = false;
      L.marker([pin.lat, pin.lng], {
        icon,
        title: state.pointEditMode ? `${pin.name} - 드래그해서 위치 수정` : `${pin.name} 위치`,
        draggable: state.pointEditMode && pin.type === "construction",
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
          openMapPinDetail(pin);
        })
        .addTo(milestoneLayer);
    }

    const item = document.createElement("article");
    item.className = "pin-list-item";

    const body = document.createElement("div");
    body.className = "pin-info";
    const title = document.createElement("strong");
    title.textContent = `${pinLabel}. ${pin.name || typeLabel}`;
    const memo = document.createElement("small");
    memo.textContent = pin.memo?.trim() || "메모 없음";
    body.append(title, memo);
    const tags = getPinTags(pin);
    if (tags.length > 0) {
      const tagList = document.createElement("div");
      tagList.className = "pin-tag-list";
      tags.forEach((tag) => {
        const chip = document.createElement("span");
        chip.textContent = tag;
        tagList.append(chip);
      });
      body.append(tagList);
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
      const editButton = createPinIconButton("수정", "edit");
      editButton.addEventListener("click", () => editMapPin(pin.id));
      const deleteButton = createPinIconButton("삭제", "delete");
      deleteButton.addEventListener("click", () => deleteMapPin(pin.id));
      if (pin.type === "construction") {
        const colorButton = createPinIconButton("색상", "color", normalizeConstructionColor(pin.color));
        colorButton.addEventListener("click", () => {
          openRepresentativeColorPicker({
            title: `${pinLabel} 대표 색상`,
            currentColor: pin.color,
            onConfirm: (color) => updateConstructionPinColor(pin.id, color),
          });
        });
        actions.append(colorButton);
      }
      actions.append(editButton, deleteButton);
    }

    item.append(body, actions);
    els.milestoneList.append(item);
  });
}

function updateMapPinPosition(pinId, latlng) {
  const pin = state.milestones.find((item) => item.id === pinId);
  if (!pin || pin.type !== "construction") {
    return;
  }
  pin.lat = latlng.lat;
  pin.lng = latlng.lng;
  pin.editedAt = Date.now();
  reorderConstructionPinsByRouteOrder();
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
  const routePoints = getRouteFollowPoints();
  if (routePoints.length < 2) {
    setStatus("답사할 후보노선을 만들거나 기존 기록동선을 불러와 주세요.", "warning");
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
  const activeRoute = getVisibleActivePlannedRoute();
  if (activeRoute && activeRoute.status === "draft") {
    activeRoute.status = "surveying";
    activeRoute.updatedAt = Date.now();
  }
  persist();
  render();
  const position = await locateCurrentPosition({ status: false });
  if (!position) {
    stopRouteFollowing("현재 위치를 확인하지 못해 답사 따라가기를 시작할 수 없습니다.");
    return;
  }
  updateRouteFollowing(position);
  if (!state.tracking) {
    startRouteFollowWatcher();
  }
  renderPlannedRoutes();
  void syncProjectState(activeRoute ? "candidate-route-surveying" : "record-route-following");
  setStatus(
    activeRoute
      ? "후보노선 따라가기를 시작했습니다. 실제 이동기록을 동시에 저장할 수 있습니다."
      : "기록 동선 따라가기를 시작했습니다. 실제 이동기록을 동시에 저장할 수 있습니다.",
    "active",
  );
}

function toggleConstructionVisibility() {
  if (state.shareView && (state.shareView.loading || state.shareView.revoked)) {
    return;
  }
  if (getVisibleConstructionPinCount() === 0) {
    return;
  }
  state.constructionPinsVisible = !state.constructionPinsVisible;
  renderMilestones();
  renderProjectOverlays();
  renderPhotoMapMarkers(getVisiblePhotos());
  renderFollowMode();
  setStatus(`공사구역 핀을 ${state.constructionPinsVisible ? "표시했습니다." : "숨겼습니다."}`);
}

function togglePhotoPinVisibility() {
  if (state.shareView && (state.shareView.loading || state.shareView.revoked || !state.shareView.includePhotos)) {
    return;
  }
  if (state.photos.length === 0) {
    return;
  }
  state.photoPinsVisible = !state.photoPinsVisible;
  renderPhotoMapMarkers(getVisiblePhotos());
  renderMilestones();
  renderProjectOverlays();
  renderFollowMode();
  setStatus(`사진 위치를 지도에서 ${state.photoPinsVisible ? "표시했습니다." : "숨겼습니다."}`);
}

function renderConstructionVisibilityControls(pinCount) {
  const isVisible = state.constructionPinsVisible;
  if (els.constructionVisibilityBtn) {
    els.constructionVisibilityBtn.hidden = Boolean(state.shareView);
    els.constructionVisibilityBtn.disabled = pinCount === 0;
    els.constructionVisibilityBtn.textContent = isVisible ? "공사구역 숨기기" : "공사구역 보기";
    els.constructionVisibilityBtn.setAttribute("aria-pressed", String(isVisible));
  }
  if (els.shareConstructionToggleBtn) {
    const canToggle = Boolean(
      state.shareView &&
      state.shareView.includeConstruction &&
      !state.shareView.loading &&
      !state.shareView.revoked &&
      pinCount > 0,
    );
    els.shareConstructionToggleBtn.hidden = !canToggle;
    els.shareConstructionToggleBtn.disabled = !canToggle;
    els.shareConstructionToggleBtn.textContent = isVisible ? "공사구역 숨기기" : "공사구역 보기";
    els.shareConstructionToggleBtn.setAttribute("aria-pressed", String(isVisible));
  }
}

function renderFollowMode() {
  const isFollowMode = Boolean(state.destinationFollow);
  const followModeChanged = document.body.classList.contains("is-follow-mode") !== isFollowMode;
  document.body.classList.toggle("is-follow-mode", isFollowMode);
  if (els.followMapControls) {
    els.followMapControls.hidden = !isFollowMode;
  }
  if (els.followSafetyNotice) {
    els.followSafetyNotice.hidden = !isFollowMode;
  }

  const hasPhotos = state.photos.length > 0 && (!state.shareView || state.shareView.includePhotos);
  const hasConstruction =
    getVisibleConstructionPinCount() > 0 && (!state.shareView || state.shareView.includeConstruction);
  const photoText = state.photoPinsVisible ? "사진 숨기기" : "사진 보기";
  const constructionText = state.constructionPinsVisible ? "공사구역 숨기기" : "공사구역 보기";

  [els.followPhotoToggleBtn, els.sharePhotoToggleBtn].forEach((button) => {
    if (!button) {
      return;
    }
    button.hidden = !(button === els.followPhotoToggleBtn ? isFollowMode && hasPhotos : !isFollowMode && Boolean(state.shareView) && hasPhotos);
    button.textContent = photoText;
    button.setAttribute("aria-pressed", String(state.photoPinsVisible));
  });
  if (els.followConstructionToggleBtn) {
    els.followConstructionToggleBtn.hidden = !(isFollowMode && hasConstruction);
    els.followConstructionToggleBtn.textContent = constructionText;
    els.followConstructionToggleBtn.setAttribute("aria-pressed", String(state.constructionPinsVisible));
  }
  if (els.shareInfoControls) {
    els.shareInfoControls.hidden = isFollowMode || !state.shareView || (!hasPhotos && !hasConstruction);
  }
  if (els.shareConstructionToggleBtn && state.shareView) {
    els.shareConstructionToggleBtn.hidden = isFollowMode || !hasConstruction;
    els.shareConstructionToggleBtn.textContent = constructionText;
    els.shareConstructionToggleBtn.setAttribute("aria-pressed", String(state.constructionPinsVisible));
  }
  if (followModeChanged) {
    window.requestAnimationFrame(() => map.invalidateSize());
  }
}

function getVisibleConstructionPinCount() {
  const currentProjectCount = state.milestones.filter((pin) => pin.type === "construction").length;
  const overlayCount = state.overlayProjects
    .filter((project) => project.visible !== false && project.constructionVisible !== false)
    .reduce(
      (count, project) =>
        count +
        (Array.isArray(project.milestones)
          ? project.milestones.filter((pin) => pin.type === "construction").length
          : 0),
      0,
    );
  return currentProjectCount + overlayCount;
}

function stopRouteFollowing(message = "답사 따라가기를 종료했습니다.") {
  state.destinationFollow = false;
  followInteractionPauseUntil = 0;
  if (followInteractionResumeTimer !== null) {
    window.clearTimeout(followInteractionResumeTimer);
    followInteractionResumeTimer = null;
  }
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
  renderFollowMode();
  setStatus(message);
}

function renderRouteLines() {
  scheduleNaverNativeOverlayRender();
  const points = getRoutePathPoints(state.points);
  const followsCandidate = Boolean(getVisibleActivePlannedRoute()?.points?.length >= 2);
  if (!state.destinationFollow || followsCandidate || points.length < 2) {
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
  const routePoints = getRouteFollowPoints();
  const routeLabel = hasCandidateRouteForFollow() ? "후보노선" : "기록 동선";
  els.followRouteBtn.textContent = state.destinationFollow ? "따라가기 종료" : "답사 따라가기";
  els.followRouteBtn.classList.toggle("is-active", state.destinationFollow);
  els.followRouteBtn.disabled = state.shareView ? routePoints.length < 2 : false;
  if (routePoints.length < 2) {
    els.routeFollowStatus.textContent = "후보노선을 기준 지정하거나 기존 기록동선을 불러오면 답사를 시작할 수 있습니다.";
    els.routeFollowStatus.classList.remove("is-off-route");
    return;
  }
  if (!state.destinationFollow) {
    els.routeFollowStatus.textContent = `답사 대기 · ${routeLabel} ${routePoints.length}점`;
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
  const isMemo = pin.type === "memo";
  const name = isMemo ? pin.name : window.prompt("핀 이름", pin.name || getPinTypeLabel(pin.type));
  if (name === null) return;
  const memo = window.prompt(isMemo ? "현장 메모" : "핀 메모", pin.memo || "");
  if (memo === null) {
    return;
  }
  const tags = window.prompt("태그를 쉼표로 구분해 입력", pin.tags || "");
  if (tags === null) {
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
  if (!isMemo) pin.name = name.trim() || getPinTypeLabel(pin.type);
  pin.memo = memo.trim();
  pin.tags = normalizeTagValues(tags).join(", ");
  if (pin.type === "construction") {
    pin.displayCode = displayCode;
    pin.autoRouteCode = /^C\d+/i.test(displayCode);
    pin.color = normalizeConstructionColor(pin.color);
  }
  reorderConstructionPinsByRouteOrder();
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
  reorderConstructionPinsByRouteOrder();
  persist();
  renderMilestones();
  syncProjectState("delete-pin");
  setStatus("핀을 삭제했습니다.");
}

function getPinTypeLabel(type) {
  return type === "construction" ? "공사구역" : type === "memo" ? "현장 메모" : "목적지";
}

function getMapPinLabel(pin) {
  if (pin.type === "construction") {
    return normalizeConstructionCode(pin.displayCode, `C${getConstructionPinNumber(pin)}`);
  }
  if (pin.type === "memo") {
    return String(pin.displayCode || pin.code || "M?").trim() || "M?";
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
    .map((pin) => getMapPinLabel(pin).match(/^C(\d+)/i))
    .filter(Boolean)
    .map((match) => Number(match[1]));
  return `C${Math.max(0, ...usedNumbers) + 1}`;
}

function getNextMemoCode() {
  const usedNumbers = state.milestones
    .filter((pin) => pin.type === "memo")
    .map((pin) => String(pin.displayCode || pin.code || "").match(/^M(\d+)$/i))
    .filter(Boolean)
    .map((match) => Number(match[1]));
  return `M${Math.max(0, ...usedNumbers) + 1}`;
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
  const normalized = milestones.map((pin) => ({
    ...pin,
    tags: normalizeTagValues(pin?.tags).join(", "),
  }));
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

function createMemoMarkerIcon(pin) {
  const code = getMapPinLabel(pin);
  return L.divIcon({
    className: "",
    html: createMapPinHtml("memo", code),
    iconSize: [34, 38],
    iconAnchor: getSeparatedMarkerAnchor("memo", 34, 38, pin),
    popupAnchor: [0, -34],
  });
}

function getVisibleMapInfoPins(pins = state.milestones.filter(isMapInfoPin)) {
  const filter = state.constructionFilter || "all";
  const selectedTags = normalizeTagValues(state.constructionTagFilters);
  const bounds = getCurrentMapBounds();
  return pins.filter((pin) => {
    if (selectedTags.length > 0 && !selectedTags.some((tag) => getPinTags(pin).includes(tag))) {
      return false;
    }
    if (filter === "construction") return pin.type === "construction";
    if (filter === "memo-pin") return pin.type === "memo";
    if (filter === "with-memo") return Boolean(pin.memo?.trim());
    if (filter === "tagged") return getPinTags(pin).length > 0;
    if (filter === "map") return bounds && containsPoint(bounds, pin);
    return true;
  });
}

function renderConstructionFilterControls() {
  const availableFilters = new Set(["all", "construction", "memo-pin", "with-memo", "tagged", "map"]);
  if (!availableFilters.has(state.constructionFilter)) {
    state.constructionFilter = "all";
  }
  if (els.constructionFilter) {
    els.constructionFilter.value = state.constructionFilter;
  }
  const availableTags = getAllConstructionTags();
  state.constructionTagFilters = normalizeTagValues(state.constructionTagFilters).filter((tag) =>
    availableTags.includes(tag),
  );
  renderMultiTagFilter({
    details: els.constructionTagFilter,
    summary: els.constructionTagFilterSummary,
    menu: els.constructionTagFilterMenu,
    availableTags,
    selectedTags: state.constructionTagFilters,
    emptyText: "등록된 구역·메모 태그가 없습니다.",
    onChange: (tags) => {
      state.constructionTagFilters = tags;
      persistPhotoDisplaySettings();
      renderMilestones();
    },
  });
  if (els.constructionFilterReset) {
    els.constructionFilterReset.disabled =
      state.constructionFilter === "all" && normalizeTagValues(state.constructionTagFilters).length === 0;
  }
}

function getPinTags(pin) {
  return normalizeTagValues(pin?.tags);
}

function getAllConstructionTags() {
  return [...new Set(state.milestones.filter(isMapInfoPin).flatMap((pin) => getPinTags(pin)))];
}

function createConstructionMarkerIcon(pin) {
  const code = getMapPinLabel(pin);
  const name = String(pin.name || "").trim();
  const showName = map.getZoom() >= CONSTRUCTION_NAME_ZOOM && name && name !== "공사구역";
  if (!showName) {
    return L.divIcon({
      className: "",
      html: createMapPinHtml("construction", code, pin.color),
      iconSize: [34, 38],
      iconAnchor: getSeparatedMarkerAnchor("construction", 34, 38, pin),
      popupAnchor: [0, -34],
    });
  }

  const label = name.length > 14 ? `${name.slice(0, 13)}…` : name;
  const width = Math.min(172, Math.max(58, label.length * 13 + 22));
  const pinColor = normalizeConstructionColor(pin.color);
  const foreground = pinColor === BRIGHT_YELLOW_COLOR ? "#3b3210" : "#ffffff";
  return L.divIcon({
    className: "construction-name-icon",
    html: `<span style="background:${pinColor};color:${foreground}">${escapeHtml(label)}</span>`,
    iconSize: [width, 34],
    iconAnchor: getSeparatedMarkerAnchor("construction", width, 34, pin),
    popupAnchor: [0, -32],
  });
}

function openMapPinDetail(pin, projectName = "") {
  if (!pin || !els.constructionDetailModal) {
    return;
  }
  state.activeConstructionPinId = pin.id || null;
  activeConstructionDetailPin = pin;
  const code = getMapPinLabel(pin);
  const isMemo = pin.type === "memo";
  const pinColor = isMemo ? "#2563eb" : normalizeConstructionColor(pin.color);
  els.constructionDetailCode.textContent = projectName ? `${projectName} · ${code}` : code;
  els.constructionDetailCode.style.background = pinColor;
  els.constructionDetailCode.style.color = pinColor === BRIGHT_YELLOW_COLOR ? "#3b3210" : "#ffffff";
  els.constructionDetailTitle.textContent = pin.name?.trim() || getPinTypeLabel(pin.type);
  els.constructionDetailMeta.textContent = `${Number(pin.lat).toFixed(5)}, ${Number(pin.lng).toFixed(5)}`;
  els.constructionDetailMemo.textContent = pin.memo?.trim() || "등록된 메모가 없습니다.";
  els.constructionDetailMemo.classList.toggle("is-empty", !pin.memo?.trim());
  if (els.constructionDetailTags) {
    els.constructionDetailTags.innerHTML = "";
    const tags = getPinTags(pin);
    if (tags.length === 0) {
      const empty = document.createElement("span");
      empty.className = "is-empty";
      empty.textContent = "등록된 태그가 없습니다.";
      els.constructionDetailTags.append(empty);
    } else {
      tags.forEach((tag) => {
        const chip = document.createElement("span");
        chip.textContent = tag;
        els.constructionDetailTags.append(chip);
      });
    }
  }
  els.constructionDetailModal.hidden = false;
  document.body.classList.add("is-construction-detail-open");
}

function openConstructionDetail(pin, projectName = "") {
  openMapPinDetail(pin, projectName);
}

function closeConstructionDetail() {
  if (!els.constructionDetailModal) {
    return;
  }
  els.constructionDetailModal.hidden = true;
  state.activeConstructionPinId = null;
  activeConstructionDetailPin = null;
  document.body.classList.remove("is-construction-detail-open");
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
    renderMilestones();
    renderPhotoMapMarkers(getVisiblePhotos());
    setStatus(`${overlay.name} 동선, 사진, 공사구역을 비교 화면에 추가했습니다.`);
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
  const lastStatePhotos = Array.isArray(project.lastState?.photos) ? project.lastState.photos : [];
  const allProjectPhotos = [
    ...sessions.flatMap((session) => (Array.isArray(session?.photos) ? session.photos : [])),
    ...lastStatePhotos,
  ];
  const uniqueProjectPhotos = [...new Map(
    allProjectPhotos.map((photo, index) => [
      photo.id || `${photo.timestamp || "photo"}-${photo.lat || "x"}-${photo.lng || "x"}-${index}`,
      photo,
    ]),
  ).values()];
  return normalizeOverlayProject({
    code: project.code,
    name: project.name || project.code,
    color: OVERLAY_COLORS[nextIndex % OVERLAY_COLORS.length],
    visible: true,
    routeVisible: true,
    photosVisible: true,
    constructionVisible: true,
    points: primaryPoints.length > 0 ? primaryPoints : lastStatePoints,
    photos: uniqueProjectPhotos,
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
    routeVisible: project.routeVisible !== false,
    photosVisible: project.photosVisible !== false,
    constructionVisible: project.constructionVisible !== false,
    points: Array.isArray(project.points) ? project.points : [],
    photos: Array.isArray(project.photos) ? structuredClone(project.photos) : [],
    milestones: normalizeMilestones(Array.isArray(project.milestones) ? structuredClone(project.milestones) : []),
  };
}

function renderProjectOverlays() {
  projectOverlayLayer.clearLayers();
  scheduleNaverNativeOverlayRender();
  if (!els.overlayProjectList) {
    return;
  }
  els.overlayProjectList.innerHTML = "";

  if (state.overlayProjects.length === 0) {
    renderConstructionVisibilityControls(getVisibleConstructionPinCount());
    const empty = document.createElement("p");
    empty.className = "status-text";
    empty.textContent = "아직 함께 보는 프로젝트가 없습니다.";
    els.overlayProjectList.append(empty);
    return;
  }

  state.overlayProjects.forEach((project) => {
    const points = Array.isArray(project.points) ? project.points : [];
    if (project.visible !== false && project.routeVisible !== false && points.length > 0) {
      L.polyline(points.map((point) => [point.lat, point.lng]), {
        color: project.color,
        weight: 5,
        opacity: 0.82,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(projectOverlayLayer);
    }
    if (
      project.visible !== false &&
      project.photosVisible !== false &&
      state.photoPinsVisible &&
      Array.isArray(project.photos)
    ) {
      renderOverlayPhotoMarkers(project);
    }
    if (
      project.visible !== false &&
      project.constructionVisible !== false &&
      state.constructionPinsVisible &&
      Array.isArray(project.milestones)
    ) {
      project.milestones
        .filter(isMapInfoPin)
        .forEach((pin) => {
          const pinLabel = getMapPinLabel(pin);
          const icon = pin.type === "memo" ? createMemoMarkerIcon(pin) : createConstructionMarkerIcon(pin);
          L.marker([pin.lat, pin.lng], {
            icon,
            title: `${project.name} · ${pin.name || pinLabel}`,
          })
            .on("click", () => {
              openConstructionDetail(pin, project.name);
            })
            .addTo(projectOverlayLayer);
        });
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
      renderMilestones();
      renderPhotoMapMarkers(getVisiblePhotos());
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
    const photoCount = (project.photos || []).filter(hasPhotoPosition).length;
    const constructionCount = (project.milestones || []).filter((pin) => pin.type === "construction").length;
    const memoCount = (project.milestones || []).filter((pin) => pin.type === "memo").length;
    meta.textContent = `${project.code} · ${points.length}점 · 사진 ${photoCount} · 공사 ${constructionCount} · 메모 ${memoCount}`;
    body.append(title, meta);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.textContent = "삭제";
    removeButton.addEventListener("click", () => removeOverlayProject(project.code));

    const visibilityOptions = document.createElement("div");
    visibilityOptions.className = "overlay-visibility-options";
    visibilityOptions.append(
      createOverlayVisibilityButton(project, "routeVisible", "노선"),
      createOverlayVisibilityButton(project, "photosVisible", "사진"),
      createOverlayVisibilityButton(project, "constructionVisible", "공사구역"),
    );

    item.append(toggle, swatch, body, removeButton, visibilityOptions);
    els.overlayProjectList.append(item);
  });
  renderConstructionVisibilityControls(getVisibleConstructionPinCount());
}

function createOverlayVisibilityButton(project, property, label) {
  const button = document.createElement("button");
  const isVisible = project[property] !== false;
  button.type = "button";
  button.className = "overlay-visibility-button";
  button.classList.toggle("is-active", isVisible);
  button.textContent = label;
  button.disabled = project.visible === false;
  button.setAttribute("aria-pressed", String(isVisible));
  button.addEventListener("click", () => {
    project[property] = project[property] === false;
    persist();
    renderProjectOverlays();
    renderMilestones();
    renderPhotoMapMarkers(getVisiblePhotos());
  });
  return button;
}

function renderOverlayPhotoMarkers(project) {
  const photos = (project.photos || []).filter(hasPhotoPosition);
  const clusters = clusterPhotosForMap(photos);
  clusters.forEach((cluster) => {
    const firstPhoto = cluster.photos[0];
    const size = 42;
    const isCluster = cluster.photos.length > 1;
    const markerClass = isCluster ? "photo-cluster-marker" : "photo-single-marker";
    const countMarkup = isCluster ? `<span>${cluster.photos.length}</span>` : "";
    const icon = L.divIcon({
      className: "",
      html: `
        <button class="${markerClass} overlay-photo-marker" type="button" style="--overlay-photo-color:${project.color}" aria-label="비교 프로젝트 사진 ${cluster.photos.length}장">
          <img src="${firstPhoto.src}" alt="" />
          ${countMarkup}
        </button>
      `,
      iconSize: [size, size],
      iconAnchor: getSeparatedMarkerAnchor("photo", size, size, cluster),
      popupAnchor: [0, -34],
    });
    L.marker([cluster.lat, cluster.lng], {
      icon,
      title: `${project.name} · ${isCluster ? `사진 ${cluster.photos.length}장` : getPhotoDisplayName(firstPhoto)}`,
    })
      .on("click", () => {
        if (isCluster) {
          showPhotoTray(cluster.photos, {
            photoPool: photos,
            readOnly: true,
            sourceLabel: project.name,
          });
          return;
        }
        openPhotoModal(firstPhoto, {
          preferredPhotos: photos,
          photoPool: photos,
          readOnly: true,
          sourceLabel: project.name,
        });
      })
      .addTo(projectOverlayLayer);
  });
}

function removeOverlayProject(code) {
  state.overlayProjects = state.overlayProjects.filter((project) => project.code !== code);
  persist();
  renderProjectOverlays();
  renderMilestones();
  renderPhotoMapMarkers(getVisiblePhotos());
  setStatus("비교 프로젝트의 동선, 사진, 공사구역을 화면에서 제거했습니다.");
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

function reorderPhotosByRouteOrder(points = state.points, photos = state.photos) {
  if (!Array.isArray(photos) || photos.length === 0) {
    return false;
  }
  const route = (Array.isArray(points) ? points : []).filter(
    (point) => Number.isFinite(Number(point?.lat)) && Number.isFinite(Number(point?.lng)) && point?.skipInRoute !== true,
  );
  const autoPhotos = photos.filter(isAutoRouteNamedPhoto);
  if (autoPhotos.length === 0) {
    return false;
  }

  const ordered = autoPhotos
    .map((photo, originalIndex) => ({
      photo,
      originalIndex,
      progress: getPhotoRouteProgress(route, photo),
      timestamp: Number(photo.timestamp) || 0,
    }))
    .sort((left, right) => {
      const leftProgress = Number.isFinite(left.progress) ? left.progress : Number.POSITIVE_INFINITY;
      const rightProgress = Number.isFinite(right.progress) ? right.progress : Number.POSITIVE_INFINITY;
      return leftProgress - rightProgress || left.timestamp - right.timestamp || left.originalIndex - right.originalIndex;
    });

  const prefix = getProjectNamePrefix();
  const width = Math.max(3, String(ordered.length).length);
  const namesById = new Map();
  let changed = false;
  ordered.forEach(({ photo }, index) => {
    const routeOrder = index + 1;
    const displayName = `${prefix}-${String(routeOrder).padStart(width, "0")}`;
    if (photo.displayName !== displayName || photo.routeOrder !== routeOrder || photo.autoRouteName !== true) {
      photo.displayName = displayName;
      photo.routeOrder = routeOrder;
      photo.autoRouteName = true;
      changed = true;
    }
    if (photo.id) {
      namesById.set(photo.id, { displayName, routeOrder });
    }
  });

  if (namesById.size > 0) {
    state.sessions.forEach((session) => {
      (session.photos || []).forEach((photo) => {
        const renamed = namesById.get(photo.id);
        if (!renamed) return;
        photo.displayName = renamed.displayName;
        photo.routeOrder = renamed.routeOrder;
        photo.autoRouteName = true;
      });
    });
  }
  return changed;
}

function reorderConstructionPinsByRouteOrder(points = state.points, milestones = state.milestones) {
  if (!Array.isArray(milestones) || milestones.length === 0) {
    return false;
  }
  const route = (Array.isArray(points) ? points : []).filter(
    (point) => Number.isFinite(Number(point?.lat)) && Number.isFinite(Number(point?.lng)) && point?.skipInRoute !== true,
  );
  const targets = milestones
    .filter((pin) => pin?.type === "construction")
    .map((pin, originalIndex) => ({
      pin,
      originalIndex,
      codeParts: getAutoConstructionCodeParts(pin),
    }))
    .filter((item) => item.codeParts)
    .map((item) => ({
      ...item,
      progress: getPhotoRouteProgress(route, {
        ...item.pin,
        timestamp: getConstructionOrderTime(item.pin),
      }),
      createdAt: getConstructionOrderTime(item.pin),
    }))
    .sort((left, right) => {
      const leftProgress = Number.isFinite(left.progress) ? left.progress : Number.POSITIVE_INFINITY;
      const rightProgress = Number.isFinite(right.progress) ? right.progress : Number.POSITIVE_INFINITY;
      return leftProgress - rightProgress || left.createdAt - right.createdAt || left.originalIndex - right.originalIndex;
    });
  if (targets.length === 0) {
    return false;
  }

  const width = Math.max(2, String(targets.length).length);
  let changed = false;
  targets.forEach(({ pin, codeParts }, index) => {
    const routeOrder = index + 1;
    const displayCode = `C${String(routeOrder).padStart(width, "0")}${codeParts.suffix}`;
    if (pin.displayCode !== displayCode || pin.routeOrder !== routeOrder || pin.autoRouteCode !== true) {
      pin.displayCode = displayCode;
      pin.routeOrder = routeOrder;
      pin.autoRouteCode = true;
      changed = true;
    }
  });
  return changed;
}

function getAutoConstructionCodeParts(pin) {
  if (pin?.autoRouteCode === false) {
    return null;
  }
  const code = String(pin?.displayCode || pin?.code || "").trim();
  if (!code) {
    return { suffix: "" };
  }
  const match = code.match(/^C\d+(.*)$/i);
  return match ? { suffix: match[1] || "" } : null;
}

function getConstructionOrderTime(pin) {
  const numeric = Number(pin?.createdAt ?? pin?.timestamp);
  if (Number.isFinite(numeric)) {
    return numeric;
  }
  const parsed = Date.parse(pin?.createdAt || pin?.timestamp || "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function compareMapInfoPinsForList(left, right) {
  const leftIsConstruction = left?.type === "construction";
  const rightIsConstruction = right?.type === "construction";
  if (leftIsConstruction !== rightIsConstruction) {
    return leftIsConstruction ? -1 : 1;
  }
  if (leftIsConstruction) {
    const leftOrder = getConstructionDisplayOrder(left);
    const rightOrder = getConstructionDisplayOrder(right);
    return leftOrder - rightOrder || getConstructionOrderTime(left) - getConstructionOrderTime(right);
  }
  return getConstructionOrderTime(left) - getConstructionOrderTime(right);
}

function getConstructionDisplayOrder(pin) {
  const routeOrder = Number(pin?.routeOrder);
  if (Number.isFinite(routeOrder) && routeOrder > 0) {
    return routeOrder;
  }
  const match = String(pin?.displayCode || pin?.code || "").match(/^C(\d+)/i);
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
}

function isAutoRouteNamedPhoto(photo) {
  if (photo?.autoRouteName === false) {
    return false;
  }
  if (photo?.autoRouteName === true) {
    return true;
  }
  const name = String(photo?.displayName || photo?.name || "").trim();
  return !name || /-\d{3,6}$/.test(name) || /^사진\s*\d+$/.test(name);
}

function getPhotoRouteProgress(route, photo) {
  const photoLat = Number(photo?.lat);
  const photoLng = Number(photo?.lng);
  if (!Number.isFinite(photoLat) || !Number.isFinite(photoLng) || route.length < 2) {
    return Number.POSITIVE_INFINITY;
  }

  const candidates = [];
  let cumulative = 0;
  for (let index = 1; index < route.length; index += 1) {
    const start = route[index - 1];
    const end = route[index];
    const segment = projectPointToRouteSegment(photoLat, photoLng, start, end);
    const segmentLength = segment.segmentLength;
    candidates.push({
      distance: segment.distance,
      progress: cumulative + segmentLength * segment.ratio,
      timestamp: interpolateTimestamp(start.timestamp, end.timestamp, segment.ratio),
    });
    cumulative += segmentLength;
  }
  if (candidates.length === 0) {
    return Number.POSITIVE_INFINITY;
  }
  const nearestDistance = Math.min(...candidates.map((candidate) => candidate.distance));
  const nearby = candidates.filter(
    (candidate) => candidate.distance <= Math.max(nearestDistance + 12, nearestDistance * 1.25),
  );
  const photoTimestamp = Number(photo.timestamp);
  if (Number.isFinite(photoTimestamp) && nearby.some((candidate) => Number.isFinite(candidate.timestamp))) {
    nearby.sort((left, right) => {
      const leftTime = Number.isFinite(left.timestamp) ? Math.abs(left.timestamp - photoTimestamp) : Number.POSITIVE_INFINITY;
      const rightTime = Number.isFinite(right.timestamp) ? Math.abs(right.timestamp - photoTimestamp) : Number.POSITIVE_INFINITY;
      return leftTime - rightTime || left.distance - right.distance;
    });
    return nearby[0].progress;
  }
  nearby.sort((left, right) => left.distance - right.distance || left.progress - right.progress);
  return nearby[0].progress;
}

function projectPointToRouteSegment(photoLat, photoLng, start, end) {
  const earthRadius = 6371000;
  const referenceLat = ((Number(start.lat) + Number(end.lat) + photoLat) / 3) * (Math.PI / 180);
  const metersPerLatitude = earthRadius * (Math.PI / 180);
  const metersPerLongitude = metersPerLatitude * Math.cos(referenceLat);
  const dx = (Number(end.lng) - Number(start.lng)) * metersPerLongitude;
  const dy = (Number(end.lat) - Number(start.lat)) * metersPerLatitude;
  const px = (photoLng - Number(start.lng)) * metersPerLongitude;
  const py = (photoLat - Number(start.lat)) * metersPerLatitude;
  const lengthSquared = dx * dx + dy * dy;
  const ratio = lengthSquared > 0 ? Math.max(0, Math.min(1, (px * dx + py * dy) / lengthSquared)) : 0;
  const offsetX = px - dx * ratio;
  const offsetY = py - dy * ratio;
  return {
    ratio,
    distance: Math.hypot(offsetX, offsetY),
    segmentLength: Math.sqrt(lengthSquared),
  };
}

function interpolateTimestamp(start, end, ratio) {
  const startTime = Number(start);
  const endTime = Number(end);
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
    return Number.NaN;
  }
  return startTime + (endTime - startTime) * ratio;
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
  const selectedTags = normalizeTagValues(state.photoTagFilters);
  const todayKey = new Date().toDateString();
  const bounds = getCurrentMapBounds();

  const filtered = state.photos.filter((photo) => {
    if (selectedTags.length > 0 && !selectedTags.some((tag) => getPhotoTags(photo).includes(tag))) {
      return false;
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
  return filtered.sort(comparePhotosForDisplay);
}

function comparePhotosForDisplay(left, right) {
  if (state.photoSort === "captured") {
    return (Number(right?.timestamp) || 0) - (Number(left?.timestamp) || 0);
  }
  const leftOrder = Number(left?.routeOrder);
  const rightOrder = Number(right?.routeOrder);
  const leftHasOrder = Number.isFinite(leftOrder) && leftOrder > 0;
  const rightHasOrder = Number.isFinite(rightOrder) && rightOrder > 0;
  if (leftHasOrder !== rightHasOrder) {
    return leftHasOrder ? -1 : 1;
  }
  if (leftHasOrder && leftOrder !== rightOrder) {
    return leftOrder - rightOrder;
  }
  return getPhotoDisplayName(left).localeCompare(getPhotoDisplayName(right), "ko", {
    numeric: true,
    sensitivity: "base",
  }) || (Number(left?.timestamp) || 0) - (Number(right?.timestamp) || 0);
}

function syncPhotoFilterOptions() {
  const availableValues = new Set(["all", "hidden", "positioned", "missing", "map", "memo", "tagged", "today"]);
  if (String(state.photoFilter || "").startsWith("tag:")) {
    state.photoTagFilters = normalizeTagValues([
      ...state.photoTagFilters,
      String(state.photoFilter).slice(4),
    ]);
    state.photoFilter = "all";
  } else if (!availableValues.has(state.photoFilter)) {
    state.photoFilter = "all";
  }
  const availableTags = getAllPhotoTags();
  state.photoTagFilters = normalizeTagValues(state.photoTagFilters).filter((tag) => availableTags.includes(tag));
  renderMultiTagFilter({
    details: els.photoTagFilter,
    summary: els.photoTagFilterSummary,
    menu: els.photoTagFilterMenu,
    availableTags,
    selectedTags: state.photoTagFilters,
    emptyText: "등록된 사진 태그가 없습니다.",
    onChange: (tags) => {
      state.photoTagFilters = tags;
      persistPhotoDisplaySettings();
      renderPhotos();
    },
  });
}

function getAllPhotoTags() {
  return [...new Set(state.photos.flatMap((photo) => getPhotoTags(photo)))].sort((a, b) =>
    a.localeCompare(b, "ko"),
  );
}

function openPhotoModal(photo, options = {}) {
  if (!photo) {
    return;
  }
  const preserveSequence = Boolean(options.preserveSequence);
  if (!preserveSequence || !state.photoModalSequenceIds.includes(photo.id)) {
    photoModalPhotoPool = buildNearbyPhotoSequence(
      photo,
      options.preferredPhotos,
      options.photoPool,
    );
    state.photoModalSequenceIds = photoModalPhotoPool.map((item) => item.id);
    photoModalReadOnly = Boolean(options.readOnly);
    photoModalSourceLabel = String(options.sourceLabel || "").trim();
  }
  const hasPosition = hasPhotoPosition(photo);
  state.activePhotoId = photo.id;
  els.photoModalImage.src = photo.src;
  els.photoModalImage.alt = getPhotoDisplayName(photo);
  els.photoModalTitle.textContent = photoModalSourceLabel
    ? `${photoModalSourceLabel} · ${getPhotoDisplayName(photo)}`
    : getPhotoDisplayName(photo);
  const photoMeta = hasPosition
    ? `${formatDate(photo.timestamp)} · ${photo.lat.toFixed(5)}, ${photo.lng.toFixed(5)} · ${getLocationSourceLabel(photo.locationSource)}`
    : `${formatDate(photo.timestamp)} · 위치 없음`;
  els.photoModalMeta.textContent = photoModalReadOnly ? `비교 자료 · 읽기 전용 · ${photoMeta}` : photoMeta;
  els.photoModalMemo.textContent = photo.memo?.trim() || "등록된 메모가 없습니다.";
  els.photoModalMemo.classList.toggle("is-empty", !photo.memo?.trim());
  renderModalTags(photo);
  els.photoModalLocateBtn.disabled = !hasPosition;
  if (els.photoModalNaverBtn) {
    els.photoModalNaverBtn.disabled = !hasPosition;
  }
  if (els.photoModalNaverPanoramaBtn) {
    els.photoModalNaverPanoramaBtn.disabled = !hasPosition;
  }
  els.photoModalMemoBtn.hidden = photoModalReadOnly;
  els.photoModalTagBtn.hidden = photoModalReadOnly;
  renderPhotoModalNavigation();
  els.photoModal.hidden = false;
  document.body.classList.add("is-photo-modal-open");
}

function closePhotoModal() {
  els.photoModal.hidden = true;
  state.activePhotoId = null;
  state.photoModalSequenceIds = [];
  photoModalPhotoPool = [];
  photoModalReadOnly = false;
  photoModalSourceLabel = "";
  photoModalTouchStartX = null;
  els.photoModalImage.removeAttribute("src");
  if (els.photoModalCount) {
    els.photoModalCount.textContent = "";
  }
  document.body.classList.remove("is-photo-modal-open");
}

function normalizeTagValues(value) {
  const source = Array.isArray(value) ? value : String(value || "").split(",");
  return [...new Set(source.map((tag) => String(tag || "").trim()).filter(Boolean))];
}

function renderMultiTagFilter({ details, summary, menu, availableTags, selectedTags, emptyText, onChange }) {
  if (!details || !summary || !menu) {
    return;
  }
  const wasOpen = details.open;
  const available = normalizeTagValues(availableTags).sort((a, b) => a.localeCompare(b, "ko"));
  const selected = normalizeTagValues(selectedTags).filter((tag) => available.includes(tag));
  summary.textContent = selected.length > 0 ? `태그 ${selected.length}개` : "태그 선택";
  summary.classList.toggle("is-active", selected.length > 0);
  menu.innerHTML = "";

  if (available.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = emptyText;
    menu.append(empty);
  } else {
    available.forEach((tag) => {
      const label = document.createElement("label");
      const checkbox = document.createElement("input");
      const text = document.createElement("span");
      checkbox.type = "checkbox";
      checkbox.checked = selected.includes(tag);
      text.textContent = tag;
      checkbox.addEventListener("change", () => {
        const next = new Set(selected);
        if (checkbox.checked) {
          next.add(tag);
        } else {
          next.delete(tag);
        }
        onChange([...next]);
      });
      label.append(checkbox, text);
      menu.append(label);
    });
  }

  const clearButton = document.createElement("button");
  clearButton.type = "button";
  clearButton.textContent = "태그 전체 해제";
  clearButton.disabled = selected.length === 0;
  clearButton.addEventListener("click", () => onChange([]));
  menu.append(clearButton);
  details.open = wasOpen;
}

function buildNearbyPhotoSequence(anchorPhoto, preferredPhotos = [], photoPool = null) {
  const visiblePhotos = Array.isArray(photoPool) ? photoPool : getVisiblePhotos();
  const candidates = visiblePhotos.some((photo) => photo.id === anchorPhoto.id)
    ? visiblePhotos
    : [anchorPhoto, ...visiblePhotos];
  const preferredIds = new Set((preferredPhotos || []).map((photo) => photo.id));
  const orderByDistance = (left, right) => {
    const leftDistance = hasPhotoPosition(anchorPhoto) && hasPhotoPosition(left)
      ? getDistanceMeters(anchorPhoto, left)
      : Number.POSITIVE_INFINITY;
    const rightDistance = hasPhotoPosition(anchorPhoto) && hasPhotoPosition(right)
      ? getDistanceMeters(anchorPhoto, right)
      : Number.POSITIVE_INFINITY;
    if (leftDistance !== rightDistance) {
      return leftDistance - rightDistance;
    }
    return new Date(left.timestamp || 0).getTime() - new Date(right.timestamp || 0).getTime();
  };
  const preferred = candidates
    .filter((photo) => photo.id !== anchorPhoto.id && preferredIds.has(photo.id))
    .sort(orderByDistance);
  const remaining = candidates
    .filter((photo) => photo.id !== anchorPhoto.id && !preferredIds.has(photo.id))
    .sort(orderByDistance);
  return [anchorPhoto, ...preferred, ...remaining];
}

function navigatePhotoModal(direction) {
  const sequence = state.photoModalSequenceIds;
  if (sequence.length < 2 || !state.activePhotoId) {
    return;
  }
  const currentIndex = Math.max(0, sequence.indexOf(state.activePhotoId));
  const nextIndex = (currentIndex + direction + sequence.length) % sequence.length;
  const nextPhoto = photoModalPhotoPool.find((photo) => photo.id === sequence[nextIndex]);
  if (nextPhoto) {
    openPhotoModal(nextPhoto, { preserveSequence: true });
  }
}

function renderPhotoModalNavigation() {
  const count = state.photoModalSequenceIds.length;
  const currentIndex = state.photoModalSequenceIds.indexOf(state.activePhotoId);
  const hasMultiplePhotos = count > 1;
  if (els.photoModalPrevious) {
    els.photoModalPrevious.hidden = !hasMultiplePhotos;
  }
  if (els.photoModalNext) {
    els.photoModalNext.hidden = !hasMultiplePhotos;
  }
  if (els.photoModalCount) {
    els.photoModalCount.hidden = count === 0;
    els.photoModalCount.textContent = count > 0 ? `${Math.max(0, currentIndex) + 1} / ${count}` : "";
  }
}

function getActiveModalPhoto() {
  return photoModalPhotoPool.find((photo) => photo.id === state.activePhotoId) || null;
}

function loadNaverMapsApi() {
  if (window.naver?.maps?.Map) {
    return Promise.resolve(window.naver.maps);
  }
  if (naverMapsScriptPromise) {
    return naverMapsScriptPromise;
  }
  naverMapsScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(NAVER_MAP_CLIENT_ID)}`;
    script.async = true;
    script.dataset.naverMapsApi = "true";
    script.addEventListener("load", () => {
      waitForNaverMapsApi()
        .then(resolve)
        .catch(() => {
          naverMapsScriptPromise = null;
          reject(new Error("naver_maps_unavailable"));
        });
    });
    script.addEventListener("error", () => {
      naverMapsScriptPromise = null;
      reject(new Error("naver_maps_load_failed"));
    });
    document.head.append(script);
  });
  return naverMapsScriptPromise;
}

function waitForNaverMapsApi(timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const checkApi = () => {
      if (window.naver?.maps?.Map) {
        resolve(window.naver.maps);
        return;
      }
      if (Date.now() - startedAt >= timeoutMs) {
        naverMapsScriptPromise = null;
        reject(new Error("naver_maps_unavailable"));
        return;
      }
      window.setTimeout(checkApi, 50);
    };
    checkApi();
  });
}

function openNaverMapLocation(position, name = "선택 위치") {
  if (!hasPhotoPosition(position)) {
    return;
  }
  const query = new URLSearchParams({
    lat: Number(position.lat).toFixed(7),
    lng: Number(position.lng).toFixed(7),
    name: String(name || "선택 위치").slice(0, 80),
  });
  openReusableNaverWindow(`/naver-map.html?${query.toString()}`);
}

function openNaverRoadview(position, name = "선택 위치") {
  if (!hasPhotoPosition(position)) {
    return;
  }
  const query = new URLSearchParams({
    lat: Number(position.lat).toFixed(7),
    lng: Number(position.lng).toFixed(7),
    name: String(name || "선택 위치").slice(0, 80),
  });
  openReusableNaverWindow(`/naver-view.html?${query.toString()}`);
}

function openReusableNaverWindow(url) {
  try {
    if (naverExternalWindow && !naverExternalWindow.closed) {
      naverExternalWindow.location.href = url;
      naverExternalWindow.focus?.();
      return true;
    }
  } catch {
    naverExternalWindow = null;
  }
  naverExternalWindow = window.open(url, "routePhotoNaverWindow");
  if (naverExternalWindow) {
    naverExternalWindow.focus?.();
    return true;
  }
  setStatus("새 창이 차단되었습니다. 브라우저 주소창의 팝업 허용을 켜 주세요.", "warning");
  return false;
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
  const result = updatePhotoCopies(photoId, (item) => {
    item.memo = memo.trim();
  });
  persist();
  renderPhotos();
  if (result.touchedSessionCount > 0 && state.projectCode) {
    void syncProjectState("edit-photo");
  }
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
  const result = updatePhotoCopies(photoId, (item) => {
    item.tags = tags.trim();
  });
  persist();
  renderPhotos();
  if (result.touchedSessionCount > 0 && state.projectCode) {
    void syncProjectState("edit-photo");
  }
  if (options.keepModalOpen) {
    openPhotoModal(photo);
  }
}

function movePhotoToLatLng(photoId, latlng) {
  const photo = state.photos.find((item) => item.id === photoId);
  if (!photo) {
    return;
  }
  const positionEditedAt = Date.now();
  const result = updatePhotoCopies(photoId, (item) => {
    item.lat = latlng.lat;
    item.lng = latlng.lng;
    item.locationSource = "map";
    item.positionEdited = true;
    item.positionEditedAt = positionEditedAt;
  });
  state.selectedPosition = {
    lat: latlng.lat,
    lng: latlng.lng,
    timestamp: Date.now(),
  };
  reorderPhotosByRouteOrder();
  persist();
  render();
  if (result.touchedSessionCount > 0 && state.projectCode) {
    void syncProjectState("move-photo");
  }
  setStatus(`${getPhotoDisplayName(photo)} 위치를 현재 지도 위치로 수정했습니다.`, "success");
}

function deletePhoto(photoId) {
  const ok = window.confirm("이 사진을 삭제할까요?");
  if (!ok) {
    return;
  }
  const result = deletePhotoCopies(photoId);
  reorderPhotosByRouteOrder();
  void cleanupUnreferencedCachedPhotos([photoId]);
  persist();
  render();
  if (result.touchedSessionCount > 0 && state.projectCode) {
    void syncProjectState("delete-photo");
  }
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
  els.mapProvider.value = state.mapProvider || "naver";
  const desiredMapProvider = state.mapProvider === "naver" ? "naver" : "osm";
  const canActivateMapProvider = Boolean(state.user || initialShareToken);
  const retryAllowed = desiredMapProvider !== "naver" || Date.now() >= naverMapRetryAfter;
  if (
    canActivateMapProvider &&
    retryAllowed &&
    desiredMapProvider !== activeMapProvider &&
    desiredMapProvider !== pendingMapProvider
  ) {
    void applyMapProvider(desiredMapProvider, { quiet: true });
  }
  els.wakeLockToggle.checked = Boolean(state.wakeLockEnabled);
}

function renderSessions() {
  if (!els.historyList) {
    return;
  }

  els.historyList.innerHTML = "";
  state.overlaySessionIds = state.overlaySessionIds.filter((sessionId) =>
    state.sessions.some((session) => session.id === sessionId));
  if (els.historyOverlayStatus) {
    els.historyOverlayStatus.textContent = `겹쳐보기 ${state.overlaySessionIds.length}개`;
  }
  if (els.clearHistoryOverlaysBtn) {
    els.clearHistoryOverlaysBtn.disabled = state.overlaySessionIds.length === 0;
  }
  const pendingSessionIds = new Set(
    state.pendingSessionDeletes
      .filter((item) => item.projectCode === state.projectCode && (!item.userId || item.userId === state.user?.id))
      .map((item) => item.sessionId),
  );
  const visibleSessions = state.sessions.filter((session) => !pendingSessionIds.has(session.id));
  const currentRecordSignature = getCurrentRecordSignature();
  if (visibleSessions.length === 0) {
    const empty = document.createElement("p");
    empty.className = "status-text";
    empty.textContent = pendingSessionIds.size > 0 ? "기록 삭제를 서버에서 확인하는 중입니다." : "아직 저장된 기록이 없습니다.";
    els.historyList.append(empty);
  }

  visibleSessions.forEach((session) => {
    const isPrimary = state.primarySessionId === session.id;
    const isCurrentRecord = Boolean(session.signature && currentRecordSignature === session.signature);
    const isOverlay = state.overlaySessionIds.includes(session.id);
    const overlayColor = isOverlay ? getSessionOverlayColor(session.id) : "";
    const item = document.createElement("article");
    item.className = "history-item";
    item.classList.toggle("is-continuing", state.continuingSessionId === session.id);
    item.classList.toggle("is-primary", isPrimary);
    item.classList.toggle("is-overlay", isOverlay);
    if (isOverlay) item.style.setProperty("--history-overlay-color", overlayColor);

    const body = document.createElement("div");
    body.className = "history-info";
    const title = document.createElement("strong");
    const meta = document.createElement("span");
    title.textContent = session.name || `${formatDate(session.startedAt)} 기록`;
    const updatedAt = getSessionUpdatedTime(session);
    meta.textContent = [
      `${((session.distanceMeters || 0) / 1000).toFixed(2)} km`,
      `${(session.points || []).length}점`,
      `사진 ${(session.photos || []).length}장`,
      updatedAt ? `최종 수정 ${formatSessionDateTime(updatedAt)}` : "",
    ].filter(Boolean).join(" · ");
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
    const overlayButton = document.createElement("button");
    overlayButton.type = "button";
    overlayButton.textContent = isCurrentRecord ? "현재 동선" : isOverlay ? "겹쳐보기 해제" : "겹쳐보기";
    overlayButton.className = "history-overlay-action";
    overlayButton.classList.toggle("is-active", isOverlay);
    if (isOverlay) overlayButton.style.setProperty("--history-overlay-color", overlayColor);
    overlayButton.disabled = isCurrentRecord || (session.points || []).length < 2;
    overlayButton.addEventListener("click", () => toggleSessionOverlay(session.id));
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "수정";
    editButton.addEventListener("click", () => editSessionDetails(session.id));
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "삭제";
    deleteButton.addEventListener("click", () => deleteSession(session.id));
    actions.append(primaryButton, resumeButton, loadButton, overlayButton, editButton, deleteButton);

    item.append(body, actions);
    els.historyList.append(item);
  });

  if (pendingSessionIds.size > 0 && visibleSessions.length > 0) {
    const pendingStatus = document.createElement("p");
    pendingStatus.className = "status-text";
    pendingStatus.textContent = `삭제 대기 중 ${pendingSessionIds.size}건 · 온라인 연결 시 자동 확인합니다.`;
    els.historyList.append(pendingStatus);
  }
}

function getSessionOverlayColor(sessionId) {
  const sessionIndex = Math.max(0, state.sessions.findIndex((session) => session.id === sessionId));
  return SESSION_OVERLAY_COLORS[sessionIndex % SESSION_OVERLAY_COLORS.length];
}

function getVisibleSessionOverlays() {
  return state.overlaySessionIds
    .map((sessionId) => {
      const session = state.sessions.find((item) => item.id === sessionId);
      return session && (session.points || []).length >= 2
        ? { session, color: getSessionOverlayColor(sessionId) }
        : null;
    })
    .filter(Boolean);
}

function toggleSessionOverlay(sessionId) {
  const session = state.sessions.find((item) => item.id === sessionId);
  if (!session || (session.points || []).length < 2) {
    setStatus("위치점이 2개 이상인 기록만 겹쳐 볼 수 있습니다.", "warning");
    return;
  }
  if (state.overlaySessionIds.includes(sessionId)) {
    removeSessionOverlay(sessionId);
    renderSessionOverlays();
    renderSessions();
    setStatus(`'${session.name || "저장 기록"}' 겹쳐보기를 해제했습니다.`);
    return;
  }
  if (getCurrentRecordSignature() === session.signature) {
    setStatus("이 기록은 현재 기본 동선으로 표시되고 있습니다. 다른 기록을 겹쳐보기로 선택해 주세요.", "warning");
    return;
  }
  state.overlaySessionIds.push(sessionId);
  renderSessionOverlays();
  renderSessions();
  setStatus(`'${session.name || "저장 기록"}' 동선을 겹쳐 표시했습니다.`, "success");
}

function removeSessionOverlay(sessionId) {
  state.overlaySessionIds = state.overlaySessionIds.filter((id) => id !== sessionId);
}

function clearSessionOverlays() {
  if (!state.overlaySessionIds.length) return;
  state.overlaySessionIds = [];
  renderSessionOverlays();
  renderSessions();
  setStatus("모든 기록 겹쳐보기를 초기화했습니다.");
}

function renderSessionOverlays() {
  sessionOverlayLayer.clearLayers();
  getVisibleSessionOverlays().forEach(({ session, color }) => {
    const points = session.points.filter((point) =>
      Number.isFinite(Number(point?.lat)) && Number.isFinite(Number(point?.lng)));
    if (points.length < 2) return;
    const line = L.polyline(points.map((point) => [Number(point.lat), Number(point.lng)]), {
      color,
      weight: 5,
      opacity: 0.76,
      lineCap: "round",
      lineJoin: "round",
    }).addTo(sessionOverlayLayer);
    line.bringToBack?.();
  });
  scheduleNaverNativeOverlayRender();
}

function getSessionUpdatedTime(session) {
  return Math.max(
    0,
    ...[session?.updatedAt, session?.editedAt, session?.continuedAt, session?.endedAt, session?.savedAt, session?.startedAt]
      .map((value) => {
        const numeric = Number(value);
        if (Number.isFinite(numeric) && numeric > 0) {
          return numeric;
        }
        const parsed = Date.parse(value || "");
        return Number.isFinite(parsed) ? parsed : 0;
      }),
  );
}

function fitToData() {
  const bounds = L.latLngBounds([]);
  state.mapReferences
    .filter((reference) => reference.visible !== false)
    .forEach((reference) => reference.controlPoints.forEach((point) => bounds.extend([point.lat, point.lng])));
  state.plannedRoutes
    .filter((route) => route.visible !== false)
    .forEach((route) => route.points.forEach((point) => bounds.extend([point.lat, point.lng])));
  state.points.forEach((point) => bounds.extend([point.lat, point.lng]));
  if (state.photoPinsVisible) {
    state.photos.filter(hasPhotoPosition).forEach((photo) => bounds.extend([photo.lat, photo.lng]));
  }
  if (state.constructionPinsVisible) {
    state.milestones
      .filter(isMapInfoPin)
      .forEach((pin) => bounds.extend([pin.lat, pin.lng]));
  }
  state.overlayProjects
    .filter((project) => project.visible !== false)
    .forEach((project) => {
      if (project.routeVisible !== false) {
        project.points.forEach((point) => bounds.extend([point.lat, point.lng]));
      }
      if (project.photosVisible !== false && state.photoPinsVisible) {
        (project.photos || []).filter(hasPhotoPosition).forEach((photo) => bounds.extend([photo.lat, photo.lng]));
      }
      if (project.constructionVisible !== false && state.constructionPinsVisible) {
        project.milestones
          .filter(isMapInfoPin)
          .forEach((pin) => bounds.extend([pin.lat, pin.lng]));
      }
    });
  getVisibleSessionOverlays().forEach(({ session }) => {
    session.points.forEach((point) => bounds.extend([point.lat, point.lng]));
  });

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
    "map-center": "지도 중앙",
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

function getRouteFollowPoints() {
  const candidateRoute = getVisibleActivePlannedRoute();
  if (candidateRoute?.points?.length >= 2) {
    return getRoutePathPoints(candidateRoute.points);
  }
  return getRoutePathPoints(state.points);
}

function hasCandidateRouteForFollow() {
  return Boolean(getVisibleActivePlannedRoute()?.points?.length >= 2);
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
  const localPayload = createLocalStorageSafePayload(payload);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(localPayload));
    return true;
  } catch (error) {
    console.warn("Storage failed", error);
    const compactPayload = compactLargePhotos(localPayload);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(compactPayload));
      setStatus("브라우저에는 가벼운 복구정보만 보관했습니다. 사진 원본은 별도 저장공간과 서버에서 보호됩니다.");
      return true;
    } catch (fallbackError) {
      console.warn("Compact storage failed", fallbackError);
    }
    setStatus("브라우저 저장공간이 부족합니다. 화면을 닫지 말고 기록 저장을 눌러 서버 저장을 완료해 주세요.", "error");
    return false;
  }
}

function persistPhotoDisplaySettings() {
  try {
    const storedValue = localStorage.getItem(STORAGE_KEY);
    if (!storedValue) {
      return persist();
    }
    const saved = JSON.parse(storedValue);
    saved.photoFilter = state.photoFilter;
    saved.photoTagFilters = normalizeTagValues(state.photoTagFilters);
    saved.photoSort = state.photoSort;
    saved.photoView = state.photoView;
    saved.constructionFilter = state.constructionFilter;
    saved.constructionTagFilters = normalizeTagValues(state.constructionTagFilters);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    return true;
  } catch (error) {
    console.warn("Photo display preference storage failed", error);
    return false;
  }
}

function getPersistPayload() {
  reorderConstructionPinsByRouteOrder();
  return {
    points: state.points,
    photos: state.photos,
    milestones: state.milestones,
    plannedRoutes: state.plannedRoutes,
    activePlannedRouteId: state.activePlannedRouteId,
    mapReferences: state.mapReferences,
    activeMapReferenceId: state.activeMapReferenceId,
    overlayProjects: state.overlayProjects,
    sessions: state.sessions,
    pendingSessionDeletes: state.pendingSessionDeletes,
    primarySessionId: state.primarySessionId,
    selectedPosition: state.selectedPosition,
    initialPosition: state.initialPosition,
    activeStartedAt: state.activeStartedAt,
    liveSyncSessionId: state.liveSyncSessionId,
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
    mapProviderPolicyVersion: MAP_PROVIDER_POLICY_VERSION,
    photoFilter: state.photoFilter,
    photoTagFilters: state.photoTagFilters,
    photoSort: state.photoSort,
    photoView: state.photoView,
    constructionFilter: state.constructionFilter,
    constructionTagFilters: state.constructionTagFilters,
    projectCode: state.projectCode,
    projectName: state.projectName,
    projectAccessRole: state.projectAccessRole,
    projectRevision: state.projectRevision,
    syncDirty: state.syncDirty,
    lastSyncedAt: state.lastSyncedAt,
    lastSyncFailedAt: state.lastSyncFailedAt,
    lastSyncError: state.lastSyncError,
    lastSyncedPointCount: state.lastSyncedPointCount,
  };
}

function saveProjectRecoveryBackup(reason = "local", serverConfirmed = false) {
  if (!state.projectCode) {
    return;
  }
  const hasRecordData =
    state.sessions.length > 0 ||
    state.points.length > 0 ||
    state.photos.length > 0 ||
    state.milestones.length > 0 ||
    state.plannedRoutes.length > 0 ||
    state.mapReferences.length > 0;
  if (!hasRecordData) {
    return;
  }
  const store = readProjectRecoveryStore();
  const backup = {
    code: state.projectCode,
    name: state.projectName,
    ownerUserId: state.user?.id || store[state.projectCode]?.ownerUserId || "",
    savedAt: Date.now(),
    reason,
    serverConfirmed,
    projectRevision: state.projectRevision || "",
    points: structuredClone(state.points),
    photos: createRecoveryPhotoList(state.photos),
    milestones: structuredClone(state.milestones),
    plannedRoutes: structuredClone(state.plannedRoutes),
    activePlannedRouteId: state.activePlannedRouteId,
    mapReferences: structuredClone(state.mapReferences),
    activeMapReferenceId: state.activeMapReferenceId,
    sessions: state.sessions.map((session) => ({
      ...structuredClone(session),
      photos: createRecoveryPhotoList(session.photos || []),
    })),
    primarySessionId: state.primarySessionId,
  };
  store[state.projectCode] = backup;
  const ordered = Object.values(store).sort((a, b) => Number(b.savedAt || 0) - Number(a.savedAt || 0));
  const trimmed = Object.fromEntries(
    ordered.slice(0, MAX_PROJECT_RECOVERY_BACKUPS).map((item) => [item.code, item]),
  );
  try {
    localStorage.setItem(PROJECT_RECOVERY_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.warn("Project recovery backup failed", error);
  }
}

function createLocalStorageSafePayload(payload) {
  return {
    ...payload,
    photos: createLocalStoragePhotoList(payload.photos),
    sessions: payload.sessions.map((session) => ({
      ...session,
      photos: createLocalStoragePhotoList(session.photos || []),
    })),
  };
}

function createLocalStoragePhotoList(photos) {
  return (photos || []).map((photo) => {
    if (!isPendingLocalPhoto(photo) || photo.localPhotoCached !== true) {
      return photo;
    }
    return {
      ...photo,
      src: createPlaceholderPhotoSrc(photo.displayName || photo.name || "photo"),
      localPhotoCacheKey: photo.id,
      pendingUpload: true,
    };
  });
}

function isPendingLocalPhoto(photo) {
  return Boolean(
    photo?.id &&
    typeof photo.src === "string" &&
    photo.src.startsWith("data:image/") &&
    !photo.src.startsWith("data:image/svg+xml"),
  );
}

function readProjectRecoveryStore() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PROJECT_RECOVERY_KEY) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function getProjectRecoveryBackup(code) {
  const backup = readProjectRecoveryStore()[normalizeProjectCode(code)];
  if (!backup) {
    return null;
  }
  if (backup.ownerUserId && state.user?.id && backup.ownerUserId !== state.user.id) {
    return null;
  }
  return backup;
}

function removeProjectRecoveryBackup(code) {
  const normalizedCode = normalizeProjectCode(code);
  const store = readProjectRecoveryStore();
  if (!store[normalizedCode]) {
    return;
  }
  delete store[normalizedCode];
  try {
    localStorage.setItem(PROJECT_RECOVERY_KEY, JSON.stringify(store));
  } catch {}
}

function createRecoveryPhotoList(photos) {
  return (photos || []).map((photo) => {
    const cloned = structuredClone(photo);
    if (typeof cloned.src === "string" && cloned.src.startsWith("data:image/")) {
      cloned.src = createPlaceholderPhotoSrc(cloned.displayName || cloned.name || "photo");
      cloned.recoveryImageUnavailable = true;
    }
    return cloned;
  });
}

function shouldOfferProjectRecovery(project, backup) {
  if (!backup) {
    return false;
  }
  const serverSessions = Array.isArray(project.sessions) ? project.sessions : [];
  const backupSessions = Array.isArray(backup.sessions) ? backup.sessions : [];
  if (backupSessions.length > serverSessions.length) {
    return true;
  }
  const serverSessionPoints = serverSessions.reduce(
    (total, session) => total + (Array.isArray(session.points) ? session.points.length : 0),
    0,
  );
  const backupSessionPoints = backupSessions.reduce(
    (total, session) => total + (Array.isArray(session.points) ? session.points.length : 0),
    0,
  );
  if (backupSessionPoints > serverSessionPoints) {
    return true;
  }
  const serverPoints = Array.isArray(project.lastState?.points) ? project.lastState.points.length : 0;
  return serverSessions.length === 0 && (backup.points || []).length > serverPoints;
}

function applyProjectRecoveryBackup(project, backup) {
  applyProject(project);
  state.sessions = Array.isArray(backup.sessions) ? structuredClone(backup.sessions) : [];
  state.primarySessionId = backup.primarySessionId || state.sessions[0]?.id || null;
  state.points = Array.isArray(backup.points) ? structuredClone(backup.points) : [];
  state.photos = Array.isArray(backup.photos) ? structuredClone(backup.photos) : [];
  state.milestones = normalizeMilestones(
    Array.isArray(backup.milestones) ? structuredClone(backup.milestones) : [],
  );
  state.plannedRoutes = normalizePlannedRoutes(backup.plannedRoutes || state.plannedRoutes);
  state.activePlannedRouteId = backup.activePlannedRouteId || state.plannedRoutes[0]?.id || null;
  state.mapReferences = normalizeMapReferences(backup.mapReferences || state.mapReferences);
  state.activeMapReferenceId = backup.activeMapReferenceId || state.mapReferences[0]?.id || null;
  const primarySession = state.sessions.find((session) => session.id === state.primarySessionId);
  if (primarySession) {
    state.points = structuredClone(primarySession.points || state.points);
    state.photos = structuredClone(primarySession.photos || state.photos);
  }
  state.selectedPosition = state.points.at(-1) || null;
  state.syncDirty = true;
  saveProjectRecoveryBackup("recovery-loaded");
}

function initializeDurablePhotoStorage() {
  if (photoCacheMigrationPromise) {
    return photoCacheMigrationPromise;
  }
  photoCacheMigrationPromise = (async () => {
    try {
      if (navigator.storage?.persist) {
        await navigator.storage.persist();
      }
      const restored = await restoreCachedLocalPhotos();
      const cached = await cacheAllPendingLocalPhotos();
      if (restored || cached) {
        persist();
        render();
      }
    } catch (error) {
      console.warn("Durable photo storage initialization failed", error);
    }
  })();
  return photoCacheMigrationPromise;
}

async function cacheAllPendingLocalPhotos() {
  const photoLists = [state.photos, ...state.sessions.map((session) => session.photos || [])];
  const pending = new Map();
  photoLists.flat().forEach((photo) => {
    if (isPendingLocalPhoto(photo) && photo.localPhotoCached !== true) {
      pending.set(photo.id, photo);
    }
  });
  let changed = false;
  for (const [photoId, photo] of pending) {
    const cached = await cacheLocalPhoto(photo);
    if (!cached) {
      continue;
    }
    photoLists.forEach((photos) => {
      photos.forEach((item) => {
        if (item.id === photoId) {
          item.localPhotoCached = true;
          item.localPhotoCacheKey = photoId;
        }
      });
    });
    changed = true;
  }
  return changed;
}

async function cacheLocalPhoto(photo) {
  if (!isPendingLocalPhoto(photo)) {
    return false;
  }
  const database = await openPhotoCacheDatabase();
  if (!database) {
    return false;
  }
  try {
    await runPhotoCacheTransaction(database, "readwrite", (store) =>
      store.put({ id: photo.id, src: photo.src, savedAt: Date.now() }),
    );
    return true;
  } catch (error) {
    console.warn("Photo cache write failed", error);
    return false;
  } finally {
    database.close();
  }
}

async function restoreCachedLocalPhotos() {
  const photoLists = [state.photos, ...state.sessions.map((session) => session.photos || [])];
  const cacheKeys = new Set();
  photoLists.flat().forEach((photo) => {
    if (photo?.localPhotoCacheKey) {
      cacheKeys.add(photo.localPhotoCacheKey);
    }
  });
  if (cacheKeys.size === 0) {
    return false;
  }
  const database = await openPhotoCacheDatabase();
  if (!database) {
    return false;
  }
  let changed = false;
  try {
    for (const cacheKey of cacheKeys) {
      const cached = await runPhotoCacheTransaction(database, "readonly", (store) => store.get(cacheKey));
      if (!cached?.src) {
        continue;
      }
      photoLists.forEach((photos) => {
        photos.forEach((photo) => {
          if (photo.localPhotoCacheKey === cacheKey) {
            photo.src = cached.src;
            photo.localPhotoCached = true;
            changed = true;
          }
        });
      });
    }
  } finally {
    database.close();
  }
  return changed;
}

async function deleteCachedLocalPhoto(photoId) {
  if (!photoId) {
    return;
  }
  const database = await openPhotoCacheDatabase();
  if (!database) {
    return;
  }
  try {
    await runPhotoCacheTransaction(database, "readwrite", (store) => store.delete(photoId));
  } catch (error) {
    console.warn("Photo cache cleanup failed", error);
  } finally {
    database.close();
  }
}

async function cleanupUnreferencedCachedPhotos(photoIds) {
  const referencedIds = new Set([
    ...state.photos.map((photo) => photo.id),
    ...state.sessions.flatMap((session) => (session.photos || []).map((photo) => photo.id)),
  ]);
  for (const photoId of new Set(photoIds.filter(Boolean))) {
    if (!referencedIds.has(photoId)) {
      await deleteCachedLocalPhoto(photoId);
    }
  }
}

function openPhotoCacheDatabase() {
  if (!("indexedDB" in window)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(PHOTO_CACHE_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(PHOTO_CACHE_STORE_NAME)) {
        database.createObjectStore(PHOTO_CACHE_STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("photo_cache_open_failed"));
  });
}

function runPhotoCacheTransaction(database, mode, operation) {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PHOTO_CACHE_STORE_NAME, mode);
    const store = transaction.objectStore(PHOTO_CACHE_STORE_NAME);
    const request = operation(store);
    let result;
    request.onsuccess = () => {
      result = request.result;
    };
    request.onerror = () => reject(request.error || new Error("photo_cache_request_failed"));
    transaction.oncomplete = () => resolve(result);
    transaction.onabort = () => reject(transaction.error || new Error("photo_cache_transaction_failed"));
    transaction.onerror = () => reject(transaction.error || new Error("photo_cache_transaction_failed"));
  });
}

function compactLargePhotos(payload) {
  return {
    ...payload,
    photos: compactPhotoList(payload.photos),
    overlayProjects: payload.overlayProjects.map((project) => ({
      ...project,
      photos: compactPhotoList(project.photos || []),
    })),
    sessions: payload.sessions.map((session) => ({
      ...session,
      photos: compactPhotoList(session.photos || []),
    })),
  };
}

function compactPhotoList(photos) {
  return photos.map((photo) => {
    if (!photo.src || photo.src.length <= MAX_STORED_IMAGE_LENGTH || photo.localPhotoCached !== true) {
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
    state.plannedRoutes = normalizePlannedRoutes(saved.plannedRoutes);
    state.activePlannedRouteId = saved.activePlannedRouteId || state.plannedRoutes[0]?.id || null;
    state.mapReferences = normalizeMapReferences(saved.mapReferences);
    state.activeMapReferenceId = saved.activeMapReferenceId || state.mapReferences[0]?.id || null;
    state.mapAlignmentMode = false;
    state.mapReferenceDraft = null;
    state.pendingMapReferenceImagePoint = null;
    state.planningMode = false;
    state.plannedRouteDraft = null;
    state.overlayProjects = Array.isArray(saved.overlayProjects)
      ? saved.overlayProjects.map((project, index) => normalizeOverlayProject(project, index)).filter(Boolean)
      : [];
    state.sessions = Array.isArray(saved.sessions) ? saved.sessions : [];
    state.pendingSessionDeletes = Array.isArray(saved.pendingSessionDeletes) ? saved.pendingSessionDeletes : [];
    state.primarySessionId = saved.primarySessionId || state.sessions[0]?.id || null;
    state.selectedPosition = saved.selectedPosition || state.points.at(-1) || null;
    state.initialPosition = saved.initialPosition || null;
    state.activeStartedAt = saved.activeStartedAt || null;
    state.liveSyncSessionId = saved.liveSyncSessionId || null;
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
    const hasCurrentMapPolicy = Number(saved.mapProviderPolicyVersion || 0) >= MAP_PROVIDER_POLICY_VERSION;
    state.mapProvider = hasCurrentMapPolicy && saved.mapProvider === "osm" ? "osm" : "naver";
    state.photoFilter = saved.photoFilter || "all";
    state.photoTagFilters = normalizeTagValues(saved.photoTagFilters);
    state.photoSort = saved.photoSort === "captured" ? "captured" : "route";
    state.photoView = saved.photoView || "list";
    state.constructionFilter = saved.constructionFilter || "all";
    state.constructionTagFilters = normalizeTagValues(saved.constructionTagFilters);
    state.projectCode = saved.projectCode || "";
    state.projectName = typeof saved.projectName === "string" ? saved.projectName : "프로젝트A";
    state.projectAccessRole = saved.projectAccessRole || "";
    state.projectRevision = saved.projectRevision || "";
    state.projectMembers = [];
    state.syncDirty = Boolean(saved.syncDirty);
    state.syncing = false;
    state.lastSyncedAt = saved.lastSyncedAt || null;
    state.lastSyncFailedAt = saved.lastSyncFailedAt || null;
    state.lastSyncError = saved.lastSyncError || "";
    state.lastSyncedPointCount = Number(saved.lastSyncedPointCount || 0);
  } catch {
    state.points = [];
    state.photos = [];
    state.milestones = [];
    state.plannedRoutes = [];
    state.activePlannedRouteId = null;
    state.mapReferences = [];
    state.activeMapReferenceId = null;
    state.mapAlignmentMode = false;
    state.mapReferenceDraft = null;
    state.pendingMapReferenceImagePoint = null;
    state.planningMode = false;
    state.plannedRouteDraft = null;
    state.overlayProjects = [];
    state.sessions = [];
    state.overlaySessionIds = [];
    state.primarySessionId = null;
    state.selectedPosition = null;
    state.initialPosition = null;
    state.activeStartedAt = null;
    state.liveSyncSessionId = null;
    state.lastSyncedPointCount = 0;
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
    state.mapProvider = "naver";
    state.photoFilter = "all";
    state.photoTagFilters = [];
    state.photoSort = "route";
    state.photoView = "list";
    state.constructionFilter = "all";
    state.constructionTagFilters = [];
    state.projectCode = "";
    state.projectName = "프로젝트A";
    state.projectAccessRole = "";
    state.projectRevision = "";
    state.projectMembers = [];
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
