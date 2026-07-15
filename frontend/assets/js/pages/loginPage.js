import { login, redirectIfAuthenticated } from "../auth/auth.js";
import { ApiError } from "../api/apiService.js";
import { required, email as validateEmail } from "../utils/validators.js";

if (!redirectIfAuthenticated()) {
  initLoginPage();
}

function initLoginPage() {
  const form = document.getElementById("login-form");
  const errorBanner = document.getElementById("error-banner");
  const noticeBanner = document.getElementById("notice-banner");

  const params = new URLSearchParams(window.location.search);
  if (params.get("notice") === "awaiting_verification") {
    noticeBanner.textContent =
      "Your pharmacy account has been registered and is pending admin verification. You'll be able to sign in once it's approved.";
    noticeBanner.hidden = false;
  }

  function setFieldError(field, message) {
    const helper = form.querySelector(`[data-error-for="${field}"]`);
    if (!helper) return;
    helper.textContent = message;
    helper.closest(".md-field")?.classList.add("md-field--error");
  }

  function clearFieldErrors() {
    form.querySelectorAll("[data-error-for]").forEach((el) => {
      el.textContent = "";
      el.closest(".md-field")?.classList.remove("md-field--error");
    });
  }

  function redirectByRole(role) {
    window.location.href = role === "PHARMACY_ADMIN" ? "pharmacy-dashboard.html" : "index.html";
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorBanner.hidden = true;
    clearFieldErrors();

    const data = Object.fromEntries(new FormData(form).entries());
    const emailError = validateEmail(data.email);
    const passwordError = required(data.password, "Password is required");
    if (emailError || passwordError) {
      if (emailError) setFieldError("email", emailError);
      if (passwordError) setFieldError("password", passwordError);
      return;
    }

    const submitBtn = form.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    submitBtn.classList.add("md-btn--loading");

    try {
      const session = await login(data);
      redirectByRole(session.role);
    } catch (err) {
      errorBanner.textContent =
        err instanceof ApiError ? err.message : "Something went wrong. Please try again.";
      errorBanner.hidden = false;
    } finally {
      submitBtn.disabled = false;
      submitBtn.classList.remove("md-btn--loading");
    }
  });
}
