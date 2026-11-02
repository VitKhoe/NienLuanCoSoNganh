/**
 * Quản lý Dự án (WorkSpaces) - /js/project.js
 * Tương thích 100% với file duan.html
 */
import { initNavbar } from './navbar.js';
import {  ensureLoggedIn, getProjectDetail, fetchProjects} from './api.js';
// Biến lưu trữ trạng thái ứng dụng
let currentUserId = localStorage.getItem('currentUserId') ? Number(localStorage.getItem('currentUserId')) : null;
let currentProject = null;
let projectsListCache = [];

// ==========================================
// 1. KHI TRANG LOAD XONG (INITIALIZATION)
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
  await ensureLoggedIn().catch((error) => console.error('Lỗi kiểm tra đăng nhập:', error));
  initModalEvents();
  initFormEvents();
  initSearchEvent();
  await loadProjects();
});


// ==========================================
// 2. XỬ LÝ MỞ / ĐÓNG MODAL (QUAN TRỌNG)
// ==========================================
function initModalEvents() {
  // Lắng nghe sự kiện click nút MỞ modal (qua data-modal-open)
  document.querySelectorAll('[data-modal-open]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-modal-open');
      if (modalId === 'createProjectModal') {
        // Reset form khi bấm "+ Tạo dự án mới"
        const form = document.getElementById('formCreateProject');
        if (form) form.reset();
        document.getElementById('editProjectId').value = '';
        document.getElementById('modalProjectTitle').innerText = 'Tạo dự án mới';
      }
      openModal(modalId);
    });
  });

  // Lắng nghe sự kiện click nút ĐÓNG modal (qua data-modal-close)
  document.querySelectorAll('[data-modal-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-modal-close');
      closeModal(modalId);
    });
  });

  // Đóng modal khi click ra ngoài nền đen
  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
      e.target.setAttribute('hidden', '');
    }
  });
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.removeAttribute('hidden');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.setAttribute('hidden', '');
}

// Các hàm mở modal thủ công được gán vào window để gọi từ HTML/Code
window.openEditProjectModal = function() {
  if (!currentProject) return;
  document.getElementById('editProjectId').value = currentProject.idDuAn;
  document.getElementById('modalProjectTitle').innerText = 'Chỉnh sửa thông tin dự án';
  
  document.getElementById('tenDuAn').value = currentProject.tenDuAn || '';
  document.getElementById('moTa').value = currentProject.moTa || '';
  document.getElementById('ngayBD').value = currentProject.ngayBD || '';
  document.getElementById('ngayKT').value = currentProject.ngayKT || '';
  document.getElementById('trangThai').value = currentProject.trangThai || 'not_started';

  openModal('createProjectModal');
};

window.openAddMemberModal = function() {
  const form = document.getElementById('memberForm');
  if (form) form.reset();
  openModal('memberModal');
};

window.openReviewModal = function(idUser, userName) {
  const form = document.getElementById('reviewForm');
  if (form) form.reset();
  document.getElementById('reviewTargetUserId').value = idUser;
  document.getElementById('reviewTargetUserName').innerText = userName || `User #${idUser}`;
  openModal('reviewModal');
};

// ==========================================
// 3. DANH SÁCH DỰ ÁN & TÌM KIẾM
// ==========================================
async function loadProjects() {
  const projectListEl = document.getElementById('projectList');
  try {
    const projectsListCache = await fetchProjects();
    renderProjectList(projectsListCache);
  } catch (err) {
    console.error(err);
    projectListEl.innerHTML = `<li class="error-text">❌ Lỗi khi tải dự án.</li>`;
  }
}

function renderProjectList(list) {
  const projectListEl = document.getElementById('projectList');
  if (!list || list.length === 0) {
    projectListEl.innerHTML = `<li class="empty-text">Chưa có dự án nào.</li>`;
    return;
  }
  const statusLabels = {
    not_started: 'Chưa bắt đầu',
    in_progress: 'Đang làm',
    completed: 'Hoàn thành'
  };
  projectListEl.innerHTML = list.map(p => `
    
    <li class="project-item" data-id="${p.idDuAn}" onclick="selectProject(${p.idDuAn})">
      <div class="project-item-header">
        <h4 class="project-title">${escapeHtml(p.tenDuAn)}</h4>
        <span class="badge badge-${p.trangThai}">
          ${statusLabels[p.trangThai] || p.trangThai}
        </span>
      </div>
      <p class="project-desc">Tạo bởi: ${escapeHtml(p.userName)}</p>
      <p class="project-desc">${escapeHtml(p.moTa || 'Không có mô tả')}</p>
    </li>
  `).join('');
}

function initSearchEvent() {
  const searchInput = document.getElementById('searchProjectInput');
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    const keyword = e.target.value.toLowerCase().trim();
    // const filtered = projectsListCache.filter(p => 
    //   p.tenDuAn.toLowerCase().includes(keyword) || 
    //   (p.moTa && p.moTa.toLowerCase().includes(keyword))
    // );
    renderProjectList(filtered);
  });
}

// ==========================================
// 4. HIỂN THỊ CHI TIẾT DỰ ÁN (CỘT PHẢI)
// ==========================================
window.selectProject = async function(idDuAn) {
  const panel = document.getElementById('projectDetailPanel');
  panel.innerHTML = `<div class="loading-state"><p>Đang tải chi tiết dự án...</p></div>`;

  try {
    const res = await getProjectDetail(idDuAn);
    //renderProjectList(projectsListCache);
    renderProjectDetail(res);
  } catch (err) {
    console.error(err);
    panel.innerHTML = `<div class="empty-state"><p>❌ Lỗi khi tải dữ liệu dự án.</p></div>`;
  }
};

function renderProjectDetail(p) {
  const panel = document.getElementById('projectDetailPanel');
  const isOwner = Number(p.idUserTao) === currentUserId;
  const isCompleted = p.trangThai === 'completed';

  panel.innerHTML = `
    <div class="project-detail-header">
      <div>
        <h3>${escapeHtml(p.tenDuAn)}</h3>
        <span class="badge status-${p.trangThai}">${getStatusLabel(p.trangThai)}</span>
      </div>
      <div class="project-actions">
        ${isOwner ? `
          <button class="btn btn-sm btn-outline" onclick="openEditProjectModal()">✏️ Sửa</button>
          <button class="btn btn-sm btn-danger" onclick="handleDeleteProject(${p.idDuAn})">🗑️ Xóa</button>
        ` : `
          <button class="btn btn-sm btn-warning" onclick="handleLeaveProject(${p.idDuAn})">🚪 Rút khỏi dự án</button>
        `}
      </div>
    </div>

    <div class="project-detail-body">
      <div class="project-info-card">
        <p><strong>Mô tả:</strong> ${escapeHtml(p.moTa || 'Chưa có mô tả.')}</p>
        <p><strong>Ngày bắt đầu:</strong> ${p.ngayBD || '--/--/----'} | <strong>Ngày kết thúc:</strong> ${p.ngayKT || '--/--/----'}</p>
      </div>

      <div class="project-members-section">
        <div class="section-header">
          <h4>👥 Thành viên dự án (${(p.thanhVien || []).length})</h4>
          ${isOwner ? `<button class="btn btn-sm btn-primary" onclick="openAddMemberModal()">+ Thêm / Phân quyền</button>` : ''}
        </div>

        <ul class="member-list-items">
          ${(p.thanhVien || []).map(m => `
            <li class="member-item-row">
              <div class="member-info">
                <strong>${escapeHtml(m.tenNguoiDung || `User #${m.idUser}`)}</strong>
                <span class="role-badge">${getRoleLabel(m.vaiTro)}</span>
                ${m.diemDanhGia ? `<span class="rating-badge">⭐ ${m.diemDanhGia}/5</span>` : ''}
              </div>
              <div class="member-actions-btns">
                ${isOwner && isCompleted && Number(m.idUser) !== currentUserId ? `
                  <button class="btn btn-xs btn-outline" onclick="openReviewModal(${m.idUser}, '${escapeHtml(m.tenNguoiDung || '')}')">⭐ Đánh giá</button>
                ` : ''}
                ${isOwner && Number(m.idUser) !== currentUserId ? `
                  <button class="btn btn-xs btn-danger" onclick="handleRemoveMember(${m.idUser})">✕ Xóa</button>
                ` : ''}
              </div>
            </li>
          `).join('')}
        </ul>
      </div>
    </div>
  `;
}

// ==========================================
// 5. CÁC HÀM XỬ LÝ FORM & CALL API
// ==========================================
function initFormEvents() {
  // 17. Tạo / Sửa dự án
  const formProject = document.getElementById('formCreateProject');
  if (formProject) {
    formProject.addEventListener('submit', async (e) => {
      e.preventDefault();
      const editId = document.getElementById('editProjectId').value;
      const data = {
        tenDuAn: document.getElementById('tenDuAn').value.trim(),
        moTa: document.getElementById('moTa').value.trim(),
        ngayBD: document.getElementById('ngayBD').value,
        ngayKT: document.getElementById('ngayKT').value,
        trangThai: document.getElementById('trangThai').value
      };

      const url = editId ? `/api/projects/${editId}` : '/api/projects';
      const method = editId ? 'PUT' : 'POST';

      try {
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

        if (res.ok) {
          closeModal('createProjectModal');
          await loadProjects();
          if (editId) selectProject(editId);
        } else {
          const err = await res.json();
          alert(err.message || 'Lỗi khi lưu thông tin dự án');
        }
      } catch (err) {
        console.error(err);
      }
    });
  }

  // 20. Quản lý / Phân quyền thành viên
  const memberForm = document.getElementById('memberForm');
  if (memberForm) {
    memberForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!currentProject) return;

      const idUser = Number(document.getElementById('memberUserId').value);
      const vaiTro = document.getElementById('memberRole').value;

      try {
        const res = await fetch(`/api/projects/${currentProject.idDuAn}/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idUser, vaiTro })
        });

        if (res.ok) {
          closeModal('memberModal');
          selectProject(currentProject.idDuAn);
        } else {
          const err = await res.json();
          alert(err.message || 'Không thể cập nhật thành viên');
        }
      } catch (err) {
        console.error(err);
      }
    });
  }

  // 23. Đánh giá thành viên
  const reviewForm = document.getElementById('reviewForm');
  if (reviewForm) {
    reviewForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!currentProject) return;

      const targetUserId = document.getElementById('reviewTargetUserId').value;
      const diemDanhGia = Number(document.getElementById('reviewScore').value);
      const nhanXet = document.getElementById('reviewComment').value.trim();

      try {
        const res = await fetch(`/api/projects/${currentProject.idDuAn}/members/${targetUserId}/rate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ diemDanhGia, nhanXet })
        });

        if (res.ok) {
          closeModal('reviewModal');
          selectProject(currentProject.idDuAn);
        } else {
          const err = await res.json();
          alert(err.message || 'Lỗi khi gửi đánh giá');
        }
      } catch (err) {
        console.error(err);
      }
    });
  }
}

// 18. Xóa dự án
window.handleDeleteProject = async function(idDuAn) {
  if (!confirm('Bạn có chắc chắn muốn xóa dự án này? Thao tác không thể hoàn tác!')) return;
  try {
    const res = await fetch(`/api/projects/${idDuAn}`, { method: 'DELETE' });
    if (res.ok) {
      currentProject = null;
      document.getElementById('projectDetailPanel').innerHTML = `
        <div class="empty-state"><p>Vui lòng chọn một dự án từ danh sách bên trái để xem chi tiết.</p></div>
      `;
      await loadProjects();
    } else {
      alert('Không thể xóa dự án.');
    }
  } catch (err) {
    console.error(err);
  }
};

// 21. Xóa thành viên
window.handleRemoveMember = async function(idUser) {
  if (!confirm('Bạn có chắc muốn xóa thành viên này khỏi dự án?')) return;
  try {
    const res = await fetch(`/api/projects/${currentProject.idDuAn}/members/${idUser}`, { method: 'DELETE' });
    if (res.ok) {
      selectProject(currentProject.idDuAn);
    } else {
      alert('Không thể xóa thành viên.');
    }
  } catch (err) {
    console.error(err);
  }
};

// 22. Rút khỏi dự án
window.handleLeaveProject = async function(idDuAn) {
  if (!confirm('Bạn có chắc chắn muốn rút khỏi dự án này?')) return;
  try {
    const res = await fetch(`/api/projects/${idDuAn}/leave`, { method: 'POST' });
    if (res.ok) {
      currentProject = null;
      document.getElementById('projectDetailPanel').innerHTML = `
        <div class="empty-state"><p>Bạn đã rút khỏi dự án thành công.</p></div>
      `;
      await loadProjects();
    } else {
      alert('Không thể rút khỏi dự án.');
    }
  } catch (err) {
    console.error(err);
  }
};

// ==========================================
// 6. HÀM TRỢ GIÚP (HELPERS)
// ==========================================
function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getStatusLabel(status) {
  switch (status) {
    case 'in_progress': return '🚀 Đang thực hiện';
    case 'completed': return '✅ Hoàn thành';
    case 'not_started': return '⏳ Chưa bắt đầu';
    default: return 'Khác';
  }
}

function getRoleLabel(role) {
  switch (role) {
    case 'quan_ly': return 'Quản lý';
    case 'nhan_vien': return 'Nhân viên';
    case 'khach': return 'Khách';
    default: return role;
  }
}

initNavbar();