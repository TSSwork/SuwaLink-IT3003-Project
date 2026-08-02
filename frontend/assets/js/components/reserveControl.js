import { request, ApiError } from "../api/apiService.js";

/**
 * Builds a "quantity + Reserve button" row wired to POST /api/reservations, plus an
 * inline error element for failures (insufficient stock, invalid quantity, etc). Shared
 * by the search results page and the patient dashboard's prescription-response view.
 *
 * @param {object} options
 * @param {string} options.inventoryItemId
 * @param {number} [options.initialQuantity] - default value in the quantity input
 * @param {number} [options.maxQuantity] - upper bound for the input, if known (search
 *   knows live stock; a prescription response does not, so this is optional)
 * @param {boolean} [options.disabled] - render the Reserve button pre-disabled
 * @param {string} [options.prescriptionResponseItemId] - set when reserving from a
 *   prescription response rather than directly from search
 * @param {(reservation: object) => void} options.onReserved - called with the
 *   reservation response data after a successful reserve
 * @returns {{row: HTMLElement, error: HTMLElement, setMax: (n: number) => void}}
 */
export function createReserveControl({
  inventoryItemId,
  initialQuantity = 1,
  maxQuantity,
  disabled = false,
  prescriptionResponseItemId,
  onReserved,
}) {
  const row = document.createElement("div");
  row.className = "md-reserve-row";

  const qtyInput = document.createElement("input");
  qtyInput.type = "number";
  qtyInput.className = "md-reserve-qty";
  qtyInput.min = "1";
  if (maxQuantity != null) qtyInput.max = String(maxQuantity);
  qtyInput.value = String(initialQuantity);
  qtyInput.setAttribute("aria-label", "Quantity");
  row.appendChild(qtyInput);

  const reserveBtn = document.createElement("button");
  reserveBtn.type = "button";
  reserveBtn.className = "md-btn md-btn--filled";
  reserveBtn.innerHTML = '<span class="md-btn__label">Reserve</span>';
  reserveBtn.disabled = disabled;
  row.appendChild(reserveBtn);

  const error = document.createElement("p");
  error.className = "md-type-body-small md-reserve-error";
  error.hidden = true;

  reserveBtn.addEventListener("click", async () => {
    const quantity = Number(qtyInput.value);
    error.hidden = true;

    const upperBound = maxQuantity ?? Infinity;
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > upperBound) {
      error.textContent = maxQuantity != null
        ? `Enter a quantity between 1 and ${maxQuantity}.`
        : "Enter a valid quantity.";
      error.hidden = false;
      return;
    }

    reserveBtn.disabled = true;
    reserveBtn.classList.add("md-btn--loading");

    try {
      const body = { inventoryItemId, quantity };
      if (prescriptionResponseItemId) body.prescriptionResponseItemId = prescriptionResponseItemId;

      const reservation = await request("/api/reservations", { method: "POST", body });
      onReserved?.(reservation);
    } catch (err) {
      error.textContent =
        err instanceof ApiError ? err.message : "Couldn't reserve this item. Please try again.";
      error.hidden = false;
    } finally {
      reserveBtn.classList.remove("md-btn--loading");
      reserveBtn.disabled = false;
    }
  });

  return {
    row,
    error,
    setMax(newMax) {
      qtyInput.max = String(newMax);
      if (newMax === 0) reserveBtn.disabled = true;
    },
  };
}
