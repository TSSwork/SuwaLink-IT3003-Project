import { requireAuth, logout } from "../auth/auth.js";
import { request } from "../api/apiService.js";

document.getElementById("logout-btn").addEventListener("click", logout);

const loadingState = document.getElementById("loading-state");
const errorState = document.getElementById("error-state");
const profileCard = document.getElementById("profile-card");

async function loadProfile() {
  if (!requireAuth()) return;

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

loadProfile();
