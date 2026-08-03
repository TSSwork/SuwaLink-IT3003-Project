import { requireAuth, logout } from "../auth/auth.js";
import { request, ApiError } from "../api/apiService.js";

const session = requireAuth();
if (session) {
  initAdminDashboard();
}

function initAdminDashboard() {
  document.getElementById("logout-btn").addEventListener("click", logout);

  const tabs = document.querySelectorAll(".md-tab");
  const panels = {
    dashboard: document.getElementById("panel-dashboard"),
    pharmacies: document.getElementById("panel-pharmacies"),
    users: document.getElementById("panel-users"),
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => switchTab(tab.dataset.tab));
  });

  function switchTab(name) {
    tabs.forEach((t) => t.setAttribute("aria-selected", String(t.dataset.tab === name)));
    Object.entries(panels).forEach(([key, panel]) => {
      panel.hidden = key !== name;
    });
  }

  loadDashboardStats();

  async function loadDashboardStats() {
    const errorBanner = document.getElementById("dashboard-error-banner");
    errorBanner.hidden = true;

    try {
      const stats = await request("/api/admin/dashboard");
      document.getElementById("stat-customers").textContent = stats.totalCustomers;
      document.getElementById("stat-pharmacies").textContent = stats.totalPharmacies;
      document.getElementById("stat-verified").textContent = stats.verifiedPharmacies;
      document.getElementById("stat-pending").textContent = stats.pendingPharmacies;
    } catch (err) {
      errorBanner.textContent =
        err instanceof ApiError ? err.message : "Couldn't load dashboard stats.";
      errorBanner.hidden = false;
    }
  }
}
