import {
  getAllSkillsCatalog,
  getMyCompetency,
  saveMySkill,
  deleteMySkill,
  saveMyCertification,
  deleteMyCertification,
  saveMyEducation,
  deleteMyEducation,
  saveMyWorkExperience,
  deleteMyWorkExperience
} from './api.js';

const CAP_DO_LABELS = {
  1: 'Cơ bản (Lv.1)',
  2: 'Khá / Trung cấp (Lv.2)',
  3: 'Thành thạo (Lv.3)',
  4: 'Chuyên gia (Lv.4)'
};

const TRANG_THAI_DUYET_LABELS = {
  cho_duyet: '⏳ Chờ duyệt',
  hop_le: '✅ Hợp lệ',
  tu_choi: '❌ Từ chối'
};

let editingCertId = null;

// Helper chống XSS khi render chuỗi HTML
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Helper hiển thị thông báo trên thẻ <p id="skillMessage"> hoặc <p id="certMessage">
function showSectionMessage(elementId, text, isError = false) {
  const el = document.getElementById(elementId);
  if (!el) return;

  el.textContent = text;
  el.hidden = false;
  el.style.color = isError ? '#dc3545' : '#198754';

  clearTimeout(el._hideTimer);
  el._hideTimer = setTimeout(() => {
    el.hidden = true;
  }, 3500);
}

// =========================================================================
// 1. TẢI DỮ LIỆU DANH MỤC GỢI Ý, KỸ NĂNG & CHỨNG CHỈ
// =========================================================================
export async function loadCompetencySection() {
  try {
    const [catalogRes, compRes] = await Promise.all([
      getAllSkillsCatalog().catch(() => ({ data: [] })),
      getMyCompetency()
    ]);

    // Đổ gợi ý từ bảng ky_nang vào <datalist id="skillSuggestions">
    const catalog = Array.isArray(catalogRes) ? catalogRes : (catalogRes?.data || []);
    const datalist = document.getElementById('skillSuggestions');
    if (datalist) {
      datalist.innerHTML = catalog
        .map(s => `<option value="${escapeHtml(s.tenKyNang)}">${escapeHtml(s.nhomNganh || '')}</option>`)
        .join('');
    }

    const payload = compRes?.data || compRes || {};
    const skills = payload.skills || [];
    const certs = payload.certs || [];
    const hocVan = payload.hocVan || [];
    const kinhNghiem = payload.kinhNghiem || [];

    renderSkillList(skills);
    renderCertList(certs);
    renderHocVanList(hocVan);
    renderKinhNghiemList(kinhNghiem);
  } catch (err) {
    console.error('Lỗi tải dữ liệu năng lực:', err);
    showSectionMessage('skillMessage', err.message || 'Không thể tải dữ liệu năng lực.', true);
  }
}

// =========================================================================
// 2. RENDER DANH SÁCH KỸ NĂNG (#skillList)
// =========================================================================
function renderSkillList(skills) {
  const ul = document.getElementById('skillList');
  if (!ul) return;

  if (!Array.isArray(skills) || skills.length === 0) {
    ul.innerHTML = `<li class="text-muted">Chưa kê khai kỹ năng chuyên môn nào.</li>`;
    return;
  }

  ul.innerHTML = skills.map(s => `
    <li class="skill-item" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border: 1px solid #e0e0e0; border-radius: 6px; margin-bottom: 8px; background: #fff;">
      <div>
        <strong>${escapeHtml(s.tenKyNang)}</strong>
        ${s.nhomNganh ? `<small class="text-muted"> [${escapeHtml(s.nhomNganh)}]</small>` : ''}
        <div style="font-size: 13px; color: #555; margin-top: 3px;">
          Trình độ: <b>${CAP_DO_LABELS[Number(s.capDo)] || `Lv.${s.capDo}`}</b>
          • Kinh nghiệm: <b>${Number(s.soNamKinhNghiem || 0)} năm</b>
          ${s.daXacThuc ? `<span style="color: #2b8a3e; font-weight: 600; margin-left: 6px;">✔ Đã xác thực</span>` : ''}
        </div>
      </div>
      <div style="display: flex; gap: 6px;">
        <button type="button" class="btn btn-sm btn-secondary" onclick="editSkillItem(${JSON.stringify(s).replace(/"/g, '&quot;')})">Sửa</button>
        <button type="button" class="btn btn-sm btn-danger" onclick="removeSkillItem(${s.id})">Xóa</button>
      </div>
    </li>
  `).join('');
}

// =========================================================================
// 3. RENDER DANH SÁCH CHỨNG CHỈ GOOGLE DRIVE (#certList)
// =========================================================================
function renderCertList(certs) {
  const ul = document.getElementById('certList');
  if (!ul) return;

  if (!Array.isArray(certs) || certs.length === 0) {
    ul.innerHTML = `<li class="text-muted">Chưa kê khai chứng chỉ / bằng cấp nào.</li>`;
    return;
  }

  ul.innerHTML = certs.map(c => {
    const ngayCapStr = c.ngayCap ? String(c.ngayCap).slice(0, 10) : '--';
    const ngayHetHanStr = c.ngayHetHan ? String(c.ngayHetHan).slice(0, 10) : 'Vô thời hạn';

    return `
      <li class="skill-item" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border: 1px solid #e0e0e0; border-radius: 6px; margin-bottom: 8px; background: #fff;">
        <div>
          <strong>${escapeHtml(c.tenChungChi)}</strong>
          <span style="font-size: 12px; margin-left: 6px;">${TRANG_THAI_DUYET_LABELS[c.trangThaiDuyet] || ''}</span>
          <div style="font-size: 13px; color: #555; margin-top: 3px;">
            Đơn vị cấp: <b>${escapeHtml(c.toChucCap)}</b>
            ${c.maChungChi ? ` • Mã số: <code>${escapeHtml(c.maChungChi)}</code>` : ''}
          </div>
          <div style="font-size: 12px; color: #777; margin-top: 2px;">
            Ngày cấp: ${ngayCapStr} | Hiệu lực đến: ${ngayHetHanStr}
          </div>
        </div>
        <div style="display: flex; gap: 6px; align-items: center;">
          ${c.drive_url ? `
            <a href="${escapeHtml(c.drive_url)}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline" style="text-decoration: none;">
              Xem Drive ↗
            </a>
          ` : ''}
          <button type="button" class="btn btn-sm btn-secondary" onclick="editCertItem(${JSON.stringify(c).replace(/"/g, '&quot;')})">Sửa</button>
          <button type="button" class="btn btn-sm btn-danger" onclick="removeCertItem(${c.idChungChi})">Xóa</button>
        </div>
      </li>
    `;
  }).join('');
}

// =========================================================================
// 4. THÊM / SỬA / XÓA KỸ NĂNG (#formSkill)
// =========================================================================
function resetSkillForm() {
  const form = document.getElementById('formSkill');
  if (form) form.reset();

  const tenInput = document.getElementById('tenKyNang');
  if (tenInput) tenInput.readOnly = false;

  const btnCancel = document.getElementById('btnCancelSkill');
  const btnSave = document.getElementById('btnSaveSkill');
  if (btnCancel) btnCancel.hidden = true;
  if (btnSave) btnSave.textContent = 'Thêm kỹ năng';
}

function initSkillEvents() {
  const formSkill = document.getElementById('formSkill');
  const btnCancelSkill = document.getElementById('btnCancelSkill');

  if (btnCancelSkill) {
    btnCancelSkill.addEventListener('click', resetSkillForm);
  }

  if (formSkill) {
    formSkill.addEventListener('submit', async (e) => {
      e.preventDefault();

      const tenKyNang = document.getElementById('tenKyNang')?.value.trim();
      const nhomNganh = document.getElementById('nhomNganh')?.value.trim() || 'Chung';
      const capDo = Number(document.getElementById('capDo')?.value || 1);
      const soNamKinhNghiem = Number(document.getElementById('soNamKinhNghiem')?.value || 0);

      if (!tenKyNang) {
        showSectionMessage('skillMessage', 'Vui lòng nhập tên kỹ năng.', true);
        return;
      }

      try {
        await saveMySkill({ tenKyNang, nhomNganh, capDo, soNamKinhNghiem });
        resetSkillForm();
        showSectionMessage('skillMessage', 'Đã lưu kỹ năng thành công!');
        await loadCompetencySection();
      } catch (err) {
        showSectionMessage('skillMessage', err.message || 'Lỗi khi lưu kỹ năng.', true);
      }
    });
  }
}

window.editSkillItem = function (s) {
  const tenInput = document.getElementById('tenKyNang');
  const nhomInput = document.getElementById('nhomNganh');
  const capDoSelect = document.getElementById('capDo');
  const expInput = document.getElementById('soNamKinhNghiem');

  if (tenInput) {
    tenInput.value = s.tenKyNang || '';
    tenInput.readOnly = true; // Khóa tên kỹ năng khi sửa để tránh tạo trùng bản ghi
  }
  if (nhomInput) nhomInput.value = s.nhomNganh || '';
  if (capDoSelect) capDoSelect.value = String(s.capDo || 1);
  if (expInput) expInput.value = s.soNamKinhNghiem ?? 0;

  const btnCancel = document.getElementById('btnCancelSkill');
  const btnSave = document.getElementById('btnSaveSkill');
  if (btnCancel) btnCancel.hidden = false;
  if (btnSave) btnSave.textContent = 'Cập nhật kỹ năng';

  capDoSelect?.focus();
};

window.removeSkillItem = async function (id) {
  if (!confirm('Bạn có chắc muốn xóa kỹ năng này khỏi hồ sơ?')) return;

  try {
    await deleteMySkill(id);
    showSectionMessage('skillMessage', 'Đã xóa kỹ năng.');
    await loadCompetencySection();
  } catch (err) {
    showSectionMessage('skillMessage', err.message || 'Không thể xóa kỹ năng.', true);
  }
};

// =========================================================================
// 5. THÊM / SỬA / XÓA CHỨNG CHỈ GOOGLE DRIVE (#formCert)
// =========================================================================
function resetCertForm() {
  editingCertId = null;
  const form = document.getElementById('formCert');
  if (form) form.reset();

  const btnCancel = document.getElementById('btnCancelCert');
  const btnSave = document.getElementById('btnSaveCert');
  if (btnCancel) btnCancel.hidden = true;
  if (btnSave) btnSave.textContent = 'Thêm chứng chỉ';
}

function initCertEvents() {
  const formCert = document.getElementById('formCert');
  const btnCancelCert = document.getElementById('btnCancelCert');

  if (btnCancelCert) {
    btnCancelCert.addEventListener('click', resetCertForm);
  }

  if (formCert) {
    formCert.addEventListener('submit', async (e) => {
      e.preventDefault();

      const tenChungChi = document.getElementById('tenChungChi')?.value.trim();
      const toChucCap = document.getElementById('toChucCap')?.value.trim();
      const maChungChi = document.getElementById('maChungChi')?.value.trim() || null;
      const ngayCap = document.getElementById('ngayCap')?.value;
      const ngayHetHan = document.getElementById('ngayHetHan')?.value || null;
      const drive_url = document.getElementById('certDriveUrl')?.value.trim() || null;

      if (!tenChungChi || !toChucCap || !ngayCap) {
        showSectionMessage('certMessage', 'Vui lòng nhập đầy đủ Tên chứng chỉ, Đơn vị cấp và Ngày cấp.', true);
        return;
      }

      if (drive_url && !/^https:\/\/(drive|docs)\.google\.com\/.+/i.test(drive_url)) {
        showSectionMessage('certMessage', 'Đường dẫn minh chứng phải là link từ Google Drive (drive.google.com).', true);
        return;
      }

      try {
        await saveMyCertification({
          idChungChi: editingCertId,
          tenChungChi,
          toChucCap,
          maChungChi,
          ngayCap,
          ngayHetHan,
          drive_url
        });

        resetCertForm();
        showSectionMessage('certMessage', 'Đã lưu chứng chỉ thành công!');
        await loadCompetencySection();
      } catch (err) {
        showSectionMessage('certMessage', err.message || 'Lỗi khi lưu chứng chỉ.', true);
      }
    });
  }
}

window.editCertItem = function (c) {
  editingCertId = c.idChungChi;

  document.getElementById('tenChungChi').value = c.tenChungChi || '';
  document.getElementById('toChucCap').value = c.toChucCap || '';
  document.getElementById('maChungChi').value = c.maChungChi || '';
  document.getElementById('ngayCap').value = c.ngayCap ? String(c.ngayCap).slice(0, 10) : '';
  document.getElementById('ngayHetHan').value = c.ngayHetHan ? String(c.ngayHetHan).slice(0, 10) : '';
  document.getElementById('certDriveUrl').value = c.drive_url || '';

  const btnCancel = document.getElementById('btnCancelCert');
  const btnSave = document.getElementById('btnSaveCert');
  if (btnCancel) btnCancel.hidden = false;
  if (btnSave) btnSave.textContent = 'Cập nhật chứng chỉ';

  document.getElementById('tenChungChi')?.focus();
};

window.removeCertItem = async function (idChungChi) {
  if (!confirm('Bạn có chắc muốn xóa chứng chỉ này khỏi hồ sơ?')) return;

  try {
    await deleteMyCertification(idChungChi);
    if (editingCertId === idChungChi) resetCertForm();
    showSectionMessage('certMessage', 'Đã xóa chứng chỉ.');
    await loadCompetencySection();
  } catch (err) {
    showSectionMessage('certMessage', err.message || 'Không thể xóa chứng chỉ.', true);
  }
};

// =========================================================================
// 5. HỌC VẤN & KINH NGHIỆM LÀM VIỆC
// =========================================================================
let editingHocVanId = null;
let editingKinhNghiemId = null;

function renderHocVanList(hocVan) {
  const ul = document.getElementById('hocVanList');
  if (!ul) return;
  if (!Array.isArray(hocVan) || hocVan.length === 0) {
    ul.innerHTML = '<li class="text-muted">Chưa kê khai học vấn nào.</li>';
    return;
  }
  ul.innerHTML = hocVan.map((h) => `
    <li class="skill-item" style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border:1px solid #e0e0e0;border-radius:6px;margin-bottom:8px;background:#fff;">
      <div>
        <strong>${escapeHtml(h.truongHoc)}</strong>
        ${h.bangCap ? `<span class="badge">${escapeHtml(h.bangCap)}</span>` : ''}
        <div style="font-size:13px;color:#555;margin-top:3px;">${escapeHtml(h.chuyenNganh || '')}${h.namBatDau || h.namKetThuc ? ` • ${h.namBatDau || '?'} - ${h.namKetThuc || 'nay'}` : ''}</div>
        ${h.moTa ? `<div style="font-size:12px;color:#777;margin-top:2px;">${escapeHtml(h.moTa)}</div>` : ''}
      </div>
      <div style="display:flex;gap:6px;">
        <button type="button" class="btn btn-sm btn-secondary" onclick="editHocVanItem(${JSON.stringify(h).replace(/"/g, '&quot;')})">Sửa</button>
        <button type="button" class="btn btn-sm btn-danger" onclick="removeHocVanItem(${h.idHocVan})">Xóa</button>
      </div>
    </li>`).join('');
}

function renderKinhNghiemList(kinhNghiem) {
  const ul = document.getElementById('kinhNghiemList');
  if (!ul) return;
  if (!Array.isArray(kinhNghiem) || kinhNghiem.length === 0) {
    ul.innerHTML = '<li class="text-muted">Chưa kê khai kinh nghiệm nào.</li>';
    return;
  }
  ul.innerHTML = kinhNghiem.map((k) => {
    const bd = k.ngayBatDau ? String(k.ngayBatDau).slice(0, 10) : '';
    const kt = k.ngayKetThuc ? String(k.ngayKetThuc).slice(0, 10) : 'Nay';
    return `
    <li class="skill-item" style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border:1px solid #e0e0e0;border-radius:6px;margin-bottom:8px;background:#fff;">
      <div>
        <strong>${escapeHtml(k.tenCongTy)}</strong>
        ${k.viTri ? `<span style="margin-left:6px;font-size:13px;color:#555;">${escapeHtml(k.viTri)}</span>` : ''}
        <div style="font-size:12px;color:#777;margin-top:2px;">${bd ? `${bd} - ${kt}` : ''}</div>
        ${k.moTa ? `<div style="font-size:12px;color:#777;margin-top:2px;">${escapeHtml(k.moTa)}</div>` : ''}
      </div>
      <div style="display:flex;gap:6px;">
        <button type="button" class="btn btn-sm btn-secondary" onclick="editKinhNghiemItem(${JSON.stringify(k).replace(/"/g, '&quot;')})">Sửa</button>
        <button type="button" class="btn btn-sm btn-danger" onclick="removeKinhNghiemItem(${k.idKinhNghiem})">Xóa</button>
      </div>
    </li>`;
  }).join('');
}

function resetHocVanForm() {
  editingHocVanId = null;
  const form = document.getElementById('formHocVan');
  if (form) form.reset();
  const btnCancel = document.getElementById('btnCancelHocVan');
  const btnSave = document.getElementById('btnSaveHocVan');
  if (btnCancel) btnCancel.hidden = true;
  if (btnSave) btnSave.textContent = 'Thêm học vấn';
}

function initHocVanEvents() {
  const form = document.getElementById('formHocVan');
  const btnCancel = document.getElementById('btnCancelHocVan');
  if (btnCancel) btnCancel.addEventListener('click', resetHocVanForm);

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const truongHoc = document.getElementById('truongHoc')?.value.trim();
      if (!truongHoc) {
        showSectionMessage('hocVanMessage', 'Vui lòng nhập tên trường.', true);
        return;
      }
      try {
        await saveMyEducation({
          idHocVan: editingHocVanId,
          truongHoc,
          chuyenNganh: document.getElementById('chuyenNganh')?.value.trim() || null,
          bangCap: document.getElementById('bangCap')?.value || null,
          namBatDau: document.getElementById('namBatDau')?.value || null,
          namKetThuc: document.getElementById('namKetThuc')?.value || null,
          moTa: document.getElementById('moTaHocVan')?.value.trim() || null
        });
        resetHocVanForm();
        showSectionMessage('hocVanMessage', 'Đã lưu học vấn!');
        await loadCompetencySection();
      } catch (err) {
        showSectionMessage('hocVanMessage', err.message || 'Lỗi khi lưu học vấn.', true);
      }
    });
  }
}

window.editHocVanItem = function (h) {
  editingHocVanId = h.idHocVan;
  document.getElementById('truongHoc').value = h.truongHoc || '';
  document.getElementById('chuyenNganh').value = h.chuyenNganh || '';
  document.getElementById('bangCap').value = h.bangCap || '';
  document.getElementById('namBatDau').value = h.namBatDau || '';
  document.getElementById('namKetThuc').value = h.namKetThuc || '';
  document.getElementById('moTaHocVan').value = h.moTa || '';
  document.getElementById('btnCancelHocVan').hidden = false;
  document.getElementById('btnSaveHocVan').textContent = 'Cập nhật học vấn';
  document.getElementById('truongHoc')?.focus();
};

window.removeHocVanItem = async function (id) {
  if (!confirm('Bạn có chắc muốn xóa học vấn này?')) return;
  try {
    await deleteMyEducation(id);
    showSectionMessage('hocVanMessage', 'Đã xóa học vấn.');
    await loadCompetencySection();
  } catch (err) {
    showSectionMessage('hocVanMessage', err.message || 'Không thể xóa học vấn.', true);
  }
};

function resetKinhNghiemForm() {
  editingKinhNghiemId = null;
  const form = document.getElementById('formKinhNghiem');
  if (form) form.reset();
  const btnCancel = document.getElementById('btnCancelKinhNghiem');
  const btnSave = document.getElementById('btnSaveKinhNghiem');
  if (btnCancel) btnCancel.hidden = true;
  if (btnSave) btnSave.textContent = 'Thêm kinh nghiệm';
}

function initKinhNghiemEvents() {
  const form = document.getElementById('formKinhNghiem');
  const btnCancel = document.getElementById('btnCancelKinhNghiem');
  if (btnCancel) btnCancel.addEventListener('click', resetKinhNghiemForm);

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const tenCongTy = document.getElementById('tenCongTy')?.value.trim();
      if (!tenCongTy) {
        showSectionMessage('kinhNghiemMessage', 'Vui lòng nhập tên công ty.', true);
        return;
      }
      try {
        await saveMyWorkExperience({
          idKinhNghiem: editingKinhNghiemId,
          tenCongTy,
          viTri: document.getElementById('viTri')?.value.trim() || null,
          moTa: document.getElementById('moTaKinhNghiem')?.value.trim() || null,
          ngayBatDau: document.getElementById('ngayBatDau')?.value || null,
          ngayKetThuc: document.getElementById('ngayKetThuc')?.value || null
        });
        resetKinhNghiemForm();
        showSectionMessage('kinhNghiemMessage', 'Đã lưu kinh nghiệm!');
        await loadCompetencySection();
      } catch (err) {
        showSectionMessage('kinhNghiemMessage', err.message || 'Lỗi khi lưu kinh nghiệm.', true);
      }
    });
  }
}

window.editKinhNghiemItem = function (k) {
  editingKinhNghiemId = k.idKinhNghiem;
  document.getElementById('tenCongTy').value = k.tenCongTy || '';
  document.getElementById('viTri').value = k.viTri || '';
  document.getElementById('moTaKinhNghiem').value = k.moTa || '';
  document.getElementById('ngayBatDau').value = k.ngayBatDau ? String(k.ngayBatDau).slice(0, 10) : '';
  document.getElementById('ngayKetThuc').value = k.ngayKetThuc ? String(k.ngayKetThuc).slice(0, 10) : '';
  document.getElementById('btnCancelKinhNghiem').hidden = false;
  document.getElementById('btnSaveKinhNghiem').textContent = 'Cập nhật kinh nghiệm';
  document.getElementById('tenCongTy')?.focus();
};

window.removeKinhNghiemItem = async function (id) {
  if (!confirm('Bạn có chắc muốn xóa kinh nghiệm này?')) return;
  try {
    await deleteMyWorkExperience(id);
    showSectionMessage('kinhNghiemMessage', 'Đã xóa kinh nghiệm.');
    await loadCompetencySection();
  } catch (err) {
    showSectionMessage('kinhNghiemMessage', err.message || 'Không thể xóa kinh nghiệm.', true);
  }
};

// =========================================================================
// 6. KHỞI TẠO KHI TRANG TẢI XONG
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
  initSkillEvents();
  initCertEvents();
  initHocVanEvents();
  initKinhNghiemEvents();
  loadCompetencySection();
});


