import { getCurrentAuth, logout, homePathForRole } from "../auth/auth.js";

const navActions = document.getElementById("nav-actions");
const session = getCurrentAuth();

if (session) {
  const dashboardLink = document.createElement("a");
  dashboardLink.className = "md-btn md-btn--text";
  dashboardLink.textContent = session.role === "PHARMACY_ADMIN" ? "Dashboard" : "My account";
  dashboardLink.href = homePathForRole(session.role);

  const logoutBtn = document.createElement("button");
  logoutBtn.className = "md-btn md-btn--outlined";
  logoutBtn.textContent = "Logout";
  logoutBtn.addEventListener("click", logout);

  navActions.append(dashboardLink, logoutBtn);
} else {
  const signIn = document.createElement("a");
  signIn.className = "md-btn md-btn--text";
  signIn.textContent = "Sign in";
  signIn.href = "login.html";

  const signUp = document.createElement("a");
  signUp.className = "md-btn md-btn--filled";
  signUp.textContent = "Sign up";
  signUp.href = "register.html";

  navActions.append(signIn, signUp);
}
