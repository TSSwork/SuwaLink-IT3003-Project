import { requireAuth, logout, homePathForRole } from "../auth/auth.js";
import { requestMultipart, request, ApiError } from "../api/apiService.js";
import { API_BASE_URL } from "../config/env.js";
import { createReserveControl } from "../components/reserveControl.js";

const session = requireAuth();
if (session) {
  if (session.role !== "CUSTOMER") {
    window.location.href = homePathForRole(session.role);
  } else {
    initPatientDashboard();
  }
}

function initPatientDashboard() {
  document.getElementById("logout-btn").addEventListener("click", logout);

  const tabs = document.querySelectorAll(".md-tab");
  const panels = {
    upload: document.getElementById("panel-upload"),
    requests: document.getElementById("panel-requests"),
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
    if (name === "requests") loadRequests();
    if (name === "reservations") loadReservations();
  }

  initUploadForm(() => switchTab("requests"));

  async function loadRequests() {
    const errorBanner = document.getElementById("requests-error-banner");
    const emptyState = document.getElementById("requests-empty-state");
    const list = document.getElementById("requests-list");

    errorBanner.hidden = true;
    emptyState.hidden = true;
    list.innerHTML = "";

    try {
      const requests = await request("/api/prescriptions/me");

      if (requests.length === 0) {
        emptyState.hidden = false;
        return;
      }

      requests.forEach((req) => list.appendChild(renderRequestCard(req)));
    } catch (err) {
      errorBanner.textContent =
        err instanceof ApiError ? err.message : "Couldn't load your prescription requests.";
      errorBanner.hidden = false;
    }
  }

  function renderRequestCard(req) {
    const card = document.createElement("div");
    card.className = "md-card request-card";

    const header = document.createElement("div");
    header.className = "request-card__header";

    const date = document.createElement("p");
    date.className = "md-type-body-small";
    date.style.color = "var(--md-sys-color-on-surface-variant)";
    date.textContent = new Date(req.createdAt).toLocaleString();
    header.appendChild(date);

    const status = document.createElement("span");
    status.className = `status-badge status-badge--${req.status.toLowerCase()}`;
    status.textContent = req.status;
    header.appendChild(status);

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

    const actions = document.createElement("div");
    actions.className = "request-card__actions";

    const viewResponsesBtn = document.createElement("button");
    viewResponsesBtn.type = "button";
    viewResponsesBtn.className = "md-btn md-btn--outlined";
    viewResponsesBtn.textContent = "View responses";
    actions.appendChild(viewResponsesBtn);

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "md-btn md-btn--text";
    closeBtn.textContent = "Close request";
    closeBtn.hidden = req.status === "CLOSED";
    actions.appendChild(closeBtn);

    card.appendChild(actions);

    const responseList = document.createElement("div");
    responseList.className = "response-list";
    responseList.hidden = true;
    card.appendChild(responseList);

    let responsesLoaded = false;

    viewResponsesBtn.addEventListener("click", async () => {
      responseList.hidden = !responseList.hidden;
      if (responseList.hidden || responsesLoaded) return;

      responseList.innerHTML = "";
      const loadingText = document.createElement("p");
      loadingText.className = "md-type-body-small";
      loadingText.textContent = "Loading responses…";
      responseList.appendChild(loadingText);

      try {
        const responses = await request(`/api/prescriptions/${req.id}/responses`);
        responsesLoaded = true;
        responseList.innerHTML = "";

        if (responses.length === 0) {
          const none = document.createElement("p");
          none.className = "md-type-body-small";
          none.style.color = "var(--md-sys-color-on-surface-variant)";
          none.textContent = "No pharmacies have responded yet.";
          responseList.appendChild(none);
          return;
        }

        responses.forEach((res) => responseList.appendChild(renderResponse(res)));
      } catch (err) {
        responseList.innerHTML = "";
        const errText = document.createElement("p");
        errText.className = "md-type-body-small";
        errText.style.color = "var(--md-sys-color-error)";
        errText.textContent =
          err instanceof ApiError ? err.message : "Couldn't load responses. Please try again.";
        responseList.appendChild(errText);
      }
    });

    closeBtn.addEventListener("click", async () => {
      try {
        await request(`/api/prescriptions/${req.id}/close`, { method: "PATCH" });
        status.className = "status-badge status-badge--closed";
        status.textContent = "CLOSED";
        closeBtn.hidden = true;
      } catch (err) {
        const errText = document.createElement("p");
        errText.className = "md-type-body-small";
        errText.style.color = "var(--md-sys-color-error)";
        errText.textContent =
          err instanceof ApiError ? err.message : "Couldn't close this request. Please try again.";
        actions.appendChild(errText);
      }
    });

    function renderResponse(res) {
      const wrapper = document.createElement("div");

      const pharmacyName = document.createElement("p");
      pharmacyName.className = "md-type-title";
      pharmacyName.textContent = res.pharmacyName;
      wrapper.appendChild(pharmacyName);

      if (res.message) {
        const message = document.createElement("p");
        message.className = "md-type-body-small";
        message.style.color = "var(--md-sys-color-on-surface-variant)";
        message.textContent = res.message;
        wrapper.appendChild(message);
      }

      res.items.forEach((item) => {
        const itemRow = document.createElement("div");
        itemRow.className = "response-item";

        const info = document.createElement("p");
        info.className = "md-type-body-small";
        info.textContent =
          `${item.medicineBrandName} — ${item.quantity} available at LKR ${item.unitPrice.toFixed(2)} each`;
        itemRow.appendChild(info);

        const control = createReserveControl({
          inventoryItemId: item.inventoryItemId,
          initialQuantity: item.quantity,
          prescriptionResponseItemId: item.id,
          onReserved: (reservation) => {
            const reservedNote = document.createElement("p");
            reservedNote.className = "md-type-body-small";
            reservedNote.style.color = "var(--md-sys-color-success)";
            reservedNote.textContent = `Reserved ${reservation.quantity} × ${reservation.medicineBrandName}.`;
            itemRow.appendChild(reservedNote);
            control.row.remove();
          },
        });

        itemRow.appendChild(control.row);
        wrapper.appendChild(itemRow);
        wrapper.appendChild(control.error);
      });

      return wrapper;
    }

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
      const reservations = await request("/api/reservations/me");

      if (reservations.length === 0) {
        emptyState.hidden = false;
        return;
      }

      reservations.forEach((res) => list.appendChild(renderReservationCard(res)));
    } catch (err) {
      errorBanner.textContent =
        err instanceof ApiError ? err.message : "Couldn't load your reservations.";
      errorBanner.hidden = false;
    }
  }

  function renderReservationCard(res) {
    const card = document.createElement("div");
    card.className = "md-card reservation-card";

    const header = document.createElement("div");
    header.className = "request-card__header";

    const title = document.createElement("p");
    title.className = "md-type-title";
    title.textContent = `${res.medicineBrandName} × ${res.quantity}`;
    header.appendChild(title);

    const status = document.createElement("span");
    status.className = `status-badge status-badge--${res.status.toLowerCase()}`;
    status.textContent = res.status;
    header.appendChild(status);

    card.appendChild(header);

    const pharmacy = document.createElement("p");
    pharmacy.className = "md-type-body-small";
    pharmacy.style.color = "var(--md-sys-color-on-surface-variant)";
    pharmacy.textContent = res.pharmacyName;
    card.appendChild(pharmacy);

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
      const cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.className = "md-btn md-btn--outlined";
      cancelBtn.textContent = "Cancel";
      cancelBtn.style.marginTop = "var(--md-space-4)";

      cancelBtn.addEventListener("click", async () => {
        errorText.hidden = true;
        cancelBtn.disabled = true;
        cancelBtn.classList.add("md-btn--loading");

        try {
          await request(`/api/reservations/${res.id}/cancel`, { method: "PATCH" });
          status.className = "status-badge status-badge--cancelled";
          status.textContent = "CANCELLED";
          cancelBtn.remove();
        } catch (err) {
          errorText.textContent =
            err instanceof ApiError ? err.message : "Couldn't cancel this reservation. Please try again.";
          errorText.hidden = false;
        } finally {
          cancelBtn.classList.remove("md-btn--loading");
          cancelBtn.disabled = false;
        }
      });

      card.appendChild(cancelBtn);
    }

    return card;
  }
}

function initUploadForm(onSubmitted) {
  const form = document.getElementById("upload-form");
  const errorBanner = document.getElementById("upload-error-banner");
  const successBanner = document.getElementById("upload-success-banner");
  const imageInput = document.getElementById("upload-image");
  const imagePreview = document.getElementById("upload-image-preview");

  imageInput.addEventListener("change", () => {
    const file = imageInput.files?.[0];
    if (file) {
      imagePreview.src = URL.createObjectURL(file);
      imagePreview.hidden = false;
    } else {
      imagePreview.hidden = true;
    }
  });

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

  const fieldNameMap = { image: "upload-image", patientAge: "upload-age", note: "upload-note" };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorBanner.hidden = true;
    successBanner.hidden = true;
    clearFieldErrors();

    const formData = new FormData(form);

    const submitBtn = form.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    submitBtn.classList.add("md-btn--loading");

    try {
      await requestMultipart("/api/prescriptions", formData);
      successBanner.textContent = "Prescription request submitted.";
      successBanner.hidden = false;
      form.reset();
      imagePreview.hidden = true;
      onSubmitted();
    } catch (err) {
      if (err instanceof ApiError && err.errors?.length) {
        err.errors.forEach(({ field, message }) => setFieldError(fieldNameMap[field] ?? field, message));
      } else {
        errorBanner.textContent =
          err instanceof ApiError ? err.message : "Couldn't submit your prescription. Please try again.";
        errorBanner.hidden = false;
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.classList.remove("md-btn--loading");
    }
  });
}
