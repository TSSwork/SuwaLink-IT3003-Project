import { forgotPassword, redirectIfAuthenticated } from "../auth/auth.js";
import { ApiError } from "../api/apiService.js";
import { email as validateEmail } from "../utils/validators.js";

if (!redirectIfAuthenticated()) {
  initForgotPasswordPage();
}

function initForgotPasswordPage() {
  const form = document.getElementById("forgot-password-form");
  const errorBanner = document.getElementById("error-banner");
  const noticeBanner = document.getElementById("notice-banner");

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

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorBanner.hidden = true;
    noticeBanner.hidden = true;
    clearFieldErrors();

    const data = Object.fromEntries(new FormData(form).entries());
    const emailError = validateEmail(data.email);
    if (emailError) {
      setFieldError("email", emailError);
      return;
    }

    const submitBtn = form.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    submitBtn.classList.add("md-btn--loading");

    try {
      await forgotPassword(data);
      noticeBanner.textContent = "A code has been sent to your email. It expires in 10 minutes.";
      noticeBanner.hidden = false;
      setTimeout(() => {
        window.location.href = `reset-password.html?email=${encodeURIComponent(data.email)}`;
      }, 1200);
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
