// Điểm khởi động của trang chủ: nối các chức năng lại với nhau

import { initModals } from './ui.js';
import { initNavbar } from './navbar.js';
import { ensureLoggedIn , getProjectDetail} from './api.js';
import { fetchProjects, createProjectNon_TT} from './api.js';
// import { getProjectDetail } from './project-detail.js'; // Hàm hiển thị chi tiết (nếu có)

let allProjects = []; // Lưu trữ danh sách gốc để hỗ trợ tìm kiếm client-side

// 1. Hàm gọi API lấy danh sách dự án
// export async function fetchProjects() {
//   const projectListEl = document.getElementById('projectList');
//   if (!projectListEl) return;

//   try {
//     const response = await request('/api/projects', { method: 'GET' });
//     allProjects = await response.json();

//     renderProjectList(allProjects);
//   } catch (error) {
//     console.error('Lỗi tải danh sách dự án:', error);
//     projectListEl.innerHTML = `<li class="error-text">Không thể tải danh sách dự án.</li>`;
//   }
// }
export function listenButton(elementId, handler) {
  const button = document.getElementById(elementId);
  
  if (!button) {
    console.warn(`Không tìm thấy nút với ID: "${elementId}"`);
    return;
  }

  button.addEventListener('click', async (event) => {
    try {
      await handler(event);
    } catch (error) {
      console.error('Lỗi khi bấm nút:', error);
    }
  });
}
function getValue(id) {
  return document.getElementById(id).value.trim();
}
export function initProjectForm(idEl) {
  const form = document.getElementById(idEl);
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const tenDuAn = getValue('tenDuAn');
    if (!tenDuAn) {
      alert('Vui lòng nhập tên dự án!');
      return;
    }

    // Gom dữ liệu dự án + tin tuyển dụng đi kèm
    const payload = {
      tenDuAn,
      moTa: getValue('moTa'),
      ngayBD: getValue('ngayBD') || null,
      ngayKT: getValue('ngayKT') || null,
      trangThai: getValue('trangThai')
    };
    console.log('Dữ liệu gửi đi:', payload);
    try {
      await createProjectNon_TT(payload);
      alert('Tạo dự án và đăng tin tuyển dụng thành công!');
      form.reset();
// tải lại để hiện tin tuyển dụng mới
      window.location.reload();
    } catch (error) {
      console.error('Lỗi khi gửi dữ liệu:', error);
      alert(errorMessage(error));
    }
  });
}
// 2. Hàm render danh sách dự án ra HTML
export async function renderProjectList(projects) {
  const projectListEl = document.getElementById('projectList');
  if (!projectListEl) return;

  if (projects.length === 0) {
    projectListEl.innerHTML = `<li class="empty-text">Không tìm thấy dự án nào.</li>`;
    return;
  }

  const statusLabels = {
    not_started: 'Chưa bắt đầu',
    in_progress: 'Đang làm',
    completed: 'Hoàn thành'
  };

  projectListEl.innerHTML = projects.map(p => `
    <li class="project-item" data-id="${p.idDuAn}">
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

  // Bắt sự kiện click vào từng dự án để xem chi tiết
  
}

// 3. Khởi tạo sự kiện Tìm kiếm (Search Box)
export function initProjectSearch() {
  const searchInput = document.getElementById('searchProjectInput');
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    const keyword = e.target.value.toLowerCase().trim();

    // Lọc dự án theo Tên hoặc Mô tả
    const filteredProjects = allProjects.filter(p => 
      p.tenDuAn.toLowerCase().includes(keyword) || 
      (p.moTa && p.moTa.toLowerCase().includes(keyword))
    );

    renderProjectList(filteredProjects);
  });
}

// Hàm hỗ trợ escape HTML tránh lỗi XSS
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
export function renderProjectDetail(projectData) {
  const currentUserId = localStorage.currentUserId;
  const detailPanel = document.getElementById('projectDetailPanel');
  if (!detailPanel || !projectData) return;

  const members = projectData.thanhVien || [];

  const statusMap = {
    'not_started': { label: 'Chưa bắt đầu', class: 'badge-not_started' },
    'in_progress': { label: 'Đang thực hiện', class: 'badge-in_progress' },
    'completed': { label: 'Hoàn thành', class: 'badge-completed' }
  };
  const statusInfo = statusMap[projectData.trangThai] || { label: projectData.trangThai, class: '' };

  // 2. Định dạng ngày thán
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Chưa thiết lập';
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN');
  };

  const isMember = members.some(m => Number(m.idUser) === Number(currentUserId)) || 
                   Number(projectData.idUserTao) === Number(currentUserId);

  const membersHtml = members.length > 0 
    ? members.map(m => {
        const roleLabel = m.vaiTro === 'quan_ly' ? 'Quản lý' : (m.vaiTro === 'nhan_vien' ? 'Nhân viên' : 'Khách');
        const avatarUrl = m.avatar || '/assets/default-avatar.png';
        return `
          <li class="member-item">
            <div class="member-info">
              <img src="${avatarUrl}" alt="${m.tenThanhVien}" class="member-avatar" />
              <span class="member-name">${m.tenThanhVien}</span>
            </div>
            <span class="member-role badge badge-${m.vaiTro}">${roleLabel}</span>
          </li>
        `;
      }).join('')
    : '<li>Chưa có thành viên nào</li>';

  // 5. Render HTML chi tiết dự án
  detailPanel.innerHTML = `
    <div class="project-detail-header">
      <div class="title-group">
        <h3>${projectData.tenDuAn}</h3>
        <span class="badge ${statusInfo.class}">${statusInfo.label}</span>
      </div>

    </div>

    <div class="project-detail-body">
      <div class="info-group">
        <small>Tạo bởi: <strong>${projectData.tenNguoiTao}</strong></small>
      </div>

      <div class="info-group">
        <label>Mô tả dự án:</label>
        <p class="description-text">${projectData.moTa || 'Không có mô tả cho dự án này.'}</p>
      </div>

      <div class="info-row">
        <div class="info-group">
          <label>Ngày bắt đầu:</label>
          <p>${formatDate(projectData.ngayBD)}</p>
        </div>
        <div class="info-group">
          <label>Ngày kết thúc:</label>
          <p>${formatDate(projectData.ngayKT)}</p>
        </div>
      </div>

      <hr class="divider">

      <div class="members-section">
        <div class="members-header">
          <h4>Danh sách Thành viên (${members.length})</h4>
        </div>
        <ul class="member-list">
          ${membersHtml}
        </ul>
        
      <!-- Khu vực nút hành động theo trạng thái tham gia -->
      <div class="join-action-group">
        ${isMember 
          ? `<span class="badge badge-success">✓ Bạn là thành viên</span>`
          : `<button class="btn btn-primary" id="btnRequestJoinProject" data-id="${projectData.idDuAn}">
               🙋‍♂️ Xin tham gia dự án
             </button>`
        }
      </div>
      </div>
    </div>
  `;

  // 6. Gán sự kiện cho nút Xin tham gia (Tạm thời để trống)
  if (!isMember) {
    const btnJoin = document.getElementById('btnRequestJoinProject');
    if (btnJoin) {
      btnJoin.addEventListener('click', async() => {
        if (!confirm(`Bạn muốn gửi yêu cầu tham gia dự án "${projectData.tenDuAn}"?`)) return;

        try {
          btnJoin.disabled = true;
          btnJoin.textContent = '⏳ Đang gửi...';

          const res = await fetch(`/api/projects/${projectData.idDuAn}/join-request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });

          const result = await res.json();

          if (res.ok) {
            alert('Đã gửi tin nhắn xin tham gia cho chủ dự án!');
            btnJoin.textContent = '⏳ Đã gửi yêu cầu';
          } else {
            alert(result.message || 'Gửi yêu cầu thất bại');
            btnJoin.disabled = false;
            btnJoin.textContent = '🙋‍♂️ Xin tham gia dự án';
          }
        } catch (err) {
          console.error('Lỗi kết nối:', err);
          alert('Không thể kết nối đến máy chủ');
          btnJoin.disabled = false;
          btnJoin.textContent = '🙋‍♂️ Xin tham gia dự án';
        }
      });
    }
  }
}
// 4. Hàm khởi chạy trang WorkSpaces
export async function initProjectModule() {
  const projectListEl = document.getElementById('projectList');
  if (!projectListEl) return;
  try {
    const response = await fetchProjects();
    allProjects =  response;
    renderProjectList(allProjects);
    const projectDetail = document.getElementById('projectList');
    projectDetail.addEventListener('click', async (e) => {
      const projectItem = e.target.closest('.project-item');
      if (!projectItem) return;
      const projectId = projectItem.dataset.id;
      const projectData = await getProjectDetail(projectId);
      if(!projectData) return;
      renderProjectDetail(projectData);
    });

  }catch (error){
    console.error('Lỗi tải danh sách dự án:', error);
    projectListEl.innerHTML = `<li class="error-text">Không thể tải danh sách dự án.</li>`;
  }
  initProjectSearch();
  // listenButton('btnOpenCreateModal', )
}

// Khởi chạy khi load xong DOM
document.addEventListener('DOMContentLoaded', initProjectModule);

// type="module" tự chạy sau khi trang đã được đọc xong nên gọi thẳng được

initNavbar();
initModals();
// initProjectModule();
initProjectForm('formCreateProject')
// Chưa đăng nhập thì chuyển về trang đăng nhập
ensureLoggedIn().catch((error) => console.error('Lỗi kiểm tra đăng nhập:', error));