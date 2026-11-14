// Tin tuyển dụng: hiển thị danh sách (bảng TinTuyenDung) lên tường

import { fetchJobs , createRecruitments, applyRecruitment, getApplications, reviewApplication, saveRecruitment, unsaveRecruitment } from './api.js';
import { escapeHtml, formatDate, formatDateTime } from './ui.js';

// Tạo HTML cho một tin tuyển dụng
export function renderJob(item) {
  const hanNopText = item.hanNop ? formatDate(item.hanNop) : 'Không giới hạn';
  const postedText = item.created_at ? formatDateTime(item.created_at) : '';
  return `
    <div class="card card-job">
      <div class="card-body">
        <div class="job-top">
          <span class="badge">Tuyển dụng dự án</span>
          ${postedText ? `<small class="text-muted">Đăng: ${postedText}</small>` : ''}
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
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;">
          <button class="btn btn-outline-success btn-sm" onclick="joinProject(${item.idDuAN})">🙋‍♂️ Xin tham gia dự án</button>
          ${Number(localStorage.getItem('currentUserId')) === Number(item.idUser)
            ? `<button class="btn btn-outline-primary btn-sm" onclick="viewApplications(${item.idTinTuyen})">👥 Xem đơn ứng tuyển</button>`
            : `<button class="btn btn-outline-primary btn-sm" onclick="applyJob(${item.idTinTuyen})">📨 Ứng tuyển</button>`}
          <button class="btn btn-outline-warning btn-sm" onclick="toggleSaveJob(${item.idTinTuyen}, this)">🔖 Lưu tin</button>
        </div>
       </div>
    </div>`;
}
window.joinProject = joinProject; // Đảm bảo hàm joinProject có thể được gọi từ HTML

// ---- Ứng tuyển, lưu tin, xem đơn (Nhóm 3) ----
window.applyJob = async function(idTinTuyen) {
  const loiNhan = prompt('Lời nhắn gửi nhà tuyển dụng (tùy chọn):') || '';
  try {
    const r = await applyRecruitment(idTinTuyen, loiNhan);
    alert(r.message || 'Đã nộp đơn ứng tuyển');
  } catch (e) { alert(e.message || 'Lỗi khi ứng tuyển'); }
};

window.toggleSaveJob = async function(idTinTuyen, btn) {
  try {
    if (btn.dataset.saved === '1') {
      await unsaveRecruitment(idTinTuyen);
      btn.dataset.saved = '0';
      btn.textContent = '🔖 Lưu tin';
    } else {
      await saveRecruitment(idTinTuyen);
      btn.dataset.saved = '1';
      btn.textContent = '✅ Đã lưu';
    }
  } catch (e) { alert(e.message || 'Lỗi khi lưu tin'); }
};

window.viewApplications = async function(idTinTuyen) {
  try {
    const list = await getApplications(idTinTuyen);
    document.getElementById('applicationsModal')?.remove();
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'applicationsModal';
    modal.dataset.idTin = idTinTuyen;
    modal.innerHTML = `
      <div class="modal-dialog modal-lg">
        <div class="modal-header">
          <h5 class="modal-title">👥 Đơn ứng tuyển (${list.length})</h5>
          <button type="button" class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
        </div>
        <div class="modal-body" style="max-height:400px;overflow:auto;">
          ${list.length ? list.map((a) => `
            <div style="border:1px solid #e0e0e0;border-radius:6px;padding:10px;margin-bottom:8px;">
              <strong>${escapeHtml(a.tenNguoiDung)}</strong> <small>(${escapeHtml(a.email)})</small>
              <span class="badge">${a.trangThai}</span>
              ${a.loiNhan ? `<div style="font-size:13px;color:#555;">${escapeHtml(a.loiNhan)}</div>` : ''}
              ${a.trangThai === 'Pending' ? `
                <div style="margin-top:6px;display:flex;gap:6px;">
                  <button class="btn btn-xs btn-success" onclick="reviewApp(${a.idUngTuyen}, 'Accepted')">✅ Duyệt</button>
                  <button class="btn btn-xs btn-danger" onclick="reviewApp(${a.idUngTuyen}, 'Rejected')">❌ Từ chối</button>
                </div>` : ''}
            </div>`).join('') : '<i>Chưa có đơn ứng tuyển nào.</i>'}
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  } catch (e) { alert(e.message || 'Lỗi khi tải đơn ứng tuyển'); }
};

window.reviewApp = async function(idUngTuyen, trangThai) {
  try {
    await reviewApplication(idUngTuyen, trangThai);
    const modal = document.getElementById('applicationsModal');
    const idTin = Number(modal?.dataset.idTin);
    modal?.remove();
    if (idTin) viewApplications(idTin);
  } catch (e) { alert(e.message || 'Lỗi khi duyệt đơn'); }
};
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
    
  