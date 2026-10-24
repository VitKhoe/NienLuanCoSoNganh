// Tin tuyển dụng: hiển thị danh sách (bảng TinTuyenDung) lên tường

import { fetchJobs } from './api.js';
import { escapeHtml, formatDate } from './ui.js';

// Tạo HTML cho một tin tuyển dụng
function renderJob(item) {
  const hanNopText = item.hanNop ? formatDate(item.hanNop) : 'Không giới hạn';

  return `
    <div class="card card-job">
      <div class="card-body">
        <div class="job-top">
          <span class="badge">Tuyển dụng dự án</span>
          <small class="text-muted">Hạn nộp: ${hanNopText}</small>
        </div>

        <h5 class="job-title">${escapeHtml(item.tieuDe)}</h5>
        <p class="job-project">
          <strong>Dự án:</strong> ${escapeHtml(item.tenDuAn || 'Dự án liên kết')}
        </p>

        <div class="job-requirements">
          <strong>Yêu cầu công việc:</strong>
          <p>${escapeHtml(item.yeuCau)}</p>
        </div>

        <button type="button" class="btn btn-outline-success btn-sm">Ứng tuyển ngay</button>
      </div>
    </div>`;
}

export async function loadRecruitments() {
  const container = document.getElementById('recruitmentContainer');
  if (!container) return;

  try {
    const jobs = await fetchJobs();

    if (!jobs || jobs.length === 0) {
      container.innerHTML = '<p class="empty-text">Chưa có tin tuyển dụng nào.</p>';
      return;
    }
    container.innerHTML = jobs.map(renderJob).join('');
  } catch (error) {
    console.error('Lỗi khi tải tin tuyển dụng:', error);
  }
}