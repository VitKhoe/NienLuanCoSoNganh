// Dự án: form tạo dự án (bảng DuAn) kèm tin tuyển dụng đăng đồng thời

import { createProject, errorMessage } from './api.js';
import { closeModal } from './ui.js';
import { loadRecruitments } from './recruitments.js';

// Lấy giá trị (đã cắt khoảng trắng) của một ô nhập theo id
function getValue(id) {
  return document.getElementById(id).value.trim();
}

export async function initProjectForm() {
  const form = document.getElementById('formCreateProject');
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
      await createProject(payload);
      alert('Tạo dự án và đăng tin tuyển dụng thành công!');
      form.reset();
      closeModal('createProjectModal');
      loadRecruitments(); // tải lại để hiện tin tuyển dụng mới
    } catch (error) {
      console.error('Lỗi khi gửi dữ liệu:', error);
      alert(errorMessage(error));
    }
  });
}