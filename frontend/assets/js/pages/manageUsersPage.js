import { requireAuth } from "../auth/auth.js";
import { request } from "../api/apiService.js";

$(function () {
  const $tbody = $("#users-body");
  const $errorState = $("#error-state");

  function showError(message) {
    $errorState.text(message).prop("hidden", false);
  }

  function renderRow(user) {
    const $row = $("<tr>");
    $("<td>").text(user.name).appendTo($row);
    $("<td>").text(user.email).appendTo($row);
    $("<td>").text(user.role).appendTo($row);

    const $actions = $("<td>");
    const $deleteBtn = $("<button>").text("Delete");
    $deleteBtn.on("click", () => handleDelete(user.id, $deleteBtn));
    $actions.append($deleteBtn);
    $row.append($actions);
    return $row;
  }

  function handleDelete(userId, $button) {
    $button.prop("disabled", true);
    $errorState.prop("hidden", true);
    request(`/api/admin/users/${userId}`, { method: "DELETE" })
      .then(loadUsers)
      .catch((err) => {
        showError(err.message ?? "Couldn't delete this user. They may still have related data (a pharmacy, prescriptions, or bookmarks).");
        $button.prop("disabled", false);
      });
  }

  function loadUsers() {
    return request("/api/admin/users")
      .then((users) => {
        $tbody.empty();
        users.forEach((user) => $tbody.append(renderRow(user)));
      })
      .catch((err) => showError(err.message ?? "Couldn't load users. Please try refreshing the page."));
  }

  const session = requireAuth();
  if (session) {
    if (session.role !== "ADMIN") {
      window.location.href = "index.html";
    } else {
      loadUsers();
    }
  }
});
