// Trang tài khoản (views/account.html): hồ sơ cá nhân + kỹ năng chuyên môn

import {
  ensureLoggedIn,
  updateProfile,
  fetchSkills,
  addSkill,
  updateSkill,
  deleteSkill,
  errorMessage
} from './api.js';
import { escapeHtml, showMessage } from './ui.js';
import { initNavbar } from './navbar.js';

const getEl = (id) => document.getElementById(id);

const LEVEL_LABELS = {
  Beginner: 'Cơ bản',
  Intermediate: 'Trung cấp',
  Expert: 'Thành thạo',
  Master: 'Chuyên gia'
};

// =========================================================================
// 1. HỒ SƠ CÁ NHÂN
// =========================================================================

// Ảnh đại diện: hiện ảnh nếu tải được, không thì hiện chữ cái đầu của tên
function renderAvatar(avatar, name) {
  const box = getEl('avatarPreview');
  box.textContent = (name || '?').trim().charAt(0).toUpperCase();
  if (!avatar) return;

  const img = new Image();
  img.alt = 'Avatar';
  img.addEventListener('load', () => {
    box.textContent = '';
    box.appendChild(img);
  });
  img.src = avatar;
}

function fillProfile(profile) {
  getEl('profileUserName').textContent = profile.userName;
  getEl('profileEmail').textContent = profile.email;
  getEl('HovaTen').value = profile.HovaTen || '';
  getEl('avatar').value = profile.avatar || '';
  getEl('SDT').value = profile.SDT || '';
  getEl('tieuSu').value = profile.tieuSu || '';
  renderAvatar(profile.avatar, profile.HovaTen);
}

function initProfileForm() {
  const form = getEl('formProfile');
  const message = getEl('profileMessage');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    try {
      const profile = await updateProfile({
        HovaTen: getEl('HovaTen').value,
        avatar: getEl('avatar').value,
        SDT: getEl('SDT').value,
        tieuSu: getEl('tieuSu').value
      });
      fillProfile(profile);
      showMessage(message, 'Đã lưu hồ sơ.', 'success');
    } catch (error) {
      showMessage(message, errorMessage(error), 'error');
    }
  });
}

// =========================================================================
// 2. KỸ NĂNG CHUYÊN MÔN
// =========================================================================
let skills = [];       // danh sách đang hiển thị
let editingId = null;  // id kỹ năng đang sửa (null = đang thêm mới)

function renderSkill(skill) {
  return `
    <li class="skill-item" data-id="${skill.idChuyenMon}">
      <div class="skill-info">
        <strong>${escapeHtml(skill.tenKyNang)}</strong>
        <span class="badge">${escapeHtml(LEVEL_LABELS[skill.trinhDo] || skill.trinhDo)}</span>
        <small class="text-muted">${skill.soNamKinhNghiem} năm kinh nghiệm</small>
      </div>
      <div class="skill-actions">
        <button type="button" class="btn btn-outline-success btn-sm" data-action="edit">Sửa</button>
        <button type="button" class="btn btn-outline-danger btn-sm" data-action="delete">Xóa</button>
      </div>
    </li>`;
}

function renderSkills() {
  getEl('skillList').innerHTML = skills.length
    ? skills.map(renderSkill).join('')
    : '<li class="empty-text">Chưa có kỹ năng nào.</li>';
}

async function loadSkills() {
  try {
    skills = await fetchSkills();
    renderSkills();
  } catch (error) {
    console.error('Lỗi khi tải kỹ năng:', error);
    showMessage(getEl('skillMessage'), 'Không thể tải danh sách kỹ năng.', 'error');
  }
}

// Đưa form về trạng thái "thêm mới"
function resetSkillForm() {
  editingId = null;
  getEl('formSkill').reset();
  getEl('btnSaveSkill').textContent = 'Thêm kỹ năng';
  getEl('btnCancelSkill').hidden = true;
}

// Đưa form sang trạng thái "sửa" một kỹ năng
function startEditSkill(skill) {
  editingId = skill.idChuyenMon;
  getEl('tenKyNang').value = skill.tenKyNang;
  getEl('trinhDo').value = skill.trinhDo;
  getEl('soNamKinhNghiem').value = skill.soNamKinhNghiem;
  getEl('btnSaveSkill').textContent = 'Cập nhật kỹ năng';
  getEl('btnCancelSkill').hidden = false;
  getEl('tenKyNang').focus();
}

async function handleDeleteSkill(skill) {
  if (!confirm(`Xóa kỹ năng "${skill.tenKyNang}"?`)) return;

  try {
    await deleteSkill(skill.idChuyenMon);
    if (editingId === skill.idChuyenMon) resetSkillForm();
    showMessage(getEl('skillMessage'), 'Đã xóa kỹ năng.', 'success');
    await loadSkills();
  } catch (error) {
    showMessage(getEl('skillMessage'), errorMessage(error), 'error');
  }
}

function initSkillForm() {
  const form = getEl('formSkill');
  const message = getEl('skillMessage');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = {
      tenKyNang: getEl('tenKyNang').value,
      trinhDo: getEl('trinhDo').value,
      soNamKinhNghiem: getEl('soNamKinhNghiem').value
    };

    try {
      if (editingId === null) {
        await addSkill(data);
      } else {
        await updateSkill(editingId, data);
      }
      showMessage(message, editingId === null ? 'Đã thêm kỹ năng.' : 'Đã cập nhật kỹ năng.', 'success');
      resetSkillForm();
      await loadSkills();
    } catch (error) {
      showMessage(message, errorMessage(error), 'error');
    }
  });

  getEl('btnCancelSkill').addEventListener('click', () => {
    resetSkillForm();
    showMessage(message, '');
  });

  // Nút "Sửa" / "Xóa" trên từng dòng kỹ năng
  getEl('skillList').addEventListener('click', async (e) => {
    const button = e.target.closest('[data-action]');
    if (!button) return;

    const id = Number(button.closest('.skill-item').dataset.id);
    const skill = skills.find((item) => item.idChuyenMon === id);
    if (!skill) return;

    if (button.dataset.action === 'edit') startEditSkill(skill);
    if (button.dataset.action === 'delete') await handleDeleteSkill(skill);
  });
}

// =========================================================================
// KHỞI ĐỘNG
// =========================================================================
async function init() {
  const profile = await ensureLoggedIn(); // chưa đăng nhập thì tự chuyển trang
  if (!profile) return;

  fillProfile(profile);
  await loadSkills();
}

initNavbar();
initProfileForm();
initSkillForm();
init().catch((error) => {
  console.error('Lỗi khi tải trang tài khoản:', error);
  showMessage(getEl('profileMessage'), 'Không thể tải thông tin tài khoản.', 'error');
});