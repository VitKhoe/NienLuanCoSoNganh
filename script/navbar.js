// Thanh điều hướng dùng chung cho các trang: menu thu gọn, "Đăng xuất", "Tài khoản"

import { logout } from './api.js';
import { initMenu } from './ui.js';

async function handleLogout() {
  try {
    await logout();
  } catch (error) {
    console.error('Lỗi khi đăng xuất:', error);
  }
  window.location.href = '/login_signup.html';
}

function viewAccount() {
  window.location.href = '/account.html';
}

export function initNavbar() {
  initMenu();

  const actions = { btnLogout: handleLogout, btnAccount: viewAccount };

  Object.entries(actions).forEach(([id, action]) => {
    document.getElementById(id)?.addEventListener('click', async (e) => {
      e.preventDefault();
      await action();
    });
  });
}