/**
 * Quản lý Dự án (WorkSpaces) - /js/project.js
 * Tương thích 100% với file duan.html
 */

import { initNavbar } from './navbar.js';
import {  ensureLoggedIn, getProjectDetail, fetchProjects, removeMember, createProjectNon_TT} from './api.js';
import {createRecruitment} from './recruitments.js';
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
    const listPJDetail = await Promise.all(projectsListCache.map(p => getProjectDetail(p.idDuAn)));
    const filtered = listPJDetail.filter(p => isMemberOfProject(p, currentUserId));
    renderProjectList(filtered);
  } catch (err) {
    console.error(err);
    projectListEl.innerHTML = `<li class="error-text">❌ Lỗi khi tải dự án.</li>`;
  }
    
}

function renderProjectList(list) {
  //const own = number(currentUserId);
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
    currentProject = res;
    //renderProjectList(projectsListCache);
    const [tasksData] = await Promise.all([
      fetchTasksByProject(idDuAn)
    ]);
    renderProjectDetail(res, tasksData);
    panel.addEventListener('click', (e) => {
    // Kiểm tra nút được click có matcher class/id mong muốn không
    if (e.target.closest('#btnOpenRecruitmentModal')) {
      if (!currentProject) return alert('Chưa chọn dự án!');
      openModal('recruitmentModal');
    }
  });
  } catch (err) {
    console.error(err);
    panel.innerHTML = `<div class="empty-state"><p>❌ Lỗi khi tải dữ liệu dự án.</p></div>`;
  }
};
function isMemberOfProject(project, userId) {
  if (!project || !userId) return false;

  const currentId = Number(userId);
  if (isNaN(currentId) || currentId === 0) return false;

  // 1. Kiểm tra nếu là Chủ dự án (người tạo)
  const ownerId = Number(project.idUserTao || project.id_user_tao);
  const isOwner = !isNaN(ownerId) && ownerId === currentId;

  // 2. Kiểm tra nếu nằm trong mảng thanhVien (khớp với idUser)
  const isMember = Array.isArray(project.thanhVien) && project.thanhVien.some(m => {
    return Number(m.idUser) === currentId;
  });

  return isOwner || isMember;
}
function renderProjectDetail(p, tasks = []) {
  const panel = document.getElementById('projectDetailPanel');
  if (!panel) return;

  const isOwner = Number(p.idUserTao) === Number(localStorage.getItem('currentUserId'));
  const isCompleted = p.trangThai === 'completed';

  panel.innerHTML = `
    <div class="project-detail-header">
      <div>
        <h3>${escapeHtml(p.tenDuAn)}</h3>
        <span class="badge status-${p.trangThai}">${getStatusLabel(p.trangThai)}</span>
      </div>
      <div class="project-actions">
        ${isOwner ? `
          <button class="btn btn-sm btn-outline" onclick="openEditProjectModal(${JSON.stringify(p).replace(/"/g, '&quot;')})">✏️ Sửa</button>
          <button class="btn btn-sm btn-danger" onclick="handleDeleteProject(${p.idDuAn})">🗑️ Xóa</button>
        ` : `
          <button class="btn btn-sm btn-warning" onclick="handleLeaveProject(${p.idDuAn})">🚪 Rút khỏi dự án</button>
        `}
      </div>
      <br>
      <button class="btn btn-primary" onclick="openCreateTaskModal()">
        ➕ Tạo công việc mới
      </button>
      <button id="btnOpenRecruitmentModal" class="btn btn-primary">
    📢 Đăng tin tuyển dụng
    </button>
    </div>

    <div class="project-detail-body">
      <div class="project-info-card">
        <p><strong>Mô tả:</strong> ${escapeHtml(p.moTa || 'Chưa có mô tả.')}</p>
        <p><strong>Ngày bắt đầu:</strong> ${p.ngayBD || '--/--/----'} | <strong>Ngày kết thúc:</strong> ${p.ngayKT || '--/--/----'}</p>
      </div>

      <!-- KHU VỰC THÀNH VIÊN DỰ ÁN -->
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
                  <button class="btn btn-xs btn-danger" onclick="handleRemoveMember(${m.idUser}, ${p.idDuAn})">✕ Xóa</button>
                ` : ''}
              </div>
            </li>
          `).join('')}
        </ul>
      </div>

      <!-- 🔑 KHU VỰC DANH SÁCH TASK MỚI THÊM -->
      <div class="project-tasks-section" style="margin-top: 24px;">
        <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h4>📋 Danh sách công việc (${tasks.length})</h4>
        </div>

        ${tasks.length === 0 ? `
          <p style="color: #888; font-style: italic; padding: 12px; background: #f9f9f9; border-radius: 6px;">Chưa có công việc nào trong dự án này.</p>
        ` : `
          <div class="task-list-items" style="display: flex; flex-direction: column; gap: 10px;">
            ${tasks.map(t => {
              const assignedList = t.assignedUsers;
              return `
                <div class="task-card-row" style="padding: 12px; border: 1px solid #e0e0e0; border-radius: 6px; background: #fff; display: flex; justify-content: space-between; align-items: center;">
                  <div class="task-main-info">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <strong style="font-size: 15px;">${escapeHtml(t.tenTask)}</strong>
                      <span class="badge status-${(t.trangThai || 'todo').toLowerCase()}" style="padding: 2px 8px; border-radius: 4px; font-size: 11px; ${getTaskStatusStyle(t.trangThai)}">
                        ${t.trangThai || 'Todo'}
                      </span>
                    </div>

                    <!-- Hiển thị danh sách người thực hiện hoặc null -->
                    <div style="font-size: 13px; color: #555; margin-top: 6px;">
                      👤 <strong>Người thực hiện:</strong> 
                      ${assignedList && assignedList.length > 0 
                        ? assignedList.map(u => `<span style="background: #e9ecef; padding: 2px 6px; border-radius: 3px; font-size: 12px; margin-right: 4px;">${escapeHtml(u.tenNguoiDung || `User #${u.idUser}`)}</span>`).join('')
                        : '<span style="color: #999; font-style: italic;">Chưa phân công</span>'
                      }
                    </div>

                    ${t.deadLine ? `
                      <div style="font-size: 12px; color: #888; margin-top: 4px;">
                        ⏰ Hạn chót: ${t.deadLine}
                      </div>
                    ` : ''}
                  </div>

                  <div class="task-actions">
                    <button class="btn btn-xs btn-outline" onclick="openTaskDetailModal(${t.idTask})">👁️ Xem chi tiết</button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>

    </div>
  `;
}

// Helper đổi màu badge theo chuẩn trạng thái task ENUM('Todo', 'Doing', 'Done')
function getTaskStatusStyle(status) {
  if (status === 'Done') return 'background: #d4edda; color: #155724; border: 1px solid #c3e6cb;';
  if (status === 'Doing') return 'background: #cce5ff; color: #004085; border: 1px solid #b8daff;';
  return 'background: #fff3cd; color: #856404; border: 1px solid #ffeeba;'; // Todo
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
        if (editId) {
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

        }
        else {
          const res = await createProjectNon_TT(data);
          if (res.ok) {
          closeModal('createProjectModal');
          await loadProjects();
          if (editId) selectProject(editId);
        } else {
          const err = await res.json();
          alert(err.message || 'Lỗi khi lưu thông tin dự án');
        }
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
window.handleRemoveMember = async function(idUser, projectId) {
  if (!confirm('Bạn có chắc muốn xóa thành viên này khỏi dự án?')) return;
  try {
    const res = await removeMember(projectId, idUser);
    if (res.ok) {
      selectProject(projectId);
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


window.openEditProjectModal = function(project) {
  const p = project || currentProject;
  if (!p) return alert('Vui lòng chọn dự án cần chỉnh sửa');

  document.getElementById('edit_idDuAn').value = p.idDuAn;
  document.getElementById('edit_tenDuAn').value = p.tenDuAn || '';
  document.getElementById('edit_moTa').value = p.moTa || '';
  document.getElementById('edit_ngayBD').value = p.ngayBD ? p.ngayBD.substring(0, 10) : '';
  document.getElementById('edit_ngayKT').value = p.ngayKT ? p.ngayKT.substring(0, 10) : '';
  document.getElementById('edit_trangThai').value = p.trangThai || 'not_started';

  openModal('editProjectModal');
};
export async function updateProject(idDuAn, projectData) {
  const res = await fetch(`/api/projects/${idDuAn}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(projectData)
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Cập nhật dự án thất bại');
  }

  return await res.json();
}
// Lắng nghe sự kiện Submit Form Edit Dự Án
document.addEventListener('DOMContentLoaded', () => {
  const formEdit = document.getElementById('formEditProject');
  if (formEdit) {
    formEdit.addEventListener('submit', async (e) => {
      e.preventDefault();

      const idDuAn = document.getElementById('edit_idDuAn').value;
      const data = {
        tenDuAn: document.getElementById('edit_tenDuAn').value.trim(),
        moTa: document.getElementById('edit_moTa').value.trim(),
        ngayBD: document.getElementById('edit_ngayBD').value || null,
        ngayKT: document.getElementById('edit_ngayKT').value || null,
        trangThai: document.getElementById('edit_trangThai').value
      };

      try {
        await updateProject(idDuAn, data);
        alert('Cập nhật dự án thành công!');
        closeModal('editProjectModal');
        
        // Reload lại danh sách và chi tiết dự án
        await loadProjects();
        if (typeof selectProject === 'function') {
          selectProject(idDuAn);
        }
      } catch (err) {
        console.error('Lỗi khi cập nhật dự án:', err);
        alert(err.message);
      }
    });
  }
  const formCreateRecruitment = document.getElementById('createRecruitmentForm');
if (formCreateRecruitment) {
  formCreateRecruitment.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!currentProject) {
      alert('Vui lòng chọn dự án trước!');
      return;
    }

    const data = {
      idDuAn: currentProject.idDuAn,
      tieuDe: document.getElementById('recruitmentTitle').value.trim(),
      yeuCau: document.getElementById('recruitmentRequirements').value.trim(),
      hanNop: document.getElementById('recruitmentDeadline').value || null,
      trangThai: document.getElementById('recruitmentStatus').value
    };

    try {
      await createRecruitment(data);
      alert('Đăng tin tuyển dụng thành công!');
      closeModal('recruitmentModal');
      formCreateRecruitment.reset();
      
      // Reload lại thông tin dự án hiện tại
      if (typeof selectProject === 'function') {
        selectProject(currentProject.idDuAn);
      }
    } catch (err) {
      console.error('Lỗi khi đăng tin tuyển dụng:', err);
      alert(err.message);
    }
  });
}
});
function getRoleLabel(role) {
  switch (role) {
    case 'quan_ly': return 'Quản lý';
    case 'nhan_vien': return 'Nhân viên';
    case 'khach': return 'Khách';
    default: return role;
  }
}
let searchTimeout = null;

// Lắng nghe ô tìm kiếm UserName
document.getElementById('searchUserName')?.addEventListener('input', function(e) {
  const keyword = e.target.value.trim();
  const resultsContainer = document.getElementById('userSearchResults');
  const hiddenInput = document.getElementById('memberUserId');

  // Xóa ID cũ nếu người dùng sửa đổi văn bản
  hiddenInput.value = '';

  if (keyword.length < 2) {
    resultsContainer.style.display = 'none';
    return;
  }

  // Chờ người dùng dừng gõ 300ms mới fetch
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(async () => {
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(keyword)}`);
      if (!res.ok) return;

      const users = await res.json();
      
      // Lọc bỏ những người đã là thành viên trong dự án hiện tại
      const existingIds = (currentProject && currentProject.thanhVien) 
        ? currentProject.thanhVien.map(m => Number(m.idUser)) 
        : [];
      const filteredUsers = users.filter(u => !existingIds.includes(Number(u.idUser)));

      if (filteredUsers.length === 0) {
        resultsContainer.innerHTML = `<li style="padding: 8px 12px; color: #888;">Không tìm thấy người dùng phù hợp</li>`;
      } else {
        resultsContainer.innerHTML = filteredUsers.map(u => `
          <li class="search-item" data-id="${u.idUser}" data-name="${escapeHtml(u.userName)}" style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #eee;">
            <strong>${escapeHtml(u.userName)}</strong> <small style="color:#666;">(${escapeHtml(u.email || '')})</small>
          </li>
        `).join('');
      }

      resultsContainer.style.display = 'block';
    } catch (err) {
      console.error('Lỗi tìm kiếm người dùng:', err);
    }
  }, 300);
});

// Xử lý sự kiện click chọn một người dùng trong danh sách gợi ý
document.getElementById('userSearchResults')?.addEventListener('click', function(e) {
  const item = e.target.closest('.search-item');
  if (!item) return;

  const selectedId = item.getAttribute('data-id');
  const selectedName = item.getAttribute('data-name');

  // Gán thông tin đã chọn
  document.getElementById('memberUserId').value = selectedId;
  document.getElementById('searchUserName').value = selectedName;

  // Ẩn bảng gợi ý
  this.style.display = 'none';
});

// Click ra ngoài thì ẩn dropdown
document.addEventListener('click', function(e) {
  const container = document.querySelector('.user-search-container');
  if (container && !container.contains(e.target)) {
    const resultsContainer = document.getElementById('userSearchResults');
    if (resultsContainer) resultsContainer.style.display = 'none';
  }
}); 
// 1. Click ra ngoài container tìm kiếm thì ẩn dropdown gợi ý
document.addEventListener('click', (e) => {
  const container = document.querySelector('.user-search-container');
  const resultsContainer = document.getElementById('userSearchResults');
  
  if (container && !container.contains(e.target) && resultsContainer) {
    resultsContainer.style.display = 'none';
  }
});
// Hàm mở Modal tạo Task
window.openCreateTaskModal = function() {
  if (!currentProject) {
    alert('Vui lòng chọn dự án trước!');
    return;
  }
  openModal('createTaskModal');
};

// Xử lý Submit Form Tạo Task
// Submit Form Tạo Task
const createTaskForm = document.getElementById('createTaskForm');
if (createTaskForm) {
  createTaskForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!currentProject) return alert('Chưa chọn dự án!');

    const tenTask = document.getElementById('taskName').value.trim();
    const deadLineInput = document.getElementById('taskDeadline').value;
    const trangThai = document.getElementById('taskStatus').value;
    const moTa = document.getElementById('taskDesc').value.trim();

    let deadLine = deadLineInput ? deadLineInput.replace('T', ' ') + ':00' : null;

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          idDuAn: currentProject.idDuAn,
          tenTask,
          moTa,
          deadLine,
          trangThai
        })
      });

      if (res.ok) {
        closeModal('createTaskModal');
        createTaskForm.reset();
        selectProject(currentProject.idDuAn); // Reload lại danh sách task
      } else {
        const err = await res.json();
        alert(err.message || 'Lỗi khi tạo task');
      }
    } catch (err) {
      console.error('Lỗi khi tạo task:', err);
    }
  });
}
async function fetchTasksByProject(idDuAn) {
  try {
    const res = await fetch(`/api/project/${idDuAn}/tasks`);
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error('Lỗi khi tải danh sách task:', err);
    return [];
  }
}
initNavbar();
