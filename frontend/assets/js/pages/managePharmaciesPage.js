import { requireAuth } from "../auth/auth.js";
import { request } from "../api/apiService.js";

function statusLabel(status) {
  if (status === "VERIFIED") return "Verified";
  if (status === "REJECTED") return "Rejected";
  return "Pending";
}

$(function () {
  const $tbody = $("#pharmacies-body");
  const $errorState = $("#error-state");

  function showError(message) {
    $errorState.text(message).prop("hidden", false);
  }

  function renderRow(pharmacy) {
    const $row = $("<tr>");
    $("<td>").text(pharmacy.pharmacyName).appendTo($row);
    $("<td>").text(pharmacy.licenceNo).appendTo($row);
    $("<td>").text(statusLabel(pharmacy.status)).appendTo($row);

    const $actions = $("<td>");
    const $approveBtn = $("<button>").text("Approve").prop("disabled", pharmacy.status === "VERIFIED");
    const $rejectBtn = $("<button>").text("Reject").prop("disabled", pharmacy.status === "REJECTED");

    $approveBtn.on("click", () => handleAction(pharmacy.id, "approve", $approveBtn));
    $rejectBtn.on("click", () => handleAction(pharmacy.id, "reject", $rejectBtn));

    $actions.append($approveBtn, $rejectBtn);
    $row.append($actions);
    return $row;
  }

  function handleAction(pharmacyId, action, $button) {
    $button.prop("disabled", true);
    $errorState.prop("hidden", true);
    request(`/api/admin/pharmacies/${pharmacyId}/${action}`, { method: "PUT" })
      .then(loadPharmacies)
      .catch((err) => {
        showError(err.message ?? "Something went wrong. Please try again.");
        $button.prop("disabled", false);
      });
  }

  function loadPharmacies() {
    return request("/api/admin/pharmacies")
      .then((pharmacies) => {
        $tbody.empty();
        pharmacies.forEach((pharmacy) => $tbody.append(renderRow(pharmacy)));
      })
      .catch((err) => showError(err.message ?? "Couldn't load pharmacies. Please try refreshing the page."));
  }

  const session = requireAuth();
  if (session) {
    if (session.role !== "ADMIN") {
      window.location.href = "index.html";
    } else {
      loadPharmacies();
    }
  }
});
