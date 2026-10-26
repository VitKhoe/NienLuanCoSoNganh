// Trang đăng nhập / đăng ký (public/login_signup.html)

import { login, signup, fetchMe, ApiError } from './api.js';
import { showMessage } from './ui.js';

const getEl = (id) => document.getElementById(id);

// Hiện lỗi từ server (không thêm tiền tố "Lỗi Server") hoặc lỗi mạng
function showError(error) {
  const text = error instanceof ApiError ? error.message : 'Không thể kết nối tới Server!';
  showMessage(getEl('authMessage'), text, 'error');
}

// Chuyển giữa tab "Đăng nhập" và "Đăng ký"
function showTab(name) {
  document.querySelectorAll('[data-tab]').forEach((tab) => {
    tab.classList.toggle('is-active', tab.dataset.tab === name);
  });
  getEl('formLogin').hidden = name !== 'login';
  getEl('formSignup').hidden = name !== 'signup';
  showMessage(getEl('authMessage'), '');
}

function initTabs() {
  document.querySelectorAll('[data-tab]').forEach((tab) => {
    tab.addEventListener('click', () => showTab(tab.dataset.tab));
  });
}

function initLoginForm() {
  const form = getEl('formLogin');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    try {
      await login({
        email: getEl('loginEmail').value.trim(),
        password: getEl('loginPassword').value
      });
      window.location.href = '/'; // vào trang chủ
    } catch (error) {
      showError(error);
    }
  });
}

function initSignupForm() {
  const form = getEl('formSignup');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const password = getEl('signupPassword').value;
    if (password !== getEl('signupConfirm').value) {
      showMessage(getEl('authMessage'), 'Mật khẩu nhập lại không khớp', 'error');
      return;
    }

    const email = getEl('signupEmail').value.trim();

    try {
      await signup({
        username: getEl('signupUsername').value.trim(),
        email,
        password
      });

      form.reset();
      showTab('login');
      getEl('loginEmail').value = email;
      showMessage(getEl('authMessage'), 'Đăng ký thành công, hãy đăng nhập.', 'success');
    } catch (error) {
      showError(error);
    }
  });
}

// Đã đăng nhập rồi thì không cần ở trang này nữa
async function redirectIfLoggedIn() {
  try {
    await fetchMe();
    window.location.replace('/');
  } catch {
    // chưa đăng nhập (hoặc server lỗi): ở lại trang đăng nhập
  }
}

initTabs();
initLoginForm();
initSignupForm();
redirectIfLoggedIn();