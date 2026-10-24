// Hàm giao diện dùng chung: escape HTML, định dạng ngày, modal, menu

// ---------- Tiện ích ----------

// Ngăn lỗ hổng XSS khi chèn chuỗi người dùng nhập vào HTML
export function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// VD: 14:30 12/10/2026
export function formatDateTime(value) {
  return new Date(value).toLocaleString('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short'
  });
}

export function formatDate(value) {
  return new Date(value).toLocaleDateString('vi-VN');
}

// ---------- Modal ----------

export function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
}

export function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');

  // Hết modal nào đang mở thì cho phép cuộn trang lại
  if (!document.querySelector('.modal.is-open')) {
    document.body.classList.remove('modal-open');
  }
}

// Gắn sự kiện cho mọi modal trong trang:
//   data-modal-open="idModal"  -> nút mở modal
//   data-modal-close           -> nút đóng modal chứa nó
export function initModals() {
  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-modal-open]');
    if (opener) {
      openModal(opener.dataset.modalOpen);
      return;
    }

    const closer = e.target.closest('[data-modal-close]');
    if (closer) {
      closeModal(closer.closest('.modal').id);
      return;
    }

    // Bấm ra vùng nền tối bên ngoài hộp thoại thì đóng
    if (e.target.classList.contains('modal')) {
      closeModal(e.target.id);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('.modal.is-open').forEach((modal) => closeModal(modal.id));
  });
}

// ---------- Menu trên màn hình nhỏ ----------

export function initMenu() {
  const toggle = document.getElementById('menuToggle');
  const menu = document.getElementById('menu');
  if (!toggle || !menu) return;

  toggle.addEventListener('click', () => menu.classList.toggle('is-open'));
}