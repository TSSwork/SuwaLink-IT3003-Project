import { registerCustomer, registerPharmacy } from "../auth/auth.js";
import { ApiError } from "../api/apiService.js";
import { required, email, minLength } from "../utils/validators.js";

const tabs = document.querySelectorAll(".md-tab");
const panels = {
  customer: document.getElementById("customer-form"),
  pharmacy: document.getElementById("pharmacy-form"),
};
const banner = document.getElementById("banner");

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => t.setAttribute("aria-selected", String(t === tab)));
    Object.entries(panels).forEach(([name, panel]) => {
      panel.hidden = name !== tab.dataset.tab;
    });
    hideBanner();
  });
});

function showBanner(message, variant = "error") {
  banner.textContent = message;
  banner.className = `md-banner md-banner--${variant}`;
  banner.hidden = false;
}

function hideBanner() {
  banner.hidden = true;
}

function clearFieldErrors(form) {
  form.querySelectorAll("[data-error-for]").forEach((el) => {
    if (!el.dataset.defaultText) el.dataset.defaultText = el.textContent;
    el.textContent = el.dataset.defaultText;
    el.closest(".md-field")?.classList.remove("md-field--error");
  });
}

function setFieldError(form, field, message) {
  const helper = form.querySelector(`[data-error-for="${field}"]`);
  if (!helper) return;
  helper.textContent = message;
  helper.closest(".md-field")?.classList.add("md-field--error");
}

function setLoading(form, loading) {
  const btn = form.querySelector("button[type=submit]");
  btn.disabled = loading;
  btn.classList.toggle("md-btn--loading", loading);
}

function validateCustomer(data) {
  const errors = {};
  const name = required(data.name);
  if (name) errors.name = name;
  const emailErr = email(data.email);
  if (emailErr) errors.email = emailErr;
  const phone = required(data.phone);
  if (phone) errors.phone = phone;
  const password = minLength(data.password, 8, "Password");
  if (password) errors.password = password;
  return errors;
}

function validatePharmacy(data) {
  const errors = validateCustomer(data);
  const licenceNo = required(data.licenceNo);
  if (licenceNo) errors.licenceNo = licenceNo;
  const address = required(data.address);
  if (address) errors.address = address;
  return errors;
}

function applyValidationErrors(form, errors) {
  Object.entries(errors).forEach(([field, message]) => setFieldError(form, field, message));
}

document.getElementById("customer-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  hideBanner();
  const form = event.target;
  clearFieldErrors(form);

  const data = Object.fromEntries(new FormData(form).entries());
  const errors = validateCustomer(data);
  if (Object.keys(errors).length > 0) {
    applyValidationErrors(form, errors);
    return;
  }

  setLoading(form, true);
  try {
    await registerCustomer(data);
    window.location.href = "index.html";
  } catch (err) {
    handleSubmitError(form, err);
  } finally {
    setLoading(form, false);
  }
});

document.getElementById("pharmacy-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  hideBanner();
  const form = event.target;
  clearFieldErrors(form);

  const data = Object.fromEntries(new FormData(form).entries());
  const errors = validatePharmacy(data);
  if (Object.keys(errors).length > 0) {
    applyValidationErrors(form, errors);
    return;
  }

  setLoading(form, true);
  try {
    await registerPharmacy(data);
    window.location.href = "login.html?notice=awaiting_verification";
  } catch (err) {
    handleSubmitError(form, err);
  } finally {
    setLoading(form, false);
  }
});

function handleSubmitError(form, err) {
  if (err instanceof ApiError && err.errors?.length) {
    const byField = Object.fromEntries(err.errors.map((e) => [e.field, e.message]));
    applyValidationErrors(form, byField);
    return;
  }
  showBanner(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
}
