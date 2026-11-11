// Tin tuyển dụng: hiển thị danh sách (bảng TinTuyenDung) lên tường

import { fetchJobs , createRecruitments} from './api.js';
import { escapeHtml, formatDate } from './ui.js';

// Tạo HTML cho một tin tuyển dụng
function renderJob(item) {
  const hanNopText = item.hanNop ? formatDate(item.hanNop) : 'Không giới hạn';
  console.log('renderJob item:', item);
  const jobdata = {
    idDuAn: item.idDuAN || '',
    tenDuAn: item.tenDuAn || ''
  }
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
        <button class="btn btn-outline-success btn-sm" id="btnRequestJoinProject" data-id="${escapeHtml(item.idDuAN || '')}" onclick="joinProject(${item.idDuAN})">
               🙋‍♂️ Xin tham gia dự án
             </button>
       </div>
    </div>`;
}
window.joinProject = joinProject; // Đảm bảo hàm joinProject có thể được gọi từ HTML
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
export async function createRecruitment(jobData) {
  const { idDuAn, tieuDe, yeuCau, hanNop, trangThai } = jobData || {};

  if (!idDuAn) {
    throw new Error('Thiếu idDuAn khi tạo tin tuyển dụng');
  }

  const result = await createRecruitments(idDuAn, { tieuDe, yeuCau, hanNop, trangThai });

  if (result.success === false || result.message && !result.idTinTuyen) {
    throw new Error(result.message || 'Không thể tạo tin tuyển dụng');
  }

  return result;
}
async function joinProject(p) {
   if (!confirm(`Bạn muốn gửi yêu cầu tham gia dự án?`)) return;

        try {
          // btnJoin.disabled = true;
          // btnJoin.textContent = '⏳ Đang gửi...';

          const res = await fetch(`/api/projects/${p}/join-request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });

          const result = await res.json();

          if (res.ok) {
            alert('Đã gửi tin nhắn xin tham gia cho chủ dự án!');
            // btnJoin.textContent = '⏳ Đã gửi yêu cầu';
          } else {
            alert(result.message || 'Gửi yêu cầu thất bại');
            // btnJoin.disabled = false;
            // btnJoin.textContent = '🙋‍♂️ Xin tham gia dự án';
          }
        } catch (err) {
          console.error('Lỗi kết nối:', err);
          alert('Không thể kết nối đến máy chủ');
          // btnJoin.disabled = false;
          //  btnJoin.textContent = '🙋‍♂️ Xin tham gia dự án';
        }
      }
    
  