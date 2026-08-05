import { request, ApiError } from "../api/apiService.js";

const FILLED_PATH = "M200-120v-640q0-33 23.5-56.5T280-840h400q33 0 56.5 23.5T760-760v640L480-240 200-120Z";
const OUTLINE_PATH =
  "M200-120v-640q0-33 23.5-56.5T280-840h400q33 0 56.5 23.5T760-760v640L480-240 200-120Zm80-122 200-86 200 86v-518H280v518Z";

/**
 * A small icon-only toggle button wired to POST/DELETE /api/bookmarks/{inventoryId}.
 * Shared by the search results page (corner of each medicine card) and the patient
 * dashboard's Bookmarks tab (where the button always renders in the "bookmarked" state).
 *
 * @param {object} options
 * @param {string} options.inventoryId
 * @param {boolean} [options.bookmarked] - initial state
 * @param {(bookmarked: boolean) => void} [options.onToggled] - called after a successful toggle
 * @param {(message: string) => void} [options.onError] - called with a user-facing message on failure
 * @returns {HTMLButtonElement}
 */
export function createBookmarkButton({ inventoryId, bookmarked = false, onToggled, onError }) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "bookmark-btn";

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 -960 960 960");
  svg.setAttribute("width", "20");
  svg.setAttribute("height", "20");
  svg.setAttribute("fill", "currentColor");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  svg.appendChild(path);
  btn.appendChild(svg);

  function render() {
    path.setAttribute("d", bookmarked ? FILLED_PATH : OUTLINE_PATH);
    btn.classList.toggle("bookmark-btn--active", bookmarked);
    btn.setAttribute("aria-pressed", String(bookmarked));
    btn.setAttribute("aria-label", bookmarked ? "Remove bookmark" : "Bookmark this medicine");
  }
  render();

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    try {
      if (bookmarked) {
        await request(`/api/bookmarks/${inventoryId}`, { method: "DELETE" });
        bookmarked = false;
      } else {
        await request(`/api/bookmarks/${inventoryId}`, { method: "POST" });
        bookmarked = true;
      }
      render();
      onToggled?.(bookmarked);
    } catch (err) {
      onError?.(err instanceof ApiError ? err.message : "Couldn't update bookmark. Please try again.");
    } finally {
      btn.disabled = false;
    }
  });

  return btn;
}
