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
  notifiedAlerts: {}
};

const STATUS_LABELS = {
  active: "Aktif",
  trial: "Deneme",
  paused: "Duraklatildi",
  cancelled: "Iptal"
};

const STATUS_COLORS = {
  active: "var(--success)",
  trial: "var(--warning)",
  paused: "var(--accent)",
  cancelled: "var(--danger)"
};

const CYCLE_LABELS = {
  weekly: "Haftalik",
  monthly: "Aylik",
  quarterly: "3 Aylik",
  yearly: "Yillik"
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
  subscriptions: [],
  payments: [],
  archives: [],
  settings: { ...DEFAULT_SETTINGS },
  editingId: null,
  deferredPrompt: null,
  activePaymentSubscriptionId: null
};

const $ = (selector) => document.querySelector(selector);

const dom = {
  monthlyTotal: $("#monthlyTotal"),
  yearlyProjection: $("#yearlyProjection"),
  budgetStatus: $("#budgetStatus"),
  upcomingCount: $("#upcomingCount"),
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
  requestNotificationBtn: $("#requestNotificationBtn"),
  exportBtn: $("#exportBtn"),
  importInput: $("#importInput"),
  statusFilter: $("#statusFilter"),
  searchInput: $("#searchInput"),
  addSubscriptionBtn: $("#addSubscriptionBtn"),
  quickLogBtn: $("#quickLogBtn"),
  themeToggle: $("#themeToggle"),
  installBanner: $("#installBanner"),
  installBtn: $("#installBtn"),
  subscriptionDialog: $("#subscriptionDialog"),
  subscriptionForm: $("#subscriptionForm"),
  dialogTitle: $("#dialogTitle"),
  closeDialogBtn: $("#closeDialogBtn"),
  resetFormBtn: $("#resetFormBtn"),
  archiveBtn: $("#archiveBtn"),
  catalogSelect: $("#catalogSelect"),
  paymentDialog: $("#paymentDialog"),
  paymentForm: $("#paymentForm"),
  paymentSubscriptionSelect: $("#paymentSubscriptionSelect"),
  closePaymentDialogBtn: $("#closePaymentDialogBtn"),
  categoryChart: $("#categoryChart"),
  trendChart: $("#trendChart"),
  subscriptionCardTemplate: $("#subscriptionCardTemplate")
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  await Promise.all([loadCatalog(), initDatabase()]);
  bindEvents();
  await loadState();
  applyTheme(state.settings.theme || "light");
  populateCatalogSelect();
  populateSettingsForm();
  populatePaymentSubscriptions();
  renderAll();
  maybeShowInstallHint();
  await registerServiceWorker();
  maybeSendNotifications();
}

async function loadCatalog() {
  try {
    const response = await fetch("./data/catalog.json");
    state.catalog = await response.json();
  } catch (error) {
    console.error("Katalog yuklenemedi", error);
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
  const [subscriptions, payments, archives, settings] = await Promise.all([
    getAll("subscriptions"),
    getAll("payments"),
    getAll("archives"),
    getRecord("settings", DEFAULT_SETTINGS.id)
  ]);

  state.subscriptions = subscriptions.sort((a, b) => a.name.localeCompare(b.name, "tr"));
  state.payments = payments.sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt));
  state.archives = archives.sort((a, b) => new Date(b.archivedAt) - new Date(a.archivedAt));
  state.settings = { ...DEFAULT_SETTINGS, ...(settings || {}) };

  if (!settings) {
    await putRecord("settings", state.settings);
  }
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
  dom.addSubscriptionBtn.addEventListener("click", () => openSubscriptionDialog());
  dom.quickLogBtn.addEventListener("click", () => openPaymentDialog());
  dom.closeDialogBtn.addEventListener("click", () => dom.subscriptionDialog.close());
  dom.closePaymentDialogBtn.addEventListener("click", () => dom.paymentDialog.close());
  dom.resetFormBtn.addEventListener("click", resetSubscriptionForm);
  dom.archiveBtn.addEventListener("click", handleArchiveCurrentSubscription);
  dom.subscriptionForm.addEventListener("submit", handleSubscriptionSubmit);
  dom.paymentForm.addEventListener("submit", handlePaymentSubmit);
  dom.settingsForm.addEventListener("submit", handleSettingsSubmit);
  dom.requestNotificationBtn.addEventListener("click", requestNotificationPermission);
  dom.exportBtn.addEventListener("click", exportData);
  dom.importInput.addEventListener("change", importData);
  dom.statusFilter.addEventListener("change", renderSubscriptions);
  dom.searchInput.addEventListener("input", renderSubscriptions);
  dom.themeToggle.addEventListener("click", toggleTheme);
  dom.catalogSelect.addEventListener("change", handleCatalogSelection);
  dom.paymentSubscriptionSelect.addEventListener("change", autoFillPaymentAmount);
  dom.installBtn.addEventListener("click", triggerInstallPrompt);

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
    const subscription = state.subscriptions.find((item) => item.id === id);
    if (!subscription) {
      return;
    }

    if (action === "edit") {
      openSubscriptionDialog(subscription);
    } else if (action === "log") {
      openPaymentDialog(subscription.id);
    } else if (action === "delete") {
      await handleDeleteSubscription(subscription);
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
  const currentValue = state.activePaymentSubscriptionId || state.subscriptions[0]?.id || "";
  dom.paymentSubscriptionSelect.innerHTML = "";
  if (!state.subscriptions.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Once abonelik ekle";
    dom.paymentSubscriptionSelect.append(option);
    return;
  }

  state.subscriptions.forEach((subscription) => {
    const option = document.createElement("option");
    option.value = subscription.id;
    option.textContent = subscription.name;
    if (subscription.id === currentValue) {
      option.selected = true;
    }
    dom.paymentSubscriptionSelect.append(option);
  });

  autoFillPaymentAmount();
}

function populateSettingsForm() {
  const { settingsForm } = dom;
  Object.entries(state.settings).forEach(([key, value]) => {
    const field = settingsForm.elements.namedItem(key);
    if (!field) {
      return;
    }
    if (field.type === "checkbox") {
      field.checked = Boolean(value);
    } else {
      field.value = value;
    }
  });
}

function resetSubscriptionForm() {
  dom.subscriptionForm.reset();
  dom.subscriptionForm.elements.namedItem("currency").value = "TRY";
  dom.subscriptionForm.elements.namedItem("billingCycle").value = "monthly";
  dom.subscriptionForm.elements.namedItem("status").value = "active";
  dom.subscriptionForm.elements.namedItem("valueScore").value = "3";
  dom.subscriptionForm.elements.namedItem("usageFrequency").value = "medium";
  dom.subscriptionForm.elements.namedItem("color").value = "#0A66D9";
  dom.subscriptionForm.elements.namedItem("icon").value = "A";
  dom.subscriptionForm.elements.namedItem("nextPaymentDate").value = todayIso();
  dom.catalogSelect.value = "";
}

function openSubscriptionDialog(subscription = null) {
  state.editingId = subscription?.id || null;
  dom.dialogTitle.textContent = subscription ? "Aboneligi Duzenle" : "Yeni Abonelik";
  dom.archiveBtn.classList.toggle("hidden", !subscription);
  resetSubscriptionForm();

  if (subscription) {
    setFormValues(dom.subscriptionForm, subscription);
  }

  dom.subscriptionDialog.showModal();
}

function openPaymentDialog(subscriptionId = null) {
  if (!state.subscriptions.length) {
    showToast("Odeme kaydi icin once abonelik eklemelisin.");
    return;
  }

  dom.paymentForm.reset();
  state.activePaymentSubscriptionId = subscriptionId || state.subscriptions[0].id;
  populatePaymentSubscriptions();
  dom.paymentForm.elements.namedItem("paidAt").value = todayIso();
  autoFillPaymentAmount();
  dom.paymentDialog.showModal();
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

async function handleSubscriptionSubmit(event) {
  event.preventDefault();
  const formData = new FormData(dom.subscriptionForm);
  const existing = state.subscriptions.find((item) => item.id === state.editingId);

  const subscription = {
    id: existing?.id || createId("sub"),
    name: normalizeText(formData.get("name")),
    price: Number(formData.get("price")),
    currency: formData.get("currency"),
    billingCycle: formData.get("billingCycle"),
    nextPaymentDate: formData.get("nextPaymentDate"),
    category: normalizeText(formData.get("category")),
    paymentMethod: normalizeText(formData.get("paymentMethod")),
    status: formData.get("status"),
    color: formData.get("color"),
    icon: normalizeText(formData.get("icon")).slice(0, 2) || "A",
    notes: normalizeText(formData.get("notes")),
    valueScore: Number(formData.get("valueScore") || 3),
    lastUsedDate: formData.get("lastUsedDate") || "",
    usageFrequency: formData.get("usageFrequency") || "medium",
    isPriceIncreased: formData.get("isPriceIncreased") === "on",
    trialEndDate: formData.get("trialEndDate") || "",
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (!subscription.name || !subscription.category || !subscription.nextPaymentDate || Number.isNaN(subscription.price)) {
    showToast("Lutfen zorunlu alanlari doldur.");
    return;
  }

  await putRecord("subscriptions", subscription);
  await loadState();
  populatePaymentSubscriptions();
  renderAll();
  dom.subscriptionDialog.close();
  showToast(existing ? "Abonelik guncellendi." : "Abonelik eklendi.");
}

async function handleArchiveCurrentSubscription() {
  if (!state.editingId) {
    return;
  }

  const subscription = state.subscriptions.find((item) => item.id === state.editingId);
  if (!subscription) {
    return;
  }

  const archiveItem = {
    id: createId("archive"),
    archivedAt: new Date().toISOString(),
    annualSavingsTl: calculateAnnualTl(subscription),
    snapshot: {
      ...subscription,
      status: "cancelled"
    }
  };

  await putRecord("archives", archiveItem);
  await deleteRecord("subscriptions", subscription.id);
  await loadState();
  populatePaymentSubscriptions();
  renderAll();
  dom.subscriptionDialog.close();
  showToast("Abonelik arsive tasindi.");
}

async function handleDeleteSubscription(subscription) {
  const confirmed = window.confirm(`${subscription.name} kalici olarak silinsin mi?`);
  if (!confirmed) {
    return;
  }

  await deleteRecord("subscriptions", subscription.id);
  const paymentsToDelete = state.payments.filter((payment) => payment.subscriptionId === subscription.id);
  await Promise.all(paymentsToDelete.map((payment) => deleteRecord("payments", payment.id)));
  await loadState();
  populatePaymentSubscriptions();
  renderAll();
  showToast("Abonelik silindi.");
}

async function handlePaymentSubmit(event) {
  event.preventDefault();
  const formData = new FormData(dom.paymentForm);
  const subscriptionId = formData.get("subscriptionId");
  const subscription = state.subscriptions.find((item) => item.id === subscriptionId);
  if (!subscription) {
    showToast("Gecerli abonelik secilemedi.");
    return;
  }

  const amount = Number(formData.get("amount"));
  const currency = formData.get("currency");
  const payment = {
    id: createId("pay"),
    subscriptionId,
    paidAt: formData.get("paidAt"),
    amount,
    currency,
    tlAmountAtPayment: convertToTl(amount, currency),
    note: normalizeText(formData.get("note"))
  };

  await putRecord("payments", payment);
  subscription.nextPaymentDate = addCycle(payment.paidAt, subscription.billingCycle);
  subscription.updatedAt = new Date().toISOString();
  await putRecord("subscriptions", subscription);
  await loadState();
  renderAll();
  dom.paymentDialog.close();
  showToast("Odeme kaydi eklendi.");
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
    darkModePreferred: formData.get("darkModePreferred") === "on",
    theme: formData.get("darkModePreferred") === "on" ? "dark" : "light"
  };

  applyTheme(state.settings.theme);

  await putRecord("settings", state.settings);
  renderAll();
  maybeSendNotifications();
  showToast("Ayarlar kaydedildi.");
}

function handleCatalogSelection() {
  const selected = state.catalog.find((item) => item.name === dom.catalogSelect.value);
  if (!selected) {
    return;
  }

  const defaults = {
    name: selected.name,
    category: selected.category,
    icon: selected.icon,
    color: selected.color,
    price: selected.price,
    currency: selected.currency,
    billingCycle: selected.billingCycle,
    nextPaymentDate: todayIso()
  };

  setFormValues(dom.subscriptionForm, defaults);
}

function autoFillPaymentAmount() {
  const subscription = state.subscriptions.find((item) => item.id === dom.paymentSubscriptionSelect.value);
  if (!subscription) {
    return;
  }

  dom.paymentForm.elements.namedItem("amount").value = subscription.price;
  dom.paymentForm.elements.namedItem("currency").value = subscription.currency;
}

function renderAll() {
  renderOverview();
  renderAlerts();
  renderSubscriptions();
  renderPayments();
  populateSettingsForm();
}

function renderOverview() {
  const activeSubscriptions = state.subscriptions.filter((item) => item.status !== "cancelled");
  const monthlyTotal = sum(activeSubscriptions.map((item) => calculateMonthlyTl(item)));
  const yearlyTotal = sum(activeSubscriptions.map((item) => calculateAnnualTl(item)));
  const alerts = buildAlerts();
  const budgetTarget = Number(state.settings.monthlyBudget || 0);

  dom.monthlyTotal.textContent = formatCurrency(monthlyTotal);
  dom.yearlyProjection.textContent = formatCurrency(yearlyTotal);
  dom.upcomingCount.textContent = String(alerts.filter((item) => item.type !== "budget").length);
  dom.budgetStatus.textContent = budgetTarget
    ? `${formatCurrency(monthlyTotal)} / ${formatCurrency(budgetTarget)}`
    : "Hedef yok";

  renderCategoryChart(activeSubscriptions);
  renderTrendChart(activeSubscriptions);
  renderTopExpensive(activeSubscriptions);
  renderCancellationCandidates(activeSubscriptions);
  renderYearSummary(yearlyTotal);
  renderArchiveSummary();
}

function renderAlerts() {
  const alerts = buildAlerts();
  dom.alertBadge.textContent = String(alerts.length);
  dom.alertsList.innerHTML = "";

  if (!alerts.length) {
    dom.alertsList.textContent = "Su an dikkat gerektiren bir durum yok.";
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

function renderSubscriptions() {
  const search = dom.searchInput.value.trim().toLocaleLowerCase("tr");
  const status = dom.statusFilter.value;
  const filtered = state.subscriptions.filter((item) => {
    const matchesStatus = status === "all" ? true : item.status === status;
    const haystack = `${item.name} ${item.category} ${item.paymentMethod} ${item.notes}`.toLocaleLowerCase("tr");
    const matchesSearch = search ? haystack.includes(search) : true;
    return matchesStatus && matchesSearch;
  });

  dom.subscriptionsList.innerHTML = "";
  if (!filtered.length) {
    dom.subscriptionsList.textContent = "Filtreye uyan abonelik yok.";
    dom.subscriptionsList.classList.add("empty-state");
    return;
  }

  dom.subscriptionsList.classList.remove("empty-state");
  filtered.forEach((subscription) => {
    const node = dom.subscriptionCardTemplate.content.firstElementChild.cloneNode(true);
    node.dataset.id = subscription.id;
    node.querySelector(".subscription-icon").textContent = subscription.icon || "A";
    node.querySelector(".subscription-icon").style.background = subscription.color;
    node.querySelector(".subscription-name").textContent = subscription.name;
    node.querySelector(".subscription-meta").textContent = `${subscription.category} • ${subscription.paymentMethod || "Odeme yontemi yok"}`;
    const pill = node.querySelector(".status-pill");
    pill.textContent = STATUS_LABELS[subscription.status] || subscription.status;
    pill.style.color = STATUS_COLORS[subscription.status];

    const stats = [
      ["Aylik", formatCurrency(calculateMonthlyTl(subscription))],
      ["Yillik", formatCurrency(calculateAnnualTl(subscription))],
      ["Gunluk", formatCurrency(calculateDailyTl(subscription))],
      ["Sonraki", formatDate(subscription.nextPaymentDate)]
    ];

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

    node.querySelector(".subscription-notes").textContent =
      subscription.notes ||
      `Kullanim: ${usageLabel(subscription.usageFrequency)} • Deger puani: ${subscription.valueScore}/5 • Iptalde yillik tasarruf ${formatCurrency(calculateAnnualTl(subscription))}`;

    dom.subscriptionsList.append(node);
  });
}

function renderPayments() {
  dom.paymentsList.innerHTML = "";
  if (!state.payments.length) {
    dom.paymentsList.textContent = "Henuz manuel odeme kaydi yok.";
    dom.paymentsList.classList.add("empty-state");
    return;
  }

  dom.paymentsList.classList.remove("empty-state");
  state.payments.slice(0, 20).forEach((payment) => {
    const subscription = state.subscriptions.find((item) => item.id === payment.subscriptionId);
    const article = document.createElement("article");
    article.className = "payment-item";
    article.innerHTML = `
      <div>
        <strong>${escapeHtml(subscription?.name || "Silinmis abonelik")}</strong>
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

function renderTopExpensive(subscriptions) {
  const topItems = [...subscriptions]
    .sort((a, b) => calculateAnnualTl(b) - calculateAnnualTl(a))
    .slice(0, 5);

  dom.expensiveList.innerHTML = "";
  if (!topItems.length) {
    dom.expensiveList.textContent = "Gosterilecek veri yok.";
    dom.expensiveList.classList.add("empty-state");
    return;
  }

  dom.expensiveList.classList.remove("empty-state");
  topItems.forEach((subscription, index) => {
    const row = document.createElement("article");
    row.className = "rank-item";
    row.innerHTML = `
      <div>
        <strong>${index + 1}. ${escapeHtml(subscription.name)}</strong>
        <small class="rank-subtitle">${escapeHtml(subscription.category)} • ${CYCLE_LABELS[subscription.billingCycle]}</small>
      </div>
      <strong>${formatCurrency(calculateAnnualTl(subscription))}</strong>
    `;
    dom.expensiveList.append(row);
  });
}

function renderCancellationCandidates(subscriptions) {
  const candidates = subscriptions
    .map((subscription) => ({
      subscription,
      score: calculateCancellationScore(subscription)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  dom.cancellationList.innerHTML = "";
  if (!candidates.length) {
    dom.cancellationList.textContent = "Iptal adayi hesaplanacak veri yok.";
    dom.cancellationList.classList.add("empty-state");
    return;
  }

  dom.cancellationList.classList.remove("empty-state");
  candidates.forEach(({ subscription, score }) => {
    const row = document.createElement("article");
    row.className = "rank-item";
    row.innerHTML = `
      <div>
        <strong>${escapeHtml(subscription.name)}</strong>
        <small class="rank-subtitle">${usageLabel(subscription.usageFrequency)} • Deger ${subscription.valueScore}/5 • Skor ${score.toFixed(0)}</small>
      </div>
      <strong>${formatCurrency(calculateAnnualTl(subscription))}</strong>
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
  const label = totalCount ? "Gerceklesmis" : "Tahmini";

  dom.yearSummaryLabel.textContent = `${currentYear} ozeti`;
  dom.yearSummary.innerHTML = [
    { title: `${label} harcama`, value: formatCurrency(totalCount ? actualSpent : projected) },
    { title: "Odeme kaydi", value: `${totalCount} adet` },
    { title: "Gunluk ortalama", value: formatCurrency((totalCount ? actualSpent : projected) / 365) },
    { title: "Aylik ortalama", value: formatCurrency((totalCount ? actualSpent : projected) / 12) }
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
    { title: "Toplam arsiv", value: `${state.archives.length} kayit` },
    { title: "Yillik tasarruf", value: formatCurrency(totalSavings) },
    { title: "Son iptal", value: lastArchived ? lastArchived.snapshot.name : "Yok" },
    { title: "Son arsiv tarihi", value: lastArchived ? formatDate(lastArchived.archivedAt) : "Yok" }
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

function renderCategoryChart(subscriptions) {
  const categoryTotals = {};
  subscriptions.forEach((subscription) => {
    categoryTotals[subscription.category] = (categoryTotals[subscription.category] || 0) + calculateMonthlyTl(subscription);
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
    : "Kategori dagilimi icin aktif abonelik ekle.";
}

function renderTrendChart(subscriptions) {
  const points = buildTrendData(subscriptions);
  drawLineChart(dom.trendChart, points.map((point) => point.total));
}

function buildAlerts() {
  const alerts = [];
  const today = stripTime(new Date());
  const monthlyTotal = sum(state.subscriptions.map((item) => calculateMonthlyTl(item)));
  const budgetTarget = Number(state.settings.monthlyBudget || 0);

  state.subscriptions.forEach((subscription) => {
    if (subscription.status === "cancelled") {
      return;
    }

    const paymentDays = daysBetween(today, subscription.nextPaymentDate);
    const annualTl = calculateAnnualTl(subscription);
    if (paymentDays >= 0 && paymentDays <= state.settings.renewalReminderDays) {
      alerts.push({
        id: `renewal-${subscription.id}-${subscription.nextPaymentDate}`,
        type: "renewal",
        severity: paymentDays <= 1 ? "critical" : "info",
        badge: `${paymentDays} gun`,
        title: `${subscription.name} odemesi yaklasiyor`,
        message: `${formatDate(subscription.nextPaymentDate)} tarihinde ${formatMoney(subscription.price, subscription.currency)} yenileme var.`
      });
    }

    if (subscription.trialEndDate) {
      const trialDays = daysBetween(today, subscription.trialEndDate);
      if (trialDays >= 0 && trialDays <= state.settings.trialReminderDays) {
        alerts.push({
          id: `trial-${subscription.id}-${subscription.trialEndDate}`,
          type: "trial",
          severity: "critical",
          badge: `${trialDays} gun`,
          title: `${subscription.name} deneme suresi bitiyor`,
          message: `Deneme suresi ${formatDate(subscription.trialEndDate)} tarihinde sona eriyor.`
        });
      }
    }

    if (annualTl >= state.settings.highAnnualThreshold && paymentDays >= 0 && paymentDays <= 30) {
      alerts.push({
        id: `annual-${subscription.id}-${subscription.nextPaymentDate}`,
        type: "annual",
        severity: "info",
        badge: "Buyuk odeme",
        title: `${subscription.name} yuksek maliyetli`,
        message: `Bu aboneligin yillik etkisi ${formatCurrency(annualTl)}. Odeme yakinda.`
      });
    }

    if (subscription.isPriceIncreased) {
      alerts.push({
        id: `price-${subscription.id}-${subscription.updatedAt}`,
        type: "price",
        severity: "info",
        badge: "Zam",
        title: `${subscription.name} icin zam isaretli`,
        message: "Guncel fiyati kontrol etmek isteyebilirsin."
      });
    }
  });

  if (budgetTarget && monthlyTotal > budgetTarget) {
    alerts.push({
      id: `budget-${todayIso()}`,
      type: "budget",
      severity: "critical",
      badge: "Butce",
      title: "Aylik butce hedefi asildi",
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
    showToast("Bu tarayicida bildirim destegi yok.");
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
    version: 1,
    settings: state.settings,
    subscriptions: state.subscriptions,
    payments: state.payments,
    archives: state.archives
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `abonelik-yedek-${todayIso()}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast("JSON yedegi hazirlandi.");
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
      throw new Error("Gecersiz yedek dosyasi");
    }

    const confirmed = window.confirm("Mevcut veriler silinip secilen yedek yüklenecek. Devam edilsin mi?");
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
    applyTheme(state.settings.theme || "light");
    showToast("Yedek basariyla geri yuklendi.");
  } catch (error) {
    console.error(error);
    showToast("Yedek yuklenemedi.");
  } finally {
    event.target.value = "";
  }
}

function toggleTheme() {
  const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(nextTheme);
  state.settings.theme = nextTheme;
  state.settings.darkModePreferred = nextTheme === "dark";
  putRecord("settings", state.settings);
  populateSettingsForm();
}

function applyTheme(theme) {
  document.body.dataset.theme = theme;
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
    showToast("Tarayici su an yukleme istemi gostermiyor.");
    return;
  }

  state.deferredPrompt.prompt();
  await state.deferredPrompt.userChoice;
  state.deferredPrompt = null;
  dom.installBanner.classList.add("hidden");
}

function buildTrendData(subscriptions) {
  const monthLabels = [];
  const monthlyTotals = [];
  const now = new Date();

  for (let offset = 5; offset >= 0; offset -= 1) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const total = sum(
      subscriptions.map((subscription) =>
        monthlyOccurrenceForMonth(subscription, monthDate.getFullYear(), monthDate.getMonth())
      )
    );
    monthLabels.push(monthDate.toLocaleDateString("tr-TR", { month: "short" }));
    monthlyTotals.push({ label: monthLabels.at(-1), total });
  }

  return monthlyTotals;
}

function monthlyOccurrenceForMonth(subscription, year, month) {
  const monthlyTl = calculateMonthlyTl(subscription);
  const annualTl = calculateAnnualTl(subscription);
  if (subscription.billingCycle === "monthly") {
    return monthlyTl;
  }

  if (subscription.billingCycle === "weekly") {
    return monthlyTl;
  }

  const next = new Date(subscription.nextPaymentDate);
  if (Number.isNaN(next.getTime())) {
    return monthlyTl;
  }

  const iter = new Date(next);
  for (let i = 0; i < 36; i += 1) {
    if (iter.getFullYear() === year && iter.getMonth() === month) {
      return subscription.billingCycle === "quarterly" ? annualTl / 4 : annualTl;
    }
    iter.setTime(addCycle(iter, subscription.billingCycle, true).getTime());
    if (iter.getFullYear() > year || (iter.getFullYear() === year && iter.getMonth() > month)) {
      break;
    }
  }

  const backIter = new Date(next);
  for (let i = 0; i < 36; i += 1) {
    if (backIter.getFullYear() === year && backIter.getMonth() === month) {
      return subscription.billingCycle === "quarterly" ? annualTl / 4 : annualTl;
    }
    backIter.setTime(addCycle(backIter, subscription.billingCycle, false).getTime());
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
  ctx.font = "700 18px Avenir Next, Segoe UI, sans-serif";
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
    drawEmptyCanvasState(ctx, width, height, "Trend icin veri yok");
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
  ctx.font = "12px Avenir Next, Segoe UI, sans-serif";
  ctx.fillText("6 ay", padding, height - 8);
  ctx.fillText(formatCurrencyShort(max), width - padding - 42, 18);
}

function drawEmptyCanvasState(ctx, width, height, label) {
  ctx.save();
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--muted");
  ctx.font = "14px Avenir Next, Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, width / 2, height / 2);
  ctx.restore();
}

function calculateMonthlyTl(subscription) {
  const base = convertToTl(subscription.price, subscription.currency);
  switch (subscription.billingCycle) {
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

function calculateAnnualTl(subscription) {
  return calculateMonthlyTl(subscription) * 12;
}

function calculateDailyTl(subscription) {
  return calculateAnnualTl(subscription) / 365;
}

function calculateCancellationScore(subscription) {
  const annualNorm = Math.min(calculateAnnualTl(subscription) / 150, 100);
  const usageNorm = USAGE_SCORES[subscription.usageFrequency] ?? 0.5;
  const valueNorm = (6 - Number(subscription.valueScore || 3)) / 5;
  const daysSinceLastUse = subscription.lastUsedDate ? daysBetween(subscription.lastUsedDate, todayIso()) : 120;
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
    high: "Sik kullanim",
    medium: "Ara sira kullanim",
    low: "Nadiren kullanim",
    unused: "Neredeyse hic kullanilmiyor"
  }[value] || "Belirsiz";
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
  return asDate ? date : date.toISOString().slice(0, 10);
}

function severityScore(value) {
  return { critical: 3, info: 2 }[value] || 1;
}

function getCategoryColor(category) {
  const palette = ["#0A66D9", "#13B7C9", "#0D9476", "#5CAEFF", "#325AD7", "#7BC4FF", "#0053A0"];
  const hash = Array.from(category).reduce((total, char) => total + char.charCodeAt(0), 0);
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
