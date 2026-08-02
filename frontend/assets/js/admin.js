import { requireAuth } from "./auth/auth.js";
import { request } from "./api/apiService.js";

$(function () {
  const session = requireAuth();
  if (!session) return;
  if (session.role !== "ADMIN") {
    window.location.href = "index.html";
    return;
  }

  request("/api/admin/dashboard")
    .then((data) => {
      $("#customers").text(data.totalCustomers);
      $("#pharmacies").text(data.totalPharmacies);
      $("#verified").text(data.verifiedPharmacies);
      $("#pending").text(data.pendingPharmacies);
      $("#rejected").text(data.rejectedPharmacies);
    })
    .catch((err) => console.error("Failed to load dashboard:", err));
});
