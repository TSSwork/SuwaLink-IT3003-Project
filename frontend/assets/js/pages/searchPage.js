import { request, ApiError } from "../api/apiService.js";
import { getCurrentAuth, logout, homePathForRole } from "../auth/auth.js";
import { createReserveControl } from "../components/reserveControl.js";
import { createBookmarkButton } from "../components/bookmarkButton.js";

initNav();
initSearchPage();

function initNav() {
  const navActions = document.getElementById("nav-actions");
  const session = getCurrentAuth();

  if (session) {
    const dashboardLink = document.createElement("a");
    dashboardLink.className = "md-btn md-btn--text";
    dashboardLink.textContent = session.role === "PHARMACY_OWNER" ? "Dashboard" : "My account";
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
}

function initSearchPage() {
  const form = document.getElementById("search-form");
  const errorBanner = document.getElementById("error-banner");
  const successBanner = document.getElementById("success-banner");
  const loadingState = document.getElementById("loading-state");
  const emptyState = document.getElementById("empty-state");
  const noResultsState = document.getElementById("no-results-state");
  const resultsList = document.getElementById("results-list");

  let bookmarkedIds = new Set();
  if (getCurrentAuth()?.role === "CUSTOMER") {
    request("/api/bookmarks")
      .then((bookmarks) => {
        bookmarkedIds = new Set(bookmarks.map((b) => b.inventory.id));
      })
      .catch(() => {
        // Non-critical: bookmark buttons just fall back to showing "not bookmarked".
      });
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await runSearch();
  });

  async function runSearch() {
    errorBanner.hidden = true;
    successBanner.hidden = true;
    noResultsState.hidden = true;
    emptyState.hidden = true;
    resultsList.innerHTML = "";
    loadingState.hidden = false;

    const data = Object.fromEntries(new FormData(form).entries());
    const params = new URLSearchParams();
    if (data.query) params.set("query", data.query);
    if (data.minPrice) params.set("minPrice", data.minPrice);
    if (data.maxPrice) params.set("maxPrice", data.maxPrice);

    try {
      const results = await request(`/api/inventory/search?${params.toString()}`, { auth: false });
      loadingState.hidden = true;

      if (results.length === 0) {
        noResultsState.textContent = data.query
          ? `No medicines found for "${data.query}".`
          : "No medicines found. Try a different search.";
        noResultsState.hidden = false;
        return;
      }

      results.forEach((item) => resultsList.appendChild(renderResultCard(item)));
    } catch (err) {
      loadingState.hidden = true;
      errorBanner.textContent =
        err instanceof ApiError ? err.message : "Couldn't load search results. Please try again.";
      errorBanner.hidden = false;
    }
  }

  function renderResultCard(item) {
    const session = getCurrentAuth();
    const card = document.createElement("div");
    card.className = "md-card search-result-card";

    const title = document.createElement("p");
    title.className = "md-type-title";
    title.textContent = `${item.medicine.brandName} (${item.medicine.genericName})`;
    card.appendChild(title);

    const strength = document.createElement("p");
    strength.className = "md-type-body-small";
    strength.style.color = "var(--md-sys-color-on-surface-variant)";
    strength.textContent = `${item.medicine.dosageForm} · ${item.medicine.strength}`;
    card.appendChild(strength);

    const pharmacy = document.createElement("p");
    pharmacy.className = "md-type-body-small search-result-card__pharmacy";
    pharmacy.textContent = `${item.pharmacy.name} · ${item.pharmacy.address}`;
    card.appendChild(pharmacy);

    const price = document.createElement("p");
    price.className = "search-result-card__price";
    price.textContent = `${item.currency} ${item.unitPrice.toFixed(2)}`;
    card.appendChild(price);

    const stock = document.createElement("p");
    stock.className = "md-type-body-small search-result-card__stock";
    stock.textContent = `${item.stockQuantity} in stock`;
    card.appendChild(stock);

    if (session?.role === "CUSTOMER") {
      const bookmarkBtn = createBookmarkButton({
        inventoryId: item.id,
        bookmarked: bookmarkedIds.has(item.id),
        onToggled: (bookmarked) => {
          if (bookmarked) bookmarkedIds.add(item.id);
          else bookmarkedIds.delete(item.id);
        },
        onError: (message) => {
          errorBanner.textContent = message;
          errorBanner.hidden = false;
        },
      });
      card.appendChild(bookmarkBtn);

      const control = createReserveControl({
        inventoryItemId: item.id,
        initialQuantity: 1,
        maxQuantity: item.stockQuantity,
        disabled: item.stockQuantity === 0 || !item.available,
        onReserved: (reservation) => {
          successBanner.textContent =
            `Reserved ${reservation.quantity} × ${reservation.medicineBrandName} at ${reservation.pharmacyName}.`;
          successBanner.hidden = false;

          item.stockQuantity -= reservation.quantity;
          stock.textContent = `${item.stockQuantity} in stock`;
          control.setMax(item.stockQuantity);
        },
      });

      card.appendChild(control.error);
      card.appendChild(control.row);
    } else {
      const signInLink = document.createElement("a");
      signInLink.className = "md-btn md-btn--text";
      signInLink.href = "login.html";
      signInLink.textContent = "Sign in as a patient to reserve";
      card.appendChild(signInLink);
    }

    return card;
  }
}
