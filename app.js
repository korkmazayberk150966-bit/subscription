const DB_NAME = "abonelikTakibiDB";
const DB_VERSION = 1;
const STORE_NAMES = ["subscriptions", "payments", "settings", "archives"];

const DEFAULT_SETTINGS = {
  id: "app-settings",
  monthlyBudget: 0,
  usdRate: 32.5,
  eurRate: 35.4,
  renewalReminderDays: 3,
  trialReminderDays: 3,
  highAnnualThreshold: 3000,
  coffeePrice: 95,
  vacationBudget: 18000,
  auditReminderMonths: 3,
  notificationsEnabled: false,
  darkModePreferred: false,
  theme: "light",
  lastRateSync: "",
  lastRateSource: "manual",
  notifiedAlerts: {},
  lastAuditPrompt: "",
  snoozedAuditUntil: ""
};

const STATUS_LABELS = {
  active: "Aktif",
  trial: "Deneme",
  paused: "Duraklatıldı",
  cancelled: "İptal",
  completed: "Tamamlandı"
};

const STATUS_COLORS = {
  active: "var(--success)",
  trial: "var(--warning)",
  paused: "var(--accent)",
  cancelled: "var(--danger)",
  completed: "var(--muted)"
};

const CYCLE_LABELS = {
  weekly: "Haftalık",
  monthly: "Aylık",
  quarterly: "3 aylık",
  yearly: "Yıllık"
};

const USAGE_SCORES = {
  high: 0.1,
  medium: 0.45,
  low: 0.75,
  unused: 1
};

const VIEW_MODE_LABELS = {
  monthly: "Bu Ay Toplam",
  yearly: "Yıllık Görünüm"
};

const ONBOARDING_STEPS = [
  {
    icon: "A",
    title: "Harcamalarını tek yerde tut",
    body: "Aboneliklerini, taksitlerini ve denemelerini tek uygulamada takip et."
  },
  {
    icon: "₺",
    title: "Kur ve bütçe akışını gör",
    body: "Canlı kur, bütçe uyarıları ve yaklaşan ödemelerle neyin yaklaştığını önceden fark et."
  },
  {
    icon: "✓",
    title: "Karar vermeyi kolaylaştır",
    body: "Deneme bitişleri, iptal adayları ve kullanım başına maliyet gibi sinyallerle daha net karar ver."
  }
];

const state = {
  db: null,
  catalog: [],
  records: [],
  payments: [],
  archives: [],
  settings: { ...DEFAULT_SETTINGS },
  editingId: null,
  deferredPrompt: null,
  activePaymentSubscriptionId: null,
  detailRecordId: null,
  activeTab: "overview",
  processingTrialDecision: false,
  displayMode: "monthly",
  onboardingStep: 0,
  serviceWorkerRegistration: null,
  cashflowDays: []
};

const $ = (selector) => document.querySelector(selector);

const dom = {
  monthlyTotal: $("#monthlyTotal"),
  monthlySubscriptionsTotal: $("#monthlySubscriptionsTotal"),
  monthlyInstallmentsTotal: $("#monthlyInstallmentsTotal"),
  yearlyProjection: $("#yearlyProjection"),
  budgetStatus: $("#budgetStatus"),
  budgetProgressValue: $("#budgetProgressValue"),
  budgetProgressHint: $("#budgetProgressHint"),
  budgetProgressFill: $("#budgetProgressFill"),
  upcomingCount: $("#upcomingCount"),
  monthlyTrialsCount: $("#monthlyTrialsCount"),
  monthlyDelta: $("#monthlyDelta"),
  heroTitle: $("#heroTitle"),
  appHeaderTitle: $("#appHeaderTitle"),
  alertBadge: $("#alertBadge"),
  alertsList: $("#alertsList"),
  timelineList: $("#timelineList"),
  next7DaysSummary: $("#next7DaysSummary"),
  cashflowCalendar: $("#cashflowCalendar"),
  comparisonSummary: $("#comparisonSummary"),
  trendNarrativeTitle: $("#trendNarrativeTitle"),
  trendNarrative: $("#trendNarrative"),
  categoryLegendSummary: $("#categoryLegendSummary"),
  categoryLegend: $("#categoryLegend"),
  expensiveList: $("#expensiveList"),
  cancellationList: $("#cancellationList"),
  yearSummaryLabel: $("#yearSummaryLabel"),
  yearSummary: $("#yearSummary"),
  trialSummary: $("#trialSummary"),
  archiveSummary: $("#archiveSummary"),
  wrappedSummary: $("#wrappedSummary"),
  auditStatus: $("#auditStatus"),
  auditSummary: $("#auditSummary"),
  subscriptionsList: $("#subscriptionsList"),
  paymentsList: $("#paymentsList"),
  settingsForm: $("#settingsForm"),
  refreshRatesBtn: $("#refreshRatesBtn"),
  ratesMeta: $("#ratesMeta"),
  requestNotificationBtn: $("#requestNotificationBtn"),
  testNotificationBtn: $("#testNotificationBtn"),
  exportBtn: $("#exportBtn"),
  importInput: $("#importInput"),
  statusFilter: $("#statusFilter"),
  sortFilter: $("#sortFilter"),
  statusSegmented: $("#statusSegmented"),
  analyticsSegmented: $("#analyticsSegmented"),
  searchInput: $("#searchInput"),
  monthlyViewBtn: $("#monthlyViewBtn"),
  yearlyViewBtn: $("#yearlyViewBtn"),
  sortPickerBtn: $("#sortPickerBtn"),
  fabAddBtn: $("#fabAddBtn"),
  quickLogBtn: $("#quickLogBtn"),
  installBanner: $("#installBanner"),
  installBtn: $("#installBtn"),
  subscriptionDialog: $("#subscriptionDialog"),
  subscriptionForm: $("#subscriptionForm"),
  dialogTitle: $("#dialogTitle"),
  closeDialogBtn: $("#closeDialogBtn"),
  resetFormBtn: $("#resetFormBtn"),
  saveRecordBtn: $("#saveRecordBtn"),
  archiveBtn: $("#archiveBtn"),
  recordTypeSelect: $("#recordTypeSelect"),
  catalogCategorySelect: $("#catalogCategorySelect"),
  catalogSelect: $("#catalogSelect"),
  catalogPickerBtn: $("#catalogPickerBtn"),
  subscriptionFields: $("#subscriptionFields"),
  installmentFields: $("#installmentFields"),
  paymentDialog: $("#paymentDialog"),
  paymentForm: $("#paymentForm"),
  savePaymentBtn: $("#savePaymentBtn"),
  paymentSubscriptionSelect: $("#paymentSubscriptionSelect"),
  closePaymentDialogBtn: $("#closePaymentDialogBtn"),
  recordDetailDialog: $("#recordDetailDialog"),
  closeDetailDialogBtn: $("#closeDetailDialogBtn"),
  detailSheetTitle: $("#detailSheetTitle"),
  detailSheetLogo: $("#detailSheetLogo"),
  detailSheetType: $("#detailSheetType"),
  detailSheetName: $("#detailSheetName"),
  detailSheetPrice: $("#detailSheetPrice"),
  detailSheetStats: $("#detailSheetStats"),
  detailSheetNotes: $("#detailSheetNotes"),
  detailEditBtn: $("#detailEditBtn"),
  detailArchiveBtn: $("#detailArchiveBtn"),
  detailRemindBtn: $("#detailRemindBtn"),
  calendarDetailDialog: $("#calendarDetailDialog"),
  closeCalendarDetailDialogBtn: $("#closeCalendarDetailDialogBtn"),
  calendarDetailTitle: $("#calendarDetailTitle"),
  calendarDetailList: $("#calendarDetailList"),
  categoryChart: $("#categoryChart"),
  trendChart: $("#trendChart"),
  subscriptionCardTemplate: $("#subscriptionCardTemplate"),
  detailPreviewCard: $("#detailPreviewCard"),
  detailPreviewLogo: $("#detailPreviewLogo"),
  detailPreviewType: $("#detailPreviewType"),
  detailPreviewTitle: $("#detailPreviewTitle"),
  detailPreviewPrice: $("#detailPreviewPrice"),
  onboardingDialog: $("#onboardingDialog"),
  onboardingTitle: $("#onboardingTitle"),
  onboardingBody: $("#onboardingBody"),
  onboardingIcon: $("#onboardingIcon"),
  nextOnboardingBtn: $("#nextOnboardingBtn"),
  skipOnboardingBtn: $("#skipOnboardingBtn"),
  pickerDialog: $("#pickerDialog"),
  pickerTitle: $("#pickerTitle"),
  pickerOptions: $("#pickerOptions"),
  closePickerDialogBtn: $("#closePickerDialogBtn"),
  pickerTriggers: Array.from(document.querySelectorAll(".picker-trigger")),
  analyticsSections: Array.from(document.querySelectorAll("[data-analytics-section]")),
  tabButtons: Array.from(document.querySelectorAll(".tab-button")),
  tabPanels: Array.from(document.querySelectorAll("[data-tab-panel]"))
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  await Promise.all([loadCatalog(), initDatabase()]);
  bindEvents();
  await loadState();
  state.displayMode = window.localStorage.getItem("abonelik-view-mode") || "monthly";
  applyTheme(state.settings.theme || "system");
  populateCatalogCategorySelect();
  populateCatalogSelect();
  populateSettingsForm();
  populatePaymentSubscriptions();
  renderAll();
  setActiveTab(state.activeTab);
  handleAnalyticsSegmentClick({ target: document.querySelector("[data-analytics-view].is-active") });
  syncNativeControls();
  maybeShowInstallHint();
  await registerServiceWorker();
  maybeSendNotifications();
  await maybeResolveExpiredTrials();
  maybeShowOnboarding();
}

async function loadCatalog() {
  try {
    const response = await fetch("./data/catalog.json");
    state.catalog = await response.json();
  } catch (error) {
    console.error("Katalog yüklenemedi", error);
    state.catalog = [];
  }
}

function initDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      STORE_NAMES.forEach((storeName) => {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: "id" });
        }
      });
    };
    request.onsuccess = () => {
      state.db = request.result;
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

async function loadState() {
  const [records, payments, archives, settings] = await Promise.all([
    getAll("subscriptions"),
    getAll("payments"),
    getAll("archives"),
    getRecord("settings", DEFAULT_SETTINGS.id)
  ]);

  state.records = records
    .map(normalizeRecord)
    .sort((a, b) => getRecordPrimaryName(a).localeCompare(getRecordPrimaryName(b), "tr"));
  state.payments = payments.sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt));
  state.archives = archives.sort((a, b) => new Date(b.archivedAt) - new Date(a.archivedAt));
  state.settings = { ...DEFAULT_SETTINGS, ...(settings || {}) };

  if (!settings) {
    await putRecord("settings", state.settings);
  }
}

function normalizeRecord(record) {
  const base = {
    recordType: "subscription",
    logoMode: "monogram",
    priceHistory: [],
    category: "",
    notes: "",
    status: "active",
    color: "#0A66D9",
    icon: "",
    name: "",
    paymentMethod: "",
    lastUsedDate: "",
    trialEndDate: "",
    usageFrequency: "medium",
    valueScore: 3,
    isPriceIncreased: false
  };
  const normalized = { ...base, ...record };
  if (normalized.recordType === "installment") {
    normalized.merchant = normalized.merchant || normalized.name || "";
    normalized.productName = normalized.productName || "";
    normalized.category = normalized.category || normalized.installmentCategory || "Taksitli Alışveriş";
    normalized.notes = normalized.notes || normalized.installmentNotes || "";
    normalized.totalAmount = Number(normalized.totalAmount || 0);
    normalized.monthlyInstallment = Number(normalized.monthlyInstallment || 0);
    normalized.totalInstallments = Number(normalized.totalInstallments || 0);
    normalized.startDate = normalized.startDate || normalized.nextPaymentDate || todayIso();
    normalized.currency = normalized.currency || "TRY";
    normalized.color = normalized.color || normalized.installmentColor || "#0A66D9";
    normalized.icon = normalized.icon || guessMonogram(normalized.merchant || normalized.productName || "T");
    normalized.paymentMethod = normalized.paymentMethod || "Kart";
    normalized.valueScore = 3;
    normalized.usageFrequency = "medium";
  } else {
    normalized.price = Number(normalized.price || 0);
    normalized.currency = normalized.currency || "TRY";
    normalized.billingCycle = normalized.billingCycle || "monthly";
    normalized.nextPaymentDate = normalized.nextPaymentDate || todayIso();
    normalized.icon = normalized.icon || guessMonogram(normalized.name || "A");
  }
  return normalized;
}

function getAll(storeName) {
  return new Promise((resolve, reject) => {
    const request = state.db.transaction(storeName, "readonly").objectStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

function getRecord(storeName, key) {
  return new Promise((resolve, reject) => {
    const request = state.db.transaction(storeName, "readonly").objectStore(storeName).get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

function putRecord(storeName, value) {
  return new Promise((resolve, reject) => {
    const request = state.db.transaction(storeName, "readwrite").objectStore(storeName).put(value);
    request.onsuccess = () => resolve(value);
    request.onerror = () => reject(request.error);
  });
}

function deleteRecord(storeName, key) {
  return new Promise((resolve, reject) => {
    const request = state.db.transaction(storeName, "readwrite").objectStore(storeName).delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function clearStore(storeName) {
  return new Promise((resolve, reject) => {
    const request = state.db.transaction(storeName, "readwrite").objectStore(storeName).clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function bindEvents() {
  dom.fabAddBtn.addEventListener("click", () => openRecordDialog());
  dom.quickLogBtn.addEventListener("click", () => openPaymentDialog());
  dom.closeDialogBtn.addEventListener("click", () => dom.subscriptionDialog.close());
  dom.closePaymentDialogBtn.addEventListener("click", () => dom.paymentDialog.close());
  dom.closeDetailDialogBtn.addEventListener("click", () => dom.recordDetailDialog.close());
  dom.closeCalendarDetailDialogBtn.addEventListener("click", () => dom.calendarDetailDialog.close());
  dom.resetFormBtn.addEventListener("click", resetRecordForm);
  dom.archiveBtn.addEventListener("click", handleArchiveCurrentRecord);
  dom.subscriptionForm.addEventListener("submit", handleRecordSubmit);
  dom.saveRecordBtn.addEventListener("click", handleRecordSaveClick);
  dom.paymentForm.addEventListener("submit", handlePaymentSubmit);
  dom.savePaymentBtn.addEventListener("click", handlePaymentSaveClick);
  dom.settingsForm.addEventListener("submit", handleSettingsSubmit);
  dom.refreshRatesBtn.addEventListener("click", refreshLiveRates);
  dom.requestNotificationBtn.addEventListener("click", requestNotificationPermission);
  dom.testNotificationBtn.addEventListener("click", sendTestNotification);
  dom.exportBtn.addEventListener("click", exportData);
  dom.importInput.addEventListener("change", importData);
  dom.statusFilter.addEventListener("change", renderRecords);
  dom.sortFilter.addEventListener("change", renderRecords);
  dom.searchInput.addEventListener("input", renderRecords);
  dom.statusSegmented.addEventListener("click", handleStatusSegmentClick);
  dom.analyticsSegmented.addEventListener("click", handleAnalyticsSegmentClick);
  dom.sortPickerBtn.addEventListener("click", () => openPickerFromSelect(dom.sortFilter, "Sırala"));
  dom.monthlyViewBtn.addEventListener("click", () => setDisplayMode("monthly"));
  dom.yearlyViewBtn.addEventListener("click", () => setDisplayMode("yearly"));
  dom.catalogCategorySelect.addEventListener("change", handleCatalogCategoryChange);
  dom.catalogSelect.addEventListener("change", handleCatalogSelection);
  dom.recordTypeSelect.addEventListener("change", syncFormMode);
  dom.paymentSubscriptionSelect.addEventListener("change", autoFillPaymentAmount);
  dom.installBtn.addEventListener("click", triggerInstallPrompt);
  dom.subscriptionForm.addEventListener("input", handleFormLiveUpdates);
  dom.subscriptionForm.addEventListener("click", handleColorPresetClick);
  dom.tabButtons.forEach((button) => {
    button.addEventListener("click", () => setActiveTab(button.dataset.tabTarget));
  });
  dom.closePickerDialogBtn.addEventListener("click", () => dom.pickerDialog.close());
  dom.pickerTriggers.forEach((trigger) => {
    trigger.addEventListener("click", () => openPickerByTarget(trigger.dataset.pickerTarget, trigger.dataset.pickerTitle));
  });
  document.querySelectorAll("[data-form-status]").forEach((button) => {
    button.addEventListener("click", () => setFormStatus(button.dataset.formStatus));
  });
  document.querySelectorAll("[data-record-type]").forEach((button) => {
    button.addEventListener("click", () => setRecordType(button.dataset.recordType));
  });
  [dom.subscriptionDialog, dom.paymentDialog, dom.onboardingDialog, dom.pickerDialog].forEach((dialog) => {
    dialog.addEventListener("close", syncSheetState);
    dialog.addEventListener("cancel", syncSheetState);
  });
  [dom.recordDetailDialog, dom.calendarDetailDialog].forEach((dialog) => {
    dialog.addEventListener("close", syncSheetState);
    dialog.addEventListener("cancel", syncSheetState);
  });
  dom.nextOnboardingBtn.addEventListener("click", advanceOnboarding);
  dom.skipOnboardingBtn.addEventListener("click", completeOnboarding);
  dom.detailEditBtn.addEventListener("click", () => {
    const record = state.records.find((item) => item.id === state.detailRecordId);
    if (!record) {
      return;
    }
    dom.recordDetailDialog.close();
    openRecordDialog(record);
  });
  dom.detailArchiveBtn.addEventListener("click", async () => {
    const record = state.records.find((item) => item.id === state.detailRecordId);
    if (!record) {
      return;
    }
    dom.recordDetailDialog.close();
    await archiveRecord(record, { toastMessage: `${getRecordDisplayTitle(record)} arşive taşındı.` });
  });
  dom.detailRemindBtn.addEventListener("click", () => {
    const record = state.records.find((item) => item.id === state.detailRecordId);
    if (!record) {
      return;
    }
    if (isInstallment(record)) {
      const progress = getInstallmentProgress(record);
      showToast(progress.nextDueDate ? `Sonraki taksit: ${formatDate(progress.nextDueDate)}` : "Bu taksit planı tamamlandı.");
      return;
    }
    if (isTrialRecord(record)) {
      showToast(record.trialEndDate ? `Deneme bitişi: ${formatDate(record.trialEndDate)}` : "Deneme için tarih yok.");
      return;
    }
    showToast(record.nextPaymentDate ? `Sonraki ödeme: ${formatDate(record.nextPaymentDate)}` : "Sonraki ödeme tarihi yok.");
  });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if ((state.settings.theme || "system") === "system") {
      applyTheme("system");
      renderAll();
    }
  });

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    state.deferredPrompt = event;
    dom.installBanner.classList.remove("hidden");
  });

  dom.subscriptionsList.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    const card = event.target.closest(".subscription-card");
    if (!button && card) {
      openRecordDetail(card.dataset.id);
      return;
    }
    if (!button) {
      return;
    }
    const { id } = card.dataset;
    const action = button.dataset.action;
    const record = state.records.find((item) => item.id === id);
    if (!record) {
      return;
    }
    if (action === "edit") {
      openRecordDialog(record);
    } else if (action === "log") {
      openPaymentDialog(record.id);
    } else if (action === "delete") {
      await handleDeleteRecord(record);
    }
  });

  dom.auditSummary.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-audit-action]");
    if (!button) {
      return;
    }
    const record = state.records.find((item) => item.id === button.dataset.recordId);
    if (!record) {
      return;
    }
    const action = button.dataset.auditAction;
    if (action === "keep") {
      record.lastUsedDate = todayIso();
      record.updatedAt = new Date().toISOString();
      await putRecord("subscriptions", record);
      state.settings.lastAuditPrompt = new Date().toISOString();
      await putRecord("settings", state.settings);
      showToast(`${getRecordDisplayTitle(record)} tutuldu.`);
    } else if (action === "cancel") {
      state.settings.lastAuditPrompt = new Date().toISOString();
      await putRecord("settings", state.settings);
      await archiveRecord(record, { toastMessage: `${getRecordDisplayTitle(record)} arşive taşındı.` });
    } else if (action === "remind") {
      state.settings.snoozedAuditUntil = addDaysIso(todayIso(), 30);
      state.settings.lastAuditPrompt = new Date().toISOString();
      await putRecord("settings", state.settings);
      showToast("Denetim 30 gün ertelendi.");
    }
    await loadState();
    renderAll();
  });
  dom.cashflowCalendar.addEventListener("click", (event) => {
    const dayCard = event.target.closest(".calendar-day[data-date]");
    if (!dayCard) {
      return;
    }
    openCalendarDayDetail(dayCard.dataset.date);
  });
}

function populateCatalogSelect() {
  const recordType = dom.recordTypeSelect?.value || "subscription";
  const selectedCategory = dom.catalogCategorySelect?.value || "";
  const previousValue = dom.catalogSelect?.value || "";
  dom.catalogSelect.innerHTML = '<option value="">Elle doldur</option>';
  const visibleItems = state.catalog
    .filter((item) => item.recordType === recordType)
    .filter((item) => !selectedCategory || item.category === selectedCategory);
  visibleItems.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.name;
    option.textContent = `${item.name} • ${item.category}`;
    dom.catalogSelect.append(option);
  });
  dom.catalogSelect.value = visibleItems.some((item) => item.name === previousValue) ? previousValue : "";
}

function populateCatalogCategorySelect() {
  const recordType = dom.recordTypeSelect?.value || "subscription";
  const previousValue = dom.catalogCategorySelect?.value || "";
  const categories = [...new Set(
    state.catalog
      .filter((item) => item.recordType === recordType)
      .map((item) => item.category)
      .filter(Boolean)
  )].sort((left, right) => left.localeCompare(right, "tr"));

  dom.catalogCategorySelect.innerHTML = '<option value="">Tüm kategoriler</option>';
  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    dom.catalogCategorySelect.append(option);
  });
  dom.catalogCategorySelect.value = categories.includes(previousValue) ? previousValue : "";
}

function populatePaymentSubscriptions() {
  const currentValue = state.activePaymentSubscriptionId || state.records[0]?.id || "";
  dom.paymentSubscriptionSelect.innerHTML = "";
  if (!state.records.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Önce kayıt ekle";
    dom.paymentSubscriptionSelect.append(option);
    return;
  }

  state.records.forEach((record) => {
    const option = document.createElement("option");
    option.value = record.id;
    option.textContent = `${getRecordPrimaryName(record)}${isInstallment(record) ? " · taksit" : ""}`;
    option.selected = record.id === currentValue;
    dom.paymentSubscriptionSelect.append(option);
  });
  autoFillPaymentAmount();
}

function populateSettingsForm() {
  Object.entries(state.settings).forEach(([key, value]) => {
    const field = dom.settingsForm.elements.namedItem(key);
    if (!field) {
      return;
    }
    if (field.type === "checkbox") {
      field.checked = Boolean(value);
    } else {
      field.value = value;
    }
  });
  syncNativeControls();
  updateRatesMeta();
}

function resetRecordForm() {
  dom.subscriptionForm.reset();
  dom.recordTypeSelect.value = "subscription";
  setFieldValue("currency", "TRY");
  setFieldValue("billingCycle", "monthly");
  setFieldValue("status", "active");
  setFieldValue("valueScore", "3");
  setFieldValue("usageFrequency", "medium");
  setFieldValue("color", "#0A66D9");
  setFieldValue("installmentColor", "#0A66D9");
  setFieldValue("icon", "A");
  setFieldValue("nextPaymentDate", todayIso());
  setFieldValue("startDate", todayIso());
  setFieldValue("installmentCategory", "Taksitli Alışveriş");
  dom.catalogCategorySelect.value = "";
  dom.catalogSelect.value = "";
  syncFormMode();
  syncNativeControls();
  syncColorPresetStates();
  updateDetailPreview();
}

function openRecordDialog(record = null) {
  state.editingId = record?.id || null;
  dom.dialogTitle.textContent = record ? "Kaydı Düzenle" : "Yeni Kayıt";
  dom.archiveBtn.classList.toggle("hidden", !record);
  setButtonBusy(dom.saveRecordBtn, false);
  resetRecordForm();

  if (record) {
    if (isInstallment(record)) {
      setFieldValue("recordType", "installment");
      setFieldValue("merchant", record.merchant);
      setFieldValue("productName", record.productName);
      setFieldValue("totalAmount", record.totalAmount || "");
      setFieldValue("monthlyInstallment", record.monthlyInstallment || "");
      setFieldValue("totalInstallments", record.totalInstallments || "");
      setFieldValue("startDate", record.startDate || "");
      setFieldValue("installmentCategory", record.category || "");
      setFieldValue("installmentColor", record.color || "#0A66D9");
      setFieldValue("installmentNotes", record.notes || "");
    } else {
      setFieldValue("recordType", "subscription");
      setFormValues(dom.subscriptionForm, record);
    }
  }

  syncFormMode();
  syncNativeControls();
  updateDetailPreview();
  dom.subscriptionDialog.showModal();
  syncSheetState();
}

function openPaymentDialog(recordId = null) {
  if (!state.records.length) {
    showToast("Ödeme kaydı için önce bir kayıt eklemelisin.");
    return;
  }
  setButtonBusy(dom.savePaymentBtn, false);
  dom.paymentForm.reset();
  state.activePaymentSubscriptionId = recordId || state.records[0].id;
  populatePaymentSubscriptions();
  setFieldValue("paidAt", todayIso(), dom.paymentForm);
  autoFillPaymentAmount();
  syncNativeControls();
  dom.paymentDialog.showModal();
  syncSheetState();
}

function openRecordDetail(recordId) {
  const record = state.records.find((item) => item.id === recordId);
  if (!record) {
    return;
  }
  state.detailRecordId = record.id;
  const localLogo = getLogoAssetPath(record) || createLogoDataUri({
    label: record.icon || guessMonogram(getRecordPrimaryName(record)),
    color: record.color || getCategoryColor(record.category),
    title: getRecordPrimaryName(record),
    subtitle: isInstallment(record) ? "TAKSIT" : record.category
  });
  dom.detailSheetTitle.textContent = getRecordDisplayTitle(record);
  dom.detailSheetLogo.style.background = record.color || getCategoryColor(record.category);
  dom.detailSheetLogo.innerHTML = `<img src="${localLogo}" alt="" />`;
  dom.detailSheetType.textContent = getRecordTypeLabel(record);
  dom.detailSheetName.textContent = getRecordDisplayTitle(record);
  dom.detailSheetPrice.textContent = getRecordPriceLine(record);
  dom.detailSheetStats.innerHTML = getRecordStats(record)
    .slice(0, 4)
    .map(
      ([label, value]) => `
        <article class="summary-item">
          <small>${escapeHtml(label)}</small>
          <strong>${escapeHtml(value)}</strong>
        </article>
      `
    )
    .join("");
  dom.detailSheetNotes.textContent = record.notes || getDefaultNotes(record);
  dom.recordDetailDialog.showModal();
  syncSheetState();
}

function openCalendarDayDetail(dateIso) {
  const day = state.cashflowDays.find((item) => toIsoDate(item.date) === dateIso);
  if (!day) {
    return;
  }
  dom.calendarDetailTitle.textContent = formatDate(dateIso);
  const items = [
    ...day.items.map((item) => ({ title: item, meta: day.total ? formatCurrency(day.total) : "Ödeme" })),
    ...day.trials.map((item) => ({ title: item, meta: "Deneme bitişi" }))
  ];
  dom.calendarDetailList.innerHTML = items.length
    ? items
        .map(
          (item) => `
            <article class="picker-option is-static">
              <span>${escapeHtml(item.title)}</span>
              <strong>${escapeHtml(item.meta)}</strong>
            </article>
          `
        )
        .join("")
    : getEmptyStateMarkup("◌", "Bu gün sakin", "Seçtiğin gün için planlı ödeme ya da deneme bitişi görünmüyor.");
  dom.calendarDetailDialog.showModal();
  syncSheetState();
}

function setFormValues(form, values) {
  Object.entries(values).forEach(([key, value]) => {
    const field = form.elements.namedItem(key);
    if (!field || value == null) {
      return;
    }
    if (field.type === "checkbox") {
      field.checked = Boolean(value);
    } else {
      field.value = value;
    }
  });
}

function setFieldValue(name, value, form = dom.subscriptionForm) {
  const field = form.elements.namedItem(name);
  if (!field) {
    return;
  }
  if (field.type === "checkbox") {
    field.checked = Boolean(value);
  } else {
    field.value = value;
  }
  syncNativeControls();
  syncColorPresetStates();
}

function handleFormLiveUpdates(event) {
  if (dom.recordTypeSelect.value === "installment") {
    const totalInstallments = Number(getFieldValue("totalInstallments")) || 0;
    if (event.target.name === "totalAmount" && totalInstallments) {
      const total = Number(getFieldValue("totalAmount")) || 0;
      if (total > 0) {
        setFieldValue("monthlyInstallment", (total / totalInstallments).toFixed(2));
      }
    }
    if (event.target.name === "monthlyInstallment" && totalInstallments) {
      const monthly = Number(getFieldValue("monthlyInstallment")) || 0;
      if (monthly > 0) {
        setFieldValue("totalAmount", (monthly * totalInstallments).toFixed(2));
      }
    }
  }
  if (event.target.type === "color") {
    syncColorPresetStates();
  }
  updateDetailPreview();
}

function handleColorPresetClick(event) {
  const button = event.target.closest("[data-color-value]");
  if (!button) {
    return;
  }
  const target = button.dataset.colorTarget;
  const value = button.dataset.colorValue;
  if (!target || !value) {
    return;
  }
  setFieldValue(target, value);
  updateDetailPreview();
}

function handleRecordSaveClick() {
  void submitRecordForm();
}

function handlePaymentSaveClick() {
  void submitPaymentForm();
}

function getFieldValue(name, form = dom.subscriptionForm) {
  return form.elements.namedItem(name)?.value || "";
}

function syncFormMode() {
  const installmentMode = dom.recordTypeSelect.value === "installment";
  dom.subscriptionFields.classList.toggle("hidden", installmentMode);
  dom.installmentFields.classList.toggle("hidden", !installmentMode);
  toggleGroupDisabled(dom.subscriptionFields, installmentMode);
  toggleGroupDisabled(dom.installmentFields, !installmentMode);
  populateCatalogCategorySelect();
  populateCatalogSelect();
  applyCatalogCategoryToActiveForm();
  syncNativeControls();
  updateDetailPreview();
}

function toggleGroupDisabled(group, disabled) {
  group.querySelectorAll("input, select, textarea, button").forEach((field) => {
    field.disabled = disabled;
  });
}

function applyCatalogCategoryToActiveForm() {
  const selectedCategory = dom.catalogCategorySelect.value || "";
  if (!selectedCategory) {
    return;
  }
  if (dom.recordTypeSelect.value === "installment") {
    setFieldValue("installmentCategory", selectedCategory);
  } else {
    setFieldValue("category", selectedCategory);
  }
}

function updateDetailPreview() {
  if (!dom.detailPreviewCard) {
    return;
  }
  const installmentMode = dom.recordTypeSelect.value === "installment";
  const title = installmentMode ? getFieldValue("merchant") || "Taksitli kayıt" : getFieldValue("name") || "Abonelik";
  const product = getFieldValue("productName");
  const color = installmentMode ? getFieldValue("installmentColor") || "#0A66D9" : getFieldValue("color") || "#0A66D9";
  const monogram = installmentMode ? guessMonogram(title) : getFieldValue("icon") || guessMonogram(title);
  const priceLine = installmentMode
    ? buildInstallmentPreviewLine()
    : buildSubscriptionPreviewLine();
  const status = getFieldValue("status");
  const previewRecord = installmentMode
    ? { recordType: "installment", merchant: title, name: title, category: "Taksitli Alışveriş" }
    : { recordType: "subscription", name: title, category: getFieldValue("category") };
  const localLogo = getLogoAssetPath(previewRecord);

  const logoSvg = localLogo || createLogoDataUri({ label: monogram, color, title, subtitle: installmentMode ? "TAKSİT" : "ABONE" });
  dom.detailPreviewLogo.style.background = color;
  dom.detailPreviewLogo.innerHTML = `<img src="${logoSvg}" alt="" />`;
  dom.detailPreviewType.textContent = installmentMode ? "Taksitli alışveriş" : status === "trial" ? "Deneme aboneliği" : "Abonelik";
  dom.detailPreviewTitle.textContent = product ? `${title} · ${product}` : title;
  dom.detailPreviewPrice.textContent = priceLine;
}

function buildSubscriptionPreviewLine() {
  const amount = Number(getFieldValue("price")) || 0;
  const currency = getFieldValue("currency") || "TRY";
  const cycle = CYCLE_LABELS[getFieldValue("billingCycle")] || "Aylık";
  const status = getFieldValue("status");
  const trialEndDate = getFieldValue("trialEndDate");
  if (status === "trial") {
    const previewTrial = getTrialState({ trialEndDate });
    const suffix = amount ? ` · Sonrasında ${formatMoney(amount, currency)} · ${cycle}` : "";
    return `Ücretsiz deneme · ${previewTrial.badge}${suffix}`;
  }
  return amount ? `${formatMoney(amount, currency)} · ${cycle}` : "0 TL";
}

function buildInstallmentPreviewLine() {
  const monthly = Number(getFieldValue("monthlyInstallment")) || 0;
  const total = Number(getFieldValue("totalAmount")) || 0;
  const count = Number(getFieldValue("totalInstallments")) || 0;
  if (monthly && count) {
    return `${formatMoney(monthly, "TRY")} · ${count} taksit`;
  }
  if (total && count) {
    return `${formatMoney(total, "TRY")} toplam · ${count} taksit`;
  }
  return "0 TL";
}

async function handleRecordSubmit(event) {
  event.preventDefault();
  await submitRecordForm();
}

async function submitRecordForm() {
  if (dom.saveRecordBtn.disabled) {
    return false;
  }
  setButtonBusy(dom.saveRecordBtn, true, "Kaydediliyor...");
  try {
    const formData = new FormData(dom.subscriptionForm);
    const existing = state.records.find((item) => item.id === state.editingId);
    const recordType = formData.get("recordType") || "subscription";
    let record;

    if (recordType === "installment") {
      const merchant = normalizeText(formData.get("merchant"));
      const productName = normalizeText(formData.get("productName"));
      const totalInstallments = Number(formData.get("totalInstallments") || 0);
      const totalAmount = Number(formData.get("totalAmount") || 0);
      const monthlyInstallment = Number(formData.get("monthlyInstallment") || 0);
      const startDate = formData.get("startDate") || "";
      if (!merchant || !productName || !totalInstallments || !startDate || (!totalAmount && !monthlyInstallment)) {
        showToast("Taksitli kayıt için zorunlu alanları doldur.");
        return;
      }
      const normalizedMonthly = monthlyInstallment || totalAmount / totalInstallments;
      const normalizedTotal = totalAmount || normalizedMonthly * totalInstallments;
      record = normalizeRecord({
        id: existing?.id || createId("rec"),
        recordType: "installment",
        merchant,
        productName,
        name: merchant,
        totalAmount: roundMoney(normalizedTotal),
        monthlyInstallment: roundMoney(normalizedMonthly),
        totalInstallments,
        startDate,
        category: normalizeText(formData.get("installmentCategory")) || "Taksitli Alışveriş",
        notes: normalizeText(formData.get("installmentNotes")),
        color: formData.get("installmentColor") || "#0A66D9",
        icon: guessMonogram(merchant),
        paymentMethod: existing?.paymentMethod || "Kart",
        currency: "TRY",
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } else {
      const rawPrice = formData.get("price");
      const category = normalizeText(formData.get("category")) || dom.catalogCategorySelect.value || "";
      const nextPriceHistory = [...(existing?.priceHistory || [])];
      if (
        existing &&
        !isInstallment(existing) &&
        (Number(existing.price) !== Number(rawPrice) ||
          existing.currency !== formData.get("currency") ||
          existing.billingCycle !== formData.get("billingCycle"))
      ) {
        nextPriceHistory.unshift({
          amount: Number(existing.price || 0),
          currency: existing.currency || "TRY",
          billingCycle: existing.billingCycle || "monthly",
          recordedAt: new Date().toISOString()
        });
      }
      record = normalizeRecord({
        id: existing?.id || createId("rec"),
        recordType: "subscription",
        name: normalizeText(formData.get("name")),
        price: Number(rawPrice),
        currency: formData.get("currency"),
        billingCycle: formData.get("billingCycle"),
        nextPaymentDate: formData.get("nextPaymentDate"),
        trialEndDate: formData.get("trialEndDate") || "",
        category,
        paymentMethod: normalizeText(formData.get("paymentMethod")),
        status: formData.get("status"),
        icon: normalizeText(formData.get("icon")).slice(0, 2) || guessMonogram(formData.get("name")),
        color: formData.get("color") || "#0A66D9",
        notes: normalizeText(formData.get("notes")),
        valueScore: Number(formData.get("valueScore") || 3),
        lastUsedDate: formData.get("lastUsedDate") || "",
        usageFrequency: formData.get("usageFrequency") || "medium",
        isPriceIncreased: formData.get("isPriceIncreased") === "on",
        priceHistory: nextPriceHistory.slice(0, 12),
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      if (!record.name || rawPrice === "" || !record.category || !record.nextPaymentDate) {
        showToast("Lütfen isim, ücret, kategori ve sonraki ödeme tarihini doldur.");
        return false;
      }
    }

    await putRecord("subscriptions", record);
    await loadState();
    populatePaymentSubscriptions();
    renderAll();
    dom.subscriptionDialog.close();
    syncSheetState();
    showToast(existing ? "Kayıt güncellendi." : "Kayıt eklendi.");
    await maybeResolveExpiredTrials();
    return true;
  } catch (error) {
    console.error(error);
    showToast("Kayıt kaydedilemedi. Lütfen tekrar dene.");
    return false;
  } finally {
    setButtonBusy(dom.saveRecordBtn, false);
  }
}

async function archiveRecord(record, options = {}) {
  const { toastMessage = "Kayıt arşive taşındı.", closeDialog = false } = options;
  if (!record) {
    return;
  }
  const archiveItem = {
    id: createId("archive"),
    archivedAt: new Date().toISOString(),
    annualSavingsTl: calculateAnnualTl(record),
    snapshot: {
      ...record,
      status: isInstallment(record) ? "completed" : "cancelled"
    }
  };
  await putRecord("archives", archiveItem);
  await deleteRecord("subscriptions", record.id);
  await loadState();
  populatePaymentSubscriptions();
  renderAll();
  if (closeDialog) {
    dom.subscriptionDialog.close();
    syncSheetState();
  }
  if (toastMessage) {
    showToast(toastMessage);
  }
}

async function handleArchiveCurrentRecord() {
  if (!state.editingId) {
    return;
  }
  const record = state.records.find((item) => item.id === state.editingId);
  await archiveRecord(record, { closeDialog: true });
}

async function handleDeleteRecord(record) {
  const confirmed = window.confirm(`${getRecordDisplayTitle(record)} kalıcı olarak silinsin mi?`);
  if (!confirmed) {
    return;
  }
  await deleteRecord("subscriptions", record.id);
  const paymentsToDelete = state.payments.filter((payment) => payment.subscriptionId === record.id);
  await Promise.all(paymentsToDelete.map((payment) => deleteRecord("payments", payment.id)));
  await loadState();
  populatePaymentSubscriptions();
  renderAll();
  showToast("Kayıt silindi.");
}

async function handlePaymentSubmit(event) {
  event.preventDefault();
  await submitPaymentForm();
}

async function submitPaymentForm() {
  if (dom.savePaymentBtn.disabled) {
    return false;
  }
  setButtonBusy(dom.savePaymentBtn, true, "Kaydediliyor...");
  const formData = new FormData(dom.paymentForm);
  const recordId = formData.get("subscriptionId");
  const record = state.records.find((item) => item.id === recordId);
  if (!record) {
    showToast("Geçerli kayıt seçilemedi.");
    setButtonBusy(dom.savePaymentBtn, false);
    return false;
  }
  if (!formData.get("paidAt") || formData.get("amount") === "") {
    showToast("Ödeme tarihi ve tutarı zorunlu.");
    setButtonBusy(dom.savePaymentBtn, false);
    return false;
  }
  try {
    const amount = Number(formData.get("amount"));
    const currency = formData.get("currency");
    const payment = {
      id: createId("pay"),
      subscriptionId: recordId,
      paidAt: formData.get("paidAt"),
      amount,
      currency,
      tlAmountAtPayment: convertToTl(amount, currency),
      note: normalizeText(formData.get("note"))
    };
    await putRecord("payments", payment);
    if (!isInstallment(record)) {
      record.nextPaymentDate = addCycle(payment.paidAt, record.billingCycle);
      record.updatedAt = new Date().toISOString();
      await putRecord("subscriptions", record);
    }
    await loadState();
    renderAll();
    dom.paymentDialog.close();
    syncSheetState();
    showToast("Ödeme kaydı eklendi.");
    return true;
  } catch (error) {
    console.error(error);
    showToast("Ödeme kaydedilemedi. Lütfen tekrar dene.");
    return false;
  } finally {
    setButtonBusy(dom.savePaymentBtn, false);
  }
}

async function handleSettingsSubmit(event) {
  event.preventDefault();
  const formData = new FormData(dom.settingsForm);
  state.settings = {
    ...state.settings,
    monthlyBudget: Number(formData.get("monthlyBudget") || 0),
    usdRate: Number(formData.get("usdRate") || DEFAULT_SETTINGS.usdRate),
    eurRate: Number(formData.get("eurRate") || DEFAULT_SETTINGS.eurRate),
    renewalReminderDays: Number(formData.get("renewalReminderDays") || 3),
    trialReminderDays: Number(formData.get("trialReminderDays") || 3),
    highAnnualThreshold: Number(formData.get("highAnnualThreshold") || 0),
    coffeePrice: Number(formData.get("coffeePrice") || DEFAULT_SETTINGS.coffeePrice),
    vacationBudget: Number(formData.get("vacationBudget") || DEFAULT_SETTINGS.vacationBudget),
    auditReminderMonths: Number(formData.get("auditReminderMonths") || DEFAULT_SETTINGS.auditReminderMonths),
    notificationsEnabled: formData.get("notificationsEnabled") === "on",
    darkModePreferred: formData.get("theme") === "dark",
    theme: formData.get("theme") || "system"
  };
  applyTheme(state.settings.theme);
  await putRecord("settings", state.settings);
  renderAll();
  maybeSendNotifications();
  showToast("Ayarlar kaydedildi.");
}

async function refreshLiveRates() {
  dom.refreshRatesBtn.disabled = true;
  dom.refreshRatesBtn.textContent = "Kur çekiliyor...";

  try {
    const [usdResponse, eurResponse] = await Promise.all([
      fetch("https://open.er-api.com/v6/latest/USD"),
      fetch("https://open.er-api.com/v6/latest/EUR")
    ]);

    if (!usdResponse.ok || !eurResponse.ok) {
      throw new Error("Kur servisi yanıt vermedi");
    }

    const [usdData, eurData] = await Promise.all([usdResponse.json(), eurResponse.json()]);
    if (usdData?.result !== "success" || eurData?.result !== "success") {
      throw new Error("Kur servisi geçerli veri döndürmedi");
    }

    const usdRate = Number(usdData?.rates?.TRY || 0);
    const eurRate = Number(eurData?.rates?.TRY || 0);

    if (!usdRate || !eurRate) {
      throw new Error("Kur verisi eksik geldi");
    }

    state.settings.usdRate = roundMoney(usdRate);
    state.settings.eurRate = roundMoney(eurRate);
    state.settings.lastRateSync = new Date().toISOString();
    state.settings.lastRateSource = "open-er-api";

    await putRecord("settings", state.settings);
    populateSettingsForm();
    renderAll();
    showToast("Canlı kurlar güncellendi.");
  } catch (error) {
    console.error(error);
    showToast("Canlı kur çekilemedi. Mevcut değerler korunuyor.");
  } finally {
    dom.refreshRatesBtn.disabled = false;
    dom.refreshRatesBtn.textContent = "Canlı kuru çek";
    updateRatesMeta();
  }
}

function handleCatalogSelection() {
  const selected = state.catalog.find((item) => item.name === dom.catalogSelect.value);
  if (!selected) {
    return;
  }
  if (dom.catalogCategorySelect) {
    dom.catalogCategorySelect.value = selected.category || "";
  }
  if (selected.recordType === "installment") {
    setFieldValue("recordType", "installment");
    setFieldValue("merchant", selected.name);
    setFieldValue("installmentCategory", selected.category || "Taksitli Alışveriş");
    setFieldValue("installmentColor", selected.color || "#0A66D9");
  } else {
    setFieldValue("recordType", "subscription");
    setFieldValue("name", selected.name);
    setFieldValue("category", selected.category);
    setFieldValue("icon", selected.icon);
    setFieldValue("color", selected.color);
    setFieldValue("price", selected.price);
    setFieldValue("currency", selected.currency);
    setFieldValue("billingCycle", selected.billingCycle);
    setFieldValue("nextPaymentDate", todayIso());
  }
  syncFormMode();
  updateDetailPreview();
}

function handleCatalogCategoryChange() {
  dom.catalogSelect.value = "";
  applyCatalogCategoryToActiveForm();
  populateCatalogSelect();
  syncNativeControls();
}

function autoFillPaymentAmount() {
  const record = state.records.find((item) => item.id === dom.paymentSubscriptionSelect.value);
  if (!record) {
    return;
  }
  const amount = isInstallment(record) ? record.monthlyInstallment : record.price;
  dom.paymentForm.elements.namedItem("amount").value = amount || "";
  dom.paymentForm.elements.namedItem("currency").value = record.currency || "TRY";
}

function renderAll() {
  renderOverview();
  renderAlerts();
  renderRecords();
  renderPayments();
  populateSettingsForm();
  updateHeaderForTab();
  updateFabVisibility();
  updateViewModeControls();
}

function updateRatesMeta() {
  if (!dom.ratesMeta) {
    return;
  }
  if (!state.settings.lastRateSync) {
    dom.ratesMeta.textContent = "Son güncelleme: Henüz çekilmedi";
    return;
  }
  const sourceLabel = state.settings.lastRateSource === "open-er-api" ? "Open ER API" : "manuel";
  dom.ratesMeta.textContent = `Son güncelleme: ${formatDateTime(state.settings.lastRateSync)} · Kaynak: ${sourceLabel}`;
}

function renderOverview() {
  const activeSubscriptions = state.records.filter((item) => !isInstallment(item) && getRecordStatus(item) !== "cancelled");
  const activeInstallments = state.records.filter((item) => isInstallment(item) && getRecordStatus(item) !== "completed");
  const activeTrials = state.records.filter((item) => isTrialRecord(item));
  const monthlySubscriptions = sum(activeSubscriptions.map((item) => calculateMonthlyTl(item)));
  const monthlyInstallments = sum(activeInstallments.map((item) => calculateMonthlyTl(item)));
  const monthlyTotal = monthlySubscriptions + monthlyInstallments;
  const yearlyTotal = sum(state.records.map((item) => calculateAnnualTl(item)));
  const previousMonthTotal = calculateMonthTotalRelative(-1);
  const alerts = buildAlerts();
  const budgetTarget = Number(state.settings.monthlyBudget || 0);
  const displayTotal = state.displayMode === "yearly" ? yearlyTotal : monthlyTotal;
  const displaySubscriptionTotal = state.displayMode === "yearly" ? monthlySubscriptions * 12 : monthlySubscriptions;
  const displayInstallmentTotal = state.displayMode === "yearly" ? monthlyInstallments * 12 : monthlyInstallments;
  const deltaPercentage = previousMonthTotal
    ? ((monthlyTotal - previousMonthTotal) / previousMonthTotal) * 100
    : monthlyTotal > 0
      ? 100
      : 0;

  dom.heroTitle.textContent = VIEW_MODE_LABELS[state.displayMode] || VIEW_MODE_LABELS.monthly;
  dom.monthlyTotal.textContent = formatCurrency(displayTotal);
  dom.monthlySubscriptionsTotal.textContent = formatCurrency(displaySubscriptionTotal);
  dom.monthlyInstallmentsTotal.textContent = formatCurrency(displayInstallmentTotal);
  dom.yearlyProjection.textContent = formatCurrency(yearlyTotal);
  dom.upcomingCount.textContent = String(alerts.filter((item) => item.type !== "budget").length);
  dom.monthlyTrialsCount.textContent = String(activeTrials.length);
  dom.monthlyDelta.textContent = `${deltaPercentage >= 0 ? "+" : ""}${deltaPercentage.toFixed(0)}%`;
  dom.budgetStatus.textContent = budgetTarget
    ? `${formatCurrency(monthlyTotal)} / ${formatCurrency(budgetTarget)}`
    : "Hedef yok";
  const budgetProgress = budgetTarget > 0 ? Math.min((monthlyTotal / budgetTarget) * 100, 100) : 0;
  if (dom.budgetProgressFill) {
    dom.budgetProgressFill.style.width = `${budgetProgress}%`;
  }
  if (dom.budgetProgressValue) {
    dom.budgetProgressValue.textContent = budgetTarget
      ? `%${Math.round(budgetProgress)} · ${formatCurrency(monthlyTotal)}`
      : "Hedef ekle";
  }
  if (dom.budgetProgressHint) {
    dom.budgetProgressHint.textContent = budgetTarget
      ? monthlyTotal > budgetTarget
        ? `Hedefini ${formatCurrency(monthlyTotal - budgetTarget)} aştın.`
        : `${formatCurrency(Math.max(budgetTarget - monthlyTotal, 0))} alanın kaldı.`
      : "Aylık hedef belirlediğinde bu ay ki ritmi burada göreceksin.";
  }

  renderCategoryChart(state.records);
  renderTrendChart(state.records);
  renderTopExpensive(state.records.filter((item) => calculateAnnualTl(item) > 0));
  renderCancellationCandidates(activeSubscriptions.filter((item) => !isTrialRecord(item)));
  renderTrialSummary(activeTrials);
  renderArchiveSummary();
  renderUpcomingTimeline();
  renderCashflowCalendar();
  renderComparisonSummary(monthlyTotal, yearlyTotal);
  renderTrendNarrative(monthlyTotal, previousMonthTotal);
  renderAuditSummary();
}

function renderAlerts() {
  const alerts = buildAlerts();
  dom.alertBadge.textContent = String(alerts.length);
  syncAppBadge(alerts.length);
  dom.alertsList.innerHTML = "";
  if (!alerts.length) {
    dom.alertsList.innerHTML = getEmptyStateMarkup("✓", "Her şey yolunda", "Şu an dikkat gerektiren bir durum görünmüyor.");
    dom.alertsList.classList.add("empty-state");
    return;
  }
  dom.alertsList.classList.remove("empty-state");
  alerts.forEach((alert) => {
    const article = document.createElement("article");
    article.className = `alert-item ${alert.severity}`;
    article.innerHTML = `
      <div class="alert-line">
        <strong>${escapeHtml(alert.title)}</strong>
        <span>${escapeHtml(alert.badge)}</span>
      </div>
      <p>${escapeHtml(alert.message)}</p>
    `;
    dom.alertsList.append(article);
  });
}

function renderRecords() {
  const search = dom.searchInput.value.trim().toLocaleLowerCase("tr");
  const status = dom.statusFilter.value;
  const filtered = state.records.filter((item) => {
    const computedStatus = getRecordStatus(item);
    const matchesStatus = status === "all" ? true : computedStatus === status;
    const haystack = `${getRecordDisplayTitle(item)} ${item.category} ${item.paymentMethod} ${item.notes} ${item.productName || ""}`.toLocaleLowerCase("tr");
    const matchesSearch = search ? haystack.includes(search) : true;
    return matchesStatus && matchesSearch;
  });
  const sortValue = dom.sortFilter.value;
  filtered.sort((a, b) => compareRecords(sortValue, a, b));

  dom.subscriptionsList.innerHTML = "";
  if (!filtered.length) {
    dom.subscriptionsList.innerHTML = getEmptyStateMarkup("⌁", "Henüz kayıt yok", "İlk aboneliğini ya da taksitini ekleyerek listeyi doldur.");
    dom.subscriptionsList.classList.add("empty-state");
    return;
  }
  dom.subscriptionsList.classList.remove("empty-state");

  filtered.forEach((record) => {
    const node = dom.subscriptionCardTemplate.content.firstElementChild.cloneNode(true);
    node.dataset.id = record.id;
    renderRecordLogo(node, record);
    node.querySelector(".subscription-name").textContent = getRecordDisplayTitle(record);
    node.querySelector(".subscription-meta").textContent = `${record.category} • ${getRecordTypeLabel(record)}`;
    node.querySelector(".subscription-price-line").textContent = getRecordPriceLine(record);
    const pill = node.querySelector(".status-pill");
    const computedStatus = getRecordStatus(record);
    pill.textContent = STATUS_LABELS[computedStatus] || computedStatus;
    pill.style.color = STATUS_COLORS[computedStatus] || "var(--primary)";

    const stats = getRecordStats(record);
    node.querySelector(".subscription-stats").innerHTML = stats
      .map(
        ([label, value]) => `
          <div class="stat-chip">
            <small>${label}</small>
            <strong>${value}</strong>
          </div>
        `
      )
      .join("");

    const installmentProgress = node.querySelector(".installment-progress");
    if (isInstallment(record)) {
      const progress = getInstallmentProgress(record);
      installmentProgress.classList.remove("hidden");
      installmentProgress.querySelector(".progress-value").textContent = `${progress.displayInstallment} / ${progress.totalInstallments}`;
      installmentProgress.querySelector(".progress-fill").style.width = `${progress.percentage}%`;
      installmentProgress.querySelector(".progress-label").textContent = progress.completed ? "Taksit tamamlandı" : "Taksit ilerlemesi";
    } else if (isTrialRecord(record)) {
      const trial = getTrialState(record);
      installmentProgress.classList.remove("hidden");
      installmentProgress.querySelector(".progress-value").textContent = trial.badge;
      installmentProgress.querySelector(".progress-fill").style.width = `${trial.progressPercentage}%`;
      installmentProgress.querySelector(".progress-label").textContent = trial.expired
        ? "Deneme süresi doldu"
        : "Deneme süresi";
    } else {
      installmentProgress.classList.add("hidden");
    }

    node.querySelector(".subscription-notes").textContent =
      record.notes || getDefaultNotes(record);

    dom.subscriptionsList.append(node);
  });
}

function renderPayments() {
  dom.paymentsList.innerHTML = "";
  if (!state.payments.length) {
    dom.paymentsList.innerHTML = getEmptyStateMarkup("₺", "Ödeme geçmişi boş", "İlk manuel ödeme kaydını eklediğinde burada akışını göreceksin.");
    dom.paymentsList.classList.add("empty-state");
    return;
  }
  dom.paymentsList.classList.remove("empty-state");
  state.payments.slice(0, 20).forEach((payment) => {
    const record = state.records.find((item) => item.id === payment.subscriptionId);
    const article = document.createElement("article");
    article.className = "payment-item";
    article.innerHTML = `
      <div>
        <strong>${escapeHtml(record ? getRecordDisplayTitle(record) : "Silinmiş kayıt")}</strong>
        <small>${formatDate(payment.paidAt)} • ${escapeHtml(payment.note || "Not yok")}</small>
      </div>
      <div>
        <strong>${formatMoney(payment.amount, payment.currency)}</strong>
        <small>${formatCurrency(payment.tlAmountAtPayment)}</small>
      </div>
    `;
    dom.paymentsList.append(article);
  });
}

function renderTopExpensive(records) {
  const topItems = [...records]
    .sort((a, b) => calculateAnnualTl(b) - calculateAnnualTl(a))
    .slice(0, 5);
  dom.expensiveList.innerHTML = "";
  if (!topItems.length) {
    dom.expensiveList.innerHTML = getEmptyStateMarkup("◎", "Henüz maliyet sıralaması yok", "Ücretli kayıt eklediğinde en yüksek etkili servisler burada görünür.");
    dom.expensiveList.classList.add("empty-state");
    return;
  }
  dom.expensiveList.classList.remove("empty-state");
  topItems.forEach((record, index) => {
    const row = document.createElement("article");
    row.className = "rank-item";
    row.innerHTML = `
      <div>
        <strong>${index + 1}. ${escapeHtml(getRecordDisplayTitle(record))}</strong>
        <small class="rank-subtitle">${escapeHtml(record.category)} • ${escapeHtml(getRecordTypeLabel(record))}</small>
      </div>
      <strong>${formatCurrency(calculateAnnualTl(record))}</strong>
    `;
    dom.expensiveList.append(row);
  });
}

function renderCancellationCandidates(records) {
  const candidates = records
    .map((record) => ({ record, score: calculateCancellationScore(record) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  dom.cancellationList.innerHTML = "";
  if (!candidates.length) {
    dom.cancellationList.innerHTML = getEmptyStateMarkup("⌁", "İptal adayı yok", "Kullanım ve maliyet verisi arttıkça burada tasarruf fırsatları görünecek.");
    dom.cancellationList.classList.add("empty-state");
    return;
  }
  dom.cancellationList.classList.remove("empty-state");
  candidates.forEach(({ record, score }) => {
    const row = document.createElement("article");
    row.className = "rank-item";
    row.innerHTML = `
      <div>
        <strong>${escapeHtml(getRecordDisplayTitle(record))}</strong>
        <small class="rank-subtitle">${usageLabel(record.usageFrequency)} • Değer ${record.valueScore}/5 • Skor ${score.toFixed(0)}</small>
      </div>
      <strong>${formatCurrency(calculateAnnualTl(record))}</strong>
    `;
    dom.cancellationList.append(row);
  });
}

function renderYearSummary(yearlyProjectionTl) {
  const currentYear = new Date().getFullYear();
  const thisYearPayments = state.payments.filter((payment) => new Date(payment.paidAt).getFullYear() === currentYear);
  const actualSpent = sum(thisYearPayments.map((payment) => payment.tlAmountAtPayment));
  const totalCount = thisYearPayments.length;
  const projected = yearlyProjectionTl;
  const label = totalCount ? "Gerçekleşmiş" : "Tahmini";
  dom.yearSummaryLabel.textContent = `${currentYear} özeti`;
  dom.yearSummary.innerHTML = [
    { title: `${label} harcama`, value: formatCurrency(totalCount ? actualSpent : projected) },
    { title: "Ödeme kaydı", value: `${totalCount} adet` },
    { title: "Günlük ortalama", value: formatCurrency((totalCount ? actualSpent : projected) / 365) },
    { title: "Aylık ortalama", value: formatCurrency((totalCount ? actualSpent : projected) / 12) }
  ]
    .map(
      (item) => `
        <article class="summary-item">
          <small>${item.title}</small>
          <strong>${item.value}</strong>
        </article>
      `
    )
    .join("");
}

function renderTrialSummary(activeTrials) {
  if (!dom.trialSummary) {
    return;
  }
  if (!activeTrials.length) {
    dom.trialSummary.innerHTML = `
      <article class="summary-item summary-item-wide">
        <small>Durum</small>
        <strong>Aktif deneme yok</strong>
      </article>
    `;
    return;
  }

  const nearestTrial = [...activeTrials]
    .filter((record) => record.trialEndDate)
    .sort((a, b) => daysBetween(todayIso(), a.trialEndDate) - daysBetween(todayIso(), b.trialEndDate))[0];

  dom.trialSummary.innerHTML = [
    { title: "Aktif deneme", value: `${activeTrials.length} kayıt` },
    {
      title: "En yakın bitiş",
      value: nearestTrial ? `${nearestTrial.name} · ${formatDate(nearestTrial.trialEndDate)}` : "Tarih yok"
    },
    {
      title: "Bugün bitiyor",
      value: `${activeTrials.filter((record) => getTrialState(record).daysRemaining === 0).length} kayıt`
    },
    {
      title: "Ücretli olursa aylık etki",
      value: formatCurrency(sum(activeTrials.map((record) => convertToTl(record.price, record.currency))))
    }
  ]
    .map(
      (item) => `
        <article class="summary-item">
          <small>${item.title}</small>
          <strong>${item.value}</strong>
        </article>
      `
    )
    .join("");
}

function renderCashflowCalendar() {
  const days = buildCashflowCalendarDays();
  state.cashflowDays = days;
  const next7 = days.filter((day) => day.offset >= 0 && day.offset <= 6 && (day.total > 0 || day.trials.length));
  dom.next7DaysSummary.innerHTML = [
    {
      title: "Önümüzdeki 7 gün",
      value: formatCurrency(sum(next7.map((day) => day.total)))
    },
    {
      title: "Tahsilat günü",
      value: `${next7.filter((day) => day.total > 0).length} gün`
    },
    {
      title: "Deneme bitişi",
      value: `${next7.reduce((count, day) => count + day.trials.length, 0)} adet`
    },
    {
      title: "En yoğun gün",
      value: next7.length ? formatDate(next7.sort((a, b) => b.total - a.total)[0]?.date || "") : "Yok"
    }
  ]
    .map(
      (item) => `
        <article class="summary-item">
          <small>${item.title}</small>
          <strong>${item.value}</strong>
        </article>
      `
    )
    .join("");

  if (!days.some((day) => day.total > 0 || day.trials.length)) {
    dom.cashflowCalendar.innerHTML = getEmptyStateMarkup("◌", "Bu ay sakin görünüyor", "Ay içinde işaretlenecek ödeme ya da deneme bitişi yok.");
    dom.cashflowCalendar.classList.add("empty-state");
    return;
  }

  dom.cashflowCalendar.classList.remove("empty-state");
  dom.cashflowCalendar.innerHTML = days
    .map((day) => {
      const intensityClass = day.total >= 1000 ? "is-heavy" : day.total >= 300 ? "is-medium" : "";
      const chips = [
        ...day.items.slice(0, 2).map((item) => `<span class="calendar-chip">${escapeHtml(item)}</span>`),
        ...day.trials.slice(0, 1).map((item) => `<span class="calendar-chip calendar-chip-trial">${escapeHtml(item)}</span>`)
      ].join("");
      return `
        <article class="calendar-day ${intensityClass}" data-date="${toIsoDate(day.date)}">
          <small>${day.dayLabel}</small>
          <strong>${day.total > 0 ? formatCurrency(day.total) : day.trials.length ? "Deneme" : "-"}</strong>
          <div class="calendar-chips">${chips}</div>
        </article>
      `;
    })
    .join("");
}

function renderComparisonSummary(monthlyTotal, yearlyTotal) {
  const coffeePrice = Number(state.settings.coffeePrice || DEFAULT_SETTINGS.coffeePrice);
  const vacationBudget = Number(state.settings.vacationBudget || DEFAULT_SETTINGS.vacationBudget);
  const monthlyCoffees = coffeePrice ? Math.round(monthlyTotal / coffeePrice) : 0;
  const yearlyVacations = vacationBudget ? (yearlyTotal / vacationBudget).toFixed(1) : "0.0";
  dom.comparisonSummary.innerHTML = [
    {
      title: "Aylık kahve karşılığı",
      value: `${monthlyCoffees} kahve`
    },
    {
      title: "Yıllık tatil karşılığı",
      value: `${yearlyVacations} hafta`
    },
    {
      title: "Referans kahve",
      value: formatCurrency(coffeePrice)
    },
    {
      title: "Referans tatil",
      value: formatCurrency(vacationBudget)
    }
  ]
    .map(
      (item) => `
        <article class="summary-item">
          <small>${item.title}</small>
          <strong>${item.value}</strong>
        </article>
      `
    )
    .join("");
}

function renderTrendNarrative(currentMonthTotal, previousMonthTotal) {
  const diff = currentMonthTotal - previousMonthTotal;
  const percent = previousMonthTotal ? Math.round((diff / previousMonthTotal) * 100) : currentMonthTotal > 0 ? 100 : 0;
  const monthStats = buildMonthReasonBreakdown();
  const topIncrease = monthStats.increases[0];
  const topDecrease = monthStats.decreases[0];
  let sentence = "Henüz yeterli değişim sinyali yok.";

  if (diff > 0 && topIncrease) {
    sentence = `Geçen aya göre %${Math.abs(percent)} arttı. En büyük sebep ${topIncrease.name} kaydının etkisi (+${formatCurrency(topIncrease.delta)}).`;
  } else if (diff < 0 && topDecrease) {
    sentence = `Geçen aya göre %${Math.abs(percent)} düştü. En büyük fark ${topDecrease.name} kaydındaki azalma (${formatCurrency(Math.abs(topDecrease.delta))}).`;
  } else if (diff === 0) {
    sentence = "Geçen aya göre toplam maliyet neredeyse aynı kaldı.";
  }

  dom.trendNarrativeTitle.textContent = `${diff >= 0 ? "Artış" : "Azalış"} özeti`;
  dom.trendNarrative.textContent = sentence;
}

function renderWrappedSummary() {
  const wrapped = buildWrappedSummary();
  dom.wrappedSummary.innerHTML = wrapped
    .map(
      (item) => `
        <article class="wrapped-card">
          <small>${item.title}</small>
          <strong>${item.value}</strong>
          <p>${item.note}</p>
        </article>
      `
    )
    .join("");
}

function renderAuditSummary() {
  const auditItems = buildAuditItems();
  const due = isAuditReminderDue();
  dom.auditStatus.textContent = due ? "Gözden geçirme zamanı" : "Takvimde";
  if (!auditItems.length) {
    dom.auditSummary.innerHTML = getEmptyStateMarkup("✓", "Denetim temiz", "Şu an hızlı aksiyon gerektiren bir abonelik görünmüyor.");
    dom.auditSummary.classList.add("empty-state");
    return;
  }
  dom.auditSummary.classList.remove("empty-state");
  dom.auditSummary.innerHTML = auditItems
    .map(
      (item) => `
        <article class="audit-item">
          <div>
            <strong>${escapeHtml(item.title)}</strong>
            <p>${escapeHtml(item.reason)}</p>
          </div>
          <div class="audit-actions">
            <button class="ghost-button" type="button" data-audit-action="keep" data-record-id="${item.id}">Tut</button>
            <button class="danger-button" type="button" data-audit-action="cancel" data-record-id="${item.id}">İptal et</button>
            <button class="ghost-button" type="button" data-audit-action="remind" data-record-id="${item.id}">Hatırlat</button>
          </div>
        </article>
      `
    )
    .join("");
}

function renderArchiveSummary() {
  const totalSavings = sum(state.archives.map((item) => item.annualSavingsTl));
  const lastArchived = state.archives[0];
  dom.archiveSummary.innerHTML = [
    { title: "Toplam arşiv", value: `${state.archives.length} kayıt` },
    { title: "Yıllık tasarruf", value: formatCurrency(totalSavings) },
    { title: "Son iptal", value: lastArchived ? getRecordDisplayTitle(lastArchived.snapshot) : "Yok" },
    { title: "Son arşiv tarihi", value: lastArchived ? formatDate(lastArchived.archivedAt) : "Yok" }
  ]
    .map(
      (item) => `
        <article class="summary-item">
          <small>${item.title}</small>
          <strong>${item.value}</strong>
        </article>
      `
    )
    .join("");
}

function renderCategoryChart(records) {
  const categoryTotals = {};
  records.forEach((record) => {
    const value = calculateMonthlyTl(record);
    if (value <= 0) {
      return;
    }
    categoryTotals[record.category] = (categoryTotals[record.category] || 0) + value;
  });
  const entries = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const colors = entries.map(([category]) => getCategoryColor(category));
  drawDonutChart(dom.categoryChart, entries.map((entry) => entry[1]), colors);
  dom.categoryLegendSummary.textContent = entries.length ? `${entries.length} kategori` : "Veri yok";
  dom.categoryLegend.innerHTML = entries.length
    ? entries
        .map(
          ([category, total], index) => `
            <div class="legend-item">
              <div class="legend-item">
                <span class="legend-dot" style="background:${colors[index]}"></span>
                <span>${escapeHtml(category)}</span>
              </div>
              <strong>${formatCurrency(total)}</strong>
            </div>
          `
        )
        .join("")
    : "Kategori dağılımı için aktif kayıt ekle.";
}

function renderTrendChart(records) {
  const points = buildTrendData(records);
  drawLineChart(dom.trendChart, points.map((point) => point.total));
}

function buildAlerts() {
  const alerts = [];
  const today = stripTime(new Date());
  const budgetTarget = Number(state.settings.monthlyBudget || 0);
  const monthlyTotal = sum(state.records.map((item) => calculateMonthlyTl(item)));

  state.records.forEach((record) => {
    if (isInstallment(record)) {
      const progress = getInstallmentProgress(record);
      if (progress.completed) {
        return;
      }
      if (progress.nextDueDate) {
        const dueDays = daysBetween(today, progress.nextDueDate);
        if (dueDays >= 0 && dueDays <= state.settings.renewalReminderDays) {
          alerts.push({
            id: `installment-${record.id}-${progress.nextDueDate}`,
            type: "installment",
            severity: dueDays <= 1 ? "critical" : "info",
            badge: `${dueDays} gün`,
            title: `${record.merchant} taksiti yaklaşıyor`,
            message: `${record.productName} için ${formatDate(progress.nextDueDate)} tarihinde ${formatMoney(record.monthlyInstallment, "TRY")} ödemesi var.`
          });
        }
      }
      return;
    }

    const status = getRecordStatus(record);
    if (status === "cancelled") {
      return;
    }
    if (isTrialRecord(record) && record.trialEndDate) {
      const trialDays = daysBetween(today, record.trialEndDate);
      const reminderDays = new Set([Number(state.settings.trialReminderDays || 3), 3, 1, 0]);
      if (trialDays >= 0 && reminderDays.has(trialDays)) {
        alerts.push({
          id: `trial-${record.id}-${record.trialEndDate}`,
          type: "trial",
          severity: "critical",
          badge: `${trialDays} gün`,
          title: `${record.name} deneme süresi bitiyor`,
          message: `${record.name} aboneliğinin deneme süresi ${formatDate(record.trialEndDate)} tarihinde bitiyor — ücretli aboneliğe dönmeden karar ver.`
        });
      }
      if (trialDays < 0) {
        alerts.push({
          id: `trial-ended-${record.id}-${record.trialEndDate}`,
          type: "trial-ended",
          severity: "critical",
          badge: "Karar ver",
          title: `${record.name} denemesi sona erdi`,
          message: `${record.name} için deneme ${formatDate(record.trialEndDate)} tarihinde bitti. Ücretli devam mı, arşiv mi karar ver.`
        });
      }
      return;
    }
    const paymentDays = daysBetween(today, record.nextPaymentDate);
    const annualTl = calculateAnnualTl(record);
    if (paymentDays >= 0 && paymentDays <= state.settings.renewalReminderDays) {
      alerts.push({
        id: `renewal-${record.id}-${record.nextPaymentDate}`,
        type: "renewal",
        severity: paymentDays <= 1 ? "critical" : "info",
        badge: `${paymentDays} gün`,
        title: `${record.name} ödemesi yaklaşıyor`,
        message: `${formatDate(record.nextPaymentDate)} tarihinde ${formatMoney(record.price, record.currency)} yenileme var.`
      });
    }
    if (annualTl >= state.settings.highAnnualThreshold && paymentDays >= 0 && paymentDays <= 30) {
      alerts.push({
        id: `annual-${record.id}-${record.nextPaymentDate}`,
        type: "annual",
        severity: "info",
        badge: "Büyük ödeme",
        title: `${record.name} yüksek maliyetli`,
        message: `Bu kaydın yıllık etkisi ${formatCurrency(annualTl)}. Ödeme yakında.`
      });
    }
    if (record.isPriceIncreased) {
      alerts.push({
        id: `price-${record.id}-${record.updatedAt}`,
        type: "price",
        severity: "info",
        badge: "Zam",
        title: `${record.name} için zam işaretli`,
        message: "Güncel fiyatı kontrol etmek isteyebilirsin."
      });
    }
    const staleDays = record.lastUsedDate ? daysBetween(record.lastUsedDate, todayIso()) : 0;
    if (annualTl >= Math.max(600, Number(state.settings.highAnnualThreshold || 0) * 0.35) && staleDays >= 45) {
      alerts.push({
        id: `stale-${record.id}-${record.lastUsedDate}`,
        type: "stale",
        severity: "info",
        badge: `${staleDays} gün`,
        title: `${record.name} uzun süredir kullanılmıyor`,
        message: `${record.name} son ${staleDays} gündür kullanılmamış görünüyor. Maliyeti ${formatCurrency(annualTl)} / yıl.`
      });
    }
  });

  if (budgetTarget && monthlyTotal > budgetTarget) {
    alerts.push({
      id: `budget-${todayIso()}`,
      type: "budget",
      severity: "critical",
      badge: "Bütçe",
      title: "Aylık bütçe hedefi aşıldı",
      message: `${formatCurrency(monthlyTotal)} toplam, hedefin ${formatCurrency(budgetTarget)}.`
    });
  }
  if (isAuditReminderDue()) {
    alerts.push({
      id: `audit-${todayIso()}`,
      type: "audit",
      severity: "info",
      badge: "Denetim",
      title: "Aboneliklerini gözden geçirme zamanı",
      message: "3 aylık denetim ekranında kullanılmayan, zamlanan ve denemesi bitecek kayıtları incele."
    });
  }
  return alerts.sort((a, b) => severityScore(b.severity) - severityScore(a.severity));
}

async function maybeSendNotifications() {
  const todayKey = todayIso();
  const alerts = buildAlerts();
  syncAppBadge(alerts.length);
  if (!("Notification" in window) || Notification.permission !== "granted" || !state.settings.notificationsEnabled) {
    return;
  }
  const notified = state.settings.notifiedAlerts || {};
  let changed = false;

  for (const alert of alerts) {
    const key = `${todayKey}:${alert.id}`;
    if (notified[key]) {
      continue;
    }
    await showLocalNotification(alert.title, {
      body: alert.message,
      icon: "./assets/icons/icon-192.png",
      badge: "./assets/icons/icon-192.png",
      tag: alert.id
    });
    notified[key] = true;
    changed = true;
  }

  if (changed) {
    state.settings.notifiedAlerts = notified;
    await putRecord("settings", state.settings);
  }
}

async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    showToast("Bu tarayıcıda bildirim desteği yok.");
    return;
  }
  const permission = await Notification.requestPermission();
  state.settings.notificationsEnabled = permission === "granted";
  await putRecord("settings", state.settings);
  populateSettingsForm();
  if (permission === "granted") {
    maybeSendNotifications();
    showToast("Bildirim izni verildi.");
  } else {
    showToast("Bildirim izni verilmedi.");
  }
}

async function sendTestNotification() {
  if (!("Notification" in window)) {
    showToast("Bu tarayıcı bildirim desteklemiyor.");
    return;
  }
  if (!state.settings.notificationsEnabled || Notification.permission !== "granted") {
    showToast("Önce bildirim izni ver.");
    return;
  }
  await showLocalNotification("Test bildirimi", {
    body: "Yerel bildirim sistemi bu cihazda çalışıyor.",
    icon: "./assets/icons/icon-192.png",
    badge: "./assets/icons/icon-192.png",
    tag: `test-${todayIso()}`
  });
  showToast("Test bildirimi gönderildi.");
}

async function exportData() {
  const payload = {
    exportedAt: new Date().toISOString(),
    version: 2,
    settings: state.settings,
    subscriptions: state.records,
    payments: state.payments,
    archives: state.archives
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `abonelik-yedek-${todayIso()}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast("JSON yedeği hazırlandı.");
}

async function importData(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed.subscriptions) || !Array.isArray(parsed.payments) || !Array.isArray(parsed.archives)) {
      throw new Error("Geçersiz yedek dosyası");
    }
    const confirmed = window.confirm("Mevcut veriler silinip seçilen yedek yüklenecek. Devam edilsin mi?");
    if (!confirmed) {
      event.target.value = "";
      return;
    }
    await Promise.all(STORE_NAMES.map((storeName) => clearStore(storeName)));
    await Promise.all([
      ...parsed.subscriptions.map((item) => putRecord("subscriptions", item)),
      ...parsed.payments.map((item) => putRecord("payments", item)),
      ...parsed.archives.map((item) => putRecord("archives", item)),
      putRecord("settings", { ...DEFAULT_SETTINGS, ...(parsed.settings || {}), id: DEFAULT_SETTINGS.id })
    ]);
    await loadState();
    populateCatalogSelect();
    populatePaymentSubscriptions();
    renderAll();
    applyTheme(state.settings.theme || "system");
    await maybeResolveExpiredTrials();
    showToast("Yedek başarıyla geri yüklendi.");
  } catch (error) {
    console.error(error);
    showToast("Yedek yüklenemedi.");
  } finally {
    event.target.value = "";
  }
}

function applyTheme(theme) {
  const resolvedTheme =
    theme === "dark" || theme === "light"
      ? theme
      : window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
  document.body.dataset.theme = resolvedTheme;
  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) {
    themeColor.setAttribute("content", resolvedTheme === "dark" ? "#091321" : "#2E6BFF");
  }
}

function setActiveTab(tabName) {
  state.activeTab = tabName;
  dom.tabButtons.forEach((button) => {
    const active = button.dataset.tabTarget === tabName;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-current", active ? "page" : "false");
  });
  dom.tabPanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.tabPanel === tabName);
  });
  updateHeaderForTab();
  updateFabVisibility();
}

function updateHeaderForTab() {
  const config = {
    overview: { title: "Özet" },
    subscriptions: { title: "Abonelikler" },
    analytics: { title: "Analiz" },
    settings: { title: "Ayarlar" }
  }[state.activeTab] || { title: "Akçe" };

  dom.appHeaderTitle.textContent = config.title;
}

function updateFabVisibility() {
  const hidden = state.activeTab === "settings" || state.activeTab === "analytics";
  dom.fabAddBtn.classList.toggle("is-hidden", hidden);
}

function syncNativeControls() {
  syncSegmentedButtons();
  syncPickerTriggerLabels();
}

function syncSegmentedButtons() {
  document.querySelectorAll("[data-status-value]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.statusValue === dom.statusFilter.value);
  });
  document.querySelectorAll("[data-record-type]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.recordType === dom.recordTypeSelect.value);
  });
  document.querySelectorAll("[data-form-status]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.formStatus === getFieldValue("status"));
  });
}

function syncPickerTriggerLabels() {
  dom.pickerTriggers.forEach((trigger) => {
    const target = resolvePickerTarget(trigger.dataset.pickerTarget);
    if (!target) {
      return;
    }
    const labelNode = trigger.querySelector("span");
    if (!labelNode) {
      return;
    }
    if (target.tagName === "SELECT") {
      const option = target.selectedOptions?.[0];
      labelNode.textContent = option ? option.textContent : "Seç";
    } else {
      labelNode.textContent = target.value || "Seç";
    }
  });
}

function handleStatusSegmentClick(event) {
  const button = event.target.closest("[data-status-value]");
  if (!button) {
    return;
  }
  dom.statusFilter.value = button.dataset.statusValue;
  syncSegmentedButtons();
  renderRecords();
}

function handleAnalyticsSegmentClick(event) {
  const button = event.target.closest("[data-analytics-view]");
  if (!button) {
    return;
  }
  const view = button.dataset.analyticsView;
  document.querySelectorAll("[data-analytics-view]").forEach((node) => {
    node.classList.toggle("is-active", node === button);
  });
  dom.analyticsSections.forEach((section) => {
    const visible = section.dataset.analyticsSection.split(" ").includes(view);
    section.classList.toggle("hidden", !visible);
  });
}

function setFormStatus(status) {
  setFieldValue("status", status);
  syncSegmentedButtons();
  updateDetailPreview();
}

function setRecordType(type) {
  dom.recordTypeSelect.value = type;
  syncFormMode();
}

function resolvePickerTarget(targetName) {
  if (targetName === "catalogCategorySelect") {
    return dom.catalogCategorySelect;
  }
  if (targetName === "catalogSelect") {
    return dom.catalogSelect;
  }
  if (targetName === "paymentSubscriptionSelect") {
    return dom.paymentSubscriptionSelect;
  }
  if (targetName === "auditReminderMonths") {
    return dom.settingsForm.elements.namedItem("auditReminderMonths");
  }
  return (
    dom.subscriptionForm.elements.namedItem(targetName) ||
    dom.paymentForm.elements.namedItem(targetName) ||
    dom.settingsForm.elements.namedItem(targetName) ||
    document.getElementById(targetName)
  );
}

function openPickerByTarget(targetName, title) {
  const target = resolvePickerTarget(targetName);
  if (!target || target.tagName !== "SELECT") {
    return;
  }
  openPickerFromSelect(target, title || "Seç");
}

function openPickerFromSelect(selectElement, title) {
  dom.pickerTitle.textContent = title;
  dom.pickerOptions.innerHTML = "";
  Array.from(selectElement.options).forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `picker-option${option.selected ? " is-active" : ""}`;
    button.innerHTML = `<span>${escapeHtml(option.textContent)}</span><strong>${option.selected ? "Seçili" : ""}</strong>`;
    button.addEventListener("click", () => {
      selectElement.value = option.value;
      selectElement.dispatchEvent(new Event("change", { bubbles: true }));
      syncNativeControls();
      dom.pickerDialog.close();
      if (selectElement === dom.paymentSubscriptionSelect) {
        autoFillPaymentAmount();
      }
      if (selectElement === dom.recordTypeSelect) {
        syncFormMode();
      }
    });
    dom.pickerOptions.append(button);
  });
  dom.pickerDialog.showModal();
  syncSheetState();
}

function syncSheetState() {
  document.body.classList.toggle(
    "sheet-open",
    Boolean(dom.subscriptionDialog?.open) ||
      Boolean(dom.paymentDialog?.open) ||
      Boolean(dom.onboardingDialog?.open) ||
      Boolean(dom.pickerDialog?.open) ||
      Boolean(dom.recordDetailDialog?.open) ||
      Boolean(dom.calendarDetailDialog?.open)
  );
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }
  try {
    state.serviceWorkerRegistration = await navigator.serviceWorker.register("./sw.js");
  } catch (error) {
    console.error("Service worker kaydedilemedi", error);
  }
}

async function showLocalNotification(title, options) {
  try {
    const registration = state.serviceWorkerRegistration || (await navigator.serviceWorker?.ready);
    if (registration?.showNotification) {
      await registration.showNotification(title, options);
      return;
    }
  } catch (error) {
    console.error("Service worker bildirimi gösteremedi", error);
  }

  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, options);
  }
}

function syncAppBadge(count) {
  if ("setAppBadge" in navigator && count > 0) {
    navigator.setAppBadge(count).catch(() => {});
    return;
  }
  if ("clearAppBadge" in navigator) {
    navigator.clearAppBadge().catch(() => {});
  }
}

function maybeShowInstallHint() {
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
  if (isStandalone) {
    dom.installBanner.classList.add("hidden");
  }
}

async function triggerInstallPrompt() {
  if (!state.deferredPrompt) {
    showToast("Tarayıcı şu an yükleme istemi göstermiyor.");
    return;
  }
  state.deferredPrompt.prompt();
  await state.deferredPrompt.userChoice;
  state.deferredPrompt = null;
  dom.installBanner.classList.add("hidden");
}

function buildTrendData(records) {
  const data = [];
  const now = new Date();
  for (let offset = 5; offset >= 0; offset -= 1) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const total = sum(records.map((record) => monthlyOccurrenceForMonth(record, monthDate.getFullYear(), monthDate.getMonth())));
    data.push({ label: monthDate.toLocaleDateString("tr-TR", { month: "short" }), total });
  }
  return data;
}

function monthlyOccurrenceForMonth(record, year, month) {
  if (isInstallment(record)) {
    const start = new Date(record.startDate);
    if (Number.isNaN(start.getTime()) || !record.totalInstallments) {
      return 0;
    }
    const monthIndex = (year - start.getFullYear()) * 12 + (month - start.getMonth());
    return monthIndex >= 0 && monthIndex < record.totalInstallments ? record.monthlyInstallment : 0;
  }
  const monthlyTl = calculateMonthlyTl(record);
  const annualTl = calculateAnnualTl(record);
  if (record.billingCycle === "monthly" || record.billingCycle === "weekly") {
    return monthlyTl;
  }
  const next = new Date(record.nextPaymentDate);
  if (Number.isNaN(next.getTime())) {
    return monthlyTl;
  }
  const iter = new Date(next);
  for (let i = 0; i < 36; i += 1) {
    if (iter.getFullYear() === year && iter.getMonth() === month) {
      return record.billingCycle === "quarterly" ? annualTl / 4 : annualTl;
    }
    iter.setTime(addCycle(iter, record.billingCycle, true).getTime());
    if (iter.getFullYear() > year || (iter.getFullYear() === year && iter.getMonth() > month)) {
      break;
    }
  }
  const backIter = new Date(next);
  for (let i = 0; i < 36; i += 1) {
    if (backIter.getFullYear() === year && backIter.getMonth() === month) {
      return record.billingCycle === "quarterly" ? annualTl / 4 : annualTl;
    }
    backIter.setTime(addCycle(backIter, record.billingCycle, true).getTime());
    if (backIter.getFullYear() < year || (backIter.getFullYear() === year && backIter.getMonth() < month)) {
      break;
    }
  }
  return 0;
}

function getMonthlyOccurrenceTl(record, year, month) {
  return monthlyOccurrenceForMonth(record, year, month);
}

function drawDonutChart(canvas, values, colors) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const total = sum(values);
  ctx.clearRect(0, 0, width, height);
  if (!total) {
    drawEmptyCanvasState(ctx, width, height, "Veri yok");
    return;
  }
  ctx.save();
  ctx.translate(width / 2, height / 2);
  let start = -Math.PI / 2;
  values.forEach((value, index) => {
    const slice = (value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.strokeStyle = colors[index];
    ctx.lineWidth = 36;
    ctx.lineCap = "round";
    ctx.arc(0, 0, 66, start, start + slice);
    ctx.stroke();
    start += slice;
  });
  ctx.beginPath();
  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--surface-strong");
  ctx.arc(0, 0, 40, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--text");
  ctx.font = '700 18px "Hanken Grotesk Local"';
  ctx.textAlign = "center";
  ctx.fillText(formatCurrencyShort(total), 0, 6);
  ctx.restore();
}

function drawLineChart(canvas, values) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  if (!values.some(Boolean)) {
    drawEmptyCanvasState(ctx, width, height, "Trend için veri yok");
    return;
  }
  const padding = 28;
  const max = Math.max(...values, 1);
  const stepX = (width - padding * 2) / Math.max(values.length - 1, 1);
  ctx.strokeStyle = "rgba(120, 170, 230, 0.25)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i += 1) {
    const y = padding + ((height - padding * 2) / 3) * i;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
  }
  ctx.beginPath();
  values.forEach((value, index) => {
    const x = padding + stepX * index;
    const y = height - padding - (value / max) * (height - padding * 2);
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue("--primary");
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--accent");
  values.forEach((value, index) => {
    const x = padding + stepX * index;
    const y = height - padding - (value / max) * (height - padding * 2);
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--muted");
  ctx.font = '12px "Hanken Grotesk Local"';
  ctx.fillText("6 ay", padding, height - 8);
  ctx.fillText(formatCurrencyShort(max), width - padding - 42, 18);
}

function drawEmptyCanvasState(ctx, width, height, label) {
  ctx.save();
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--muted");
  ctx.font = '14px "Hanken Grotesk Local"';
  ctx.textAlign = "center";
  ctx.fillText(label, width / 2, height / 2);
  ctx.restore();
}

function calculateMonthlyTl(record) {
  if (isInstallment(record)) {
    const progress = getInstallmentProgress(record);
    return progress.started && !progress.completed ? convertToTl(record.monthlyInstallment, record.currency) : 0;
  }
  if (isTrialRecord(record)) {
    return 0;
  }
  const base = convertToTl(record.price, record.currency);
  switch (record.billingCycle) {
    case "weekly":
      return (base * 52) / 12;
    case "quarterly":
      return base / 3;
    case "yearly":
      return base / 12;
    case "monthly":
    default:
      return base;
  }
}

function calculateAnnualTl(record) {
  if (isInstallment(record)) {
    const progress = getInstallmentProgress(record);
    const futureInstallments = Math.max(0, Math.min(progress.remainingInstallments, 12));
    return futureInstallments * convertToTl(record.monthlyInstallment, record.currency);
  }
  if (isTrialRecord(record)) {
    return 0;
  }
  return calculateMonthlyTl(record) * 12;
}

function calculateDailyTl(record) {
  return calculateAnnualTl(record) / 365;
}

function calculateCancellationScore(record) {
  const annualNorm = Math.min(calculateAnnualTl(record) / 150, 100);
  const usageNorm = USAGE_SCORES[record.usageFrequency] ?? 0.5;
  const valueNorm = (6 - Number(record.valueScore || 3)) / 5;
  const daysSinceLastUse = record.lastUsedDate ? daysBetween(record.lastUsedDate, todayIso()) : 120;
  const stalenessNorm = Math.min(daysSinceLastUse / 180, 1);
  return annualNorm * 0.45 + usageNorm * 100 * 0.2 + valueNorm * 100 * 0.2 + stalenessNorm * 100 * 0.15;
}

function convertToTl(amount, currency) {
  const numericAmount = Number(amount || 0);
  if (currency === "USD") {
    return numericAmount * Number(state.settings.usdRate || 1);
  }
  if (currency === "EUR") {
    return numericAmount * Number(state.settings.eurRate || 1);
  }
  return numericAmount;
}

function getInstallmentProgress(record, now = new Date()) {
  const start = new Date(record.startDate);
  const totalInstallments = Number(record.totalInstallments || 0);
  if (Number.isNaN(start.getTime()) || !totalInstallments) {
    return {
      started: false,
      completed: false,
      displayInstallment: 0,
      totalInstallments,
      percentage: 0,
      remainingInstallments: totalInstallments,
      nextDueDate: null
    };
  }

  const current = stripTime(now);
  const startDay = start.getDate();
  const rawMonthDiff = (current.getFullYear() - start.getFullYear()) * 12 + (current.getMonth() - start.getMonth());
  const adjustedMonthDiff = current.getDate() < startDay ? rawMonthDiff - 1 : rawMonthDiff;
  const started = adjustedMonthDiff >= 0 || current >= stripTime(start);
  const completed = adjustedMonthDiff >= totalInstallments;
  const displayInstallment = completed ? totalInstallments : Math.max(1, Math.min(totalInstallments, adjustedMonthDiff + 1));
  const remainingInstallments = completed ? 0 : Math.max(0, totalInstallments - displayInstallment);
  const percentage = totalInstallments ? (displayInstallment / totalInstallments) * 100 : 0;

  let nextDueDate = null;
  if (!started) {
    nextDueDate = toIsoDate(start);
  } else if (!completed && displayInstallment < totalInstallments) {
    nextDueDate = addMonthsIso(record.startDate, displayInstallment);
  }

  return {
    started,
    completed,
    displayInstallment,
    totalInstallments,
    percentage,
    remainingInstallments,
    nextDueDate
  };
}

function getRecordStatus(record) {
  if (isInstallment(record)) {
    return getInstallmentProgress(record).completed ? "completed" : "active";
  }
  return record.status || "active";
}

function isTrialRecord(record) {
  return !isInstallment(record) && getRecordStatus(record) === "trial";
}

function getRecordTypeLabel(record) {
  return isInstallment(record) ? "Taksitli alışveriş" : "Abonelik";
}

function getRecordPrimaryName(record) {
  return isInstallment(record) ? record.merchant || record.name || "" : record.name || "";
}

function getRecordDisplayTitle(record) {
  if (isInstallment(record)) {
    return record.productName ? `${record.merchant} · ${record.productName}` : record.merchant;
  }
  return record.name;
}

function getRecordPriceLine(record) {
  if (isInstallment(record)) {
    const progress = getInstallmentProgress(record);
    const displayAmount = state.displayMode === "yearly" ? record.monthlyInstallment * 12 : record.monthlyInstallment;
    const prefix = state.displayMode === "yearly" ? "Yıllık eşdeğer" : "Aylık";
    return `${prefix} ${formatCurrency(displayAmount)} · ${progress.displayInstallment}/${progress.totalInstallments} taksit`;
  }
  if (isTrialRecord(record)) {
    const trial = getTrialState(record);
    const paidLine = `${formatMoney(record.price, record.currency)} · ${cycleSuffix(record.billingCycle)}`;
    if (trial.expired) {
      return "Deneme süresi doldu · Sonraki adımı seç";
    }
    return `Ücretsiz deneme · ${trial.badge} · Sonrasında ${paidLine}`;
  }
  const displayValue = state.displayMode === "yearly" ? calculateAnnualTl(record) : calculateMonthlyTl(record);
  const displayLabel = state.displayMode === "yearly" ? "Yıllık eşdeğer" : "Aylık etki";
  return `${displayLabel} ${formatCurrency(displayValue)} · ${formatMoney(record.price, record.currency)} ${cycleSuffix(record.billingCycle)}`;
}

function getRecordStats(record) {
  if (isInstallment(record)) {
    const progress = getInstallmentProgress(record);
    return [
      ["Toplam", formatCurrency(record.totalAmount)],
      ["Aylık", formatCurrency(record.monthlyInstallment)],
      ["İlerleme", `${progress.displayInstallment} / ${progress.totalInstallments}`],
      ["Sonraki", progress.nextDueDate ? formatDate(progress.nextDueDate) : "Tamamlandı"]
    ];
  }
  if (isTrialRecord(record)) {
    const trial = getTrialState(record);
    return [
      ["Deneme", trial.badge],
      ["Bitiş", record.trialEndDate ? formatDate(record.trialEndDate) : "Belirtilmedi"],
      ["Ücretli olursa", formatMoney(record.price, record.currency)],
      ["Toplama etkisi", "Şimdilik dahil değil"]
    ];
  }
  return [
    ["Aylık", formatCurrency(calculateMonthlyTl(record))],
    ["Yıllık", formatCurrency(calculateAnnualTl(record))],
    ["Kullanım başı", formatCurrency(calculateCostPerUse(record))],
    ["Son fiyat", getLatestPriceHistoryLabel(record)],
    ["Sonraki", formatDate(record.nextPaymentDate)]
  ];
}

function calculateCostPerUse(record) {
  if (isInstallment(record) || isTrialRecord(record)) {
    return 0;
  }
  const denominator = { high: 20, medium: 8, low: 3, unused: 1 }[record.usageFrequency] || 4;
  return calculateMonthlyTl(record) / denominator;
}

function getLatestPriceHistoryLabel(record) {
  if (!record.priceHistory?.length) {
    return "Yeni";
  }
  const last = record.priceHistory[0];
  return `${formatMoney(last.amount, last.currency)} ${cycleSuffix(last.billingCycle)}`;
}

function getDefaultNotes(record) {
  if (isInstallment(record)) {
    const progress = getInstallmentProgress(record);
    return `${record.merchant} alışverişi • ${progress.displayInstallment}/${progress.totalInstallments} taksit • Tamamlanınca otomatik düşer`;
  }
  if (isTrialRecord(record)) {
    const trial = getTrialState(record);
    return `Deneme sürümü aktif • ${trial.expired ? "Süresi doldu, karar bekliyor" : `${trial.badge}`} • Ücretli olana kadar toplam maliyete dahil değil`;
  }
  return `Kullanım: ${usageLabel(record.usageFrequency)} • Değer puanı: ${record.valueScore}/5 • İptalde yıllık tasarruf ${formatCurrency(calculateAnnualTl(record))}`;
}

function getTrialState(record, now = new Date()) {
  if (!record.trialEndDate) {
    return {
      daysRemaining: null,
      expired: false,
      badge: "Tarih yok",
      progressPercentage: 20
    };
  }
  const daysRemaining = daysBetween(stripTime(now), record.trialEndDate);
  const expired = daysRemaining < 0;
  return {
    daysRemaining,
    expired,
    badge: expired ? "Süresi doldu" : daysRemaining === 0 ? "Bugün bitiyor" : `${daysRemaining} gün kaldı`,
    progressPercentage: expired ? 100 : Math.max(10, Math.min(96, ((Math.max(0, 14 - daysRemaining)) / 14) * 100))
  };
}

async function maybeResolveExpiredTrials() {
  if (state.processingTrialDecision) {
    return;
  }
  const expiredTrials = state.records.filter((record) => isTrialRecord(record) && getTrialState(record).expired);
  if (!expiredTrials.length) {
    return;
  }

  state.processingTrialDecision = true;
  try {
    for (const record of expiredTrials) {
      const keepPaid = window.confirm(
        `${record.name} deneme süresi ${formatDate(record.trialEndDate)} tarihinde bitti.\n\nÜcretli aboneliğe geçildi mi?\n\nTamam = Evet, ücretli olarak devam et\nİptal = Hayır, arşive taşı`
      );

      if (keepPaid) {
        const nextPaymentDate =
          !record.nextPaymentDate || new Date(record.nextPaymentDate) < stripTime(new Date())
            ? todayIso()
            : record.nextPaymentDate;
        await putRecord(
          "subscriptions",
          normalizeRecord({
            ...record,
            status: "active",
            nextPaymentDate,
            updatedAt: new Date().toISOString()
          })
        );
        showToast(`${record.name} ücretli aboneliğe geçirildi.`);
      } else {
        await archiveRecord(record, {
          toastMessage: `${record.name} deneme bitiminde arşive taşındı.`
        });
      }

      await loadState();
      populatePaymentSubscriptions();
      renderAll();
    }
  } finally {
    state.processingTrialDecision = false;
  }
}

function renderRecordLogo(node, record) {
  const img = node.querySelector(".subscription-logo");
  const fallback = node.querySelector(".subscription-icon");
  const monogram = record.icon || guessMonogram(getRecordPrimaryName(record));
  const title = getRecordPrimaryName(record);
  const subtitle = isInstallment(record) ? "TR" : record.category;
  const localLogo = getLogoAssetPath(record);
  img.src = localLogo || createLogoDataUri({
    label: monogram,
    color: record.color || getCategoryColor(record.category),
    title,
    subtitle
  });
  img.classList.remove("hidden");
  img.alt = `${title} logosu`;
  fallback.classList.add("hidden");
}

function getLogoAssetPath(record) {
  const key = slugifyLogoKey(getRecordPrimaryName(record));
  const catalogMatch = state.catalog.find((item) => slugifyLogoKey(item.name) === key);
  const slug = catalogMatch?.logo || key;
  const asset = KNOWN_LOGO_ASSETS[slug] || "";
  return asset;
}

function createLogoDataUri({ label, color, title, subtitle }) {
  const safeLabel = escapeHtml(label.slice(0, 2).toUpperCase());
  const safeTitle = escapeHtml(title.slice(0, 22));
  const safeSubtitle = escapeHtml((subtitle || "").slice(0, 12).toUpperCase());
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${color}"/>
          <stop offset="100%" stop-color="#13B7C9"/>
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="20" fill="url(#g)"/>
      <rect x="5" y="5" width="54" height="54" rx="17" fill="rgba(255,255,255,0.08)"/>
      <text x="32" y="31" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="rgba(255,255,255,0.8)">${safeSubtitle}</text>
      <text x="32" y="47" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="#ffffff">${safeLabel}</text>
      <title>${safeTitle}</title>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function guessMonogram(value) {
  const clean = normalizeText(value).replace(/[^A-Za-zÇĞİÖŞÜçğıöşü0-9 ]/g, "");
  if (!clean) {
    return "A";
  }
  const parts = clean.split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

const KNOWN_LOGO_ASSETS = {
  netflix: "./assets/logos/netflix.png",
  spotify: "./assets/logos/spotify.png",
  spotifypremiumbireysel: "./assets/logos/spotify.png",
  spotifypremiumduo: "./assets/logos/spotify.png",
  spotifypremiumaile: "./assets/logos/spotify.png",
  spotifypremiumogrenci: "./assets/logos/spotify.png",
  youtubepremium: "./assets/logos/youtube-premium.png",
  disney: "./assets/logos/disney-plus.png",
  disneyplus: "./assets/logos/disney-plus.png",
  amazonprime: "./assets/logos/amazon-prime.png",
  applemusic: "./assets/logos/apple-music.png",
  icloud: "./assets/logos/icloud.png",
  icloudplus: "./assets/logos/icloud.png",
  googleone: "./assets/logos/google-one.svg",
  googleonebasic: "./assets/logos/google-one.svg",
  googleonestandard: "./assets/logos/google-one.svg",
  googleonepremium: "./assets/logos/google-one.svg",
  notion: "./assets/logos/notion.png",
  notionplus: "./assets/logos/notion.png",
  chatgpt: "./assets/logos/chatgpt.png",
  chatgptgo: "./assets/logos/chatgpt.png",
  chatgptplus: "./assets/logos/chatgpt.png",
  chatgptpro: "./assets/logos/chatgpt.png",
  chatgptbusiness: "./assets/logos/chatgpt.png",
  claude: "./assets/logos/claude.png",
  claudepro: "./assets/logos/claude.png",
  claudemax5x: "./assets/logos/claude.png",
  claudemax20x: "./assets/logos/claude.png",
  claudeteam: "./assets/logos/claude.png",
  gemini: "./assets/logos/gemini.png",
  googleaipro: "./assets/logos/gemini.png",
  googleaiultra: "./assets/logos/gemini.png",
  figmaprofessional: "./assets/logos/figma.png",
  canvapro: "./assets/logos/canva.png",
  adobecreativecloud: "./assets/logos/adobe.png",
  exxen: "./assets/logos/exxen.png",
  blutv: "./assets/logos/blutv.png",
  mubi: "./assets/logos/mubi.png",
  xboxgamepass: "./assets/logos/xbox.png",
  xboxgamepassultimate: "./assets/logos/xbox.png",
  xboxgamepasspc: "./assets/logos/xbox.png",
  xbox: "./assets/logos/xbox.png",
  playstationplus: "./assets/logos/playstation.png",
  githubcopilot: "./assets/logos/github-copilot.svg",
  bitwardenpremium: "./assets/logos/bitwarden.png",
  "1password": "./assets/logos/onepassword.png",
  todoistpro: "./assets/logos/todoist.png",
  mediummember: "./assets/logos/medium.png",
  patreon: "./assets/logos/patreon.png",
  microsoft365: "./assets/logos/microsoft365.png",
  microsoft365personal: "./assets/logos/microsoft365.png",
  linkedin: "./assets/logos/linkedin.png",
  linkedinpremiumcareer: "./assets/logos/linkedin.png",
  linkedinpremiumbusiness: "./assets/logos/linkedin.png",
  linkedinpremiumduocareer: "./assets/logos/linkedin.png",
  linkedinpremiumduobusiness: "./assets/logos/linkedin.png",
  linkedinpremiumallinone: "./assets/logos/linkedin.png",
  linkedinpremiumcompanypage: "./assets/logos/linkedin.png",
  trendyol: "./assets/logos/trendyol.png",
  trendyolplus: "./assets/logos/trendyol.png",
  hepsiburada: "./assets/logos/hepsiburada.svg",
  hepsiburadapremium: "./assets/logos/hepsiburada.svg",
  ciceksepeti: "./assets/logos/ciceksepeti.png",
  getir: "./assets/logos/getir.png",
  yemeksepeti: "./assets/logos/yemeksepeti.png",
  teknosa: "./assets/logos/teknosa.png",
  mediamarkt: "./assets/logos/mediamarkt.png",
  a101: "./assets/logos/a101.png",
  migros: "./assets/logos/migros.png",
  pazarama: "./assets/logos/pazarama.png",
  boyner: "./assets/logos/boyner.png",
  lcwaikiki: "./assets/logos/lcwaikiki.svg",
  defacto: "./assets/logos/defacto.png",
  amazonturkiye: "./assets/logos/amazon-tr.png",
  n11: "./assets/logos/n11.png",
  vodafone: "./assets/logos/vodafone.png",
  vodafonefaturalihat: "./assets/logos/vodafone.png",
  turktelekom: "./assets/logos/turktelekom.svg",
  turktelekomfaturalihat: "./assets/logos/turktelekom.svg",
  turkcell: "./assets/logos/turkcell.svg",
  turkcellfaturalihat: "./assets/logos/turkcell.svg"
};

function slugifyLogoKey(value) {
  return String(value || "")
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function formatCurrency(value) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2 }).format(value || 0);
}

function formatCurrencyShort(value) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return `${Math.round(value)} TL`;
}

function formatMoney(value, currency) {
  const mapping = { TRY: "TRY", USD: "USD", EUR: "EUR" };
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: mapping[currency] || "TRY", maximumFractionDigits: 2 }).format(value || 0);
}

function formatDate(value) {
  if (!value) {
    return "Belirtilmedi";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Belirtilmedi" : date.toLocaleDateString("tr-TR");
}

function formatDateTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Bilinmiyor"
    : date.toLocaleString("tr-TR", {
        dateStyle: "short",
        timeStyle: "short"
      });
}

function cycleSuffix(cycle) {
  return {
    weekly: "/hafta",
    monthly: "/ay",
    quarterly: "/3 ay",
    yearly: "/yıl"
  }[cycle] || "/ay";
}

function daysBetween(from, to) {
  const fromDate = stripTime(new Date(from));
  const toDate = stripTime(new Date(to));
  return Math.round((toDate - fromDate) / 86400000);
}

function stripTime(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function usageLabel(value) {
  return {
    high: "Sık kullanım",
    medium: "Ara sıra kullanım",
    low: "Nadiren kullanım",
    unused: "Neredeyse hiç kullanılmıyor"
  }[value] || "Belirsiz";
}

function isInstallment(record) {
  return record.recordType === "installment";
}

function createId(prefix) {
  const browserCrypto = window.crypto || window.msCrypto;
  if (browserCrypto?.randomUUID) {
    return `${prefix}-${browserCrypto.randomUUID()}`;
  }

  if (browserCrypto?.getRandomValues) {
    const bytes = new Uint32Array(4);
    browserCrypto.getRandomValues(bytes);
    return `${prefix}-${Array.from(bytes, (value) => value.toString(16).padStart(8, "0")).join("")}`;
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeText(value) {
  return String(value || "").trim();
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function sum(values) {
  return values.reduce((total, value) => total + Number(value || 0), 0);
}

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function addCycle(value, cycle, asDate = false) {
  const date = typeof value === "string" ? new Date(value) : new Date(value);
  if (cycle === "weekly") {
    date.setDate(date.getDate() + 7);
  } else if (cycle === "quarterly") {
    date.setMonth(date.getMonth() + 3);
  } else if (cycle === "yearly") {
    date.setFullYear(date.getFullYear() + 1);
  } else {
    date.setMonth(date.getMonth() + 1);
  }
  return asDate ? date : toIsoDate(date);
}

function addMonthsIso(value, months) {
  const date = new Date(value);
  date.setMonth(date.getMonth() + months);
  return toIsoDate(date);
}

function addDaysIso(value, days) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

function toIsoDate(date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function severityScore(value) {
  return { critical: 3, info: 2 }[value] || 1;
}

function getCategoryColor(category) {
  const palette = ["#0A66D9", "#2E6BFF", "#13B7C9", "#0098D8", "#0D9476", "#10A37F", "#5D3EBC", "#7D3CB5", "#F27A1A", "#FF6000", "#FA2D65", "#003791"];
  const hash = Array.from(category || "").reduce((total, char) => total + char.charCodeAt(0), 0);
  return palette[hash % palette.length];
}

function syncColorPresetStates() {
  document.querySelectorAll("[data-color-palette]").forEach((palette) => {
    const target = palette.dataset.colorPalette;
    const field = dom.subscriptionForm.elements.namedItem(target);
    const currentValue = String(field?.value || "").toLowerCase();
    palette.querySelectorAll("[data-color-value]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.colorValue.toLowerCase() === currentValue);
    });
  });
}

function setButtonBusy(button, busy, busyLabel = "Kaydediliyor...") {
  if (!button) {
    return;
  }
  if (!button.dataset.defaultLabel) {
    button.dataset.defaultLabel = button.textContent.trim();
  }
  button.disabled = busy;
  button.classList.toggle("is-busy", busy);
  button.textContent = busy ? busyLabel : button.dataset.defaultLabel;
}

function getEmptyStateMarkup(icon, title, description) {
  return `
    <div class="empty-state-card">
      <div class="empty-state-icon">${escapeHtml(icon)}</div>
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(description)}</p>
    </div>
  `;
}

function compareRecords(sortValue, left, right) {
  if (sortValue === "cost-desc") {
    return calculateAnnualTl(right) - calculateAnnualTl(left);
  }
  if (sortValue === "next-payment") {
    return getNextRelevantDate(left) - getNextRelevantDate(right);
  }
  if (sortValue === "category") {
    return `${left.category}`.localeCompare(`${right.category}`, "tr");
  }
  return getRecordDisplayTitle(left).localeCompare(getRecordDisplayTitle(right), "tr");
}

function getNextRelevantDate(record) {
  const source = isInstallment(record) ? getInstallmentProgress(record).nextDueDate : record.nextPaymentDate;
  const date = new Date(source || "2999-12-31");
  return Number.isNaN(date.getTime()) ? new Date("2999-12-31").getTime() : date.getTime();
}

function calculateMonthTotalRelative(offsetMonths) {
  const base = new Date();
  const targetYear = base.getFullYear();
  const targetMonth = base.getMonth() + offsetMonths;
  const date = new Date(targetYear, targetMonth, 1);
  return sum(state.records.map((record) => getMonthlyOccurrenceTl(record, date.getFullYear(), date.getMonth())));
}

function renderUpcomingTimeline() {
  const items = buildUpcomingTimelineItems();
  dom.timelineList.innerHTML = "";
  if (!items.length) {
    dom.timelineList.innerHTML = getEmptyStateMarkup("◌", "Yaklaşan ödeme yok", "Önümüzdeki 30 gün için planlanmış bir ödeme görünmüyor.");
    dom.timelineList.classList.add("empty-state");
    return;
  }
  dom.timelineList.classList.remove("empty-state");
  dom.timelineList.innerHTML = items
    .map(
      (item) => `
        <article class="timeline-item">
          <div class="timeline-dot ${item.type}"></div>
          <div class="timeline-copy">
            <strong>${escapeHtml(item.title)}</strong>
            <p>${escapeHtml(item.subtitle)}</p>
          </div>
          <div class="timeline-side">
            <strong>${escapeHtml(item.dateLabel)}</strong>
            <small>${escapeHtml(item.amountLabel)}</small>
          </div>
        </article>
      `
    )
    .join("");
}

function buildUpcomingTimelineItems() {
  const today = stripTime(new Date());
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + 30);
  return state.records
    .flatMap((record) => {
      if (getRecordStatus(record) === "cancelled" || getRecordStatus(record) === "completed") {
        return [];
      }
      if (isInstallment(record)) {
        const progress = getInstallmentProgress(record);
        if (!progress.nextDueDate) {
          return [];
        }
        const dueDate = new Date(progress.nextDueDate);
        if (dueDate < today || dueDate > horizon) {
          return [];
        }
        return [{
          title: `${record.merchant} · ${record.productName}`,
          subtitle: "Taksit ödemesi",
          amountLabel: formatCurrency(record.monthlyInstallment),
          dateLabel: formatDate(progress.nextDueDate),
          type: "installment",
          date: dueDate.getTime()
        }];
      }

      if (isTrialRecord(record)) {
        return [];
      }
      const dueDate = new Date(record.nextPaymentDate);
      if (dueDate < today || dueDate > horizon) {
        return [];
      }
      return [{
        title: record.name,
        subtitle: `${record.category} · ${cycleSuffix(record.billingCycle)}`,
        amountLabel: formatMoney(record.price, record.currency),
        dateLabel: formatDate(record.nextPaymentDate),
        type: "subscription",
        date: dueDate.getTime()
      }];
    })
    .sort((a, b) => a.date - b.date);
}

function buildCashflowCalendarDays() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: totalDays }, (_, index) => {
    const date = new Date(year, month, index + 1);
    return {
      date,
      dayLabel: `${index + 1} ${date.toLocaleDateString("tr-TR", { weekday: "short" })}`,
      total: 0,
      items: [],
      trials: [],
      offset: daysBetween(todayIso(), toIsoDate(date))
    };
  });

  state.records.forEach((record) => {
    if (isInstallment(record)) {
      const progress = getInstallmentProgress(record);
      if (!progress.nextDueDate) {
        return;
      }
      const due = new Date(progress.nextDueDate);
      if (due.getFullYear() === year && due.getMonth() === month) {
        const day = days[due.getDate() - 1];
        day.total += convertToTl(record.monthlyInstallment, record.currency);
        day.items.push(`${record.merchant} taksiti`);
      }
      return;
    }

    if (isTrialRecord(record) && record.trialEndDate) {
      const trialDate = new Date(record.trialEndDate);
      if (trialDate.getFullYear() === year && trialDate.getMonth() === month) {
        days[trialDate.getDate() - 1].trials.push(`${record.name} deneme bitişi`);
      }
      return;
    }

    const due = new Date(record.nextPaymentDate);
    if (due.getFullYear() === year && due.getMonth() === month) {
      const day = days[due.getDate() - 1];
      day.total += convertToTl(record.price, record.currency);
      day.items.push(record.name);
    }
  });

  return days;
}

function buildMonthReasonBreakdown() {
  const current = state.records.map((record) => ({
    id: record.id,
    name: getRecordDisplayTitle(record),
    total: getMonthlyOccurrenceTl(record, new Date().getFullYear(), new Date().getMonth())
  }));
  const previousDate = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
  const previous = Object.fromEntries(
    state.records.map((record) => [
      record.id,
      getMonthlyOccurrenceTl(record, previousDate.getFullYear(), previousDate.getMonth())
    ])
  );
  const deltas = current.map((item) => ({
    ...item,
    delta: item.total - Number(previous[item.id] || 0)
  }));
  return {
    increases: deltas.filter((item) => item.delta > 0).sort((a, b) => b.delta - a.delta),
    decreases: deltas.filter((item) => item.delta < 0).sort((a, b) => a.delta - b.delta)
  };
}

function buildWrappedSummary() {
  const currentYear = new Date().getFullYear();
  const yearlySpent = sum(
    state.payments
      .filter((payment) => new Date(payment.paidAt).getFullYear() === currentYear)
      .map((payment) => payment.tlAmountAtPayment)
  ) || sum(state.records.map((record) => calculateAnnualTl(record)));
  const paidRecords = state.records.filter((record) => calculateAnnualTl(record) > 0);
  const topService = [...paidRecords].sort((a, b) => calculateAnnualTl(b) - calculateAnnualTl(a))[0];
  const mostUsed = [...state.records].sort((a, b) => usageRank(a.usageFrequency) - usageRank(b.usageFrequency))[0];
  const archiveSavings = sum(state.archives.map((item) => item.annualSavingsTl));
  const distinctServices = new Set(state.records.map((record) => getRecordPrimaryName(record))).size;
  const monthlyTrend = buildTrendData(state.records);
  const topMonth = [...monthlyTrend].sort((a, b) => b.total - a.total)[0];
  return [
    {
      title: "Toplam yıllık harcama",
      value: formatCurrency(yearlySpent),
      note: "Bu yıl ödediğin ya da projekte ettiğin toplam etki."
    },
    {
      title: "En pahalı servis",
      value: topService ? getRecordDisplayTitle(topService) : "Yok",
      note: topService ? `${formatCurrency(calculateAnnualTl(topService))} ile ilk sırada.` : "Henüz ücretli kayıt yok."
    },
    {
      title: "En çok kullanılan",
      value: mostUsed ? getRecordDisplayTitle(mostUsed) : "Yok",
      note: mostUsed ? `${usageLabel(mostUsed.usageFrequency)} olarak işaretlenmiş.` : "Kayıt bulunmuyor."
    },
    {
      title: "İptal ederek biriktirilen",
      value: formatCurrency(archiveSavings),
      note: "Arşive taşıdığın kayıtların yıllık tahmini tasarrufu."
    },
    {
      title: "Farklı servis sayısı",
      value: `${distinctServices}`,
      note: "Yıl boyunca ödeme yaptığın farklı servis/mağaza sayısı."
    },
    {
      title: "En yoğun ay",
      value: topMonth ? topMonth.label : "-",
      note: topMonth ? `${formatCurrency(topMonth.total)} ile zirvede.` : "Trend verisi yok."
    }
  ];
}

function buildAuditItems() {
  return state.records
    .filter((record) => !isInstallment(record) && getRecordStatus(record) !== "cancelled")
    .map((record) => {
      const staleDays = record.lastUsedDate ? daysBetween(record.lastUsedDate, todayIso()) : 0;
      const reasons = [];
      if (staleDays >= 60) {
        reasons.push(`${staleDays} gündür kullanılmadı`);
      }
      if (record.isPriceIncreased) {
        reasons.push("son dönemde zamlandı");
      }
      if (isTrialRecord(record) && record.trialEndDate && daysBetween(todayIso(), record.trialEndDate) <= 7) {
        reasons.push("deneme bitişi yaklaşıyor");
      }
      if (!reasons.length) {
        return null;
      }
      return {
        id: record.id,
        title: getRecordDisplayTitle(record),
        reason: reasons.join(" • ")
      };
    })
    .filter(Boolean)
    .slice(0, 6);
}

function isAuditReminderDue() {
  if (state.settings.snoozedAuditUntil && new Date(state.settings.snoozedAuditUntil) > stripTime(new Date())) {
    return false;
  }
  if (!state.settings.lastAuditPrompt) {
    return true;
  }
  const months = Number(state.settings.auditReminderMonths || DEFAULT_SETTINGS.auditReminderMonths);
  const next = new Date(state.settings.lastAuditPrompt);
  next.setMonth(next.getMonth() + months);
  return stripTime(new Date()) >= stripTime(next);
}

function usageRank(value) {
  return { high: 0, medium: 1, low: 2, unused: 3 }[value] ?? 4;
}

function setDisplayMode(mode) {
  state.displayMode = mode === "yearly" ? "yearly" : "monthly";
  window.localStorage.setItem("abonelik-view-mode", state.displayMode);
  renderAll();
}

function updateViewModeControls() {
  dom.monthlyViewBtn.classList.toggle("is-active", state.displayMode === "monthly");
  dom.yearlyViewBtn.classList.toggle("is-active", state.displayMode === "yearly");
}

function maybeShowOnboarding() {
  const seen = window.localStorage.getItem("abonelik-onboarding-seen");
  if (seen) {
    return;
  }
  state.onboardingStep = 0;
  renderOnboardingStep();
  dom.onboardingDialog.showModal();
  syncSheetState();
}

function renderOnboardingStep() {
  const step = ONBOARDING_STEPS[state.onboardingStep] || ONBOARDING_STEPS[0];
  dom.onboardingTitle.textContent = step.title;
  dom.onboardingBody.textContent = step.body;
  dom.nextOnboardingBtn.textContent = state.onboardingStep === ONBOARDING_STEPS.length - 1 ? "Başla" : "Devam";
}

function advanceOnboarding() {
  if (state.onboardingStep >= ONBOARDING_STEPS.length - 1) {
    completeOnboarding();
    return;
  }
  state.onboardingStep += 1;
  renderOnboardingStep();
}

function completeOnboarding() {
  window.localStorage.setItem("abonelik-onboarding-seen", "1");
  dom.onboardingDialog.close();
  syncSheetState();
}

function showToast(message) {
  const existing = document.querySelector(".toast");
  if (existing) {
    existing.remove();
  }
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.append(toast);
  setTimeout(() => toast.remove(), 2600);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
