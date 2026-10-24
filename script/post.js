// Bài viết: hiển thị danh sách (bảng Post) và form đăng bài mới

import { fetchPosts, createPost, errorMessage } from './api.js';
import { escapeHtml, formatDateTime, closeModal } from './ui.js';

// Tạo HTML cho một bài viết
function renderPost(post) {
  const initial = post.idUser ? post.idUser.toString().charAt(0).toUpperCase() : 'U';

  // Chỉ hiện ảnh khi hinhAnhUrl không null/rỗng
  const imageHTML = post.hinhAnhUrl
    ? `<div class="post-image">
         <img src="${escapeHtml(post.hinhAnhUrl)}" alt="Post image">
       </div>`
    : '';

  return `
    <div class="card">
      <div class="card-body">
        <div class="post-header">
          <div class="avatar">${initial}</div>
          <div>
            <h6 class="post-author">Người dùng #${post.idUser}</h6>
            <small class="text-muted">${formatDateTime(post.createdAt)}</small>
          </div>
        </div>
        <p class="post-content">${escapeHtml(post.noiDung)}</p>
        ${imageHTML}
      </div>
    </div>`;
}

// Gọi API lấy bài viết và vẽ lên trang
export async function loadPosts() {
  const container = document.getElementById('postContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <span>Đang tải...</span>
    </div>`;

  try {
    const posts = await fetchPosts();

    if (!posts || posts.length === 0) {
      container.innerHTML = '<p class="empty-text">Chưa có bài viết nào.</p>';
      return;
    }
    container.innerHTML = posts.map(renderPost).join('');
  } catch (error) {
    console.error('Lỗi khi tải danh sách bài viết:', error);
    container.innerHTML = `
      <div class="alert alert-danger">
        Không thể tải danh sách bài viết. Vui lòng kiểm tra kết nối mạng!
      </div>`;
  }
}

// Xử lý gửi form tạo bài viết
export function initPostForm() {
  const form = document.getElementById('formCreatePost');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const noiDung = document.getElementById('noiDung').value.trim();
    const file = document.getElementById('hinhAnhUrl').files[0];

    if (!noiDung) {
      alert('Vui lòng nhập nội dung bài viết!');
      return;
    }

    try {
      await createPost({ noiDung, hinhAnhUrl: file ? file.name : null });
      alert('Đăng bài viết thành công!');
      form.reset();
      closeModal('createPostModal');
      loadPosts();
    } catch (error) {
      console.error('Lỗi khi gửi bài viết:', error);
      alert(errorMessage(error));
    }
  });
}