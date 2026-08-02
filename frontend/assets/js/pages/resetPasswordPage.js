import { resetPassword, redirectIfAuthenticated } from "../auth/auth.js";
import { ApiError } from "../api/apiService.js";
import { required, email as validateEmail, minLength } from "../utils/validators.js";

if (!redirectIfAuthenticated()) {
  initResetPasswordPage();
}

function initResetPasswordPage() {
  const form = document.getElementById("reset-password-form");
  const errorBanner = document.getElementById("error-banner");
  const noticeBanner = document.getElementById("notice-banner");

  const params = new URLSearchParams(window.location.search);
  const prefillEmail = params.get("email");
  if (prefillEmail) {
    form.querySelector("#email").value = prefillEmail;
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

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorBanner.hidden = true;
    noticeBanner.hidden = true;
    clearFieldErrors();

    const data = Object.fromEntries(new FormData(form).entries());
    const emailError = validateEmail(data.email);
    const otpError = required(data.otp, "Code is required");
    const passwordError = minLength(data.newPassword, 8, "Password");
    if (emailError || otpError || passwordError) {
      if (emailError) setFieldError("email", emailError);
      if (otpError) setFieldError("otp", otpError);
      if (passwordError) setFieldError("newPassword", passwordError);
      return;
    }

    const submitBtn = form.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    submitBtn.classList.add("md-btn--loading");

    try {
      await resetPassword(data);
      noticeBanner.textContent = "Password reset. Redirecting to sign in…";
      noticeBanner.hidden = false;
      setTimeout(() => {
        window.location.href = "login.html";
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
