import { requireAuth, logout, homePathForRole } from "../auth/auth.js";
import { requestMultipart, request, ApiError } from "../api/apiService.js";
import { API_BASE_URL } from "../config/env.js";

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
