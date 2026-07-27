document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('notification-btn');
    const dropdown = document.getElementById('notification-dropdown');
    const badge = document.getElementById('notification-badge');
    const list = document.getElementById('notification-list');

    if (!btn || !dropdown) return;

    btn.addEventListener('click', () => {
        dropdown.hidden = !dropdown.hidden;
        if (!dropdown.hidden) {
            fetchNotifications();
        }
    });

    document.addEventListener('click', (e) => {
        if (!btn.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.hidden = true;
        }
    });

    async function fetchUnreadCount() {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/notifications/unread-count', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) return;
            
            const data = await res.json();
            if (data.count > 0) {
                badge.textContent = data.count;
                badge.hidden = false;
            } else {
                badge.hidden = true;
            }
        } catch (error) {
            console.error("Error fetching unread count:", error);
        }
    }

    async function fetchNotifications() {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/notifications', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) return;

            const notifications = await res.json();
            list.innerHTML = '';

            if (!notifications || notifications.length === 0) {
                list.innerHTML = '<p class="empty-state">No new notifications</p>';
                return;
            }

            notifications.forEach(notif => {
                const item = document.createElement('div');
                item.className = `notification-item ${notif.read ? '' : 'unread'}`;
                item.innerHTML = `
                    <div style="font-size: 14px; margin-bottom: 4px;">${notif.title}</div>
                    <div style="font-size: 12px; color: gray;">${notif.message}</div>
                `;
                
                if (!notif.read) {
                    item.addEventListener('click', () => markAsRead(notif.id, item));
                }
                
                list.appendChild(item);
            });
        } catch (error) {
            console.error("Error fetching notifications:", error);
        }
    }

    async function markAsRead(id, element) {
        try {
            const token = localStorage.getItem('token');
            await fetch(`/api/notifications/${id}/read`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            element.classList.remove('unread');
            fetchUnreadCount();
        } catch (error) {
            console.error("Error marking as read:", error);
        }
    }

    fetchUnreadCount();
});
