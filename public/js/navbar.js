// Thanh điều hướng dùng chung cho các trang: menu thu gọn, "Đăng xuất", "Tài khoản", chuông thông báo

import { logout, getNotifications, markNotificationRead, markAllNotificationsRead, getCurrentUser } from './api.js';
import { initMenu, escapeHtml } from './ui.js';

async function handleLogout() {
  try {
    await logout();
  } catch (error) {
    console.error('Lỗi khi đăng xuất:', error);
  }
  window.location.href = '/login_signup.html';
}

function viewAccount() {
  window.location.href = '/account.html';
}

// Chuông thông báo (chèn vào navbar, dùng chung mọi trang)
function injectNotificationBell() {
  const nav = document.querySelector('.navbar-inner');
  if (!nav || document.getElementById('notiBell')) return;

  const bell = document.createElement('button');
  bell.type = 'button';
  bell.id = 'notiBell';
  bell.className = 'btn btn-outline';
  bell.title = 'Thông báo';
  bell.innerHTML = '🔔 <span id="notiCount" class="badge" style="display:none;">0</span>';
  bell.onclick = openNotifications;
  nav.appendChild(bell);

  refreshUnread();
  setInterval(refreshUnread, 30000);
}

async function refreshUnread() {
  try {
    const data = await getNotifications();
    const badge = document.getElementById('notiCount');
    if (badge) {
      badge.textContent = data.unread || 0;
      badge.style.display = data.unread > 0 ? 'inline-block' : 'none';
    }
  } catch { /* chưa đăng nhập hoặc lỗi mạng */ }
}

async function openNotifications() {
  document.getElementById('notiModal')?.remove();
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'notiModal';
  modal.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-header">
        <h5 class="modal-title">🔔 Thông báo</h5>
        <button type="button" class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
      </div>
      <div class="modal-body" id="notiList" style="max-height:360px;overflow:auto;">Đang tải...</div>
      <div class="modal-footer">
        <button type="button" class="btn btn-sm btn-secondary" onclick="markAllNoti()">Đánh dấu tất cả đã đọc</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  loadNotifications();
}

async function loadNotifications() {
  const box = document.getElementById('notiList');
  try {
    const data = await getNotifications();
    box.innerHTML = data.notifications && data.notifications.length
      ? data.notifications.map((n) => `
        <div style="padding:8px;border-bottom:1px solid #eee;${n.daDoc ? '' : 'background:#f0f7ff;'}">
          <div>${escapeHtml(n.noiDung)}</div>
          <small class="text-muted">${n.createdAt ? String(n.createdAt).slice(0, 16) : ''}</small>
          ${!n.daDoc ? `<button class="btn btn-xs btn-outline" onclick="markNotiRead(${n.idThongBao})">Đã đọc</button>` : ''}
        </div>`).join('')
      : '<i>Chưa có thông báo nào.</i>';
  } catch (e) {
    box.innerHTML = '<i>Không tải được thông báo.</i>';
  }
}

window.markNotiRead = async function (id) {
  try {
    await markNotificationRead(id);
    openNotifications();
    refreshUnread();
  } catch { /* bỏ qua */ }
};
window.markAllNoti = async function () {
  try {
    await markAllNotificationsRead();
    openNotifications();
    refreshUnread();
  } catch { /* bỏ qua */ }
};

// Hiện link "Quản trị" cho admin
async function injectAdminLink() {
  try {
    const user = await getCurrentUser();
    if (!user?.isAdmin) return;
    const nav = document.querySelector('.navbar-inner');
    if (!nav || document.getElementById('adminLink')) return;
    const link = document.createElement('a');
    link.id = 'adminLink';
    link.className = 'btn btn-outline';
    link.href = '/admin.html';
    link.textContent = '⚙️ Quản trị';
    nav.appendChild(link);
  } catch { /* chưa đăng nhập */ }
}

export function initNavbar() {
  initMenu();

  const actions = { btnLogout: handleLogout, btnAccount: viewAccount };

  Object.entries(actions).forEach(([id, action]) => {
    document.getElementById(id)?.addEventListener('click', async (e) => {
      e.preventDefault();
      await action();
    });
  });

  injectNotificationBell();
  injectAdminLink();
}