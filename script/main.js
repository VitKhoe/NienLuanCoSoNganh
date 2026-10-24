// Điểm khởi động của trang chủ: nối các chức năng lại với nhau

import { initModals, initMenu } from './ui.js';
import { loadPosts, initPostForm } from './post.js';
import { loadRecruitments } from './recruitments.js';
import { initProjectForm } from './projects.js';

function logout() {
  window.location.href = '/login_signup.html'; // Đổi đường dẫn nếu cần
}

function viewAccount() {
  window.location.href = '/account.html'; // Đổi đường dẫn nếu cần
}

// Gắn hành động cho 2 nút "Đăng xuất" và "Tài khoản" trên thanh menu
function initNavbar() {
  const actions = { btnLogout: logout, btnAccount: viewAccount };

  Object.entries(actions).forEach(([id, action]) => {
    document.getElementById(id)?.addEventListener('click', (e) => {
      e.preventDefault();
      action();
    });
  });
}

// type="module" tự chạy sau khi trang đã được đọc xong nên gọi thẳng được
initModals();
initMenu();
initNavbar();
initPostForm();
initProjectForm();
loadPosts();
loadRecruitments();