// Điểm khởi động của trang chủ: nối các chức năng lại với nhau

import { initModals } from './ui.js';
import { initNavbar } from './navbar.js';
import { ensureLoggedIn } from './api.js';
import { loadPosts, initPostForm } from './posts.js';
import { loadRecruitments } from './recruitments.js';
import { initProjectForm } from './projects.js';

// type="module" tự chạy sau khi trang đã được đọc xong nên gọi thẳng được
initModals();
initNavbar();
initPostForm();
initProjectForm();
loadPosts();
loadRecruitments();

// Chưa đăng nhập thì chuyển về trang đăng nhập
ensureLoggedIn().catch((error) => console.error('Lỗi kiểm tra đăng nhập:', error));