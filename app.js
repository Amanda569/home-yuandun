const STORAGE_KEY = "home-inventory-pwa-v2";
const VIEW_STORAGE_KEY = "home-inventory-current-view";
const BUILD_VERSION = "2026.08.10.1";
const BUILD_TIME = "2026-08-10 00:00";
const VALID_VIEWS = ["items", "locations", "zones", "replenish", "settings"];
const IMAGE_UPLOAD_MAX_EDGE = 720;
const IMAGE_UPLOAD_QUALITY = 0.72;
const SYNC_CONFIG = window.HOME_INVENTORY_SYNC || null;
const ACTIVE_HOUSEHOLD_ID = getConfiguredHouseholdId();
const ACTIVE_STORAGE_KEY = getScopedStorageKey();

const DEFAULT_CATEGORIES = [
  { name: "全部", color: "#0f766e" },
  { name: "日用", color: "#3973b8" },
  { name: "洗漱", color: "#0f766e" },
  { name: "衣物", color: "#8b5cf6" },
  { name: "工具", color: "#c44949" },
  { name: "清洁", color: "#9c5f05" },
  { name: "电子", color: "#2f855a" },
  { name: "文件", color: "#4b5563" }
];

const DEFAULT_LOCATIONS = [];
const DEFAULT_ZONES = [];
const DEFAULT_CONTAINERS = [];
const SAMPLE_ITEMS = [];

function createInitialData() {
  return {
    householdName: "",
    appDisplayName: "",
    memberName: "",
    locations: [],
    zones: [...DEFAULT_ZONES],
    locationMeta: {},
    zoneMeta: createDefaultZoneMeta(DEFAULT_ZONES),
    containers: DEFAULT_CONTAINERS,
    items: [],
    replenishRules: {},
    deletedItems: {},
    deletedLocations: {},
    deletedZones: {},
    itemFieldMeta: createDefaultItemFieldMeta(),
    updatedAt: new Date().toISOString()
  };
}

const state = {
  data: loadData(),
  view: getInitialView(),
  spaceMode: "list",
  containerMode: "grid",
  locationFilter: "all",
  search: "",
  category: "全部",
  selectedLocation: "",
  selectedItemId: "",
  syncClient: null,
  serviceWorkerReady: false,
  saving: false,
  space: null,
  confirmCallback: null,
  pendingSave: null
};

const els = {};
state.zoneTreeExpanded = new Set();
state.deferredInstallPrompt = null;
state.zoneDetailCurrentZone = "";
state.navigationStack = [];

document.addEventListener("DOMContentLoaded", init);

function init() {
  bindElements();
  bindEvents();
  populateSettings();
  populateFormOptions();
  switchView(state.view);
  render();
  updateInstallButtonState();
  registerServiceWorker();
  initSync();
}

function bindElements() {
  [
    "syncButton", "searchInput", "itemCount", "locationCount", "lowCount",
    "categoryFilters", "itemList", "emptyItems", "sampleButton",
    "locationGrid", "locationFilters", "emptyLocations", "addLocationButton",
    "zoneGrid", "emptyZones", "addZoneButton", "replenishList", "replenishHint",
    "emptyReplenish", "appTitle", "appDisplayName", "householdName", "memberName", "saveSettingsButton",
    "syncStatusCard", "syncStatusText", "syncStatusDetail", "exportButton",
    "importInput", "clearButton", "addItemButton", "itemModal", "itemForm",
    "itemModalTitle", "itemId", "itemName", "itemNameDropdown",
    "itemCategory", "itemCategoryOptions", "itemZone", "itemZoneOptions",
    "itemLocation", "itemLocationOptions", "itemLocationError", "itemQuantity", "itemUnit",
    "trackStock", "minStockWrap", "itemMinQuantity", "itemNote",
    "itemThumbnailFile", "itemThumbnail", "itemThumbnailPreview", "clearItemThumbnailButton",
    "builtinFields", "customFieldsArea", "addCustomFieldButton",
    "deleteItemButton", "locationModal", "locationForm", "locationModalTitle",
    "locationOriginalName", "locationName", "locationNameError",
    "locationZone", "locationZoneError", "locationNote", "locationImageFile", "locationImage", "locationImagePreview",
    "clearLocationImageButton", "deleteLocationButton", "toast",
    "spaceCanvas", "spaceStage", "zoneModal", "zoneForm", "zoneModalTitle",
    "zoneOriginalName", "zoneName", "zoneNameError", "zoneParent", "zoneImageFile", "zoneImage",
    "zoneImagePreview", "clearZoneImageButton", "zoneDetailModal",
    "zoneDetailTitle", "zoneDetailMeta", "zoneDetailList",
    "selectedContainerName", "selectedContainerMeta", "searchResults",
    "detailModal", "detailTitle", "detailThumb", "detailCategory",
    "detailQuantity", "detailLocation", "detailGrid", "detailNote",
    "openContainerButton", "editFromDetailButton", "containerModal",
    "containerTitle", "containerMeta", "containerItemsGrid",
    "containerItemsTableWrap", "containerItemsTableBody", "containerAddItemButton",
    "zoneDetailAddLocationButton", "sceneTip", "listMode", "addContainerButton",
    "containerFormModal", "containerForm", "newContainerName", "newContainerType",
    "newContainerLocation", "newContainerDescription", "newContainerZone",
    "containerCount", "confirmModal", "confirmTitle", "confirmMessage",
    "confirmOk", "confirmCancel",
    "mergeChoiceModal", "mergeChoiceTitle", "mergeChoiceBody", "mergeChoiceClose", "mergeChoiceNew",
    "installAppButton", "zoneDetailBackButton", "containerBackButton", "detailBackButton",
    "buildVersion"
  ].forEach((id) => {
    els[id] = document.getElementById(id);
  });
}

function bindEvents() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.view));
  });
  document.querySelectorAll("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", () => closeDialogs());
  });
  document.addEventListener("toggle", handleMenuToggle, true);
  document.addEventListener("click", handleDocumentClick);
  document.querySelectorAll("[data-space-mode]").forEach((button) => {
    button.addEventListener("click", () => switchSpaceMode(button.dataset.spaceMode));
  });
  document.querySelectorAll("[data-container-mode]").forEach((button) => {
    button.addEventListener("click", () => switchContainerMode(button.dataset.containerMode));
  });
  els.searchInput?.addEventListener("input", (event) => {
    state.search = event.target.value.trim().toLowerCase();
    render();
  });
  els.addItemButton?.addEventListener("click", () => {
    resetZoneTree();
    openItemModal();
  });
  els.sampleButton?.addEventListener("click", () => {
    resetZoneTree();
    importSamples();
  });
  els.addLocationButton?.addEventListener("click", () => {
    resetZoneTree();
    openLocationModal();
  });
  els.addZoneButton?.addEventListener("click", () => {
    resetZoneTree();
    openZoneModal();
  });
  els.itemForm?.addEventListener("submit", saveItemFromForm);
  els.locationForm?.addEventListener("submit", saveLocationFromForm);
  els.zoneForm?.addEventListener("submit", saveZoneFromForm);
  els.deleteLocationButton?.addEventListener("click", deleteCurrentLocation);
  els.trackStock?.addEventListener("change", updateMinStockVisibility);
  els.deleteItemButton?.addEventListener("click", deleteCurrentItem);
  els.saveSettingsButton?.addEventListener("click", () => {
    resetZoneTree();
    saveSettings();
  });
  els.exportButton?.addEventListener("click", () => {
    resetZoneTree();
    exportData();
  });
  els.importInput?.addEventListener("change", importData);
  els.clearButton?.addEventListener("click", () => {
    resetZoneTree();
    clearData();
  });
  els.syncButton?.addEventListener("click", () => {
    resetZoneTree();
    syncNow();
  });
  els.editFromDetailButton?.addEventListener("click", () => {
    if (state.selectedItemId) openItemModal(state.selectedItemId);
  });
  els.openContainerButton?.addEventListener("click", () => {
    const item = getItemById(state.selectedItemId);
    if (item) {
      if (els.detailModal?.open) els.detailModal.close();
      openContainerForLocation(item.location, { from: { type: "item", itemId: item.id } });
    }
  });
  els.containerAddItemButton?.addEventListener("click", () => {
    const location = state.selectedLocation;
    closeDialogs();
    openItemModal();
    if (location) {
      els.itemLocation.value = location;
      els.itemZone.value = getLocationMeta(location).zone || "";
      populateLocationDatalist();
    }
  });
  els.zoneDetailAddLocationButton?.addEventListener("click", () => {
    const zone = els.zoneDetailTitle.textContent.trim();
    closeDialogs();
    openLocationModal();
    if (zone && els.locationZone) els.locationZone.value = zone;
  });
  els.addContainerButton?.addEventListener("click", () => {
    resetZoneTree();
    openContainerForm();
  });
  els.containerForm?.addEventListener("submit", saveContainerFromForm);
  els.searchInput?.addEventListener("search", render);
  els.itemName?.addEventListener("input", handleItemNameInput);
  els.itemName?.addEventListener("focus", handleItemNameInput);
  els.itemName?.addEventListener("blur", handleItemNameBlur);
  els.itemZone?.addEventListener("input", populateLocationDatalist);
  els.itemLocation?.addEventListener("blur", handleItemLocationBlur);
  els.itemLocation?.addEventListener("input", () => {
    if (els.itemLocationError) els.itemLocationError.textContent = "";
    if (els.itemLocation) els.itemLocation.classList.remove("input-error");
  });
  bindImageUploadControl({
    fileInput: els.itemThumbnailFile,
    hiddenInput: els.itemThumbnail,
    preview: els.itemThumbnailPreview,
    clearButton: els.clearItemThumbnailButton,
    emptyText: "未上传物品缩略图"
  });
  bindImageUploadControl({
    fileInput: els.locationImageFile,
    hiddenInput: els.locationImage,
    preview: els.locationImagePreview,
    clearButton: els.clearLocationImageButton,
    emptyText: "未上传位置图片"
  });
  bindImageUploadControl({
    fileInput: els.zoneImageFile,
    hiddenInput: els.zoneImage,
    preview: els.zoneImagePreview,
    clearButton: els.clearZoneImageButton,
    emptyText: "未上传区域图片"
  });
  els.addCustomFieldButton?.addEventListener("click", () => addCustomFieldInput());
  els.confirmOk?.addEventListener("click", handleConfirmOk);
  els.confirmCancel?.addEventListener("click", closeConfirmModal);
  els.mergeChoiceClose?.addEventListener("click", closeMergeChoiceModal);
  els.mergeChoiceNew?.addEventListener("click", handleMergeChoiceNew);
  els.installAppButton?.addEventListener("click", installApp);
  els.zoneDetailBackButton?.addEventListener("click", openParentZoneDetail);
  els.containerBackButton?.addEventListener("click", navigateBack);
  els.detailBackButton?.addEventListener("click", navigateBack);
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    state.deferredInstallPrompt = event;
    updateInstallButtonState();
  });
  window.addEventListener("appinstalled", () => {
    state.deferredInstallPrompt = null;
    updateInstallButtonState();
    showToast("已添加到主屏幕");
  });
  window.addEventListener("hashchange", handleRouteChange);
}

function handleMenuToggle(event) {
  const menu = event.target;
  if (!menu.matches?.(".location-menu, .zone-menu") || !menu.open) return;
  closeOpenMenus(menu);
  positionActionMenu(menu);
}

function handleDocumentClick(event) {
  if (event.target.closest?.(".location-menu, .zone-menu, .autocomplete-wrap")) return;
  closeOpenMenus();
  hideItemNameDropdown();
}

function closeOpenMenus(except = null) {
  document.querySelectorAll(".location-menu[open], .zone-menu[open]").forEach((menu) => {
    if (menu !== except) menu.removeAttribute("open");
    if (menu !== except) menu.classList.remove("open-up");
  });
}

function positionActionMenu(menu) {
  const panel = menu.querySelector(".location-menu-panel, .zone-menu-panel");
  if (!panel) return;
  menu.classList.remove("open-up");
  requestAnimationFrame(() => {
    const panelRect = panel.getBoundingClientRect();
    const bottomReserve = 96;
    if (panelRect.bottom > window.innerHeight - bottomReserve) {
      menu.classList.add("open-up");
    }
  });
}

async function installApp() {
  if (window.matchMedia?.("(display-mode: standalone)")?.matches || navigator.standalone) {
    updateInstallButtonState();
    showToast("已添加到主屏幕");
    return;
  }
  const promptEvent = state.deferredInstallPrompt || await waitForInstallPrompt(state.serviceWorkerReady ? 600 : 1800);
  if (promptEvent) {
    try {
      await promptEvent.prompt?.();
      await promptEvent.userChoice.catch(() => null);
    } finally {
      state.deferredInstallPrompt = null;
      updateInstallButtonState();
    }
    return;
  }
  showToast(getManualInstallTip());
}

function getManualInstallTip() {
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return "请点浏览器分享按钮，再选择“添加到主屏幕”";
  if (/Android/i.test(ua)) return "请点浏览器菜单，再选择“安装应用”或“添加到主屏幕”";
  return "当前浏览器暂不支持自动弹出，请从浏览器菜单中选择安装应用";
}

function waitForInstallPrompt(timeoutMs = 1500) {
  if (state.deferredInstallPrompt) return Promise.resolve(state.deferredInstallPrompt);
  return new Promise((resolve) => {
    // 说明：只监听本次点击后的短窗口，避免长期持有一次性安装事件。
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      resolve(value);
    };
    const onPrompt = (event) => {
      event.preventDefault();
      state.deferredInstallPrompt = event;
      updateInstallButtonState();
      finish(event);
    };
    const timer = setTimeout(() => finish(null), timeoutMs);
    window.addEventListener("beforeinstallprompt", onPrompt, { once: true });
  });
}

function updateInstallButtonState() {
  if (!els.installAppButton) return;
  const standalone = window.matchMedia?.("(display-mode: standalone)")?.matches || navigator.standalone;
  els.installAppButton.disabled = Boolean(standalone);
  els.installAppButton.textContent = standalone ? "已添加到主屏幕" : state.deferredInstallPrompt ? "安装到主屏幕" : "添加到主屏幕";
  els.installAppButton.title = standalone ? "当前已经以应用模式运行" : getManualInstallTip();
}

function compareName(a, b) {
  return String(a || "").localeCompare(String(b || ""), "zh-CN", { numeric: true, sensitivity: "base" });
}

function pushNavigation(entry) {
  if (!entry?.type) return;
  state.navigationStack = [...(state.navigationStack || []), entry];
  updateNavigationBackButtons();
}

function resetNavigationStack() {
  state.navigationStack = [];
  updateNavigationBackButtons();
}

function updateNavigationBackButtons() {
  const hasBack = Boolean(state.navigationStack?.length);
  [els.containerBackButton, els.detailBackButton].forEach((button) => {
    if (!button) return;
    button.classList.toggle("hidden", !hasBack);
    button.disabled = !hasBack;
  });
}

function navigateBack() {
  const stack = state.navigationStack || [];
  const target = stack.pop();
  state.navigationStack = stack;
  if (!target) {
    updateNavigationBackButtons();
    return;
  }
  if (target.type === "zone") {
    if (els.detailModal?.open) els.detailModal.close();
    if (els.containerModal?.open) els.containerModal.close();
    openZoneDetail(target.zone);
    updateNavigationBackButtons();
    return;
  }
  if (target.type === "location") {
    if (els.detailModal?.open) els.detailModal.close();
    openContainerForLocation(target.location, { preserveStack: true });
    return;
  }
  if (target.type === "item") {
    if (els.containerModal?.open) els.containerModal.close();
    openItemDetail(target.itemId, { preserveStack: true });
  }
}

function createDefaultItemFieldMeta() {
  return {
    brand: { label: "品牌", editable: true, builtin: true, order: 1 },
    spec: { label: "规格", editable: true, builtin: true, order: 2 },
    purchaseDate: { label: "购买日期", editable: true, builtin: true, order: 3 },
    expiryDate: { label: "到期日期", editable: false, builtin: true, order: 4 },
    thumbnail: { label: "物品缩略图", editable: false, builtin: true, order: 5 }
  };
}

function bindImageUploadControl({ fileInput, hiddenInput, preview, clearButton, emptyText }) {
  if (!fileInput || !hiddenInput || !preview) return;
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      hiddenInput.value = await createImageAccessUrl(file);
      renderImagePreview(preview, hiddenInput.value, emptyText);
    } catch (error) {
      fileInput.value = "";
      showToast(error.message || "图片上传失败");
    }
  });
  clearButton?.addEventListener("click", () => {
    fileInput.value = "";
    hiddenInput.value = "";
    renderImagePreview(preview, "", emptyText);
  });
  renderImagePreview(preview, hiddenInput.value, emptyText);
}

async function createImageAccessUrl(file) {
  if (!file?.type?.startsWith("image/")) {
    throw new Error("请选择图片文件");
  }
  const bitmap = await loadImageBitmap(file);
  const { width, height } = getResizedImageSize(bitmap.width, bitmap.height, IMAGE_UPLOAD_MAX_EDGE);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("图片处理失败");
  context.drawImage(bitmap, 0, 0, width, height);
  if (typeof bitmap.close === "function") bitmap.close();
  return canvas.toDataURL("image/jpeg", IMAGE_UPLOAD_QUALITY);
}

async function loadImageBitmap(file) {
  if (window.createImageBitmap) {
    return createImageBitmap(file);
  }
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.addEventListener("load", () => {
      URL.revokeObjectURL(url);
      resolve(image);
    });
    image.addEventListener("error", () => {
      URL.revokeObjectURL(url);
      reject(new Error("图片读取失败"));
    });
    image.src = url;
  });
}

function getResizedImageSize(width, height, maxEdge) {
  const longest = Math.max(width || 0, height || 0);
  if (!longest || longest <= maxEdge) return { width, height };
  const ratio = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio))
  };
}

function renderImagePreview(preview, imageUrl, emptyText = "未上传图片") {
  if (!preview) return;
  if (imageUrl) {
    preview.innerHTML = `<div class="image-preview-frame"><img src="${escapeHtml(imageUrl)}" alt="图片预览"></div>`;
    return;
  }
  preview.innerHTML = `<div class="image-preview-empty"><span>图</span><p>${escapeHtml(emptyText)}</p></div>`;
}

function loadData() {
  try {
    const raw = localStorage.getItem(ACTIVE_STORAGE_KEY);
    if (!raw) return createInitialData();
    const parsed = JSON.parse(raw);
    const loaded = {
      ...createInitialData(),
      ...parsed,
      locations: Array.isArray(parsed.locations) ? parsed.locations : [],
      zones: Array.isArray(parsed.zones) ? parsed.zones : [],
      locationMeta: parsed.locationMeta && typeof parsed.locationMeta === "object" ? parsed.locationMeta : {},
      zoneMeta: parsed.zoneMeta && typeof parsed.zoneMeta === "object" ? parsed.zoneMeta : {},
      containers: Array.isArray(parsed.containers) ? upgradeContainers(parsed.containers) : [],
      items: Array.isArray(parsed.items) ? parsed.items : [],
      replenishRules: parsed.replenishRules && typeof parsed.replenishRules === "object" ? parsed.replenishRules : {},
      deletedItems: parsed.deletedItems && typeof parsed.deletedItems === "object" ? parsed.deletedItems : {},
      deletedLocations: parsed.deletedLocations && typeof parsed.deletedLocations === "object" ? parsed.deletedLocations : {},
      deletedZones: parsed.deletedZones && typeof parsed.deletedZones === "object" ? parsed.deletedZones : {},
      itemFieldMeta: parsed.itemFieldMeta && typeof parsed.itemFieldMeta === "object" ? parsed.itemFieldMeta : createDefaultItemFieldMeta()
    };
    loaded.locations = [...new Set([...loaded.locations, ...loaded.containers.flatMap((c) => c.locations || [])])];
    return normalizeInventoryData(loaded);
  } catch {
    return createInitialData();
  }
}

function normalizeInventoryData(data) {
  const normalized = { ...createInitialData(), ...data };
  const locations = Array.isArray(normalized.locations) ? normalized.locations : [];
  normalized.items = Array.isArray(normalized.items) ? normalized.items.map(normalizeItemRecord) : [];
  normalized.deletedLocations = normalized.deletedLocations && typeof normalized.deletedLocations === "object" ? normalized.deletedLocations : {};
  normalized.deletedZones = normalized.deletedZones && typeof normalized.deletedZones === "object" ? normalized.deletedZones : {};
  const itemLocations = Array.isArray(normalized.items) ? normalized.items.map((item) => item.location).filter(Boolean) : [];
  normalized.locations = [...new Set([...locations, ...itemLocations])].filter(Boolean).filter((location) => shouldKeepLocation(location, normalized));
  normalized.locationMeta = normalizeLocationMeta(normalized.locations, normalized.locationMeta, normalized.zones || []);
  normalized.zones = normalizeZones(normalized);
  normalized.zoneMeta = normalizeZoneMeta(normalized.zones, normalized.zoneMeta);
  normalized.replenishRules = normalizeReplenishRules(normalized.replenishRules, normalized.items);
  normalized.items = normalized.items.map((item) => syncItemReplenishFields(item, normalized.replenishRules));
  normalized.itemFieldMeta = normalizeItemFieldMeta(normalized.itemFieldMeta);
  return normalized;
}

function normalizeItemFieldMeta(meta) {
  const defaults = createDefaultItemFieldMeta();
  const merged = { ...defaults };
  Object.entries(meta || {}).forEach(([key, value]) => {
    if (!value || typeof value !== "object") return;
    merged[key] = { ...defaults[key], ...value, key };
  });
  return merged;
}

function shouldKeepLocation(location, data) {
  const deletedAt = data.deletedLocations?.[location];
  if (!deletedAt) return true;
  const deletedTime = new Date(deletedAt || 0).getTime();
  const revivedTime = new Date(data.locationMeta?.[location]?.revivedAt || 0).getTime();
  const itemIsNewer = (data.items || []).some((item) => {
    if (item.location !== location) return false;
    return new Date(item.updatedAt || 0).getTime() > deletedTime;
  });
  return itemIsNewer || revivedTime > deletedTime;
}

function createDefaultLocationMeta(locations) {
  return normalizeLocationMeta(locations, {});
}

function normalizeLocationMeta(locations, meta = {}, zones = []) {
  const now = new Date().toISOString();
  return Object.fromEntries(
    locations.map((location) => {
      const existing = meta?.[location] || {};
      return [location, { zone: existing.zone || inferLocationZone(location, zones), note: existing.note || "", image: existing.image || "", revivedAt: existing.revivedAt || "", updatedAt: existing.updatedAt || now }];
    })
  );
}

function normalizeZones(data) {
  const zones = Array.isArray(data.zones) ? data.zones : [];
  const usedZones = Object.values(data.locationMeta || {}).map((meta) => meta?.zone).filter(Boolean);
  const parentZones = Object.values(data.zoneMeta || {}).map((meta) => meta?.parent).filter(Boolean);
  return [...new Set([...zones, ...usedZones, ...parentZones])].filter(Boolean).filter((zone) => shouldKeepZone(zone, data));
}

function shouldKeepZone(zone, data) {
  const deletedAt = data.deletedZones?.[zone];
  if (!deletedAt) return true;
  const deletedTime = new Date(deletedAt || 0).getTime();
  const revivedTime = new Date(data.zoneMeta?.[zone]?.revivedAt || 0).getTime();
  return revivedTime > deletedTime;
}

function upgradeContainers(containers) {
  const defaultIds = new Set(DEFAULT_CONTAINERS.map((c) => c.id));
  const upgraded = DEFAULT_CONTAINERS.map((fallback) => {
    const existing = containers.find((c) => c.id === fallback.id);
    if (!existing) return fallback;
    return { ...fallback, ...existing, position: fallback.position, size: fallback.size, locations: Array.isArray(existing.locations) && existing.locations.length ? existing.locations : fallback.locations };
  });
  containers.forEach((container) => {
    if (!container?.id || defaultIds.has(container.id)) return;
    upgraded.push(normalizeCustomContainer(container, upgraded.length));
  });
  return upgraded;
}

function normalizeCustomContainer(container, index) {
  const fallback = getContainerPreset(container.type || "box");
  return {
    ...fallback,
    ...container,
    id: container.id || crypto.randomUUID(),
    name: container.name || "新容器",
    type: container.type || "box",
    locations: Array.isArray(container.locations) && container.locations.length ? container.locations : [container.name || "新容器"],
    position: container.position && Number.isFinite(Number(container.position.x)) ? container.position : getZonePosition("center", index),
    size: container.size || fallback.size,
    color: container.color || fallback.color,
    accent: container.accent || fallback.accent,
    description: container.description || fallback.description
  };
}

async function persistData({ silent = false } = {}) {
  state.data = normalizeInventoryData(state.data);
  state.data.updatedAt = new Date().toISOString();
  saveLocalSnapshot(state.data);
  render();
  if (state.syncClient && !state.saving) {
    state.saving = true;
    try {
      const remote = await state.syncClient.load();
      state.data = mergeInventoryData(state.data, remote);
      saveLocalSnapshot(state.data);
      render();
      await state.syncClient.save(state.data);
      setSyncStatus("online", "已同步", "云端和本机数据已更新。");
    } catch (error) {
      setSyncStatus("offline", "同步失败", error.message || "稍后重试。");
    } finally {
      state.saving = false;
    }
  }
  if (!silent) showToast("已保存");
}

function saveLocalSnapshot(data) {
  const snapshot = JSON.stringify(data);
  try {
    localStorage.setItem(ACTIVE_STORAGE_KEY, snapshot);
  } catch (error) {
    if (isStorageQuotaError(error)) {
      try {
        localStorage.removeItem(ACTIVE_STORAGE_KEY);
        localStorage.setItem(ACTIVE_STORAGE_KEY, snapshot);
        return;
      } catch (retryError) {
        showToast("图片或数据仍然太大，请继续清除图片后重试");
        throw retryError;
      }
    }
    showToast("本机保存失败");
    throw error;
  }
}

function isStorageQuotaError(error) {
  return error?.name === "QuotaExceededError" || error?.code === 22 || error?.code === 1014;
}

function render() {
  renderAppTitle();
  renderStats();
  renderCategoryFilters();
  renderItems();
  renderLocationFilters();
  renderLocations();
  renderZones();
  renderReplenish();
  renderSearchResults();
  renderSpaceState();
  renderBuildVersion();
  updateActiveTabs();
}

function getAppDisplayName() {
  return state.data.appDisplayName || state.data.householdName || "库存管理";
}

function renderAppTitle() {
  const title = getAppDisplayName();
  document.title = title;
  if (els.appTitle) els.appTitle.textContent = title;
}

function renderBuildVersion() {
  if (!els.buildVersion) return;
  els.buildVersion.textContent = `版本 ${BUILD_VERSION} · ${BUILD_TIME}`;
  els.buildVersion.title = "用于确认当前页面已加载最新代码";
}

function renderStats() {
  els.itemCount.textContent = state.data.items.length;
  els.locationCount.textContent = state.data.locations.length;
  els.lowCount.textContent = getItemGroups(getLowStockItems()).length;
  if (els.containerCount) els.containerCount.textContent = getContainers().length;
}

function renderCategoryFilters() {
  const categories = ["全部", ...new Set(state.data.items.map((item) => item.category).filter(Boolean))];
  const allCategories = categories.length > 1 ? categories : DEFAULT_CATEGORIES.map((cat) => cat.name);
  els.categoryFilters.innerHTML = "";
  allCategories.forEach((category) => {
    const button = document.createElement("button");
    button.className = `chip${state.category === category ? " active" : ""}`;
    button.type = "button";
    button.textContent = category;
    button.addEventListener("click", () => {
      state.category = category;
      render();
    });
    els.categoryFilters.appendChild(button);
  });
}

function getFilteredGroups() {
  const query = state.search.trim().toLowerCase();
  const allItems = state.data.items;
  const groups = getItemGroups(allItems);
  if (!query && state.category === "全部") return groups;
  return groups.filter((group) => {
    if (!query) return state.category === "全部" || group.category === state.category;
    const matchName = normalizeItemName(group.name).toLowerCase().includes(query);
    const matchCategory = group.category?.toLowerCase().includes(query);
    const matchLocation = group.items.some((item) => item.location?.toLowerCase().includes(query));
    const matchZone = group.items.some((item) => getZoneSearchText(getLocationMeta(item.location).zone).includes(query));
    const matchItem = group.items.some((item) =>
      [item.note, item.brand, item.spec].filter(Boolean).some((v) => String(v).toLowerCase().includes(query))
    );
    const matchCategoryFilter = state.category === "全部" || group.category === state.category;
    return (matchName || matchCategory || matchLocation || matchZone || matchItem) && matchCategoryFilter;
  });
}

function renderItems() {
  els.listMode.classList.remove("hidden");
  const groups = getFilteredGroups();
  els.itemList.innerHTML = "";
  els.emptyItems.classList.toggle("visible", groups.length === 0);
  groups.forEach((group) => {
    els.itemList.appendChild(createItemGroupCard(group, { compact: false, open: false }));
  });
}

function renderSpaceState() {
  document.querySelectorAll("[data-space-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.spaceMode === state.spaceMode);
  });
  els.sceneTip?.classList.toggle("hidden", state.spaceMode !== "scene");
  els.spaceStage?.classList.toggle("hidden", state.spaceMode !== "scene");
  els.listMode.classList.toggle("hidden", false);
}

function renderSearchResults() {
  const query = state.search.trim();
  if (!els.searchResults) return;
  els.searchResults.innerHTML = "";
  if (!query) {
    els.searchResults.classList.remove("visible");
    return;
  }
  const results = getSearchMatches().slice(0, 8);
  els.searchResults.classList.add("visible");
  if (!results.length) {
      els.searchResults.innerHTML = '<div class="search-empty">没有找到匹配结果</div>';
    return;
  }
  results.forEach((result) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "search-result";
    button.innerHTML = `
      ${createSearchResultThumb(result)}
      <div class="search-result-copy">
        <strong>${escapeHtml(result.title)}</strong>
        <span>${escapeHtml(result.subtitle)}</span>
      </div>
    `;
    button.addEventListener("click", () => openSearchResult(result));
    els.searchResults.appendChild(button);
  });
}

function getSearchMatches() {
  const query = state.search.trim().toLowerCase();
  if (!query) return [];
  const items = state.data.items
    .filter((item) =>
      [item.name, item.category, item.location, getZoneSearchText(getLocationMeta(item.location).zone), item.note, item.brand, item.spec, item.purchaseDate, item.expiryDate]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    )
    .sort((a, b) => compareName(a.name, b.name))
    .map((item) => ({
      type: "item",
      id: item.id,
      item,
      title: item.name,
      subtitle: `${item.location || "未设置位置"} · ${item.category || "未分类"}`
    }));
  const locations = state.data.locations
    .filter((location) => {
      const meta = getLocationMeta(location);
      return [location, meta.zone, getZoneSearchText(meta.zone), meta.note]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    })
    .sort(compareName)
    .map((location) => {
      const items = getItemsForLocation(location);
      const meta = getLocationMeta(location);
      return {
        type: "location",
        location,
        title: location,
        subtitle: `${meta.zone || "未设置区域"} · ${items.length} 件物品`
      };
    });
  const zones = state.data.zones
    .filter((zone) => getZoneSearchText(zone).includes(query))
    .sort(compareName)
    .map((zone) => {
      const locations = getLocationsForZoneTree(zone);
      const children = getChildZones(zone);
      return {
        type: "zone",
        zone,
        title: zone,
        subtitle: `${children.length ? `${children.length} 个子区域 · ` : ""}${locations.length} 个位置`
      };
    });
  return [...zones, ...locations, ...items];
}

function createSearchResultThumb(result) {
  if (result.type === "item") return createThumbnailMarkup(result.item, "sm");
  if (result.type === "location") {
    const image = getLocationMeta(result.location).image || "";
    return image
      ? `<div class="thumb thumb-sm"><img src="${escapeHtml(image)}" alt="${escapeHtml(result.title)}"></div>`
      : `<div class="thumb thumb-sm entity-search-thumb">位</div>`;
  }
  const image = state.data.zoneMeta?.[result.zone]?.image || "";
  return image
    ? `<div class="thumb thumb-sm"><img src="${escapeHtml(image)}" alt="${escapeHtml(result.title)}"></div>`
    : `<div class="thumb thumb-sm entity-search-thumb zone-search-thumb">区</div>`;
}

function openSearchResult(result) {
  if (result.type === "item") {
    openItemDetail(result.id);
    return;
  }
  if (result.type === "location") {
    openContainerForLocation(result.location);
    return;
  }
  if (result.type === "zone") {
    openZoneDetail(result.zone);
  }
}

function renderLocations() {
  els.locationGrid.innerHTML = "";
  const locations = getFilteredLocations();
  els.emptyLocations?.classList.toggle("visible", locations.length === 0);
  locations.forEach((location) => {
    const items = getItemsForLocation(location);
    const lowCount = items.filter(isLowStock).length;
    const meta = getLocationMeta(location);
    const updatedAt = getLocationUpdatedAt(location);
    const card = document.createElement("article");
    card.className = `location-card${items.length === 0 ? " is-empty" : ""}`;
    card.innerHTML = `
      <div class="location-card-head">
        <div>
          <strong>${escapeHtml(location)}</strong>
          <span>${escapeHtml(meta.zone || "其他")}</span>
        </div>
        <details class="location-menu">
          <summary aria-label="位置设置" title="位置设置">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.8 1.8 0 0 0 .4 2l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.8 1.8 0 0 0-2-.4 1.8 1.8 0 0 0-1 1.7V21a2 2 0 1 1-4 0v-.1a1.8 1.8 0 0 0-1-1.7 1.8 1.8 0 0 0-2 .4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.8 1.8 0 0 0 .4-2 1.8 1.8 0 0 0-1.7-1H3a2 2 0 1 1 0-4h.1a1.8 1.8 0 0 0 1.7-1 1.8 1.8 0 0 0-.4-2l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.8 1.8 0 0 0 2 .4 1.8 1.8 0 0 0 1-1.7V3a2 2 0 1 1 4 0v.1a1.8 1.8 0 0 0 1 1.7 1.8 1.8 0 0 0 2-.4l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.8 1.8 0 0 0-.4 2 1.8 1.8 0 0 0 1.7 1h.1a2 2 0 1 1 0 4h-.1a1.8 1.8 0 0 0-1.7 1Z"/></svg>
          </summary>
          <div class="location-menu-panel">
      <button type="button" data-action="edit">编辑</button>
            <button type="button" class="danger" data-action="delete">删除</button>
          </div>
        </details>
      </div>
      <div class="location-card-stats">
        <span><b>${items.length}</b> 件物品</span>
    <span>${lowCount ? `${lowCount} 待补货` : escapeHtml(formatDateShort(updatedAt))}</span>
      </div>
      ${meta.note ? `<p>${escapeHtml(meta.note)}</p>` : `<p class="muted">没有说明</p>`}
    `;
    card.addEventListener("click", (event) => {
      if (event.target.closest(".location-menu")) return;
      openContainerForLocation(location);
    });
    card.querySelector('[data-action="edit"]').addEventListener("click", (event) => {
      event.stopPropagation();
      closeOpenMenus();
      openLocationModal(location);
    });
    card.querySelector('[data-action="delete"]').addEventListener("click", (event) => {
      event.stopPropagation();
      closeOpenMenus();
      confirmDeleteLocation(location);
    });
    els.locationGrid.appendChild(card);
  });
}

function renderLocationFilters() {
  if (!els.locationFilters) return;
  const locations = state.data.locations || [];
  const filters = [
    { id: "all", label: `全部 ${locations.length}` },
    { id: "active", label: `有物品 ${locations.filter((l) => getItemsForLocation(l).length > 0).length}` },
    { id: "empty", label: `空位置 ${locations.filter((l) => getItemsForLocation(l).length === 0).length}` },
    { id: "low", label: `有待补 ${locations.filter((l) => getItemsForLocation(l).some(isLowStock)).length}` }
  ];
  els.locationFilters.innerHTML = "";
  filters.forEach((filter) => {
    const button = document.createElement("button");
    button.className = `chip${state.locationFilter === filter.id ? " active" : ""}`;
    button.type = "button";
    button.textContent = filter.label;
    button.addEventListener("click", () => {
      state.locationFilter = filter.id;
      renderLocations();
      renderLocationFilters();
    });
    els.locationFilters.appendChild(button);
  });
}

function renderZones() {
  if (!els.zoneGrid) return;
  const roots = getZoneTree();
  els.zoneGrid.innerHTML = "";
  els.zoneGrid.classList.add("zone-tree");
  els.emptyZones?.classList.toggle("visible", state.data.zones.length === 0);
  roots.forEach((node) => renderZoneNode(node, els.zoneGrid));
}

function isZoneTreeExpanded(zone) {
  return state.zoneTreeExpanded?.has(zone);
}

function toggleZoneTreeNode(zone) {
  if (!zone) return;
  if (!state.zoneTreeExpanded) state.zoneTreeExpanded = new Set();
  if (state.zoneTreeExpanded.has(zone)) {
    state.zoneTreeExpanded.delete(zone);
    getDescendantZones(zone).forEach((child) => state.zoneTreeExpanded.delete(child));
  } else {
    state.zoneTreeExpanded = new Set([...getAncestorZones(zone), zone]);
  }
  renderZones();
}

function resetZoneTree() {
  state.zoneTreeExpanded = new Set();
  renderZones();
}

function getAncestorZones(zone) {
  const ancestors = [];
  const seen = new Set([zone]);
  let parent = getZoneParent(zone);
  while (parent && !seen.has(parent)) {
    ancestors.unshift(parent);
    seen.add(parent);
    parent = getZoneParent(parent);
  }
  return ancestors;
}

function renderZoneNode(node, parent) {
  const zone = node.name;
  const locations = getLocationsForZone(zone).sort(compareName);
  const descendantLocations = getLocationsForZoneTree(zone);
  const itemCount = descendantLocations.reduce((sum, l) => sum + getItemsForLocation(l).length, 0);
  const lowCount = descendantLocations.reduce((sum, l) => sum + getItemsForLocation(l).filter(isLowStock).length, 0);
  const hasZoneChildren = node.children.length > 0;
  const hasLocationChildren = locations.length > 0;
  const isLeaf = !hasZoneChildren && !hasLocationChildren;
  const isExpanded = isZoneTreeExpanded(zone);
  const wrapper = document.createElement("div");
  wrapper.className = `zone-tree-node depth-${Math.min(node.depth, 5)}`;
  const card = document.createElement("article");
  card.className = `zone-card${descendantLocations.length === 0 ? " is-empty" : ""}${hasZoneChildren ? " is-parent" : " is-leaf"}`;
  card.innerHTML = `
      <div class="zone-card-head">
        <div class="zone-card-title">
          ${isLeaf ? "" : `
          <button type="button" class="zone-tree-toggle" data-action="toggle-tree" aria-label="${isExpanded ? "折叠区域" : "展开区域"}" title="${isExpanded ? "折叠区域" : "展开区域"}" aria-expanded="${isExpanded}">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="zone-tree-toggle-icon ${isExpanded ? "is-open" : ""}">
              <path d="m9 6 6 6-6 6"/>
            </svg>
          </button>`}
          <div>
            <strong>${escapeHtml(zone)}</strong>
            <span>${isLeaf ? "最低层级" : `${node.children.length} 个子区域`} · ${descendantLocations.length} 个位置</span>
          </div>
        </div>
        <details class="zone-menu">
          <summary aria-label="区域设置" title="区域设置">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.8 1.8 0 0 0 .4 2l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.8 1.8 0 0 0-2-.4 1.8 1.8 0 0 0-1 1.7V21a2 2 0 1 1-4 0v-.1a1.8 1.8 0 0 0-1-1.7 1.8 1.8 0 0 0-2 .4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.8 1.8 0 0 0 .4-2 1.8 1.8 0 0 0-1.7-1H3a2 2 0 1 1 0-4h.1a1.8 1.8 0 0 0 1.7-1 1.8 1.8 0 0 0-.4-2l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.8 1.8 0 0 0 2 .4 1.8 1.8 0 0 0 1-1.7V3a2 2 0 1 1 4 0v.1a1.8 1.8 0 0 0 1 1.7 1.8 1.8 0 0 0 2-.4l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.8 1.8 0 0 0-.4 2 1.8 1.8 0 0 0 1.7 1h.1a2 2 0 1 1 0 4h-.1a1.8 1.8 0 0 0-1.7 1Z"/></svg>
          </summary>
          <div class="zone-menu-panel">
            <button type="button" data-action="add-child">新增子区域</button>
            <button type="button" data-action="edit">编辑</button>
            <button type="button" class="danger" data-action="delete">删除</button>
          </div>
        </details>
      </div>
      <div class="zone-card-stats">
        <span><b>${itemCount}</b> 件物品</span>
        <span>${lowCount ? `${lowCount} 待补` : "可建位置"}</span>
      </div>
    `;
  card.addEventListener("click", (event) => {
    if (event.target.closest("[data-action='toggle-tree']")) return;
    if (event.target.closest(".zone-menu")) return;
    resetZoneTree();
    resetNavigationStack();
    openZoneDetail(zone);
  });
  card.querySelector('[data-action="toggle-tree"]')?.addEventListener("click", (event) => {
    event.stopPropagation();
    closeOpenMenus();
    toggleZoneTreeNode(zone);
  });
  card.querySelector('[data-action="add-child"]').addEventListener("click", (event) => {
    event.stopPropagation();
    closeOpenMenus();
    resetZoneTree();
    openZoneModal("", zone);
  });
  card.querySelector('[data-action="edit"]').addEventListener("click", (event) => {
    event.stopPropagation();
    closeOpenMenus();
    resetZoneTree();
    openZoneModal(zone);
  });
  card.querySelector('[data-action="delete"]').addEventListener("click", (event) => {
    event.stopPropagation();
    closeOpenMenus();
    resetZoneTree();
    deleteZone(zone);
  });
  wrapper.appendChild(card);
  const children = document.createElement("div");
  children.className = "zone-tree-children";
  children.hidden = !isExpanded;
  node.children.forEach((child) => renderZoneNode(child, children));
  locations.forEach((location) => renderZoneLocationNode(location, zone, children));
  if (node.children.length || locations.length) {
    wrapper.appendChild(children);
  }
  parent.appendChild(wrapper);
}

function renderZoneLocationNode(location, zone, parent) {
  const items = getItemsForLocation(location).sort((a, b) => compareName(a.name, b.name));
  const meta = getLocationMeta(location);
  const card = document.createElement("button");
  card.type = "button";
  card.className = "zone-location-card";
  card.innerHTML = `
    <div class="entity-thumb thumb thumb-sm" aria-hidden="true">${escapeHtml(location.slice(0, 2) || "位")}</div>
    <div>
      <strong>${escapeHtml(location)}</strong>
      <span>${items.length} 件 · ${meta.note ? escapeHtml(meta.note) : "点击查看"}</span>
    </div>
  `;
  card.addEventListener("click", () => {
    closeOpenMenus();
    openContainerForLocation(location, { from: { type: "zone", zone } });
  });
  parent.appendChild(card);
}

function getLocationsForZone(zone) {
  return state.data.locations.filter((location) => getLocationMeta(location).zone === zone);
}

function getLocationsForZoneTree(zone) {
  const zones = [zone, ...getDescendantZones(zone)];
  return state.data.locations.filter((location) => zones.includes(getLocationMeta(location).zone));
}

function getZoneParent(zone) {
  return state.data.zoneMeta?.[zone]?.parent || "";
}

function getChildZones(zone) {
  return state.data.zones.filter((entry) => getZoneParent(entry) === zone).sort(compareName);
}

function getDescendantZones(zone, seen = new Set()) {
  if (seen.has(zone)) return [];
  seen.add(zone);
  return getChildZones(zone).flatMap((child) => [child, ...getDescendantZones(child, seen)]);
}

function isLeafZone(zone) {
  return !getChildZones(zone).length;
}

function getLeafZones() {
  return state.data.zones.filter(isLeafZone).sort(compareName);
}

function getAllZones() {
  return [...state.data.zones].sort(compareName);
}

function getZoneTree() {
  const zones = [...state.data.zones].sort(compareName);
  const byParent = new Map();
  zones.forEach((zone) => {
    const parent = zones.includes(getZoneParent(zone)) ? getZoneParent(zone) : "";
    if (!byParent.has(parent)) byParent.set(parent, []);
    byParent.get(parent).push(zone);
  });
  const build = (zone, depth = 0, trail = new Set()) => {
    if (trail.has(zone)) return null;
    const nextTrail = new Set(trail).add(zone);
    return {
      name: zone,
      depth,
      children: (byParent.get(zone) || []).map((child) => build(child, depth + 1, nextTrail)).filter(Boolean)
    };
  };
  return (byParent.get("") || []).map((zone) => build(zone, 0)).filter(Boolean);
}

function getFilteredLocations() {
  const query = state.search.trim().toLowerCase();
  return [...state.data.locations]
    .filter((location) => {
      const meta = getLocationMeta(location);
      const items = getItemsForLocation(location);
      if (state.locationFilter === "active") return items.length > 0;
      if (state.locationFilter === "empty") return items.length === 0;
      if (state.locationFilter === "low") return items.some(isLowStock);
      return true;
    })
    .filter((location) => {
      if (!query) return true;
      const meta = getLocationMeta(location);
      return [location, meta.zone, getZoneSearchText(meta.zone), meta.note]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    })
    .sort(compareName);
}

function renderReplenish() {
  const lowGroups = getItemGroups(getLowStockItems());
  els.replenishList.innerHTML = "";
  els.replenishHint.textContent = lowGroups.length ? `${lowGroups.length} 件` : "";
  els.emptyReplenish.classList.toggle("visible", lowGroups.length === 0);
  lowGroups.forEach((group) => {
    els.replenishList.appendChild(createItemGroupCard(group, { compact: true, open: false }));
  });
}

function createThumbnailMarkup(item, size = "md") {
  const thumb = item.thumbnail || "";
  const label = getItemAbbreviation(item.name);
  const color = getCategoryColor(item.category);
  const classes = `thumb thumb-${size}`;
  if (thumb) {
    return `<div class="${classes}"><img src="${escapeHtml(thumb)}" alt="${escapeHtml(item.name)}"></div>`;
  }
  return `<div class="${classes}" style="--thumb-color:${color}">${escapeHtml(label)}</div>`;
}

function getItemAbbreviation(name) {
  const clean = String(name || "").trim();
  if (!clean) return "物";
  return clean.replace(/\s+/g, "").slice(0, 2);
}

function getItemById(id) {
  return state.data.items.find((item) => item.id === id) || null;
}

function getContainerById(id) {
  return getContainers().find((container) => container.id === id) || null;
}

function getContainers() {
  const containers = Array.isArray(state.data.containers) && state.data.containers.length ? state.data.containers : DEFAULT_CONTAINERS;
  return upgradeContainers(containers);
}

function getContainerPreset(type) {
  const presets = {
    wardrobe: { type: "wardrobe", size: { w: 2.1, h: 3.2, d: 1.3 }, color: "#b9885a", accent: "#8e6337", description: "衣物和大件收纳" },
    box: { type: "box", size: { w: 1.8, h: 1.05, d: 1.25 }, color: "#7b8fa1", accent: "#4f6578", description: "收纳盒" },
    drawer: { type: "drawer", size: { w: 1.45, h: 1.35, d: 1.25 }, color: "#9f7b59", accent: "#6a4a31", description: "抽屉和床头柜" },
    shelf: { type: "shelf", size: { w: 2.0, h: 2.5, d: 0.9 }, color: "#8a9b69", accent: "#607043", description: "书架或置物架" },
    cabinet: { type: "cabinet", size: { w: 1.55, h: 1.9, d: 0.9 }, color: "#8ca1b5", accent: "#5f7487", description: "柜子" },
    crate: { type: "crate", size: { w: 1.6, h: 1.05, d: 1.1 }, color: "#bc906c", accent: "#8d6341", description: "通用收纳" }
  };
  return presets[type] || presets.box;
}

function getZonePosition(zone, index = getContainers().length) {
  const jitter = (index % 4) * 4;
  const positions = {
    left: { x: 24 + jitter, y: 48 + (index % 2) * 16, z: 20 + index },
    center: { x: 48 + jitter, y: 50 + (index % 2) * 14, z: 20 + index },
    right: { x: 72 - jitter, y: 48 + (index % 2) * 16, z: 20 + index },
    front: { x: 50 + jitter, y: 74, z: 20 + index },
    back: { x: 50 + jitter, y: 27, z: 20 + index }
  };
  return positions[zone] || positions.center;
}

function getContainerForLocation(location) {
  const exact = getContainers().find((container) => container.locations.includes(location));
  if (exact) return exact;
  return getContainers().find((container) => location?.includes(container.name)) || getContainers()[getContainers().length - 1];
}

function getItemsForLocation(location) {
  return state.data.items.filter((item) => item.location === location);
}

function getItemsForContainer(container) {
  if (!container) return [];
  return state.data.items.filter((item) => container.locations.includes(item.location));
}

function openContainerForLocation(location, { from = null, preserveStack = false } = {}) {
  if (!location) return;
  if (!preserveStack && !from) resetNavigationStack();
  if (from) pushNavigation(from);
  state.selectedLocation = location;
  els.containerTitle.textContent = location;
  renderContainerModal();
  switchContainerMode(state.containerMode);
  updateNavigationBackButtons();
  els.containerModal.showModal();
}

function openContainer(containerId) {
  const container = getContainerById(containerId);
  if (!container) return;
  openContainerForLocation(container.locations[0]);
}

function renderContainerModal() {
  const location = state.selectedLocation || state.data.locations[0] || "";
  if (!location) return;
  const items = getItemsForLocation(location).sort((a, b) => compareName(a.name, b.name));
  const meta = getLocationMeta(location);
  const lowCount = items.filter(isLowStock).length;
  els.containerTitle.textContent = location;
  els.containerMeta.textContent = `${meta.zone || "其他"} · ${items.length} 件物品${lowCount ? ` · ${lowCount} 件待补` : ""}${meta.note ? ` · ${meta.note}` : ""}`;
  els.containerItemsGrid.innerHTML = "";
  els.containerItemsTableBody.innerHTML = "";
  items.forEach((item) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "container-item-card";
    card.innerHTML = `
      ${createThumbnailMarkup(item, "sm")}
      <div class="container-item-copy">
        <strong>${escapeHtml(item.name)}</strong>
        <span>${escapeHtml(formatQuantity(item))}</span>
      </div>
    `;
    card.addEventListener("click", () => {
      if (els.containerModal?.open) els.containerModal.close();
      openItemDetail(item.id, { from: { type: "location", location } });
    });
    els.containerItemsGrid.appendChild(card);
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><div class="table-item">${createThumbnailMarkup(item, "xs")}<span>${escapeHtml(item.name)}</span></div></td>
      <td>${escapeHtml(formatQuantity(item))}</td>
      <td>${escapeHtml(item.category || "未分类")}</td>
      <td>${escapeHtml(item.location || "未设置位置")}</td>
    `;
    row.addEventListener("click", () => {
      if (els.containerModal?.open) els.containerModal.close();
      openItemDetail(item.id, { from: { type: "location", location } });
    });
    els.containerItemsTableBody.appendChild(row);
  });
  if (!items.length) {
    els.containerItemsGrid.innerHTML = '<div class="empty-state visible"><h3>这个位置还没有物品</h3></div>';
    els.containerItemsTableBody.innerHTML = '<tr><td colspan="4" class="empty-table">这个位置还没有物品</td></tr>';
  }
}

function switchSpaceMode(mode) {
  state.spaceMode = mode;
  render();
}

function switchContainerMode(mode) {
  state.containerMode = mode;
  document.querySelectorAll("[data-container-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.containerMode === mode);
  });
  els.containerItemsGrid.classList.toggle("hidden", mode !== "grid");
  els.containerItemsTableWrap.classList.toggle("hidden", mode !== "table");
}

function openContainerForm() {
  els.newContainerName.value = "";
  els.newContainerType.value = "box";
  els.newContainerLocation.value = "";
  els.newContainerDescription.value = "";
  els.newContainerZone.value = "center";
  els.containerFormModal.showModal();
  setTimeout(() => els.newContainerName.focus(), 80);
}

async function saveContainerFromForm(event) {
  event.preventDefault();
  const name = els.newContainerName.value.trim();
  const type = els.newContainerType.value;
  const location = els.newContainerLocation.value.trim();
  const description = els.newContainerDescription.value.trim();
  const zone = els.newContainerZone.value;
  if (!name || !location) return;
  const preset = getContainerPreset(type);
  const container = {
    id: `container-${crypto.randomUUID()}`,
    name, type, locations: [location],
    position: getZonePosition(zone),
    size: preset.size, color: preset.color, accent: preset.accent,
    description: description || preset.description,
    updatedAt: new Date().toISOString()
  };
  state.data.containers.push(container);
  if (!state.data.locations.includes(location)) state.data.locations.push(location);
  state.selectedContainerId = container.id;
  closeDialogs();
  buildSpaceScene();
  focusContainerInSpace(container.id);
  await persistData();
}

function openItemDetail(itemId, { from = null, preserveStack = false } = {}) {
  const item = getItemById(itemId);
  if (!item) return;
  if (!preserveStack && !from) resetNavigationStack();
  if (from) pushNavigation(from);
  state.selectedItemId = itemId;
  const locationMeta = getLocationMeta(item.location);
  const replenishRule = getReplenishRule(item.name);
  const sameNameTotal = getItemTotalQuantityByName(item.name);
  const fieldMeta = state.data.itemFieldMeta || {};
  const expiryWarning = getExpiryWarning(item);
  els.detailTitle.textContent = item.name;
  els.detailThumb.innerHTML = createThumbnailMarkup(item, "lg");
  els.detailCategory.textContent = item.category || "未分类";
  els.detailQuantity.textContent = formatQuantity(item);
  els.detailLocation.textContent = item.location ? `${item.location} · ${locationMeta.zone || "其他"}` : "未设置位置";
  els.detailNote.textContent = item.note || "没有备注";
  els.openContainerButton.textContent = item.location ? "查看这个位置" : "未设置位置";
  els.openContainerButton.disabled = !item.location;
  const details = [
    ["品牌", item.brand || "未填"],
    ["规格", item.spec || "未填"],
    ["购买日期", item.purchaseDate || "未填"],
    ["到期日期", item.expiryDate ? `${item.expiryDate}${expiryWarning ? "（" + expiryWarning + "）" : ""}` : "未填"],
    ["余量提醒", replenishRule.trackStock ? `总量低于 ${replenishRule.minQuantity ?? 0} 时提醒` : "未开启"],
    ["同名总量", `${sameNameTotal}${item.unit || ""}`],
    ["更新时间", item.updatedAt ? new Date(item.updatedAt).toLocaleString("zh-CN") : "未填"]
  ];
  Object.entries(item.customFields || {}).forEach(([key, value]) => {
    const meta = fieldMeta[key];
    if (meta) details.push([meta.label || key, value || "未填"]);
  });
  els.detailGrid.innerHTML = details
    .map(([label, value]) => {
      const warningClass = label.includes("到期") && String(value).includes("已") ? ' style="color:var(--red);"' : "";
      return `<div class="detail-item"><span>${escapeHtml(label)}</span><strong${warningClass}>${escapeHtml(value)}</strong></div>`;
    })
    .join("");
  els.detailModal.showModal();
  updateNavigationBackButtons();
}

function closeDialogs() {
  [els.itemModal, els.locationModal, els.zoneModal, els.zoneDetailModal, els.detailModal, els.containerModal, els.containerFormModal, els.confirmModal, els.mergeChoiceModal].forEach((dialog) => {
    if (dialog?.open) dialog.close();
  });
  resetNavigationStack();
  hideItemNameDropdown();
}

function switchView(view) {
  if (!VALID_VIEWS.includes(view)) return;
  resetZoneTree();
  state.view = view;
  document.querySelectorAll(".view").forEach((viewEl) => {
    viewEl.classList.toggle("active", viewEl.id === `${view}View`);
  });
  persistCurrentView(view);
  updateRouteForView(view);
  updateActiveTabs();
}

function getInitialView() {
  const routeView = getViewFromHash();
  if (routeView) return routeView;
  try {
    const storedView = localStorage.getItem(VIEW_STORAGE_KEY);
    if (VALID_VIEWS.includes(storedView)) return storedView;
  } catch (error) {
    // localStorage may be unavailable in private or restricted modes.
  }
  return "items";
}

function getViewFromHash() {
  const value = decodeURIComponent((window.location.hash || "").replace(/^#\/?/, ""));
  return VALID_VIEWS.includes(value) ? value : "";
}

function persistCurrentView(view) {
  try {
    localStorage.setItem(VIEW_STORAGE_KEY, view);
  } catch (error) {
    // The URL hash still preserves the view when storage is unavailable.
  }
}

function updateRouteForView(view) {
  const nextHash = `#${view}`;
  if (window.location.hash === nextHash) return;
  history.replaceState(null, "", nextHash);
}

function handleRouteChange() {
  const nextView = getViewFromHash();
  if (nextView && nextView !== state.view) switchView(nextView);
}

function updateActiveTabs() {
  document.querySelectorAll(".tab, .stat-pill").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === state.view);
  });
}

function updateSpaceSelection() {
  const container = getContainerById(state.selectedContainerId) || getContainers()[0];
  if (!container) return;
  const items = getItemsForContainer(container);
  els.selectedContainerName.textContent = container.name;
  els.selectedContainerMeta.textContent = `${container.description} · ${items.length} 件`;
}

function focusContainerInSpace(containerId) {
  if (!state.space) return;
  const container = getContainerById(containerId);
  if (!container) return;
  state.selectedContainerId = containerId;
  state.space.targetYaw = clamp((50 - Number(container.position.x || 50)) * 0.8, -28, 28);
  state.space.targetPitch = 62;
  updateSpaceSelection();
  updateSpaceScene();
}

function updateSpaceScene() {
  if (!state.space) return;
  getContainers().forEach((container) => {
    const itemCount = getItemsForContainer(container).length;
    const node = state.space.nodes.get(container.id);
    if (node) {
      node.classList.toggle("selected", container.id === state.selectedContainerId);
      const label = node.querySelector(".container-label");
      if (label) {
        label.querySelector("strong").textContent = container.name;
        label.querySelector("em").textContent = `${itemCount} 件`;
      }
    }
  });
}

function initSpaceExperience() {
  if (!els.spaceCanvas) return;
  els.spaceCanvas.innerHTML = `
    <div class="space-scene">
      <div class="space-world" id="spaceWorld">
        <div class="space-ambience"></div>
        <div class="space-floor"></div>
        <div class="space-wall back"></div>
        <div class="space-wall left"></div>
        <div class="space-wall right"></div>
        <div class="space-containers" id="spaceContainers"></div>
      </div>
    </div>
  `;
  const world = document.getElementById("spaceWorld");
  const containersLayer = document.getElementById("spaceContainers");
  const scene = {
    world, containersLayer, nodes: new Map(),
    yaw: -22, pitch: 62, targetYaw: -22, targetPitch: 62,
    dragging: false, startX: 0, startY: 0, startYaw: 0, startPitch: 0
  };
  state.space = scene;
  buildSpaceScene();
  const stage = els.spaceStage;
  stage.addEventListener("pointerdown", (event) => {
    if (event.target.closest(".container-3d")) return;
    scene.dragging = true;
    scene.startX = event.clientX;
    scene.startY = event.clientY;
    scene.startYaw = scene.targetYaw;
    scene.startPitch = scene.targetPitch;
  });
  stage.addEventListener("pointermove", (event) => {
    if (!scene.dragging) return;
    const dx = event.clientX - scene.startX;
    const dy = event.clientY - scene.startY;
    scene.targetYaw = clamp(scene.startYaw + dx * 0.14, -55, 35);
    scene.targetPitch = clamp(scene.startPitch - dy * 0.06, 50, 72);
  });
  const endDrag = () => { scene.dragging = false; };
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);
  const tick = () => {
    if (!state.space) return;
    scene.yaw += (scene.targetYaw - scene.yaw) * 0.1;
    scene.pitch += (scene.targetPitch - scene.pitch) * 0.1;
    scene.world.style.setProperty("--yaw", `${scene.yaw}deg`);
    scene.world.style.setProperty("--pitch", `${scene.pitch}deg`);
    requestAnimationFrame(tick);
  };
  updateSpaceSelection();
  updateSpaceScene();
  tick();
}

function buildSpaceScene() {
  if (!state.space) return;
  const { containersLayer, nodes } = state.space;
  containersLayer.innerHTML = "";
  nodes.clear();
  getContainers().forEach((container) => {
    const node = document.createElement("button");
    const width = Math.max(92, container.size.w * 52);
    const height = Math.max(88, container.size.h * 52);
    const depth = Math.max(18, container.size.d * 26);
    node.type = "button";
    node.className = `container-3d type-${container.type}`;
    node.dataset.containerId = container.id;
    node.style.zIndex = String(10 + Number(container.position.z || 1));
    node.style.setProperty("--x", `${clamp(Number(container.position.x) || 50, 8, 92)}%`);
    node.style.setProperty("--y", `${clamp(Number(container.position.y) || 54, 18, 86)}%`);
    node.style.setProperty("--depth-order", String(Number(container.position.z) || 1));
    node.style.setProperty("--w", `${width}px`);
    node.style.setProperty("--h", `${height}px`);
    node.style.setProperty("--d", `${depth}px`);
    node.style.setProperty("--base", container.color);
    node.style.setProperty("--accent", container.accent);
    node.innerHTML = `
      <span class="container-shadow"></span>
      <span class="container-top"></span>
      <span class="container-body"></span>
      <span class="container-edge"></span>
      <span class="container-detail one"></span>
      <span class="container-detail two"></span>
      <span class="container-label">
        <strong>${escapeHtml(container.name)}</strong>
        <em>0 件</em>
      </span>
    `;
    node.addEventListener("click", () => openContainer(container.id));
    containersLayer.appendChild(node);
    nodes.set(container.id, node);
  });
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function buildContainerGroup(THREE, container) {
  const group = new THREE.Group();
  group.position.set(container.position.x, 0, container.position.z);
  group.userData.containerId = container.id;
  let bodyMaterial;
  let labelOffset = 1.4;
  const baseColor = new THREE.Color(container.color);
  const accentColor = new THREE.Color(container.accent);
  if (container.type === "wardrobe") {
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(container.size.w, container.size.h, container.size.d),
      bodyMaterial = new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.9, metalness: 0.02, emissive: 0x000000 })
    );
    body.castShadow = true; body.receiveShadow = true;
    body.position.y = container.size.h / 2;
    group.add(body);
    group.add(makeHandle(THREE, 0.52, 1.6, 0.76, accentColor));
    group.add(makeHandle(THREE, -0.52, 1.6, 0.76, accentColor));
    group.add(makeTop(THREE, container.size, accentColor));
    labelOffset = container.size.h + 0.35;
  } else if (container.type === "shelf") {
    bodyMaterial = new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.92, emissive: 0x000000 });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(container.size.w, container.size.h, container.size.d), bodyMaterial);
    frame.castShadow = true; frame.receiveShadow = true;
    frame.position.y = container.size.h / 2;
    group.add(frame);
    group.add(makeShelfBoards(THREE, container, accentColor));
    labelOffset = container.size.h + 0.35;
  } else if (container.type === "drawer") {
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(container.size.w, container.size.h, container.size.d),
      bodyMaterial = new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.88, emissive: 0x000000 })
    );
    body.castShadow = true; body.receiveShadow = true;
    body.position.y = container.size.h / 2;
    group.add(body);
    group.add(makeDrawerLines(THREE, container.size, accentColor));
    labelOffset = container.size.h + 0.35;
  } else {
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(container.size.w, container.size.h, container.size.d),
      bodyMaterial = new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.9, emissive: 0x000000 })
    );
    body.castShadow = true; body.receiveShadow = true;
    body.position.y = container.size.h / 2;
    group.add(body);
    group.add(makeTop(THREE, container.size, accentColor));
    labelOffset = container.size.h + 0.35;
  }
  const label = makeLabelSprite(THREE, container.name, "0 件", container.color, container.accent);
  label.position.set(0, labelOffset, 0);
  group.add(label);
  group.traverse((object) => { object.userData.containerId = container.id; });
  group.userData.bodyMaterial = bodyMaterial;
  group.userData.label = label;
  group.userData.container = container;
  return group;
}

function makeLabelSprite(THREE, title, subtitle, color, accent) {
  const canvas = document.createElement("canvas");
  canvas.width = 512; canvas.height = 192;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  roundRect(ctx, 18, 24, 476, 140, 28, true, false);
  ctx.fillStyle = accent;
  ctx.font = "bold 42px sans-serif";
  ctx.fillText(title, 42, 82);
  ctx.fillStyle = color;
  ctx.font = "28px sans-serif";
  ctx.fillText(subtitle, 42, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
  sprite.scale.set(2.9, 1.1, 1);
  sprite.userData.canvas = canvas;
  sprite.userData.texture = texture;
  return sprite;
}

function updateLabelSprite(sprite, text, color, accent, selected) {
  const canvas = sprite.userData.canvas;
  const texture = sprite.userData.texture;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = selected ? "rgba(215, 240, 232, 0.98)" : "rgba(255,255,255,0.92)";
  roundRect(ctx, 18, 24, 476, 140, 28, true, false);
  const [title, subtitle] = text.split("\n");
  ctx.fillStyle = accent;
  ctx.font = "bold 42px sans-serif";
  ctx.fillText(title || "", 42, 82);
  ctx.fillStyle = color;
  ctx.font = "28px sans-serif";
  ctx.fillText(subtitle || "", 42, 128);
  texture.needsUpdate = true;
}

function makeTop(THREE, size, accentColor) {
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(size.w + 0.05, 0.12, size.d + 0.05),
    new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.8 })
  );
  top.position.y = size.h + 0.06;
  top.castShadow = true;
  return top;
}

function makeHandle(THREE, x, y, z, color) {
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.35, 8),
    new THREE.MeshStandardMaterial({ color, roughness: 0.6 })
  );
  handle.rotation.z = Math.PI / 2;
  handle.position.set(x, y, z);
  return handle;
}

function makeShelfBoards(THREE, container, accentColor) {
  const group = new THREE.Group();
  [0.6, 1.35, 2.05].forEach((y) => {
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(container.size.w + 0.02, 0.08, container.size.d + 0.02),
      new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.9 })
    );
    board.position.set(0, y, 0);
    group.add(board);
  });
  const divider = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, container.size.h, container.size.d),
    new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.95 })
  );
  divider.position.set(0, container.size.h / 2, 0);
  group.add(divider);
  return group;
}

function makeDrawerLines(THREE, size, accentColor) {
  const group = new THREE.Group();
  for (let i = 0; i < 2; i += 1) {
    const line = new THREE.Mesh(
      new THREE.BoxGeometry(size.w - 0.18, 0.06, 0.04),
      new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.9 })
    );
    line.position.set(0, 0.45 + i * 0.42, size.d / 2 + 0.02);
    group.add(line);
  }
  return group;
}

function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
  if (typeof radius === "number") {
    radius = { tl: radius, tr: radius, br: radius, bl: radius };
  } else {
    radius = { tl: 0, tr: 0, br: 0, bl: 0, ...radius };
  }
  ctx.beginPath();
  ctx.moveTo(x + radius.tl, y);
  ctx.lineTo(x + width - radius.tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
  ctx.lineTo(x + width, y + height - radius.br);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
  ctx.lineTo(x + radius.bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
  ctx.lineTo(x, y + radius.tl);
  ctx.quadraticCurveTo(x, y, x + radius.tl, y);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

function hideSpaceScene() {
  els.spaceStage.classList.add("hidden");
}

function getFilteredItems() {
  return state.data.items
    .filter((item) => {
      if (!state.search) return true;
      return [item.name, item.category, item.location, item.note, item.brand, item.spec, item.purchaseDate, item.expiryDate]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(state.search));
    })
    .filter((item) => state.search || state.category === "全部" || item.category === state.category)
    .sort((a, b) => compareName(a.name, b.name));
}

function getLowStockItems() {
  return state.data.items.filter(isLowStock);
}

function isLowStock(item) {
  const rule = getReplenishRule(item.name);
  const total = getItemTotalQuantityByName(item.name);
  return Boolean(rule.trackStock) && total <= Number(rule.minQuantity || 0);
}

function isExpiringSoon(item) {
  if (!item.expiryDate) return false;
  const expiry = new Date(item.expiryDate);
  const now = new Date();
  const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
  return diffDays <= 10 && diffDays >= 0;
}

function isExpired(item) {
  if (!item.expiryDate) return false;
  const expiry = new Date(item.expiryDate);
  const now = new Date();
  return expiry < new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function getExpiryWarning(item) {
  if (!item.expiryDate) return "";
  if (isExpired(item)) return "已过期";
  if (isExpiringSoon(item)) return "即将到期";
  return "";
}

function openItemModal(id = null) {
  populateFormOptions();
  const item = id ? state.data.items.find((entry) => entry.id === id) : null;
    els.itemModalTitle.textContent = item ? "编辑物品" : "新增物品";
  els.deleteItemButton.classList.toggle("hidden", !item);
  els.itemId.value = item?.id || "";
  els.itemName.value = item?.name || "";
  els.itemCategory.value = item?.category || "";
  els.itemZone.value = item?.location ? getLocationMeta(item.location).zone || "" : "";
  els.itemLocation.value = item?.location || "";
  els.itemQuantity.value = item?.quantity ?? "";
  els.itemUnit.value = item?.unit || "";
  els.trackStock.checked = Boolean(item?.trackStock);
  els.itemMinQuantity.value = item?.minQuantity ?? "";
  els.itemNote.value = item?.note || "";
  if (els.itemThumbnail) els.itemThumbnail.value = item?.thumbnail || "";
  if (els.itemThumbnailFile) els.itemThumbnailFile.value = "";
  renderImagePreview(els.itemThumbnailPreview, item?.thumbnail || "", "未上传物品缩略图");
  if (els.itemLocationError) els.itemLocationError.textContent = "";
  if (els.itemLocation) els.itemLocation.classList.remove("input-error");
  renderItemFormFields(item);
  populateLocationDatalist();
  updateMinStockVisibility();
  els.itemModal.showModal();
  setTimeout(() => els.itemName.focus(), 80);
}

function renderItemFormFields(item) {
  const fieldMeta = state.data.itemFieldMeta || {};
  const builtinContainer = els.builtinFields;
  const customContainer = els.customFieldsArea;
  builtinContainer.innerHTML = "";
  customContainer.innerHTML = "";
  const sorted = Object.entries(fieldMeta).sort((a, b) => (a[1].order || 0) - (b[1].order || 0));
  sorted.forEach(([key, meta]) => {
    if (meta && meta.builtin) {
      if (key === "thumbnail") return;
      const value = item?.[key] || "";
      const inputType = key.includes("Date") ? "date" : "text";
      if (meta.editable) {
        const row = document.createElement("div");
        row.className = "custom-field-row builtin-field-row";
        row.dataset.builtinKey = key;
        row.innerHTML = `
          <div>
            <label class="field-label">字段名</label>
            <input class="plain-input field-label-input" type="text" placeholder="如：重量" value="${escapeHtml(meta.label || key)}">
          </div>
          <div>
            <label class="field-label">内容</label>
            <input class="plain-input field-value-input" id="field-${key}" type="${inputType}" placeholder="可选" value="${escapeHtml(value)}">
          </div>
        `;
        builtinContainer.appendChild(row);
      } else {
        const html = `
          <label class="field-label" for="field-${key}">${escapeHtml(meta.label || key)}</label>
          <input class="plain-input" id="field-${key}" type="${inputType}" placeholder="可选" value="${escapeHtml(value)}">
        `;
        builtinContainer.insertAdjacentHTML("beforeend", html);
      }
    }
  });
  if (item?.customFields) {
    Object.entries(item.customFields).forEach(([key, value]) => {
      const meta = fieldMeta[key];
      if (meta && meta.builtin) return;
      addCustomFieldInput(key, value, meta?.label || key);
    });
  }
}

function addCustomFieldInput(key = "", value = "", label = "") {
  const container = els.customFieldsArea;
  const row = document.createElement("div");
  row.className = "custom-field-row";
  const fieldKey = key || `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  row.innerHTML = `
    <div>
      <label class="field-label">字段名</label>
      <input class="plain-input field-label-input" type="text" placeholder="如：尺寸" value="${escapeHtml(label)}">
    </div>
    <div>
      <label class="field-label">内容</label>
      <input class="plain-input field-value-input" type="text" placeholder="如：100cm" value="${escapeHtml(value)}">
    </div>
    <button type="button" class="icon-button" title="删除字段" aria-label="删除字段">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
    </button>
  `;
  row.dataset.fieldKey = fieldKey;
  row.querySelector(".icon-button").addEventListener("click", () => row.remove());
  container.appendChild(row);
}

function collectCustomFields() {
  const fields = {};
  const fieldMeta = { ...(state.data.itemFieldMeta || {}) };
  els.customFieldsArea.querySelectorAll(".custom-field-row").forEach((row) => {
    const label = row.querySelector(".field-label-input").value.trim();
    const value = row.querySelector(".field-value-input").value.trim();
    const key = row.dataset.fieldKey;
    if (!label) return;
    fields[key] = value;
    if (!fieldMeta[key]) {
      fieldMeta[key] = { label, editable: true, builtin: false, order: 100 + Object.keys(fieldMeta).length };
    } else if (fieldMeta[key].label !== label) {
      fieldMeta[key].label = label;
    }
  });
  state.data.itemFieldMeta = fieldMeta;
  return fields;
}

function handleItemNameInput() {
  const input = els.itemName;
  const dropdown = els.itemNameDropdown;
  const query = normalizeItemName(input.value).toLowerCase();
  const names = [...new Set(state.data.items.map((item) => item.name).filter(Boolean))];
  const matches = query ? names.filter((name) => name.toLowerCase().includes(query)) : [];
  dropdown.innerHTML = "";
  if (!matches.length) {
    dropdown.classList.remove("visible");
    return;
  }
  matches.forEach((name) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = name;
    button.addEventListener("click", () => {
      input.value = name;
      dropdown.classList.remove("visible");
      const existingItems = state.data.items.filter((item) => normalizeItemName(item.name) === normalizeItemName(name));
      if (existingItems.length > 0) {
        els.itemCategory.value = existingItems[0].category || "";
        els.itemUnit.value = existingItems[0].unit || "";
        const rule = getReplenishRule(name);
        els.trackStock.checked = Boolean(rule.trackStock);
        els.itemMinQuantity.value = rule.minQuantity ?? "";
        updateMinStockVisibility();
      }
      if (!els.itemId.value) {
        promptDuplicateItemLocations(name);
      }
    });
    dropdown.appendChild(button);
  });
  dropdown.classList.add("visible");
}

function hideItemNameDropdown() {
  els.itemNameDropdown?.classList.remove("visible");
}

function handleItemNameBlur() {
  if (els.itemId.value) return;
  const name = normalizeItemName(els.itemName.value);
  if (!name) return;
  setTimeout(() => {
    if (!els.itemNameDropdown?.classList.contains("visible")) return;
    promptDuplicateItemLocations(name);
  }, 150);
}

function promptDuplicateItemLocations(name) {
  const sameNameItems = state.data.items.filter((item) => normalizeItemName(item.name) === name);
  if (!sameNameItems.length) return;
  const sameNameLocations = [...new Set(sameNameItems.map((item) => item.location))];
  if (sameNameLocations.length >= 3) {
    alert(`${name} 已在 3 个位置存放，无法再新增位置`);
    els.itemName.value = "";
    els.itemName.focus();
    return;
  }
  showMergeChoiceModal(name, sameNameItems, els.itemLocation.value.trim() || "新位置");
}

function handleItemLocationBlur() {
  const location = els.itemLocation.value.trim();
  if (!location) return;
  if (state.data.locations.includes(location)) {
    const meta = getLocationMeta(location);
    if (meta.zone) {
      els.itemZone.value = meta.zone;
      populateLocationDatalist();
    }
    if (els.itemLocationError) els.itemLocationError.textContent = "";
    if (els.itemLocation) els.itemLocation.classList.remove("input-error");
    return;
  }
  const inferred = inferLocationZone(location, state.data.zones);
  if (inferred && inferred !== "其他") {
    els.itemZone.value = inferred;
    populateLocationDatalist();
    if (els.itemLocationError) els.itemLocationError.textContent = "";
    if (els.itemLocation) els.itemLocation.classList.remove("input-error");
    return;
  }
  if (els.itemLocationError) els.itemLocationError.textContent = "该位置未绑定区域，请填写区域名称";
  if (els.itemLocation) els.itemLocation.classList.add("input-error");
}

function populateFormOptions() {
  const categories = DEFAULT_CATEGORIES.filter((cat) => cat.name !== "全部").map((cat) => cat.name);
  const usedCategories = state.data.items.map((item) => item.category).filter(Boolean);
  const zones = getAllZones();
  setDatalistOptions(els.itemCategoryOptions, [...new Set([...categories, ...usedCategories])]);
  setDatalistOptions(els.itemZoneOptions, zones);
  populateLocationDatalist();
  setSelectOptions(els.locationZone, zones);
}

function populateLocationDatalist() {
  if (!els.itemLocationOptions) return;
  const zone = els.itemZone?.value.trim();
  const locations = zone
    ? state.data.locations.filter((location) => getLocationMeta(location).zone === zone || location.includes(zone))
    : state.data.locations;
  setDatalistOptions(els.itemLocationOptions, locations.length ? locations : state.data.locations);
}

function setDatalistOptions(datalist, values) {
  if (!datalist) return;
  datalist.innerHTML = "";
  [...new Set(values.filter(Boolean))].forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    datalist.appendChild(option);
  });
}

function setSelectOptions(select, values) {
  if (!select) return;
  if (select.tagName !== "SELECT") {
    setDatalistOptions(select, values);
    return;
  }
  const current = select.value;
  select.innerHTML = "";
  if (select === els.locationZone) {
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "请选择区域";
    select.appendChild(placeholder);
  }
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
  if (values.includes(current)) select.value = current;
}

function collectItemFormData() {
  const id = els.itemId.value || crypto.randomUUID();
  const category = els.itemCategory.value.trim();
  const zoneInput = els.itemZone.value.trim();
  const location = els.itemLocation.value.trim();
  const name = normalizeItemName(els.itemName.value);
  const zone = zoneInput || (location ? getLocationMeta(location).zone : "") || inferLocationZone(location, state.data.zones) || "其他";
  const quantity = Number(els.itemQuantity.value || 0);
  const fieldMeta = state.data.itemFieldMeta || {};
  const builtinValues = {};
  Object.keys(fieldMeta).forEach((key) => {
    if (key === "thumbnail") return;
    const input = document.getElementById(`field-${key}`);
    if (input) builtinValues[key] = input.value.trim();
  });
  builtinValues.thumbnail = els.itemThumbnail?.value || "";
  const customFields = collectCustomFields();
  const builtinLabelChanges = {};
  document.querySelectorAll(".builtin-field-row").forEach((row) => {
    const key = row.dataset.builtinKey;
    const labelInput = row.querySelector(".field-label-input");
    if (key && labelInput) {
      builtinLabelChanges[key] = labelInput.value.trim();
    }
  });
  return {
    id, name, category, zone, location, quantity,
    unit: els.itemUnit.value.trim(),
    trackStock: els.trackStock.checked,
    minQuantity: Number(els.itemMinQuantity.value || 0),
    note: els.itemNote.value.trim(),
    builtinValues,
    customFields,
    builtinLabelChanges,
    existingItem: null
  };
}

async function doSaveItem(formData) {
  const { id, name, category, zone, location, quantity, unit, trackStock, minQuantity, note, builtinValues, customFields, builtinLabelChanges, existingItem } = formData;
  const now = new Date().toISOString();
  const finalId = existingItem ? existingItem.id : id;

  Object.entries(builtinLabelChanges).forEach(([key, newLabel]) => {
    if (newLabel && state.data.itemFieldMeta[key]) {
      state.data.itemFieldMeta[key].label = newLabel;
    }
  });

  const existingRule = getStoredReplenishRule(name);
  const requestedRule = { trackStock, minQuantity };
  let finalRule = requestedRule;

  if (existingRule && (existingRule.trackStock !== requestedRule.trackStock || Number(existingRule.minQuantity || 0) !== Number(requestedRule.minQuantity || 0))) {
    const confirmed = confirm(`该物品已存在补货规则，当前阈值为 ${existingRule.minQuantity}，是否覆盖？`);
    if (confirmed) {
      finalRule = requestedRule;
    } else {
      finalRule = existingRule;
    }
  } else if (existingRule) {
    finalRule = existingRule;
  }

  const item = {
    id: finalId, name,
    category: category || "未分类",
    location, quantity,
    unit,
    trackStock: finalRule.trackStock,
    minQuantity: Number(finalRule.minQuantity || 0),
    note,
    brand: builtinValues.brand || "",
    spec: builtinValues.spec || "",
    purchaseDate: builtinValues.purchaseDate || "",
    expiryDate: builtinValues.expiryDate || "",
    thumbnail: builtinValues.thumbnail || "",
    customFields,
    updatedBy: state.data.memberName || "我",
    updatedAt: now
  };

  if (quantity <= 0) {
    if (existingItem) {
        const confirmed = confirm("当前位置该物品库存已为零，是否删除本条记录？");
      if (confirmed) {
        state.data.deletedItems[finalId] = now;
        state.data.items = state.data.items.filter((entry) => entry.id !== finalId);
      } else {
        const index = state.data.items.findIndex((entry) => entry.id === finalId);
        if (index >= 0) state.data.items[index] = item;
      }
    }
  } else {
    const index = state.data.items.findIndex((entry) => entry.id === finalId);
    if (index >= 0) state.data.items[index] = item;
    else state.data.items.unshift(item);
  }

  setReplenishRule(name, finalRule, state.data.memberName || "我");
  if (!state.data.zones.includes(zone)) state.data.zones.push(zone);
  state.data.zoneMeta = state.data.zoneMeta || {};
  const itemZoneRevivedAt = state.data.deletedZones?.[zone] ? now : state.data.zoneMeta[zone]?.revivedAt || "";
  state.data.zoneMeta[zone] = { ...(state.data.zoneMeta[zone] || {}), parent: state.data.zoneMeta[zone]?.parent || "", revivedAt: itemZoneRevivedAt, updatedAt: now };
  if (!state.data.locations.includes(location)) state.data.locations.push(location);
  const itemLocationRevivedAt = state.data.deletedLocations?.[location] ? now : state.data.locationMeta[location]?.revivedAt || "";
  state.data.locationMeta[location] = { ...(state.data.locationMeta[location] || {}), zone, revivedAt: itemLocationRevivedAt, updatedAt: now };
  if (state.data.deletedLocations?.[location]) delete state.data.deletedLocations[location];
  if (state.data.deletedZones?.[zone]) delete state.data.deletedZones[zone];

  closeDialogs();
  populateFormOptions();
  await persistData();
}

async function saveItemFromForm(event) {
  event.preventDefault();
  const formData = collectItemFormData();
  if (!formData.location) {
    showToast("请先填写位置");
    return;
  }
  const isNewLocation = !state.data.locations.includes(formData.location);
  if (isNewLocation && !formData.zone) {
    showToast("该位置未绑定区域，请填写区域名称");
    if (els.itemZone) els.itemZone.focus();
    return;
  }
  if ((!formData.quantity || formData.quantity <= 0) && !els.itemId.value) {
    showToast("数量不能为0");
    return;
  }

  const existingItem = state.data.items.find((entry) => entry.id === formData.id) || null;
  const sameNameItems = state.data.items.filter((item) => normalizeItemName(item.name) === formData.name);
  const sameNameLocations = [...new Set(sameNameItems.map((item) => item.location))];

  if (!existingItem && sameNameItems.length > 0) {
    if (sameNameLocations.length >= 3) {
      alert(`${formData.name} 已在 3 个位置存放，无法再新增位置`);
      return;
    }
    if (sameNameLocations.includes(formData.location)) {
      const existingAtLocation = sameNameItems.find((item) => item.location === formData.location);
      const confirmed = confirm(`${formData.name} 在「${formData.location}」已有 ${existingAtLocation.quantity}${existingAtLocation.unit || ""}，是否归位到该位置并修改库存？\n\n点击“确认”归位到已有位置\n点击“取消”可修改位置后重新保存`);
      if (!confirmed) return;
      formData.existingItem = existingAtLocation;
    } else {
      state.pendingSave = formData;
      showMergeChoiceModal(formData.name, sameNameItems, formData.location);
      return;
    }
  }

  await doSaveItem(formData);
}

function showMergeChoiceModal(name, sameNameItems, newLocation) {
  els.mergeChoiceTitle.textContent = `${name} 已有存放位置`;
  const listHtml = sameNameItems.map((item) => `
    <div class="merge-choice-item">
      <div class="merge-choice-info">
        <strong>${escapeHtml(item.location)}</strong>
        <span>${escapeHtml(formatQuantity(item))}</span>
      </div>
      <button type="button" class="secondary-button merge-to-existing" data-item-id="${escapeHtml(item.id)}">归位到此</button>
    </div>
  `).join("");
  els.mergeChoiceBody.innerHTML = `
    <p class="muted" style="margin-bottom:12px;">该物品已在以下位置存放，请选择操作：</p>
    <div class="merge-choice-list">${listHtml}</div>
    <div class="merge-choice-divider"></div>
    <p class="muted">也可以新增到当前输入的位置：<strong>${escapeHtml(newLocation)}</strong></p>
  `;

  els.mergeChoiceBody.querySelectorAll(".merge-to-existing").forEach((button) => {
    button.addEventListener("click", () => {
      const itemId = button.dataset.itemId;
      handleMergeChoiceExisting(itemId);
    });
  });

  els.mergeChoiceModal.showModal();
}

function closeMergeChoiceModal() {
  els.mergeChoiceModal?.close();
  state.pendingSave = null;
}

function handleMergeChoiceExisting(itemId) {
  closeMergeChoiceModal();
  const targetItem = getItemById(itemId);
  if (targetItem) {
    closeDialogs();
    openItemModal(targetItem.id);
  }
}

function handleMergeChoiceNew() {
  if (!state.pendingSave) {
    closeMergeChoiceModal();
    return;
  }
  const formData = state.pendingSave;
  state.pendingSave = null;
  closeMergeChoiceModal();
  doSaveItem(formData);
}

async function removeItemRecord(item) {
  if (!item) return;
  state.data.deletedItems = state.data.deletedItems || {};
  state.data.deletedItems[item.id] = new Date().toISOString();
  state.data.items = state.data.items.filter((entry) => entry.id !== item.id);
  closeDialogs();
  await persistData();
}

async function saveLocationFromForm(event) {
  event.preventDefault();
  const originalName = els.locationOriginalName.value.trim();
  const name = els.locationName.value.trim();
  const zone = els.locationZone.value.trim();
  const note = els.locationNote.value.trim();
  const image = els.locationImage?.value || "";
  if (!name) return;
  if (!zone) {
    if (els.locationZoneError) els.locationZoneError.textContent = "请选择区域";
    els.locationZone.classList.add("input-error");
    showToast("新增位置前请选择区域");
    return;
  }
  const duplicate = state.data.locations.includes(name) && name !== originalName;
  if (duplicate) {
    els.locationNameError.textContent = "该位置已存在";
    els.locationName.classList.add("input-error");
    return;
  }
  els.locationNameError.textContent = "";
  els.locationName.classList.remove("input-error");
  if (els.locationZoneError) els.locationZoneError.textContent = "";
  els.locationZone.classList.remove("input-error");
  const now = new Date().toISOString();
  state.data.deletedLocations = state.data.deletedLocations || {};
  state.data.zoneMeta = state.data.zoneMeta || {};
  const locationZoneRevivedAt = state.data.deletedZones?.[zone] ? now : state.data.zoneMeta[zone]?.revivedAt || "";
  if (zone) state.data.zoneMeta[zone] = { ...(state.data.zoneMeta[zone] || {}), parent: state.data.zoneMeta[zone]?.parent || "", revivedAt: locationZoneRevivedAt, updatedAt: now };
  const revivedAt = state.data.deletedLocations?.[name] ? now : state.data.locationMeta[name]?.revivedAt || "";
  if (originalName && originalName !== name) {
    const index = state.data.locations.indexOf(originalName);
    if (index >= 0) state.data.locations[index] = name;
    state.data.items.forEach((item) => {
      if (item.location === originalName) {
        item.location = name;
        item.updatedAt = now;
        item.updatedBy = state.data.memberName || "我";
      }
    });
    state.data.deletedLocations[originalName] = now;
    delete state.data.deletedLocations[name];
    delete state.data.locationMeta[originalName];
  } else if (!state.data.locations.includes(name)) {
    state.data.locations.push(name);
    delete state.data.deletedLocations[name];
  }
  state.data.locationMeta[name] = { zone, note, image, revivedAt, updatedAt: now };
  els.locationName.value = "";
  els.locationOriginalName.value = "";
  closeDialogs();
  populateFormOptions();
  await persistData();
}

function openLocationModal(location = "") {
  const meta = location ? getLocationMeta(location) : { zone: "", note: "", image: "" };
  els.locationModalTitle.textContent = location ? "编辑位置" : "新增位置";
  els.locationOriginalName.value = location || "";
  els.locationName.value = location || "";
  els.locationNameError.textContent = "";
  els.locationName.classList.remove("input-error");
  if (els.locationZoneError) els.locationZoneError.textContent = "";
  els.locationZone.classList.remove("input-error");
  const zones = getAllZones();
  setSelectOptions(els.locationZone, zones);
  if (meta.zone && !zones.includes(meta.zone)) {
    const option = document.createElement("option");
    option.value = meta.zone || "其他";
    option.textContent = meta.zone || "其他";
    els.locationZone.appendChild(option);
  }
  els.locationZone.value = location ? (meta.zone || inferLocationZone(location, state.data.zones) || "") : "";
  els.locationNote.value = meta.note || "";
  if (els.locationImage) els.locationImage.value = meta.image || "";
  if (els.locationImageFile) els.locationImageFile.value = "";
  renderImagePreview(els.locationImagePreview, meta.image || "", "未上传位置图片");
  els.deleteLocationButton.classList.toggle("hidden", !location);
  els.locationModal.showModal();
  setTimeout(() => els.locationName.focus(), 80);
}

function openZoneModal(zone = "", parent = "") {
  els.zoneOriginalName.value = zone || "";
  els.zoneName.value = zone || "";
  els.zoneModalTitle.textContent = zone ? "编辑区域" : "新增区域";
  els.zoneNameError.textContent = "";
  els.zoneName.classList.remove("input-error");
  populateZoneParentOptions(zone);
  if (els.zoneParent) els.zoneParent.value = zone ? getZoneParent(zone) : parent;
  const meta = zone ? state.data.zoneMeta?.[zone] || {} : {};
  if (els.zoneImage) els.zoneImage.value = meta.image || "";
  if (els.zoneImageFile) els.zoneImageFile.value = "";
  renderImagePreview(els.zoneImagePreview, meta.image || "", "未上传区域图片");
  els.zoneModal.showModal();
  setTimeout(() => els.zoneName.focus(), 80);
}

function populateZoneParentOptions(currentZone = "") {
  if (!els.zoneParent) return;
  const currentParent = currentZone ? getZoneParent(currentZone) : "";
  const blocked = new Set(currentZone ? [currentZone, ...getDescendantZones(currentZone)] : []);
  els.zoneParent.innerHTML = '<option value="">无（顶级区域）</option>';
  state.data.zones
    .filter((zone) => !blocked.has(zone))
    .sort(compareName)
    .forEach((zone) => {
      const option = document.createElement("option");
      option.value = zone;
      option.textContent = `${"　".repeat(getZoneDepth(zone))}${zone}`;
      els.zoneParent.appendChild(option);
    });
  if (currentParent && !blocked.has(currentParent)) els.zoneParent.value = currentParent;
}

function getZoneDepth(zone, seen = new Set()) {
  const parent = getZoneParent(zone);
  if (!parent || seen.has(parent)) return 0;
  seen.add(parent);
  return 1 + getZoneDepth(parent, seen);
}

async function saveZoneFromForm(event) {
  event.preventDefault();
  const originalName = els.zoneOriginalName.value.trim();
  const name = els.zoneName.value.trim();
  const parent = els.zoneParent?.value || "";
  const image = els.zoneImage?.value || "";
  if (!name) return;
  if (state.data.zones.includes(name) && name !== originalName) {
    els.zoneNameError.textContent = "该区域已存在";
    els.zoneName.classList.add("input-error");
    return;
  }
  if (originalName && parent && (parent === originalName || getDescendantZones(originalName).includes(parent))) {
    els.zoneNameError.textContent = "父级区域不能选择自身或子区域";
    els.zoneName.classList.add("input-error");
    return;
  }
  els.zoneNameError.textContent = "";
  els.zoneName.classList.remove("input-error");
  const now = new Date().toISOString();
  state.data.deletedZones = state.data.deletedZones || {};
  state.data.zoneMeta = state.data.zoneMeta || {};
  const revivedAt = state.data.deletedZones?.[name] ? now : state.data.zoneMeta[name]?.revivedAt || "";
  if (originalName && originalName !== name) {
    const originalMeta = state.data.zoneMeta[originalName] || {};
    const index = state.data.zones.indexOf(originalName);
    if (index >= 0) state.data.zones[index] = name;
    Object.values(state.data.zoneMeta).forEach((meta) => {
      if (meta?.parent === originalName) {
        meta.parent = name;
        meta.updatedAt = now;
      }
    });
    state.data.locations.forEach((location) => {
      const meta = state.data.locationMeta[location];
      if (meta?.zone === originalName) {
        meta.zone = name;
        meta.updatedAt = now;
      }
    });
    state.data.deletedZones[originalName] = now;
    delete state.data.deletedZones[name];
    state.data.zoneMeta[name] = { ...originalMeta, parent, image, revivedAt, updatedAt: now };
    delete state.data.zoneMeta[originalName];
  } else if (!state.data.zones.includes(name)) {
    state.data.zones.push(name);
    delete state.data.deletedZones[name];
  }
  state.data.zoneMeta[name] = { ...(state.data.zoneMeta[name] || {}), parent, image, revivedAt, updatedAt: now };
  els.zoneOriginalName.value = "";
  els.zoneName.value = "";
  closeDialogs();
  populateFormOptions();
  await persistData();
}

async function deleteZone(zone) {
  const zonesToDelete = [zone, ...getDescendantZones(zone)];
  const used = state.data.locations.filter((location) => zonesToDelete.includes(getLocationMeta(location).zone));
  const affectedItems = state.data.items.filter((item) => used.includes(item.location));
  const message = used.length || affectedItems.length || zonesToDelete.length > 1
    ? `删除区域「${zone}」会级联删除 ${zonesToDelete.length - 1} 个子区域、${used.length} 个位置、${affectedItems.length} 条物品记录。确定继续吗？`
    : `确定删除区域「${zone}」吗？`;
  const confirmed = confirm(message);
  if (!confirmed) return;
  const now = new Date().toISOString();
  state.data.deletedZones = state.data.deletedZones || {};
  state.data.deletedLocations = state.data.deletedLocations || {};
  state.data.deletedItems = state.data.deletedItems || {};
  zonesToDelete.forEach((entry) => {
    state.data.deletedZones[entry] = now;
    delete state.data.zoneMeta?.[entry];
  });
  used.forEach((location) => {
    state.data.deletedLocations[location] = now;
    delete state.data.locationMeta?.[location];
  });
  affectedItems.forEach((item) => {
    if (item?.id) state.data.deletedItems[item.id] = now;
  });
  state.data.zones = state.data.zones.filter((entry) => !zonesToDelete.includes(entry));
  state.data.locations = state.data.locations.filter((entry) => !used.includes(entry));
  state.data.items = state.data.items.filter((item) => !affectedItems.some((deleted) => deleted.id === item.id));
  closeDialogs();
  populateFormOptions();
  await persistData();
}

function openZoneDetail(zone) {
  const locations = getLocationsForZone(zone).sort(compareName);
  const children = getChildZones(zone);
  const treeLocations = getLocationsForZoneTree(zone);
  const itemCount = treeLocations.reduce((sum, l) => sum + getItemsForLocation(l).length, 0);
  const lowCount = treeLocations.reduce((sum, l) => sum + getItemsForLocation(l).filter(isLowStock).length, 0);
  const leaf = isLeafZone(zone);
  state.zoneDetailCurrentZone = zone;
  const parentZone = getZoneParent(zone);
  els.zoneDetailBackButton?.classList.toggle("hidden", !parentZone);
  if (els.zoneDetailBackButton) els.zoneDetailBackButton.disabled = !parentZone;
  els.zoneDetailTitle.textContent = zone;
  els.zoneDetailMeta.textContent = `${leaf ? "最低层级" : `${children.length} 个子区域`} · ${treeLocations.length} 个位置 · ${itemCount} 件物品${lowCount ? ` · ${lowCount} 待补` : ""}`;
  els.zoneDetailList.innerHTML = "";
  children.forEach((child) => {
    const childLocations = getLocationsForZoneTree(child);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "zone-location-card zone-child-card";
    button.innerHTML = `<strong>${escapeHtml(child)}</strong><span>${childLocations.length} 个位置 · 子区域</span>`;
    button.addEventListener("click", () => openZoneDetail(child));
    els.zoneDetailList.appendChild(button);
  });
  locations.forEach((location) => {
    const items = getItemsForLocation(location);
    const meta = getLocationMeta(location);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "zone-location-card";
    button.innerHTML = `<strong>${escapeHtml(location)}</strong><span>${items.length} 件 · ${meta.note ? escapeHtml(meta.note) : "点击查看"}</span>`;
    button.addEventListener("click", () => {
      els.zoneDetailModal.close();
      openContainerForLocation(location, { from: { type: "zone", zone } });
    });
    els.zoneDetailList.appendChild(button);
  });
  els.zoneDetailAddLocationButton.disabled = false;
  if (!locations.length && !children.length) {
    els.zoneDetailList.innerHTML = '<div class="empty-state visible"><h3>这个区域还没有位置</h3></div>';
  }
  els.zoneDetailModal.showModal();
}

function openParentZoneDetail() {
  const current = state.zoneDetailCurrentZone || els.zoneDetailTitle?.textContent.trim();
  const parent = getZoneParent(current);
  if (parent) openZoneDetail(parent);
}

async function deleteCurrentLocation() {
  const location = els.locationOriginalName.value.trim();
  if (!location) return;
  await confirmDeleteLocation(location);
}

async function confirmDeleteLocation(location) {
  const items = getItemsForLocation(location);
  if (items.length) {
    showToast("这个位置还有物品，先把物品移走再删除");
    return;
  }
  const confirmed = confirm(`确定删除「${location}」吗？`);
  if (!confirmed) return;
  state.data.deletedLocations = state.data.deletedLocations || {};
  state.data.deletedLocations[location] = new Date().toISOString();
  state.data.locations = state.data.locations.filter((entry) => entry !== location);
  delete state.data.locationMeta[location];
  closeDialogs();
  populateFormOptions();
  await persistData();
}

async function deleteCurrentItem() {
  const id = els.itemId.value;
  if (!id) return;
  const confirmed = confirm("确定删除这个物品吗？");
  if (!confirmed) return;
  state.data.deletedItems[id] = new Date().toISOString();
  state.data.items = state.data.items.filter((item) => item.id !== id);
  closeDialogs();
  await persistData();
}

async function adjustQuantity(id, delta) {
  const item = state.data.items.find((entry) => entry.id === id);
  if (!item) return;
  const nextQuantity = Math.max(0, Number(item.quantity || 0) + delta);
  if (nextQuantity <= 0) {
    const confirmed = confirm("当前位置该物品库存已为零，是否删除本条记录？");
    if (confirmed) {
      await removeItemRecord(item);
    } else {
      item.quantity = 0;
      item.updatedAt = new Date().toISOString();
      item.updatedBy = state.data.memberName || "我";
      await persistData({ silent: true });
    }
    return;
  }
  item.quantity = nextQuantity;
  item.updatedAt = new Date().toISOString();
  item.updatedBy = state.data.memberName || "我";
  await persistData({ silent: true });
}

function updateMinStockVisibility() {
  els.minStockWrap.classList.toggle("visible", els.trackStock.checked);
}

function populateSettings() {
  if (els.appDisplayName) els.appDisplayName.value = state.data.appDisplayName || "";
  els.householdName.value = state.data.householdName || "";
  els.memberName.value = state.data.memberName || "";
}

async function saveSettings() {
  state.data.appDisplayName = els.appDisplayName?.value.trim() || "";
  state.data.householdName = els.householdName.value.trim();
  state.data.memberName = els.memberName.value.trim();
  await persistData();
}

async function importSamples() {
  const existingNames = new Set(state.data.items.map((item) => item.name));
  const additions = SAMPLE_ITEMS
    .filter((item) => !existingNames.has(item.name))
    .map((item) => ({ ...item, id: crypto.randomUUID(), updatedBy: state.data.memberName || "我", updatedAt: new Date().toISOString() }));
  if (!additions.length) {
    showToast("示例已经导入过了");
    return;
  }
  state.data.items.unshift(...additions);
  await persistData();
}

function exportData() {
  const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${getAppDisplayName()} -${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

async function importData(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const imported = JSON.parse(text);
    if (!Array.isArray(imported.items) || !Array.isArray(imported.locations)) {
      throw new Error("文件格式不对");
    }
    state.data = normalizeInventoryData({ ...createInitialData(), ...imported });
    populateSettings();
    populateFormOptions();
    await persistData();
  } catch (error) {
    showToast(error.message || "导入失败");
  } finally {
    event.target.value = "";
  }
}

async function clearData() {
  const confirmed = confirm("确定清空本机全部数据吗");
  if (!confirmed) return;
  const deletedItems = {};
  state.data.items.forEach((item) => {
    deletedItems[item.id] = new Date().toISOString();
  });
  state.data = { ...createInitialData(), deletedItems };
  populateSettings();
  populateFormOptions();
  await persistData();
}

function formatQuantity(item) {
  const value = Number.isFinite(Number(item.quantity)) ? Number(item.quantity) : 0;
  return `${value}${item.unit || ""}`;
}

function getLocationMeta(location) {
  if (!location) return { zone: "其他", note: "", image: "", updatedAt: "" };
  const meta = state.data.locationMeta?.[location] || {};
  return { zone: meta.zone || inferLocationZone(location, state.data.zones), note: meta.note || "", image: meta.image || "", updatedAt: meta.updatedAt || "" };
}

function getZoneSearchText(zone) {
  if (!zone) return "";
  return [zone, ...getAncestorZones(zone)].filter(Boolean).join(" ").toLowerCase();
}

function inferLocationZone(location, zones = DEFAULT_ZONES) {
  const text = String(location || "");
  return zones.find((zone) => text.includes(zone)) || "其他";
}

function getLocationUpdatedAt(location) {
  const itemTimes = getItemsForLocation(location)
    .map((item) => item.updatedAt)
    .filter(Boolean)
    .map((time) => new Date(time).getTime())
    .filter(Number.isFinite);
  const metaTime = new Date(getLocationMeta(location).updatedAt || 0).getTime();
  return new Date(Math.max(metaTime || 0, ...itemTimes, 0)).toISOString();
}

function formatDateShort(dateLike) {
  const time = new Date(dateLike);
  if (Number.isNaN(time.getTime()) || time.getFullYear() < 2000) return "未更新";
  return time.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
}

function getCategoryColor(category) {
  return DEFAULT_CATEGORIES.find((cat) => cat.name === category)?.color || "#0f766e";
}

function showToast(message) {
  const openDialogs = [els.itemModal, els.locationModal, els.zoneModal, els.zoneDetailModal, els.detailModal, els.containerModal, els.containerFormModal, els.confirmModal, els.mergeChoiceModal]
    .filter((dialog) => dialog?.open);
  const toastHost = openDialogs[openDialogs.length - 1] || document.body;
  if (els.toast.parentElement !== toastHost) toastHost.appendChild(els.toast);
  els.toast.textContent = message;
  els.toast.classList.add("visible");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => els.toast.classList.remove("visible"), 1800);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js")
      .then(() => navigator.serviceWorker.ready)
      .then(() => {
        state.serviceWorkerReady = true;
        updateInstallButtonState();
      })
      .catch(() => {});
  }
}

async function initSync() {
  if (!SYNC_CONFIG?.supabaseUrl || !SYNC_CONFIG?.supabaseAnonKey || !ACTIVE_HOUSEHOLD_ID) {
    setSyncStatus("offline", "本机模式", "数据保存在这台设备的浏览器里。");
    return;
  }
  try {
    state.syncClient = createSupabaseSyncClient(SYNC_CONFIG.supabaseUrl, SYNC_CONFIG.supabaseAnonKey, ACTIVE_HOUSEHOLD_ID);
    await syncNow();
    setSyncStatus("online", "云同步已启用", "多台设备会使用同一份家庭空间数据。");
  } catch (error) {
    setSyncStatus("offline", "同步未启用", error.message || "请检查 config.js。");
  }
}

async function syncNow() {
  if (!state.syncClient) {
    showToast("当前是本机模式");
    return;
  }
  try {
    const remote = await state.syncClient.load();
    state.data = mergeInventoryData(state.data, remote);
    localStorage.setItem(ACTIVE_STORAGE_KEY, JSON.stringify(state.data));
    populateSettings();
    populateFormOptions();
    render();
    await state.syncClient.save(state.data);
    showToast("已同步");
    setSyncStatus("online", "已同步", "云端和本机数据一致。");
  } catch (error) {
    setSyncStatus("offline", "同步失败", error.message || "稍后重试。");
    showToast("同步失败");
  }
}

function createSupabaseSyncClient(supabaseUrl, supabaseAnonKey, householdId) {
  const baseUrl = String(supabaseUrl || "").replace(/\/$/, "");
  const tenantId = String(householdId || "").trim();
  if (!tenantId) throw new Error("未配置 householdId，已切换到本机模式");
  const headers = {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${supabaseAnonKey}`,
    "Content-Type": "application/json",
    Accept: "application/json"
  };
  return {
    async load() {
      const response = await fetch(`${baseUrl}/rest/v1/household_inventory?select=payload,household_id&household_id=eq.${encodeURIComponent(tenantId)}&limit=1`, { headers });
      if (!response.ok) throw new Error(`读取失败 ${response.status}`);
      const rows = await response.json();
      if (!rows[0]) return null;
      if (rows[0].household_id !== tenantId) throw new Error("云端租户校验失败，已停止读取");
      return rows[0]?.payload || null;
    },
    async save(payload) {
      const response = await fetch(`${baseUrl}/rest/v1/household_inventory?on_conflict=household_id`, {
        method: "POST",
        headers: { ...headers, Prefer: "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify({
          id: tenantId,
          household_id: tenantId,
          payload,
          updated_at: new Date().toISOString()
        })
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`保存失败 ${response.status}: ${text.slice(0, 120)}`);
      }
      return response.json().catch(() => null);
    }
  };
}

function mergeInventoryData(localData, remoteData) {
  if (!remoteData) return normalizeInventoryData({ ...localData });
  const base = createInitialData();
  const local = normalizeInventoryData({ ...base, ...localData });
  const remote = normalizeInventoryData({ ...base, ...remoteData });
  const localIsNewer = new Date(local.updatedAt || 0) >= new Date(remote.updatedAt || 0);
  const deletedItems = mergeDeletedItems(remote.deletedItems, local.deletedItems);
  const deletedLocations = mergeDeletedLocations(remote.deletedLocations, local.deletedLocations);
  const deletedZones = mergeDeletedZones(remote.deletedZones, local.deletedZones);
  const zones = mergeZones(remote.zones, local.zones, deletedZones, remote.locationMeta, local.locationMeta, remote.zoneMeta, local.zoneMeta);
  const containers = mergeContainers(remote.containers, local.containers);
  const itemsById = new Map();
  [...remote.items, ...local.items].forEach((item) => {
    if (!item?.id) return;
    const existing = itemsById.get(item.id);
    if (!existing || new Date(item.updatedAt || 0) >= new Date(existing.updatedAt || 0)) {
      itemsById.set(item.id, item);
    }
  });
  const items = [...itemsById.values()].filter((item) => {
    const deletedAt = deletedItems[item.id];
    return !deletedAt || new Date(item.updatedAt || 0) > new Date(deletedAt);
  });
  const replenishRules = mergeReplenishRules(remote.replenishRules, local.replenishRules, items);
  const itemFieldMeta = mergeItemFieldMeta(remote.itemFieldMeta, local.itemFieldMeta);
  return normalizeInventoryData({
    ...base,
    appDisplayName: localIsNewer ? local.appDisplayName : remote.appDisplayName,
    householdName: localIsNewer ? local.householdName : remote.householdName,
    memberName: local.memberName || remote.memberName || "",
    locations: [...new Set([...remote.locations, ...local.locations])],
    zones,
    locationMeta: mergeLocationMeta(remote.locationMeta, local.locationMeta, zones),
    zoneMeta: mergeZoneMeta(remote.zoneMeta, local.zoneMeta, zones),
    containers,
    items: items.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
    replenishRules,
    deletedItems,
    deletedLocations,
    deletedZones,
    itemFieldMeta,
    updatedAt: new Date().toISOString()
  });
}

function mergeItemFieldMeta(remoteMeta = {}, localMeta = {}) {
  const merged = { ...createDefaultItemFieldMeta() };
  [...Object.entries(remoteMeta || {}), ...Object.entries(localMeta || {})].forEach(([key, meta]) => {
    if (!meta || typeof meta !== "object") return;
    const existing = merged[key];
    if (!existing) {
      merged[key] = { ...meta };
    } else if (new Date(meta?.updatedAt || 0) >= new Date(existing?.updatedAt || 0)) {
      merged[key] = { ...existing, ...meta };
    }
  });
  return merged;
}

function mergeReplenishRules(remoteRules = {}, localRules = {}, items = []) {
  const merged = {};
  const now = new Date().toISOString();
  const keys = new Set([...Object.keys(remoteRules || {}), ...Object.keys(localRules || {}), ...items.map((item) => normalizeItemName(item?.name))]);
  keys.forEach((key) => {
    const remoteRule = remoteRules?.[key] ? normalizeReplenishRule(remoteRules[key], now) : null;
    const localRule = localRules?.[key] ? normalizeReplenishRule(localRules[key], now) : null;
    const itemRule = (() => {
      const candidates = items.filter((item) => normalizeItemName(item?.name) === key);
      if (!candidates.length) return null;
      const latest = [...candidates].sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))[0];
      return normalizeReplenishRule(latest, latest?.updatedAt || now);
    })();
    const candidates = [remoteRule, localRule, itemRule].filter(Boolean);
    if (!candidates.length) return;
    merged[key] = candidates.sort((a, b) => new Date(a.updatedAt || 0) - new Date(b.updatedAt || 0)).pop();
  });
  return merged;
}

function mergeDeletedItems(remoteDeleted = {}, localDeleted = {}) {
  const merged = {};
  [...Object.entries(remoteDeleted), ...Object.entries(localDeleted)].forEach(([id, deletedAt]) => {
    if (!merged[id] || new Date(deletedAt || 0) > new Date(merged[id] || 0)) {
      merged[id] = deletedAt;
    }
  });
  return merged;
}

function mergeDeletedLocations(remoteDeleted = {}, localDeleted = {}) {
  const merged = {};
  [...Object.entries(remoteDeleted), ...Object.entries(localDeleted)].forEach(([location, deletedAt]) => {
    if (!location) return;
    if (!merged[location] || new Date(deletedAt || 0) > new Date(merged[location] || 0)) {
      merged[location] = deletedAt;
    }
  });
  return merged;
}

function mergeDeletedZones(remoteDeleted = {}, localDeleted = {}) {
  const merged = {};
  [...Object.entries(remoteDeleted), ...Object.entries(localDeleted)].forEach(([zone, deletedAt]) => {
    if (!zone) return;
    if (!merged[zone] || new Date(deletedAt || 0) > new Date(merged[zone] || 0)) {
      merged[zone] = deletedAt;
    }
  });
  return merged;
}

function mergeZones(remoteZones = [], localZones = [], deletedZones = {}, remoteMeta = {}, localMeta = {}, remoteZoneMeta = {}, localZoneMeta = {}) {
  const metaZones = [...Object.values(remoteMeta || {}), ...Object.values(localMeta || {})].map((meta) => meta?.zone).filter(Boolean);
  const parentZones = [...Object.values(remoteZoneMeta || {}), ...Object.values(localZoneMeta || {})].map((meta) => meta?.parent).filter(Boolean);
  const zoneMetaByName = { ...(remoteZoneMeta || {}), ...(localZoneMeta || {}) };
  return [...new Set([...remoteZones, ...localZones, ...metaZones, ...parentZones])].filter(Boolean).filter((zone) => {
    const deletedAt = deletedZones[zone];
    if (!deletedAt) return true;
    return new Date(zoneMetaByName[zone]?.revivedAt || 0) > new Date(deletedAt || 0);
  });
}

function mergeLocationMeta(remoteMeta = {}, localMeta = {}, zones = []) {
  const merged = {};
  [...Object.entries(remoteMeta), ...Object.entries(localMeta)].forEach(([location, meta]) => {
    if (!location) return;
    const existing = merged[location];
    if (!existing || new Date(meta?.updatedAt || 0) >= new Date(existing?.updatedAt || 0)) {
      merged[location] = { zone: meta?.zone || inferLocationZone(location, zones), note: meta?.note || "", image: meta?.image || "", revivedAt: meta?.revivedAt || "", updatedAt: meta?.updatedAt || new Date().toISOString() };
    }
  });
  return normalizeLocationMeta(Object.keys(merged), merged, zones);
}

function mergeZoneMeta(remoteMeta = {}, localMeta = {}, zones = []) {
  const merged = {};
  [...Object.entries(remoteMeta || {}), ...Object.entries(localMeta || {})].forEach(([zone, meta]) => {
    if (!zone) return;
    const existing = merged[zone];
    const next = { parent: meta?.parent || "", note: meta?.note || "", image: meta?.image || "", revivedAt: meta?.revivedAt || "", updatedAt: meta?.updatedAt || new Date().toISOString() };
    if (!existing) {
      merged[zone] = next;
      return;
    }
    const nextTime = new Date(next.updatedAt || 0).getTime();
    const existingTime = new Date(existing.updatedAt || 0).getTime();
    if (nextTime > existingTime) {
      merged[zone] = next;
      return;
    }
    if (nextTime === existingTime && next.parent && !existing.parent) {
      merged[zone] = { ...next, note: next.note || existing.note || "", image: next.image || existing.image || "", revivedAt: next.revivedAt || existing.revivedAt || "" };
    }
  });
  return normalizeZoneMeta(zones, merged);
}

function mergeContainers(remoteContainers = [], localContainers = []) {
  const merged = new Map();
  [...upgradeContainers(remoteContainers), ...upgradeContainers(localContainers)].forEach((container) => {
    if (!container?.id) return;
    merged.set(container.id, { ...container });
  });
  const ordered = DEFAULT_CONTAINERS.map((container) => merged.get(container.id) || container);
  [...merged.values()].forEach((container) => {
    if (!ordered.some((entry) => entry.id === container.id)) ordered.push(container);
  });
  return ordered;
}

function setSyncStatus(mode, title, detail) {
  const dot = els.syncStatusCard.querySelector(".sync-dot");
  dot.classList.toggle("online", mode === "online");
  els.syncStatusText.textContent = title;
  els.syncStatusDetail.textContent = detail;
}

function normalizeItemName(name) {
  return String(name || "").trim().replace(/\s+/g, " ");
}

function normalizeItemRecord(item = {}) {
  const now = new Date().toISOString();
  return {
    id: item.id || crypto.randomUUID(),
    name: normalizeItemName(item.name),
    category: item.category || "未分类",
    location: item.location || "",
    quantity: Number(item.quantity || 0),
    unit: item.unit || "",
    trackStock: Boolean(item.trackStock),
    minQuantity: Number(item.minQuantity || 0),
    note: item.note || "",
    brand: item.brand || "",
    spec: item.spec || "",
    purchaseDate: item.purchaseDate || "",
    expiryDate: item.expiryDate || "",
    thumbnail: item.thumbnail || "",
    customFields: item.customFields && typeof item.customFields === "object" ? item.customFields : {},
    updatedBy: item.updatedBy || "我",
    updatedAt: item.updatedAt || now
  };
}

function normalizeReplenishRule(source = {}, updatedAt = new Date().toISOString()) {
  return {
    trackStock: Boolean(source.trackStock),
    minQuantity: Number(source.minQuantity || 0),
    updatedBy: source.updatedBy || "我",
    updatedAt: source.updatedAt || updatedAt
  };
}

function normalizeReplenishRules(rules = {}, items = []) {
  const normalized = {};
  Object.entries(rules || {}).forEach(([name, rule]) => {
    const key = normalizeItemName(name);
    if (!key) return;
    normalized[key] = normalizeReplenishRule(rule);
  });
  items.forEach((item) => {
    const key = normalizeItemName(item?.name);
    if (!key || normalized[key]) return;
    normalized[key] = normalizeReplenishRule(item, item?.updatedAt || new Date().toISOString());
  });
  return normalized;
}

function getStoredReplenishRule(name) {
  const key = normalizeItemName(name);
  return key ? state.data.replenishRules?.[key] || null : null;
}

function getReplenishRule(name) {
  const stored = getStoredReplenishRule(name);
  if (stored) return stored;
  const item = state.data.items.find((entry) => normalizeItemName(entry.name) === normalizeItemName(name));
  return item ? normalizeReplenishRule(item, item.updatedAt) : normalizeReplenishRule({});
}

function setReplenishRule(name, rule, updatedBy = "我") {
  const key = normalizeItemName(name);
  if (!key) return;
  state.data.replenishRules = state.data.replenishRules || {};
  state.data.replenishRules[key] = {
    trackStock: Boolean(rule.trackStock),
    minQuantity: Number(rule.minQuantity || 0),
    updatedBy,
    updatedAt: new Date().toISOString()
  };
}

function syncItemReplenishFields(item, rules = {}) {
  const rule = rules[normalizeItemName(item.name)];
  if (!rule) return item;
  return { ...item, trackStock: Boolean(rule.trackStock), minQuantity: Number(rule.minQuantity || 0) };
}

function getItemTotalQuantityByName(name) {
  const key = normalizeItemName(name);
  return state.data.items
    .filter((item) => normalizeItemName(item.name) === key)
    .reduce((sum, item) => sum + Number(item.quantity || 0), 0);
}

function getItemGroups(items) {
  const groups = new Map();
  items.forEach((item) => {
    const key = normalizeItemName(item.name) || item.id;
    if (!groups.has(key)) {
      groups.set(key, {
        name: key,
        category: item.category,
        unit: item.unit || "",
        items: [],
        totalQuantity: 0,
        minQuantity: Number(getReplenishRule(key).minQuantity || item.minQuantity || 0),
        trackStock: Boolean(getReplenishRule(key).trackStock || item.trackStock)
      });
    }
    const group = groups.get(key);
    group.items.push(item);
    group.totalQuantity += Number(item.quantity || 0);
    if (!group.category && item.category) group.category = item.category;
    if (!group.unit && item.unit) group.unit = item.unit;
  });
  return [...groups.values()].sort((a, b) => compareName(a.name, b.name));
}

function createItemGroupCard(group, { compact = false, open = true } = {}) {
  const details = document.createElement("details");
  details.className = `item-group-card${compact ? " compact" : ""}`;
  details.open = open;
  const quantityText = `${group.totalQuantity}${group.unit || ""}`;
  const expiryWarning = group.items.some((item) => isExpiringSoon(item) || isExpired(item))
    ? `<span class="expiry-warning">${group.items.some(isExpired) ? "已有过期" : "即将到期"}</span>`
    : "";
  details.innerHTML = `
    <summary class="item-group-summary">
      <div class="item-title">
        <span class="category-dot" style="background:${getCategoryColor(group.category)}"></span>
        <strong>${escapeHtml(group.name)}</strong>
        ${expiryWarning}
      </div>
      <span class="group-hint">${escapeHtml(quantityText)}${group.trackStock ? ` / 最少${escapeHtml(group.minQuantity)}${escapeHtml(group.unit || "")}` : ""}</span>
    </summary>
    <div class="item-group-body"></div>
  `;
  const body = details.querySelector(".item-group-body");
  group.items.forEach((item) => {
    const entry = document.createElement("div");
    entry.className = "item-group-entry";
    const itemExpiryWarning = getExpiryWarning(item);
    const isLow = isLowStock(item);
    entry.innerHTML = `
      ${createThumbnailMarkup(item, "xs")}
      <div class="item-group-entry-copy">
        <strong>${escapeHtml(item.location || "未设置位置")}</strong>
        <span>${escapeHtml(item.category || "未分类")} · ${escapeHtml(formatQuantity(item))}${itemExpiryWarning ? " · " + itemExpiryWarning : ""}${isLow ? ' <span class="expiry-warning">需补货</span>' : ""}</span>
      </div>
      <div class="item-group-entry-actions">
        <div class="stepper compact-stepper" aria-label="调整数量">
          <button type="button" data-delta="-1" aria-label="减少数量">-</button>
          <button type="button" data-delta="1" aria-label="增加数量">+</button>
        </div>
        <button type="button" class="mini-link" data-edit="${escapeHtml(item.id)}">编辑</button>
      </div>
    `;
    entry.querySelector("[data-edit]")?.addEventListener("click", () => openItemModal(item.id));
    entry.querySelectorAll("[data-delta]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        adjustQuantity(item.id, Number(button.dataset.delta));
      });
    });
    body.appendChild(entry);
  });
  return details;
}

function showConfirmModal(title, message, onOk) {
  els.confirmTitle.textContent = title;
  els.confirmMessage.textContent = message;
  els.confirmModal.showModal();
  state.confirmCallback = onOk;
}

function handleConfirmOk() {
  if (typeof state.confirmCallback === "function") {
    state.confirmCallback();
  }
  closeConfirmModal();
}

function closeConfirmModal() {
  state.confirmCallback = null;
  els.confirmModal?.close();
}

function getScopedStorageKey() {
  const url = SYNC_CONFIG?.supabaseUrl ? String(SYNC_CONFIG.supabaseUrl).replace(/\/$/, "") : "local";
  return `${STORAGE_KEY}:${url}:${ACTIVE_HOUSEHOLD_ID || "default"}`;
}

function getConfiguredHouseholdId() {
  const value = String(SYNC_CONFIG?.householdId || "").trim();
  if (!value || value.length > 100) return "";
  return value;
}

function createDefaultZoneMeta(zones) {
  return normalizeZoneMeta(zones, {});
}

function normalizeZoneMeta(zones, meta = {}) {
  const now = new Date().toISOString();
  const zoneSet = new Set((zones || []).filter(Boolean));
  return Object.fromEntries(
    (zones || []).filter(Boolean).map((zone) => {
      const existing = meta?.[zone] || {};
      const parent = existing.parent && zoneSet.has(existing.parent) && existing.parent !== zone ? existing.parent : "";
      return [zone, { parent, note: existing.note || "", image: existing.image || "", revivedAt: existing.revivedAt || "", updatedAt: existing.updatedAt || now }];
    })
  );
}








