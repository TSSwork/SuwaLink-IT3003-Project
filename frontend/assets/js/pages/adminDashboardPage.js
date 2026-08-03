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
    if (name === "pharmacies") loadPharmacies();
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

  async function loadPharmacies() {
    const errorBanner = document.getElementById("pharmacies-error-banner");
    const emptyState = document.getElementById("pharmacies-empty-state");
    const list = document.getElementById("pharmacies-list");

    errorBanner.hidden = true;
    emptyState.hidden = true;
    list.innerHTML = "";

    try {
      const pharmacies = await request("/api/admin/pharmacies");

      if (pharmacies.length === 0) {
        emptyState.hidden = false;
        return;
      }

      pharmacies.forEach((pharmacy) => list.appendChild(renderPharmacyCard(pharmacy)));
    } catch (err) {
      errorBanner.textContent =
        err instanceof ApiError ? err.message : "Couldn't load pharmacies.";
      errorBanner.hidden = false;
    }
  }

  function renderPharmacyCard(pharmacy) {
    const card = document.createElement("div");
    card.className = "md-card";

    const header = document.createElement("div");
    header.className = "admin-card__header";

    const title = document.createElement("p");
    title.className = "md-type-title";
    title.textContent = pharmacy.pharmacyName;
    header.appendChild(title);

    const status = document.createElement("span");
    status.className = `status-badge status-badge--${pharmacy.verified ? "verified" : "pending"}`;
    status.textContent = pharmacy.verified ? "Verified" : "Pending";
    header.appendChild(status);

    card.appendChild(header);

    const meta = document.createElement("p");
    meta.className = "md-type-body-small admin-card__meta";
    meta.textContent = `${pharmacy.email} · Licence ${pharmacy.licenceNo} · ${pharmacy.address}`;
    card.appendChild(meta);

    const errorText = document.createElement("p");
    errorText.className = "md-type-body-small";
    errorText.style.color = "var(--md-sys-color-error)";
    errorText.hidden = true;
    card.appendChild(errorText);

    if (!pharmacy.verified) {
      const actions = document.createElement("div");
      actions.className = "admin-card__actions";

      const approveBtn = document.createElement("button");
      approveBtn.type = "button";
      approveBtn.className = "md-btn md-btn--filled";
      approveBtn.textContent = "Approve";
      actions.appendChild(approveBtn);

      const rejectBtn = document.createElement("button");
      rejectBtn.type = "button";
      rejectBtn.className = "md-btn md-btn--outlined";
      rejectBtn.textContent = "Reject";
      actions.appendChild(rejectBtn);

      card.appendChild(actions);

      approveBtn.addEventListener("click", async () => {
        errorText.hidden = true;
        approveBtn.disabled = true;
        rejectBtn.disabled = true;
        try {
          await request(`/api/admin/pharmacies/${pharmacy.id}/approve`, { method: "PUT" });
          status.className = "status-badge status-badge--verified";
          status.textContent = "Verified";
          actions.remove();
        } catch (err) {
          errorText.textContent =
            err instanceof ApiError ? err.message : "Couldn't approve this pharmacy. Please try again.";
          errorText.hidden = false;
          approveBtn.disabled = false;
          rejectBtn.disabled = false;
        }
      });

      rejectBtn.addEventListener("click", async () => {
        errorText.hidden = true;
        approveBtn.disabled = true;
        rejectBtn.disabled = true;
        try {
          await request(`/api/admin/pharmacies/${pharmacy.id}`, { method: "DELETE" });
          card.remove();
        } catch (err) {
          errorText.textContent =
            err instanceof ApiError ? err.message : "Couldn't reject this pharmacy. Please try again.";
          errorText.hidden = false;
          approveBtn.disabled = false;
          rejectBtn.disabled = false;
        }
      });
    }

    return card;
  }
}
