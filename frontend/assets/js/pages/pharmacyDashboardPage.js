import { requireAuth, logout } from "../auth/auth.js";
import { request, ApiError } from "../api/apiService.js";
import { API_BASE_URL } from "../config/env.js";

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
    prescriptions: document.getElementById("panel-prescriptions"),
    reservations: document.getElementById("panel-reservations"),
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
    if (name === "prescriptions") {
      loadIncomingRequests();
      loadMyResponses();
    }
    if (name === "reservations") loadReservations();
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
      document.getElementById("profile-verified").textContent = profile.pharmacy?.status === "VERIFIED"
        ? "Verified pharmacy"
        : profile.pharmacy?.status === "REJECTED"
          ? "Application rejected"
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

    editBtn.addEventListener("click", () => {
      startEdit();
    });

    function startEdit() {
      priceText.hidden = true;
      actions.hidden = true;

      const editRow = document.createElement("div");
      editRow.className = "inventory-card__actions";

      const priceInput = document.createElement("input");
      priceInput.type = "number";
      priceInput.step = "0.01";
      priceInput.min = "0.01";
      priceInput.className = "inventory-card__edit-field";
      priceInput.value = item.unitPrice;
      priceInput.setAttribute("aria-label", "Unit price");

      const stockInput = document.createElement("input");
      stockInput.type = "number";
      stockInput.step = "1";
      stockInput.min = "0";
      stockInput.className = "inventory-card__edit-field";
      stockInput.value = item.stockQuantity;
      stockInput.setAttribute("aria-label", "Stock quantity");

      const expiryInput = document.createElement("input");
      expiryInput.type = "date";
      expiryInput.className = "inventory-card__edit-field";
      expiryInput.value = item.expireDate;
      expiryInput.setAttribute("aria-label", "Expiry date");

      const saveBtn = document.createElement("button");
      saveBtn.type = "button";
      saveBtn.className = "md-btn md-btn--filled";
      saveBtn.textContent = "Save";

      const cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.className = "md-btn md-btn--text";
      cancelBtn.textContent = "Cancel";

      editRow.append(priceInput, stockInput, expiryInput, saveBtn, cancelBtn);
      card.insertBefore(editRow, actions);

      cancelBtn.addEventListener("click", () => {
        editRow.remove();
        priceText.hidden = false;
        actions.hidden = false;
      });

      saveBtn.addEventListener("click", async () => {
        errorText.hidden = true;
        saveBtn.disabled = true;
        saveBtn.classList.add("md-btn--loading");

        try {
          const updated = await request(`/api/inventory/${item.id}`, {
            method: "PUT",
            body: {
              unitPrice: Number(priceInput.value),
              stockQuantity: Number(stockInput.value),
              expireDate: expiryInput.value,
            },
          });

          item.unitPrice = updated.unitPrice;
          item.stockQuantity = updated.stockQuantity;
          item.expireDate = updated.expireDate;

          priceText.textContent =
            `${item.currency} ${item.unitPrice.toFixed(2)} · ${item.stockQuantity} in stock · expires ${item.expireDate}`;

          editRow.remove();
          priceText.hidden = false;
          actions.hidden = false;
        } catch (err) {
          errorText.textContent =
            err instanceof ApiError ? err.message : "Couldn't save changes. Please try again.";
          errorText.hidden = false;
        } finally {
          saveBtn.classList.remove("md-btn--loading");
          saveBtn.disabled = false;
        }
      });
    }

    return card;
  }

  async function loadIncomingRequests() {
    const errorBanner = document.getElementById("prescriptions-incoming-error-banner");
    const emptyState = document.getElementById("prescriptions-incoming-empty-state");
    const list = document.getElementById("prescriptions-incoming-list");

    errorBanner.hidden = true;
    emptyState.hidden = true;
    list.innerHTML = "";

    try {
      const requests = await request("/api/prescriptions");

      if (requests.length === 0) {
        emptyState.hidden = false;
        return;
      }

      requests.forEach((req) => list.appendChild(renderIncomingRequestCard(req)));
    } catch (err) {
      errorBanner.textContent =
        err instanceof ApiError ? err.message : "Couldn't load incoming prescription requests.";
      errorBanner.hidden = false;
    }
  }

  function showIncomingSuccess(message) {
    const successBanner = document.getElementById("prescriptions-respond-success-banner");
    successBanner.textContent = message;
    successBanner.hidden = false;
  }

  function renderIncomingRequestCard(req) {
    const card = document.createElement("div");
    card.className = "md-card request-card";

    const header = document.createElement("div");
    header.className = "inventory-card__header";

    const patientInfo = document.createElement("p");
    patientInfo.className = "md-type-title";
    patientInfo.textContent = `${req.patientName}, age ${req.patientAge}`;
    header.appendChild(patientInfo);

    const date = document.createElement("p");
    date.className = "md-type-body-small";
    date.style.color = "var(--md-sys-color-on-surface-variant)";
    date.textContent = new Date(req.createdAt).toLocaleString();
    header.appendChild(date);

    card.appendChild(header);

    if (req.note) {
      const note = document.createElement("p");
      note.className = "md-type-body";
      note.textContent = req.note;
      card.appendChild(note);
    }

    const image = document.createElement("img");
    image.className = "request-card__image";
    image.src = `${API_BASE_URL}${req.imageUrl}`;
    image.alt = "Prescription image";
    image.addEventListener("click", () => window.open(`${API_BASE_URL}${req.imageUrl}`, "_blank"));
    card.appendChild(image);

    const errorText = document.createElement("p");
    errorText.className = "md-type-body-small";
    errorText.style.color = "var(--md-sys-color-error)";
    errorText.hidden = true;
    card.appendChild(errorText);

    const respondBtn = document.createElement("button");
    respondBtn.type = "button";
    respondBtn.className = "md-btn md-btn--outlined";
    respondBtn.textContent = "Respond";
    respondBtn.style.marginTop = "var(--md-space-4)";
    card.appendChild(respondBtn);

    const respondForm = document.createElement("div");
    respondForm.hidden = true;
    card.appendChild(respondForm);

    let formBuilt = false;

    respondBtn.addEventListener("click", async () => {
      respondForm.hidden = !respondForm.hidden;
      if (respondForm.hidden || formBuilt) return;

      respondForm.innerHTML = "";
      const loadingText = document.createElement("p");
      loadingText.className = "md-type-body-small";
      loadingText.textContent = "Loading your inventory…";
      respondForm.appendChild(loadingText);

      try {
        const items = await request("/api/inventory");
        formBuilt = true;
        respondForm.innerHTML = "";
        buildRespondForm(items);
      } catch (err) {
        respondForm.innerHTML = "";
        const errText = document.createElement("p");
        errText.className = "md-type-body-small";
        errText.style.color = "var(--md-sys-color-error)";
        errText.textContent =
          err instanceof ApiError ? err.message : "Couldn't load your inventory. Please try again.";
        respondForm.appendChild(errText);
      }
    });

    function buildRespondForm(items) {
      if (items.length === 0) {
        const none = document.createElement("p");
        none.className = "md-type-body-small";
        none.style.color = "var(--md-sys-color-on-surface-variant)";
        none.textContent = "You have no inventory items to offer yet.";
        respondForm.appendChild(none);
        return;
      }

      const messageField = document.createElement("div");
      messageField.className = "md-field";
      const messageLabel = document.createElement("label");
      messageLabel.className = "md-field__label";
      messageLabel.textContent = "Message (optional)";
      const messageInput = document.createElement("textarea");
      messageInput.className = "md-field__input pharmacy-dashboard__textarea";
      messageField.append(messageLabel, messageInput);
      respondForm.appendChild(messageField);

      const rows = items.map((item) => {
        const row = document.createElement("div");
        row.className = "response-item";

        const checkboxLabel = document.createElement("label");
        checkboxLabel.className = "md-type-body-small";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";

        checkboxLabel.append(
          checkbox,
          ` ${item.medicine.brandName} (${item.medicine.genericName}) — ${item.stockQuantity} in stock`
        );

        const qtyInput = document.createElement("input");
        qtyInput.type = "number";
        qtyInput.min = "1";
        qtyInput.max = String(item.stockQuantity);
        qtyInput.value = "1";
        qtyInput.className = "inventory-card__edit-field";
        qtyInput.disabled = true;

        checkbox.addEventListener("change", () => {
          qtyInput.disabled = !checkbox.checked;
        });

        row.append(checkboxLabel, qtyInput);
        respondForm.appendChild(row);

        return { item, checkbox, qtyInput };
      });

      const submitBtn = document.createElement("button");
      submitBtn.type = "button";
      submitBtn.className = "md-btn md-btn--filled";
      submitBtn.textContent = "Submit response";
      submitBtn.style.marginTop = "var(--md-space-4)";
      respondForm.appendChild(submitBtn);

      submitBtn.addEventListener("click", async () => {
        errorText.hidden = true;

        const selected = rows
          .filter((r) => r.checkbox.checked)
          .map((r) => ({ inventoryItemId: r.item.id, quantity: Number(r.qtyInput.value) }));

        if (selected.length === 0) {
          errorText.textContent = "Select at least one item to offer.";
          errorText.hidden = false;
          return;
        }

        submitBtn.disabled = true;
        submitBtn.classList.add("md-btn--loading");

        try {
          const body = { items: selected };
          if (messageInput.value.trim()) body.message = messageInput.value.trim();

          await request(`/api/prescriptions/${req.id}/responses`, { method: "POST", body });
          showIncomingSuccess("Response submitted.");
          card.remove();
        } catch (err) {
          errorText.textContent =
            err instanceof ApiError ? err.message : "Couldn't submit your response. Please try again.";
          errorText.hidden = false;
        } finally {
          submitBtn.classList.remove("md-btn--loading");
          submitBtn.disabled = false;
        }
      });
    }

    return card;
  }

  async function loadMyResponses() {
    const errorBanner = document.getElementById("prescriptions-my-responses-error-banner");
    const emptyState = document.getElementById("prescriptions-my-responses-empty-state");
    const list = document.getElementById("prescriptions-my-responses-list");

    errorBanner.hidden = true;
    emptyState.hidden = true;
    list.innerHTML = "";

    try {
      const responses = await request("/api/prescriptions/responses/me");

      if (responses.length === 0) {
        emptyState.hidden = false;
        return;
      }

      responses.forEach((res) => list.appendChild(renderMyResponseCard(res)));
    } catch (err) {
      errorBanner.textContent =
        err instanceof ApiError ? err.message : "Couldn't load your responses.";
      errorBanner.hidden = false;
    }
  }

  function renderMyResponseCard(res) {
    const card = document.createElement("div");
    card.className = "md-card";

    const date = document.createElement("p");
    date.className = "md-type-body-small";
    date.style.color = "var(--md-sys-color-on-surface-variant)";
    date.textContent = new Date(res.createdAt).toLocaleString();
    card.appendChild(date);

    if (res.message) {
      const message = document.createElement("p");
      message.className = "md-type-body";
      message.textContent = res.message;
      card.appendChild(message);
    }

    res.items.forEach((item) => {
      const itemLine = document.createElement("p");
      itemLine.className = "md-type-body-small";
      itemLine.textContent = `${item.medicineBrandName} × ${item.quantity} — LKR ${item.unitPrice.toFixed(2)} each`;
      card.appendChild(itemLine);
    });

    return card;
  }

  async function loadReservations() {
    const errorBanner = document.getElementById("reservations-error-banner");
    const emptyState = document.getElementById("reservations-empty-state");
    const list = document.getElementById("reservations-list");

    errorBanner.hidden = true;
    emptyState.hidden = true;
    list.innerHTML = "";

    try {
      const reservations = await request("/api/reservations");

      if (reservations.length === 0) {
        emptyState.hidden = false;
        return;
      }

      reservations.forEach((res) => list.appendChild(renderReservationCard(res)));
    } catch (err) {
      errorBanner.textContent =
        err instanceof ApiError ? err.message : "Couldn't load reservations.";
      errorBanner.hidden = false;
    }
  }

  function renderReservationCard(res) {
    const card = document.createElement("div");
    card.className = "md-card";

    const header = document.createElement("div");
    header.className = "inventory-card__header";

    const title = document.createElement("p");
    title.className = "md-type-title";
    title.textContent = `${res.medicineBrandName} × ${res.quantity}`;
    header.appendChild(title);

    const status = document.createElement("span");
    status.className = `status-badge status-badge--${res.status.toLowerCase()}`;
    status.textContent = res.status;
    header.appendChild(status);

    card.appendChild(header);

    const patient = document.createElement("p");
    patient.className = "md-type-body-small";
    patient.style.color = "var(--md-sys-color-on-surface-variant)";
    patient.textContent = res.patientName;
    card.appendChild(patient);

    const price = document.createElement("p");
    price.className = "md-type-body-small";
    price.textContent = `LKR ${res.unitPrice.toFixed(2)} each`;
    card.appendChild(price);

    const date = document.createElement("p");
    date.className = "md-type-body-small";
    date.style.color = "var(--md-sys-color-on-surface-variant)";
    date.textContent = new Date(res.createdAt).toLocaleString();
    card.appendChild(date);

    const errorText = document.createElement("p");
    errorText.className = "md-type-body-small";
    errorText.style.color = "var(--md-sys-color-error)";
    errorText.hidden = true;
    card.appendChild(errorText);

    if (res.status === "CONFIRMED") {
      const actions = document.createElement("div");
      actions.className = "inventory-card__actions";

      const completeBtn = document.createElement("button");
      completeBtn.type = "button";
      completeBtn.className = "md-btn md-btn--filled";
      completeBtn.textContent = "Complete";
      actions.appendChild(completeBtn);

      const cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.className = "md-btn md-btn--outlined";
      cancelBtn.textContent = "Cancel";
      actions.appendChild(cancelBtn);

      card.appendChild(actions);

      completeBtn.addEventListener("click", async () => {
        errorText.hidden = true;
        completeBtn.disabled = true;
        cancelBtn.disabled = true;
        try {
          await request(`/api/reservations/${res.id}/complete`, { method: "PATCH" });
          status.className = "status-badge status-badge--completed";
          status.textContent = "COMPLETED";
          actions.remove();
        } catch (err) {
          errorText.textContent =
            err instanceof ApiError ? err.message : "Couldn't mark this as completed. Please try again.";
          errorText.hidden = false;
          completeBtn.disabled = false;
          cancelBtn.disabled = false;
        }
      });

      cancelBtn.addEventListener("click", async () => {
        errorText.hidden = true;
        completeBtn.disabled = true;
        cancelBtn.disabled = true;
        try {
          await request(`/api/reservations/${res.id}/cancel`, { method: "PATCH" });
          status.className = "status-badge status-badge--cancelled";
          status.textContent = "CANCELLED";
          actions.remove();
        } catch (err) {
          errorText.textContent =
            err instanceof ApiError ? err.message : "Couldn't cancel this reservation. Please try again.";
          errorText.hidden = false;
          completeBtn.disabled = false;
          cancelBtn.disabled = false;
        }
      });
    }

    return card;
  }
}
