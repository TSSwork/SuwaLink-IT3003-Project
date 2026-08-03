import { getToken } from "./auth/tokenStorage.js";
import { API_BASE_URL } from "./config/env.js";

$(function () {
  const $btn = $("#notification-btn");
  const $dropdown = $("#notification-dropdown");
  const $badge = $("#notification-badge");
  const $list = $("#notification-list");

  if (!$btn.length || !$dropdown.length) return;

  $btn.on("click", () => {
    $dropdown.prop("hidden", !$dropdown.prop("hidden"));
    if (!$dropdown.prop("hidden")) {
      fetchNotifications();
    }
  });

  $(document).on("click", (e) => {
    if (!$btn.is(e.target) && $btn.has(e.target).length === 0
        && !$dropdown.is(e.target) && $dropdown.has(e.target).length === 0) {
      $dropdown.prop("hidden", true);
    }
  });

  function authHeader() {
    return { Authorization: `Bearer ${getToken()}` };
  }

  function fetchUnreadCount() {
    $.ajax({
      url: `${API_BASE_URL}/api/notifications/unread-count`,
      headers: authHeader(),
    })
      .done((json) => {
        if (json.data && json.data.count > 0) {
          $badge.text(json.data.count).prop("hidden", false);
        } else {
          $badge.prop("hidden", true);
        }
      })
      .fail((err) => console.error("Error fetching unread count:", err));
  }

  function fetchNotifications() {
    $.ajax({
      url: `${API_BASE_URL}/api/notifications`,
      headers: authHeader(),
    })
      .done((json) => {
        const notifications = json.data;
        $list.empty();

        if (!notifications || notifications.length === 0) {
          $list.html('<p class="empty-state">No new notifications</p>');
          return;
        }

        notifications.forEach((notif) => {
          const $item = $("<div>").addClass("notification-item");
          if (!notif.read) $item.addClass("unread");

          $("<div>").css({ fontSize: "14px", marginBottom: "4px" }).text(notif.title).appendTo($item);
          $("<div>").css({ fontSize: "12px", color: "gray" }).text(notif.message).appendTo($item);

          if (!notif.read) {
            $item.on("click", () => markAsRead(notif.id, $item));
          }

          $list.append($item);
        });
      })
      .fail((err) => console.error("Error fetching notifications:", err));
  }

  function markAsRead(id, $element) {
    $.ajax({
      url: `${API_BASE_URL}/api/notifications/${id}/read`,
      method: "PUT",
      headers: authHeader(),
    })
      .done(() => {
        $element.removeClass("unread");
        fetchUnreadCount();
      })
      .fail((err) => console.error("Error marking as read:", err));
  }

  fetchUnreadCount();
});
