const supabaseUrl = window.GGK_CONFIG?.supabaseUrl || "";
const supabaseAnonKey = window.GGK_CONFIG?.supabaseAnonKey || "";
const supabaseClient =
  window.supabase && supabaseUrl && supabaseAnonKey
    ? window.supabase.createClient(supabaseUrl, supabaseAnonKey)
    : null;

const defaultShirtCost = Number(window.GGK_CONFIG?.defaultShirtCost || 300);
const defaultJewelryCost = Number(window.GGK_CONFIG?.defaultJewelryCost || 0);
const storageKey = "ggk_admin_cost_overrides_v1";

const ordersCountEl = document.getElementById("ordersCount");
const itemsCountEl = document.getElementById("itemsCount");
const revenueTotalEl = document.getElementById("revenueTotal");
const costTotalEl = document.getElementById("costTotal");
const profitTotalEl = document.getElementById("profitTotal");
const statusMessageEl = document.getElementById("statusMessage");
const ordersTableBody = document.getElementById("ordersTableBody");
const costTableBody = document.getElementById("costTableBody");
const refreshButton = document.getElementById("refreshButton");
const sortSelect = document.getElementById("sortSelect");
const authPanel = document.getElementById("authPanel");
const authForm = document.getElementById("authForm");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const authMessage = document.getElementById("authMessage");
const authStateLabel = document.getElementById("authStateLabel");
const signOutButton = document.getElementById("signOutButton");

const filterContainers = {
  payment: document.getElementById("paymentFilters"),
  delivery: document.getElementById("deliveryFilters"),
  size: document.getElementById("sizeFilters"),
  product: document.getElementById("productFilters"),
  color: document.getElementById("colorFilters"),
};

let allRows = [];
let filteredRows = [];
let costOverrides = loadCostOverrides();
let currentSession = null;

const activeFilters = {
  payment: new Set(),
  delivery: new Set(),
  size: new Set(),
  product: new Set(),
  color: new Set(),
};

function formatPHP(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number(value) || 0);
}

function loadCostOverrides() {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveCostOverrides() {
  localStorage.setItem(storageKey, JSON.stringify(costOverrides));
}

function itemKey(row) {
  return [row.product_id || "", row.shirt_color || "", row.shirt_size || "", row.item_type || ""].join("|");
}

function getUnitCost(row) {
  const key = itemKey(row);
  if (key in costOverrides) {
    return Number(costOverrides[key]) || 0;
  }
  return row.item_type ? defaultJewelryCost : defaultShirtCost;
}

function normalizeValue(value, fallback) {
  return value == null || value === "" ? fallback : String(value);
}

async function loadData() {
  if (!supabaseClient) {
    statusMessageEl.textContent = "Supabase client is not configured.";
    return;
  }

  if (!currentSession) {
    statusMessageEl.textContent = "Sign in first.";
    return;
  }

  statusMessageEl.textContent = "Loading orders...";

  const [ordersRes, itemsRes] = await Promise.all([
    supabaseClient.from("orders").select("*"),
    supabaseClient.from("order_items").select("*"),
  ]);

  if (ordersRes.error || itemsRes.error) {
    const message = ordersRes.error?.message || itemsRes.error?.message || "Unable to load data.";
    statusMessageEl.textContent =
      `${message} If this is an RLS policy issue, allow admin read access for orders and order_items.`;
    return;
  }

  const ordersById = new Map((ordersRes.data || []).map((order) => [order.id, order]));
  allRows = (itemsRes.data || [])
    .map((item) => {
      const order = ordersById.get(item.order_id);
      if (!order) return null;

      return {
        order_id: order.id,
        created_at: order.created_at,
        customer_name: order.customer_name,
        payment_method: normalizeValue(order.payment_method, "N/A"),
        delivery_method: normalizeValue(order.delivery_method, "N/A"),
        product_id: normalizeValue(item.product_id, "N/A"),
        product_name: normalizeValue(item.product_name, "N/A"),
        shirt_color: normalizeValue(item.shirt_color, "N/A"),
        shirt_size: normalizeValue(item.shirt_size, "N/A"),
        item_type: normalizeValue(item.item_type, "N/A"),
        quantity: Number(item.quantity || 0),
        unit_price: Number(item.unit_price || 0),
        line_total: Number(item.line_total || 0),
      };
    })
    .filter(Boolean);

  buildFilterChips();
  renderCostTable(allRows);
  applyFiltersAndRender();
  statusMessageEl.textContent = `${allRows.length} line items loaded.`;
}

function clearDashboard() {
  allRows = [];
  filteredRows = [];
  ordersTableBody.innerHTML = '<tr><td colspan="13">Sign in to view data.</td></tr>';
  costTableBody.innerHTML = "";
  ordersCountEl.textContent = "0";
  itemsCountEl.textContent = "0";
  revenueTotalEl.textContent = formatPHP(0);
  costTotalEl.textContent = formatPHP(0);
  profitTotalEl.textContent = formatPHP(0);
}

function setAuthedState(session) {
  currentSession = session;
  const isAuthed = Boolean(session);
  refreshButton.disabled = !isAuthed;
  signOutButton.hidden = !isAuthed;
  authPanel.hidden = isAuthed;
  authStateLabel.textContent = isAuthed
    ? `Signed in as ${session.user?.email || "admin"}`
    : "Not signed in";

  if (!isAuthed) {
    clearDashboard();
    statusMessageEl.textContent = "Sign in with an admin account to load orders.";
  }
}

function collectUnique(field) {
  return Array.from(new Set(allRows.map((r) => r[field]).filter((v) => v !== "N/A"))).sort();
}

function buildFilterChips() {
  const options = {
    payment: collectUnique("payment_method"),
    delivery: collectUnique("delivery_method").map((value) =>
      value === "pickup" ? "pickup (campus)" : value
    ),
    size: collectUnique("shirt_size"),
    product: collectUnique("product_name"),
    color: collectUnique("shirt_color"),
  };

  Object.entries(options).forEach(([group, values]) => {
    const container = filterContainers[group];
    container.innerHTML = "";
    values.forEach((rawValue) => {
      const value = group === "delivery" ? rawValue.replace(" (campus)", "") : rawValue;
      const label = document.createElement("label");
      label.className = "chip";
      label.innerHTML = `<input type="checkbox" value="${value}" data-group="${group}" />${rawValue}`;
      container.appendChild(label);
    });
  });
}

function rowPassesFilters(row) {
  const checks = [
    ["payment", row.payment_method],
    ["delivery", row.delivery_method],
    ["size", row.shirt_size],
    ["product", row.product_name],
    ["color", row.shirt_color],
  ];

  return checks.every(([group, value]) => {
    const selected = activeFilters[group];
    if (selected.size === 0) return true;
    return selected.has(value);
  });
}

function sortRows(rows) {
  const sorted = [...rows];
  switch (sortSelect.value) {
    case "oldest":
      sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      break;
    case "revenue_desc":
      sorted.sort((a, b) => b.line_total - a.line_total);
      break;
    case "revenue_asc":
      sorted.sort((a, b) => a.line_total - b.line_total);
      break;
    case "quantity_desc":
      sorted.sort((a, b) => b.quantity - a.quantity);
      break;
    default:
      sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      break;
  }
  return sorted;
}

function applyFiltersAndRender() {
  filteredRows = sortRows(allRows.filter(rowPassesFilters));
  renderStats(filteredRows);
  renderOrdersTable(filteredRows);
}

function renderStats(rows) {
  const uniqueOrderIds = new Set(rows.map((r) => r.order_id));
  const revenue = rows.reduce((sum, row) => sum + row.line_total, 0);
  const cost = rows.reduce((sum, row) => sum + getUnitCost(row) * row.quantity, 0);
  const profit = revenue - cost;

  ordersCountEl.textContent = String(uniqueOrderIds.size);
  itemsCountEl.textContent = String(rows.length);
  revenueTotalEl.textContent = formatPHP(revenue);
  costTotalEl.textContent = formatPHP(cost);
  profitTotalEl.textContent = formatPHP(profit);
  profitTotalEl.className = profit >= 0 ? "profit-positive" : "profit-negative";
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
}

function renderOrdersTable(rows) {
  ordersTableBody.innerHTML = "";
  if (rows.length === 0) {
    ordersTableBody.innerHTML =
      '<tr><td colspan="13">No rows match current filters.</td></tr>';
    return;
  }

  rows.forEach((row) => {
    const unitCost = getUnitCost(row);
    const lineCost = unitCost * row.quantity;
    const lineProfit = row.line_total - lineCost;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${formatDate(row.created_at)}</td>
      <td class="mono">${row.order_id.slice(0, 8)}</td>
      <td>${row.customer_name || "N/A"}</td>
      <td>${row.payment_method}</td>
      <td>${row.delivery_method}</td>
      <td>${row.product_name}</td>
      <td>${row.shirt_color}</td>
      <td>${row.shirt_size}</td>
      <td>${row.item_type}</td>
      <td>${row.quantity}</td>
      <td>${formatPHP(row.line_total)}</td>
      <td>${formatPHP(lineCost)}</td>
      <td class="${lineProfit >= 0 ? "profit-positive" : "profit-negative"}">${formatPHP(lineProfit)}</td>
    `;
    ordersTableBody.appendChild(tr);
  });
}

function renderCostTable(rows) {
  const uniqueRows = [];
  const seen = new Set();
  rows.forEach((row) => {
    const key = itemKey(row);
    if (!seen.has(key)) {
      seen.add(key);
      uniqueRows.push(row);
    }
  });

  costTableBody.innerHTML = "";
  uniqueRows.forEach((row) => {
    const key = itemKey(row);
    const currentCost = getUnitCost(row);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.product_name}</td>
      <td>${row.shirt_color}</td>
      <td>${row.shirt_size}</td>
      <td>${row.item_type}</td>
      <td>
        <input type="number" min="0" step="1" value="${currentCost}" data-cost-key="${key}" />
      </td>
    `;
    costTableBody.appendChild(tr);
  });
}

document.addEventListener("change", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  if (target.matches("input[type='checkbox'][data-group]")) {
    const checkbox = target;
    const group = checkbox.dataset.group;
    if (!group || !activeFilters[group]) return;
    if (checkbox.checked) {
      activeFilters[group].add(checkbox.value);
    } else {
      activeFilters[group].delete(checkbox.value);
    }
    applyFiltersAndRender();
    return;
  }

  if (target.matches("input[type='number'][data-cost-key]")) {
    const input = target;
    const key = input.dataset.costKey;
    if (!key) return;
    costOverrides[key] = Number(input.value || 0);
    saveCostOverrides();
    applyFiltersAndRender();
    return;
  }

  if (target === sortSelect) {
    applyFiltersAndRender();
  }
});

refreshButton.addEventListener("click", loadData);

if (supabaseClient) {
  supabaseClient.auth.getSession().then(({ data }) => {
    setAuthedState(data.session || null);
    if (data.session) {
      loadData();
    }
  });

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    setAuthedState(session || null);
    if (session) {
      loadData();
    }
  });
}

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!supabaseClient) {
    authMessage.textContent = "Supabase client is not configured.";
    return;
  }

  authMessage.textContent = "Signing in...";
  const { error } = await supabaseClient.auth.signInWithPassword({
    email: authEmail.value.trim(),
    password: authPassword.value,
  });

  if (error) {
    authMessage.textContent = error.message;
    return;
  }

  authMessage.textContent = "Signed in.";
  authPassword.value = "";
});

signOutButton.addEventListener("click", async () => {
  if (!supabaseClient) return;
  await supabaseClient.auth.signOut();
});
