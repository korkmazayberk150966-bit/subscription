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
  notificationsEnabled: false,
  darkModePreferred: false,
  theme: "light",
  lastRateSync: "",
  lastRateSource: "manual",
  notifiedAlerts: {}
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
  activeTab: "overview"
};

const $ = (selector) => document.querySelector(selector);

const dom = {
  monthlyTotal: $("#monthlyTotal"),
  monthlySubscriptionsTotal: $("#monthlySubscriptionsTotal"),
  monthlyInstallmentsTotal: $("#monthlyInstallmentsTotal"),
  yearlyProjection: $("#yearlyProjection"),
  budgetStatus: $("#budgetStatus"),
  upcomingCount: $("#upcomingCount"),
  appHeaderTitle: $("#appHeaderTitle"),
  appHeaderMeta: $("#appHeaderMeta"),
  alertBadge: $("#alertBadge"),
  alertsList: $("#alertsList"),
  categoryLegendSummary: $("#categoryLegendSummary"),
  categoryLegend: $("#categoryLegend"),
  expensiveList: $("#expensiveList"),
  cancellationList: $("#cancellationList"),
  yearSummaryLabel: $("#yearSummaryLabel"),
  yearSummary: $("#yearSummary"),
  archiveSummary: $("#archiveSummary"),
  subscriptionsList: $("#subscriptionsList"),
  paymentsList: $("#paymentsList"),
  settingsForm: $("#settingsForm"),
  refreshRatesBtn: $("#refreshRatesBtn"),
  ratesMeta: $("#ratesMeta"),
  requestNotificationBtn: $("#requestNotificationBtn"),
  exportBtn: $("#exportBtn"),
  importInput: $("#importInput"),
  statusFilter: $("#statusFilter"),
  searchInput: $("#searchInput"),
  addSubscriptionBtn: $("#addSubscriptionBtn"),
  headerAddBtn: $("#headerAddBtn"),
  fabAddBtn: $("#fabAddBtn"),
  quickLogBtn: $("#quickLogBtn"),
  installBanner: $("#installBanner"),
  installBtn: $("#installBtn"),
  subscriptionDialog: $("#subscriptionDialog"),
  subscriptionForm: $("#subscriptionForm"),
  dialogTitle: $("#dialogTitle"),
  closeDialogBtn: $("#closeDialogBtn"),
  resetFormBtn: $("#resetFormBtn"),
  archiveBtn: $("#archiveBtn"),
  recordTypeSelect: $("#recordTypeSelect"),
  catalogSelect: $("#catalogSelect"),
  subscriptionFields: $("#subscriptionFields"),
  installmentFields: $("#installmentFields"),
  paymentDialog: $("#paymentDialog"),
  paymentForm: $("#paymentForm"),
  paymentSubscriptionSelect: $("#paymentSubscriptionSelect"),
  closePaymentDialogBtn: $("#closePaymentDialogBtn"),
  categoryChart: $("#categoryChart"),
  trendChart: $("#trendChart"),
  subscriptionCardTemplate: $("#subscriptionCardTemplate"),
  detailPreviewCard: $("#detailPreviewCard"),
  detailPreviewLogo: $("#detailPreviewLogo"),
  detailPreviewType: $("#detailPreviewType"),
  detailPreviewTitle: $("#detailPreviewTitle"),
  detailPreviewPrice: $("#detailPreviewPrice"),
  tabButtons: Array.from(document.querySelectorAll(".tab-button")),
  tabPanels: Array.from(document.querySelectorAll("[data-tab-panel]"))
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  await Promise.all([loadCatalog(), initDatabase()]);
  bindEvents();
  await loadState();
  applyTheme("light");
  populateCatalogSelect();
  populateSettingsForm();
  populatePaymentSubscriptions();
  renderAll();
  setActiveTab(state.activeTab);
  maybeShowInstallHint();
  await registerServiceWorker();
  maybeSendNotifications();
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
  dom.addSubscriptionBtn.addEventListener("click", () => openRecordDialog());
  dom.headerAddBtn.addEventListener("click", () => openRecordDialog());
  dom.fabAddBtn.addEventListener("click", () => openRecordDialog());
  dom.quickLogBtn.addEventListener("click", () => openPaymentDialog());
  dom.closeDialogBtn.addEventListener("click", () => dom.subscriptionDialog.close());
  dom.closePaymentDialogBtn.addEventListener("click", () => dom.paymentDialog.close());
  dom.resetFormBtn.addEventListener("click", resetRecordForm);
  dom.archiveBtn.addEventListener("click", handleArchiveCurrentRecord);
  dom.subscriptionForm.addEventListener("submit", handleRecordSubmit);
  dom.paymentForm.addEventListener("submit", handlePaymentSubmit);
  dom.settingsForm.addEventListener("submit", handleSettingsSubmit);
  dom.refreshRatesBtn.addEventListener("click", refreshLiveRates);
  dom.requestNotificationBtn.addEventListener("click", requestNotificationPermission);
  dom.exportBtn.addEventListener("click", exportData);
  dom.importInput.addEventListener("change", importData);
  dom.statusFilter.addEventListener("change", renderRecords);
  dom.searchInput.addEventListener("input", renderRecords);
  dom.catalogSelect.addEventListener("change", handleCatalogSelection);
  dom.recordTypeSelect.addEventListener("change", syncFormMode);
  dom.paymentSubscriptionSelect.addEventListener("change", autoFillPaymentAmount);
  dom.installBtn.addEventListener("click", triggerInstallPrompt);
  dom.subscriptionForm.addEventListener("input", handleFormLiveUpdates);
  dom.tabButtons.forEach((button) => {
    button.addEventListener("click", () => setActiveTab(button.dataset.tabTarget));
  });
  [dom.subscriptionDialog, dom.paymentDialog].forEach((dialog) => {
    dialog.addEventListener("close", syncSheetState);
    dialog.addEventListener("cancel", syncSheetState);
  });

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    state.deferredPrompt = event;
    dom.installBanner.classList.remove("hidden");
  });

  dom.subscriptionsList.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) {
      return;
    }
    const card = button.closest(".subscription-card");
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
}

function populateCatalogSelect() {
  dom.catalogSelect.innerHTML = '<option value="">Elle doldur</option>';
  state.catalog.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.name;
    option.textContent = `${item.name} • ${item.category}`;
    dom.catalogSelect.append(option);
  });
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
  dom.catalogSelect.value = "";
  syncFormMode();
  updateDetailPreview();
}

function openRecordDialog(record = null) {
  state.editingId = record?.id || null;
  dom.dialogTitle.textContent = record ? "Kaydı Düzenle" : "Yeni Kayıt";
  dom.archiveBtn.classList.toggle("hidden", !record);
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
  updateDetailPreview();
  dom.subscriptionDialog.showModal();
  syncSheetState();
}

function openPaymentDialog(recordId = null) {
  if (!state.records.length) {
    showToast("Ödeme kaydı için önce bir kayıt eklemelisin.");
    return;
  }
  dom.paymentForm.reset();
  state.activePaymentSubscriptionId = recordId || state.records[0].id;
  populatePaymentSubscriptions();
  setFieldValue("paidAt", todayIso(), dom.paymentForm);
  autoFillPaymentAmount();
  dom.paymentDialog.showModal();
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
  updateDetailPreview();
}

function getFieldValue(name, form = dom.subscriptionForm) {
  return form.elements.namedItem(name)?.value || "";
}

function syncFormMode() {
  const installmentMode = dom.recordTypeSelect.value === "installment";
  dom.subscriptionFields.classList.toggle("hidden", installmentMode);
  dom.installmentFields.classList.toggle("hidden", !installmentMode);
  updateDetailPreview();
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

  const logoSvg = createLogoDataUri({ label: monogram, color, title, subtitle: installmentMode ? "TAKSİT" : "ABONE" });
  dom.detailPreviewLogo.style.background = color;
  dom.detailPreviewLogo.innerHTML = `<img src="${logoSvg}" alt="" />`;
  dom.detailPreviewType.textContent = installmentMode ? "Taksitli alışveriş" : "Abonelik";
  dom.detailPreviewTitle.textContent = product ? `${title} · ${product}` : title;
  dom.detailPreviewPrice.textContent = priceLine;
}

function buildSubscriptionPreviewLine() {
  const amount = Number(getFieldValue("price")) || 0;
  const currency = getFieldValue("currency") || "TRY";
  const cycle = CYCLE_LABELS[getFieldValue("billingCycle")] || "Aylık";
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
    record = normalizeRecord({
      id: existing?.id || createId("rec"),
      recordType: "subscription",
      name: normalizeText(formData.get("name")),
      price: Number(formData.get("price")),
      currency: formData.get("currency"),
      billingCycle: formData.get("billingCycle"),
      nextPaymentDate: formData.get("nextPaymentDate"),
      trialEndDate: formData.get("trialEndDate") || "",
      category: normalizeText(formData.get("category")),
      paymentMethod: normalizeText(formData.get("paymentMethod")),
      status: formData.get("status"),
      icon: normalizeText(formData.get("icon")).slice(0, 2) || guessMonogram(formData.get("name")),
      color: formData.get("color"),
      notes: normalizeText(formData.get("notes")),
      valueScore: Number(formData.get("valueScore") || 3),
      lastUsedDate: formData.get("lastUsedDate") || "",
      usageFrequency: formData.get("usageFrequency") || "medium",
      isPriceIncreased: formData.get("isPriceIncreased") === "on",
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    if (!record.name || !record.category || !record.nextPaymentDate || Number.isNaN(record.price)) {
      showToast("Lütfen zorunlu alanları doldur.");
      return;
    }
  }

  await putRecord("subscriptions", record);
  await loadState();
  populatePaymentSubscriptions();
  renderAll();
  dom.subscriptionDialog.close();
  syncSheetState();
  showToast(existing ? "Kayıt güncellendi." : "Kayıt eklendi.");
}

async function handleArchiveCurrentRecord() {
  if (!state.editingId) {
    return;
  }
  const record = state.records.find((item) => item.id === state.editingId);
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
  dom.subscriptionDialog.close();
  syncSheetState();
  showToast("Kayıt arşive taşındı.");
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
  const formData = new FormData(dom.paymentForm);
  const recordId = formData.get("subscriptionId");
  const record = state.records.find((item) => item.id === recordId);
  if (!record) {
    showToast("Geçerli kayıt seçilemedi.");
    return;
  }
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
    notificationsEnabled: formData.get("notificationsEnabled") === "on",
    darkModePreferred: false,
    theme: "light"
  };
  applyTheme("light");
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
  const monthlySubscriptions = sum(activeSubscriptions.map((item) => calculateMonthlyTl(item)));
  const monthlyInstallments = sum(activeInstallments.map((item) => calculateMonthlyTl(item)));
  const monthlyTotal = monthlySubscriptions + monthlyInstallments;
  const yearlyTotal = sum(state.records.map((item) => calculateAnnualTl(item)));
  const alerts = buildAlerts();
  const budgetTarget = Number(state.settings.monthlyBudget || 0);

  dom.monthlyTotal.textContent = formatCurrency(monthlyTotal);
  dom.monthlySubscriptionsTotal.textContent = formatCurrency(monthlySubscriptions);
  dom.monthlyInstallmentsTotal.textContent = formatCurrency(monthlyInstallments);
  dom.yearlyProjection.textContent = formatCurrency(yearlyTotal);
  dom.upcomingCount.textContent = String(alerts.filter((item) => item.type !== "budget").length);
  dom.budgetStatus.textContent = budgetTarget
    ? `${formatCurrency(monthlyTotal)} / ${formatCurrency(budgetTarget)}`
    : "Hedef yok";

  renderCategoryChart(state.records);
  renderTrendChart(state.records);
  renderTopExpensive(state.records);
  renderCancellationCandidates(activeSubscriptions);
  renderYearSummary(yearlyTotal);
  renderArchiveSummary();
}

function renderAlerts() {
  const alerts = buildAlerts();
  dom.alertBadge.textContent = String(alerts.length);
  dom.alertsList.innerHTML = "";
  if (!alerts.length) {
    dom.alertsList.textContent = "Şu an dikkat gerektiren bir durum yok.";
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

  dom.subscriptionsList.innerHTML = "";
  if (!filtered.length) {
    dom.subscriptionsList.textContent = "Filtreye uyan kayıt yok.";
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
    }

    node.querySelector(".subscription-notes").textContent =
      record.notes || getDefaultNotes(record);

    dom.subscriptionsList.append(node);
  });
}

function renderPayments() {
  dom.paymentsList.innerHTML = "";
  if (!state.payments.length) {
    dom.paymentsList.textContent = "Henüz manuel ödeme kaydı yok.";
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
    dom.expensiveList.textContent = "Gösterilecek veri yok.";
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
    dom.cancellationList.textContent = "İptal adayı hesaplanacak veri yok.";
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
    if (record.trialEndDate) {
      const trialDays = daysBetween(today, record.trialEndDate);
      if (trialDays >= 0 && trialDays <= state.settings.trialReminderDays) {
        alerts.push({
          id: `trial-${record.id}-${record.trialEndDate}`,
          type: "trial",
          severity: "critical",
          badge: `${trialDays} gün`,
          title: `${record.name} deneme süresi bitiyor`,
          message: `Deneme süresi ${formatDate(record.trialEndDate)} tarihinde sona eriyor.`
        });
      }
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
  return alerts.sort((a, b) => severityScore(b.severity) - severityScore(a.severity));
}

function maybeSendNotifications() {
  if (!("Notification" in window) || Notification.permission !== "granted" || !state.settings.notificationsEnabled) {
    return;
  }
  const todayKey = todayIso();
  const alerts = buildAlerts();
  const notified = state.settings.notifiedAlerts || {};
  let changed = false;

  alerts.forEach((alert) => {
    const key = `${todayKey}:${alert.id}`;
    if (notified[key]) {
      return;
    }
    new Notification(alert.title, { body: alert.message, icon: "./assets/icons/icon-192.png" });
    notified[key] = true;
    changed = true;
  });

  if (changed) {
    state.settings.notifiedAlerts = notified;
    putRecord("settings", state.settings);
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
    applyTheme("light");
    showToast("Yedek başarıyla geri yüklendi.");
  } catch (error) {
    console.error(error);
    showToast("Yedek yüklenemedi.");
  } finally {
    event.target.value = "";
  }
}

function applyTheme(theme) {
  document.body.dataset.theme = "light";
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
    overview: { title: "Özet", meta: "Bugünün özeti" },
    subscriptions: { title: "Abonelikler", meta: "Abonelikler ve taksitler" },
    analytics: { title: "Analiz", meta: "Maliyet görünümü" },
    settings: { title: "Ayarlar", meta: "Tercihler ve yedek" }
  }[state.activeTab] || { title: "Abonelik Takibi", meta: "Hazır" };

  dom.appHeaderTitle.textContent = config.title;
  dom.appHeaderMeta.textContent = config.meta;
}

function updateFabVisibility() {
  const hidden = state.activeTab === "settings" || state.activeTab === "analytics";
  dom.fabAddBtn.classList.toggle("is-hidden", hidden);
}

function syncSheetState() {
  document.body.classList.toggle(
    "sheet-open",
    Boolean(dom.subscriptionDialog?.open) || Boolean(dom.paymentDialog?.open)
  );
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }
  try {
    await navigator.serviceWorker.register("./sw.js");
  } catch (error) {
    console.error("Service worker kaydedilemedi", error);
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
    backIter.setTime(addCycle(backIter, record.billingCycle, false).getTime());
    if (backIter.getFullYear() < year || (backIter.getFullYear() === year && backIter.getMonth() < month)) {
      break;
    }
  }
  return 0;
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
  ctx.font = "700 18px App Serif, Georgia, serif";
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
  ctx.font = "12px App Sans, Segoe UI, sans-serif";
  ctx.fillText("6 ay", padding, height - 8);
  ctx.fillText(formatCurrencyShort(max), width - padding - 42, 18);
}

function drawEmptyCanvasState(ctx, width, height, label) {
  ctx.save();
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--muted");
  ctx.font = "14px App Sans, Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, width / 2, height / 2);
  ctx.restore();
}

function calculateMonthlyTl(record) {
  if (isInstallment(record)) {
    const progress = getInstallmentProgress(record);
    return progress.started && !progress.completed ? convertToTl(record.monthlyInstallment, record.currency) : 0;
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
    return `Aylık ${formatCurrency(record.monthlyInstallment)} · ${progress.displayInstallment}/${progress.totalInstallments} taksit`;
  }
  return `${formatMoney(record.price, record.currency)} · ${cycleSuffix(record.billingCycle)}`;
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
  return [
    ["Aylık", formatCurrency(calculateMonthlyTl(record))],
    ["Yıllık", formatCurrency(calculateAnnualTl(record))],
    ["Günlük", formatCurrency(calculateDailyTl(record))],
    ["Sonraki", formatDate(record.nextPaymentDate)]
  ];
}

function getDefaultNotes(record) {
  if (isInstallment(record)) {
    const progress = getInstallmentProgress(record);
    return `${record.merchant} alışverişi • ${progress.displayInstallment}/${progress.totalInstallments} taksit • Tamamlanınca otomatik düşer`;
  }
  return `Kullanım: ${usageLabel(record.usageFrequency)} • Değer puanı: ${record.valueScore}/5 • İptalde yıllık tasarruf ${formatCurrency(calculateAnnualTl(record))}`;
}

function renderRecordLogo(node, record) {
  const img = node.querySelector(".subscription-logo");
  const fallback = node.querySelector(".subscription-icon");
  const monogram = record.icon || guessMonogram(getRecordPrimaryName(record));
  const title = getRecordPrimaryName(record);
  const subtitle = isInstallment(record) ? "TR" : record.category;
  const svgData = createLogoDataUri({
    label: monogram,
    color: record.color || getCategoryColor(record.category),
    title,
    subtitle
  });
  img.src = svgData;
  img.classList.remove("hidden");
  img.alt = `${title} logosu`;
  fallback.classList.add("hidden");
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
  return `${prefix}-${crypto.randomUUID()}`;
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

function toIsoDate(date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function severityScore(value) {
  return { critical: 3, info: 2 }[value] || 1;
}

function getCategoryColor(category) {
  const palette = ["#0A66D9", "#13B7C9", "#0D9476", "#5CAEFF", "#325AD7", "#7BC4FF", "#0053A0"];
  const hash = Array.from(category || "").reduce((total, char) => total + char.charCodeAt(0), 0);
  return palette[hash % palette.length];
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
