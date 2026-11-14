// Trang quản trị (chỉ admin): thống kê + quản lý người dùng + nhật ký hoạt động

import { initNavbar } from './navbar.js';
import { ensureLoggedIn, getStatistics, getAdminUsers, setUserStatus } from './api.js';
import { escapeHtml } from './ui.js';

initNavbar();

async function load() {
  const user = await ensureLoggedIn().catch(() => null);
  const msg = document.getElementById('adminMsg');
  if (!user?.isAdmin) {
    msg.textContent = 'Bạn không có quyền truy cập trang quản trị.';
    msg.hidden = false;
    return;
  }

  const stats = await getStatistics().catch(() => null);
  renderStats(stats);

  const users = await getAdminUsers().catch(() => []);
  renderUsers(users);

  const logs = await (await fetch('/api/activity-log')).json().catch(() => []);
  renderLog(logs);
}

function renderStats(stats) {
  const box = document.getElementById('statsCards');
  if (!stats) { box.innerHTML = '<p>Không tải được thống kê.</p>'; return; }
  const t = stats.tongQuan;
  const cards = [
    ['Người dùng', t.soNguoiDung],
    ['Dự án', t.soDuAn],
    ['Công việc', t.soTask],
    ['Bài viết', t.soBaiViet],
    ['Tin tuyển dụng', t.soTinTuyenDung],
    ['Task hoàn thành', `${stats.taskHoanThanh.hoanThanh}/${stats.taskHoanThanh.tong}`]
  ];
  box.innerHTML = cards.map(([label, val]) => `
    <div class="card" style="flex:1;min-width:120px;">
      <div class="card-body" style="text-align:center;">
        <h4>${val}</h4><small class="text-muted">${label}</small>
      </div>
    </div>`).join('');
}

function renderUsers(users) {
  const tbody = document.querySelector('#userTable tbody');
  tbody.innerHTML = users.map((u) => `
    <tr style="border-bottom:1px solid #eee;">
      <td>${u.idUser}</td>
      <td>${escapeHtml(u.userName)}</td>
      <td>${escapeHtml(u.email)}</td>
      <td>${escapeHtml(u.HovaTen || '')}</td>
      <td>${u.trangThai}</td>
      <td>${u.QuyenCSDL}</td>
      <td>${u.QuyenCSDL !== 'rwxrwxrwx' ? `<button class="btn btn-xs btn-outline" onclick="toggleBan(${u.idUser}, '${u.trangThai === 'Active' ? 'Banned' : 'Active'}')">${u.trangThai === 'Active' ? 'Khóa' : 'Mở khóa'}</button>` : ''}</td>
    </tr>`).join('');
}

window.toggleBan = async function (id, trangThai) {
  try {
    await setUserStatus(id, trangThai);
    load();
  } catch (e) { alert(e.message || 'Lỗi khi cập nhật'); }
};

function renderLog(logs) {
  const ul = document.getElementById('activityLog');
  ul.innerHTML = logs.length
    ? logs.map((l) => `<li style="padding:6px 0;border-bottom:1px solid #eee;"><strong>${escapeHtml(l.tenNguoiDung)}</strong> ${escapeHtml(l.hanhDong)} <small class="text-muted">(${String(l.thoiGian).slice(0, 16)})</small></li>`).join('')
    : '<li>Chưa có hoạt động.</li>';
}

load();
