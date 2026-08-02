import { requireAuth, logout } from "../auth/auth.js";
import { request, ApiError } from "../api/apiService.js";

const session = requireAuth();
if (session) {
  initPharmacyDashboard();
}

function initPharmacyDashboard() {
  document.getElementById("logout-btn").addEventListener("click", logout);

  const tabs = document.querySelectorAll(".md-tab");
  const panels = {
    profile: document.getElementById("panel-profile"),
    inventory: document.getElementById("panel-inventory"),
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => switchTab(tab.dataset.tab));
  });

  function switchTab(name) {
    tabs.forEach((t) => t.setAttribute("aria-selected", String(t.dataset.tab === name)));
    Object.entries(panels).forEach(([key, panel]) => {
      panel.hidden = key !== name;
    });
    if (name === "inventory") loadInventory();
  }

  loadProfile();
  loadMedicineOptions();
  initAddInventoryForm();

  async function loadProfile() {
    const loadingState = document.getElementById("loading-state");
    const errorState = document.getElementById("error-state");
    const profileCard = document.getElementById("profile-card");

    try {
      const profile = await request("/api/users/me");

      document.getElementById("profile-name").textContent = profile.name;
      document.getElementById("profile-licence").textContent = profile.pharmacy?.licenceNo ?? "—";
      document.getElementById("profile-address").textContent = profile.pharmacy?.address ?? "";
      document.getElementById("profile-verified").textContent = profile.pharmacy?.verified
        ? "Verified pharmacy"
        : "Awaiting admin verification";

      loadingState.hidden = true;
      profileCard.hidden = false;
    } catch {
      loadingState.hidden = true;
      errorState.textContent = "Couldn't load your profile. Please try refreshing the page.";
      errorState.hidden = false;
    }
  }

  async function loadMedicineOptions() {
    const select = document.getElementById("inventory-medicine");
    try {
      const medicines = await request("/api/medicines");
      medicines.forEach((med) => {
        const option = document.createElement("option");
        option.value = med.id;
        option.textContent = `${med.brandName} (${med.genericName}) — ${med.strength}`;
        select.appendChild(option);
      });
    } catch {
      const option = document.createElement("option");
      option.textContent = "Couldn't load medicine list";
      option.disabled = true;
      select.appendChild(option);
    }
  }

  function initAddInventoryForm() {
    const form = document.getElementById("add-inventory-form");
    const errorBanner = document.getElementById("inventory-error-banner");
    const successBanner = document.getElementById("inventory-success-banner");

    function clearFieldErrors() {
      form.querySelectorAll("[data-error-for]").forEach((el) => {
        el.textContent = "";
        el.closest(".md-field")?.classList.remove("md-field--error");
      });
    }

    function setFieldError(field, message) {
      const helper = form.querySelector(`[data-error-for="${field}"]`);
      if (!helper) return;
      helper.textContent = message;
      helper.closest(".md-field")?.classList.add("md-field--error");
    }

    const fieldNameMap = {
      medicineMasterId: "inventory-medicine",
      unitPrice: "inventory-price",
      stockQuantity: "inventory-stock",
      expireDate: "inventory-expiry",
    };

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      errorBanner.hidden = true;
      successBanner.hidden = true;
      clearFieldErrors();

      const data = Object.fromEntries(new FormData(form).entries());
      const body = {
        medicineMasterId: data.medicineMasterId,
        unitPrice: Number(data.unitPrice),
        stockQuantity: Number(data.stockQuantity),
        expireDate: data.expireDate,
      };

      const submitBtn = form.querySelector("button[type=submit]");
      submitBtn.disabled = true;
      submitBtn.classList.add("md-btn--loading");

      try {
        await request("/api/inventory", { method: "POST", body });
        successBanner.textContent = "Added to inventory.";
        successBanner.hidden = false;
        form.reset();
        loadInventory();
      } catch (err) {
        if (err instanceof ApiError && err.errors?.length) {
          err.errors.forEach(({ field, message }) => setFieldError(fieldNameMap[field] ?? field, message));
        } else {
          errorBanner.textContent =
            err instanceof ApiError ? err.message : "Couldn't add this item. Please try again.";
          errorBanner.hidden = false;
        }
      } finally {
        submitBtn.disabled = false;
        submitBtn.classList.remove("md-btn--loading");
      }
    });
  }

  async function loadInventory() {
    const errorBanner = document.getElementById("inventory-error-banner");
    const emptyState = document.getElementById("inventory-empty-state");
    const list = document.getElementById("inventory-list");

    errorBanner.hidden = true;
    emptyState.hidden = true;
    list.innerHTML = "";

    try {
      const items = await request("/api/inventory");

      if (items.length === 0) {
        emptyState.hidden = false;
        return;
      }

      items.forEach((item) => list.appendChild(renderInventoryCard(item)));
    } catch (err) {
      errorBanner.textContent =
        err instanceof ApiError ? err.message : "Couldn't load your inventory.";
      errorBanner.hidden = false;
    }
  }

  function renderInventoryCard(item) {
    const card = document.createElement("div");
    card.className = "md-card inventory-card";

    const header = document.createElement("div");
    header.className = "inventory-card__header";

    const title = document.createElement("p");
    title.className = "md-type-title";
    title.textContent = `${item.medicine.brandName} (${item.medicine.genericName})`;
    header.appendChild(title);

    const availability = document.createElement("span");
    availability.className = `status-badge status-badge--${item.available ? "available" : "unavailable"}`;
    availability.textContent = item.available ? "Available" : "Unavailable";
    header.appendChild(availability);

    card.appendChild(header);

    const meta = document.createElement("p");
    meta.className = "md-type-body-small inventory-card__meta";
    meta.textContent = `${item.medicine.dosageForm} · ${item.medicine.strength}`;
    card.appendChild(meta);

    const priceText = document.createElement("p");
    priceText.className = "md-type-body";
    priceText.textContent =
      `${item.currency} ${item.unitPrice.toFixed(2)} · ${item.stockQuantity} in stock · expires ${item.expireDate}`;
    card.appendChild(priceText);

    const errorText = document.createElement("p");
    errorText.className = "md-type-body-small";
    errorText.style.color = "var(--md-sys-color-error)";
    errorText.hidden = true;
    card.appendChild(errorText);

    const actions = document.createElement("div");
    actions.className = "inventory-card__actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "md-btn md-btn--outlined";
    editBtn.textContent = "Edit";
    actions.appendChild(editBtn);

    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = "md-btn md-btn--outlined";
    toggleBtn.textContent = item.available ? "Mark unavailable" : "Mark available";
    actions.appendChild(toggleBtn);

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "md-btn md-btn--text";
    removeBtn.textContent = "Remove";
    actions.appendChild(removeBtn);

    card.appendChild(actions);

    toggleBtn.addEventListener("click", async () => {
      errorText.hidden = true;
      toggleBtn.disabled = true;
      try {
        const updated = await request(`/api/inventory/${item.id}/availability`, {
          method: "PATCH",
          body: { available: !item.available },
        });
        item.available = updated.available;
        availability.className = `status-badge status-badge--${item.available ? "available" : "unavailable"}`;
        availability.textContent = item.available ? "Available" : "Unavailable";
        toggleBtn.textContent = item.available ? "Mark unavailable" : "Mark available";
      } catch (err) {
        errorText.textContent =
          err instanceof ApiError ? err.message : "Couldn't update availability. Please try again.";
        errorText.hidden = false;
      } finally {
        toggleBtn.disabled = false;
      }
    });

    removeBtn.addEventListener("click", async () => {
      errorText.hidden = true;
      removeBtn.disabled = true;
      try {
        await request(`/api/inventory/${item.id}`, { method: "DELETE" });
        card.remove();
      } catch (err) {
        errorText.textContent =
          err instanceof ApiError ? err.message : "Couldn't remove this item. Please try again.";
        errorText.hidden = false;
        removeBtn.disabled = false;
      }
    });

    return card;
  }
}
