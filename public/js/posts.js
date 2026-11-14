// Bảng tin: danh sách bài viết, đăng bài, like, bình luận, kết bạn và nhắn tin ngay từ bài viết

import {
  fetchPosts,
  fetchJobs,
  createPost,
  likePost,
  unlikePost,
  sendFriendRequest,
  acceptFriendRequest,
  removeConnection,
  openPrivateChat,
  getCurrentUser,
  ApiError,
  errorMessage,
  bookMark,
  unMark,
  getAvatarURL
} from './api.js';
import { escapeHtml, formatDateTime, closeModal } from './ui.js';
import { loadRelations } from './relations.js';
import { toggleComments } from './comments.js';
import { renderJob } from './recruitments.js';

const PAGE_SIZE = 10; // số bài tải mỗi lần

let me = null;              // người đang đăng nhập
let relations = new Map();  // idUser -> 'friend' | 'incoming' | 'outgoing'
let oldestId = null;        // idPost của bài cũ nhất đã tải (dùng để tải thêm bài cũ hơn)
let bound = false;          // đã gắn sự kiện cho bảng tin chưa

// ---------- Hiển thị ----------

// Nút Kết bạn / Nhắn tin hiện ở đầu bài viết của người khác
function toolsHtml(idUser) {
  if (!me || idUser === me.idUser) return '';

  const relation = relations.get(idUser);
  let friendPart = `<button type="button" class="btn btn-outline-success btn-sm" data-action="add-friend">Kết bạn</button>`;

  if (relation === 'friend') {
    friendPart = '<span class="badge">Bạn bè</span>';
  } else if (relation === 'outgoing') {
    friendPart = `<button type="button" class="btn btn-outline-danger btn-sm" data-action="cancel-request">Hủy lời mời</button>`;
  } else if (relation === 'incoming') {
    friendPart = `<button type="button" class="btn btn-success btn-sm" data-action="accept-friend">Chấp nhận kết bạn</button>`;
  }

  return `${friendPart}
    <button type="button" class="btn btn-outline-success btn-sm" data-action="message">Nhắn tin</button>`;
}
function renderAvatar(avatar, name) {
  const textContent = (name || '?').trim().charAt(0).toUpperCase();
  console.log(avatar);
  // Chỉ tải ảnh khi là URL hợp lệ (http/https) hoặc đường dẫn uploads;
  // bỏ qua tên file placeholder như "link_avatar_admin.jpg" để tránh lỗi 404.
  if (!avatar || !/^(https?:\/\/|\/uploads\/)/i.test(avatar)) return;
  try{
    const img = '<img alt="Avatar" src="' + avatar + '">';
    console.log(img);
    return img;
  }catch (error){
    console.log("looix", error);
    return textContent;
  }
}


function renderPost(post) {

  let imageIds = post.imageIds?.split(",").map(Number) || [];
  const avatarUrl = post.avatar;
  let initial = renderAvatar(avatarUrl) || (post.tenTacGia || '?').trim().charAt(0).toUpperCase() ;
  // 1. Render danh sách ảnh nếu mảng post.imageIds có dữ liệu
  let imagesHtml = '';
  if (Array.isArray(imageIds) && imageIds.length > 0) {
    const imgTags = imageIds.map(imageId => `
      <div class="post-img-item" style="flex: 1 1 calc(50% - 8px); max-width: 100%;">
        <img 
          src="/uploads/posts/${imageId}" 
          alt="Ảnh bài viết" 
          class="post-img" 
          loading="lazy"
          style="width: 100%; height: auto; max-height: 400px; object-fit: cover; border-radius: 8px;" 
        />
      </div>
    `).join('');

    imagesHtml = `
      <div class="post-images-grid" style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px;">
        ${imgTags}
      </div>`;
  }
  
  // 2. Tra vè HTML hoàn chỉnh của bài viết
  return `
    <article class="card post" data-id="${post.idPost}" data-user="${post.idUser}">
      <div class="card-body">
        <div class="post-header">
          <div class="avatar">${initial}</div>
          <div class="post-meta">
            <h6 class="post-author">${escapeHtml(post.tenTacGia)}</h6>
            <small class="text-muted">${formatDateTime(post.createdAt)}</small>
          </div>
          <div class="post-tools" data-role="tools">${toolsHtml(post.idUser)}</div>
        </div>

        <p class="post-content">${escapeHtml(post.noiDung)}</p>

        <!-- Hiển thị các ảnh bài viết tại đây -->
        ${imagesHtml}

        <div class="post-stats text-muted" style="margin-top: 12px;">
          <span data-role="like-count">${post.soLike} lượt thích</span>
          <span data-role="comment-count">${post.soBinhLuan} bình luận</span>
        </div>

        <div class="post-actions">
          <button type="button" class="post-action ${post.daMark ? 'is-active' : ''}" data-action="mark">
            <svg class="icon-bookmark" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
            </svg>
            <span class="btn-text">${post.daMark ? 'Đã lưu' : 'Lưu'}</span>
          </button>
          <button type="button" class="post-action ${post.daLike ? 'is-active' : ''}" data-action="like">${post.daLike ? 'Đã thích' : 'Thích'}</button>
          <button type="button" class="post-action" data-action="comments">Bình luận</button>
        </div>

        <div class="comments" data-role="comments" hidden></div>
      </div>
    </article>`;

} 

function moreHtml(posts) {
  return posts.length >= PAGE_SIZE
    ? `<div class="load-more" data-role="more">
         <button type="button" class="btn btn-secondary btn-sm" data-action="load-more">Xem thêm bài viết</button>
       </div>`
    : '';
}

// ---------- Tải dữ liệu ----------

// Lấy người đang đăng nhập và quan hệ bạn bè (chưa đăng nhập thì vẫn xem được bảng tin)
async function loadContext() {
  try {
    me = await getCurrentUser();
    relations = await loadRelations();
  } catch (error) {
    // 401 = chưa đăng nhập: main.js sẽ chuyển sang trang đăng nhập, nên không cần báo lỗi
    if (!(error instanceof ApiError && error.status === 401)) {
      console.error('Không tải được thông tin người dùng:', error);
    }
  }
}

// Tải lại bảng tin từ bài mới nhất
export async function loadPosts() {
  const container = document.getElementById('postContainer');
  if (!container) return;

  bindFeed(container);

  container.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <span>Đang tải...</span>
    </div>`;

  try {
    await loadContext();
    const [posts, jobs] = await Promise.all([
      fetchPosts({ limit: 100 }),
      fetchJobs().catch(() => []),
    ]);

    if ((!posts || posts.length === 0) && (!jobs || jobs.length === 0)) {
      container.innerHTML = '<p class="empty-text">Chưa có bài đăng hay tin tuyển dụng nào.</p>';
      return;
    }

    // Gộp bài viết + tin tuyển dụng, sắp xếp theo thời gian đăng (mới nhất trước)
    const items = [
      ...(posts || []).map((p) => ({ time: new Date(p.createdAt || 0).getTime(), html: renderPost(p) })),
      ...(jobs || []).map((j) => ({ time: new Date(j.created_at || 0).getTime(), html: renderJob(j) })),
    ].sort((a, b) => b.time - a.time);

    container.innerHTML = items.map((i) => i.html).join('');
    if (posts && posts.length > 0) oldestId = posts[posts.length - 1].idPost;
  } catch (error) {
    console.error('Lỗi khi tải danh sách bài viết:', error);
    container.innerHTML = `
      <div class="alert alert-danger">
        Không thể tải danh sách bài viết. Vui lòng kiểm tra kết nối mạng!
      </div>`;
  }
}

// Bấm "Xem thêm bài viết": tải các bài cũ hơn bài cuối đang hiển thị
async function loadMore(button) {
  const more = button.closest('[data-role="more"]');
  button.disabled = true;

  try {
    const posts = await fetchPosts({ limit: PAGE_SIZE, before: oldestId });
    more.insertAdjacentHTML('beforebegin', posts.map(renderPost).join(''));
    if (posts.length > 0) oldestId = posts[posts.length - 1].idPost;

    if (posts.length < PAGE_SIZE) more.remove();
    else button.disabled = false;
  } catch (error) {
    button.disabled = false;
    throw error;
  }
}

// ---------- Hành động trên một bài viết ----------

function updateLike(postEl, { daLike, soLike }) {
  const button = postEl.querySelector('[data-action="like"]');
  button.classList.toggle('is-active', daLike);
  button.textContent = daLike ? 'Đã thích' : 'Thích';
  postEl.querySelector('[data-role="like-count"]').textContent = `${soLike} lượt thích`;
}

async function handleLike(postEl) {
  const idPost = Number(postEl.dataset.id);
  const liked = postEl.querySelector('[data-action="like"]').classList.contains('is-active');
  updateLike(postEl, liked ? await unlikePost(idPost) : await likePost(idPost));
}
function updateMark(postEl, { marked }) {
  const button = postEl.querySelector('[data-action="mark"]');
  button.classList.toggle('is-active', marked);
  const textEl = button.querySelector('.btn-text');
  if (textEl) {
    textEl.textContent = marked? 'Đã lưu' : 'Lưu';
  }
}
async function handleMark(postEl) {
  const idPost = Number(postEl.dataset.id);
  const marked = postEl.querySelector('[data-action="mark"]').classList.contains('is-active');
  updateMark(postEl, marked ? await unMark(idPost) : await bookMark(idPost))
}
// Vẽ lại phần nút Kết bạn / Nhắn tin của mọi bài viết do một người đăng
function refreshTools(idUser) {
  document.querySelectorAll('#postContainer .post').forEach((postEl) => {
    if (Number(postEl.dataset.user) !== idUser) return;
    postEl.querySelector('[data-role="tools"]').innerHTML = toolsHtml(idUser);
  });
}

async function handleRelation(action, idUser) {
  if (action === 'add-friend') {
    await sendFriendRequest(idUser);
    relations.set(idUser, 'outgoing');
  } else if (action === 'cancel-request') {
    await removeConnection(idUser);
    relations.delete(idUser);
  } else if (action === 'accept-friend') {
    await acceptFriendRequest(idUser);
    relations.set(idUser, 'friend');
  }
  refreshTools(idUser);
}

async function handleMessage(idUser) {
  const chat = await openPrivateChat(idUser);
  window.location.href = `/chat.html?chat=${chat.idChatBox}`;
}

// Gắn sự kiện cho cả bảng tin một lần (bài viết nào, kể cả bài tải thêm, cũng dùng chung)
function bindFeed(container) {
  if (bound) return;
  bound = true;

  container.addEventListener('click', async (e) => {
    const button = e.target.closest('[data-action]');
    if (!button) return;
    const action = button.dataset.action;

    try {
      if (action === 'load-more') {
        await loadMore(button);
        return;
      }

      const postEl = button.closest('.post');
      if (!postEl) return;
      const idUser = Number(postEl.dataset.user);

      if (action === 'like') await handleLike(postEl);
      else if (action === 'comments') {
        if (me) await toggleComments(postEl, me);
      } else if (['add-friend', 'cancel-request', 'accept-friend'].includes(action)) {
        await handleRelation(action, idUser);
      } else if (action === 'message') await handleMessage(idUser);
      else if (action === 'mark') await handleMark(postEl);
    } catch (error) {
      alert(errorMessage(error));
    }
  });
}

// ---------- Form đăng bài ----------

/**
 * Upload 1 file ảnh gắn với postId cụ thể
 */
async function uploadPostImage(postId, file) {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('fileName', file.name);

  // Gọi đúng route với postId lấy từ Bước 1
  const response = await fetch(`/api/posts/${postId}/images`, {
    method: 'POST',
    body: formData
  });

  const result = await response.json();
  if (!response.ok || result.success === false) {
    throw new Error(result.message || `Lỗi khi tải ảnh ${file.name}`);
  }
  return result;
}
export function initPostForm() {
  const form = document.getElementById('formCreatePost');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const noiDung = document.getElementById('noiDung').value.trim();
    const fileInput = document.getElementById('hinhAnhUrl');
    const files = fileInput ? fileInput.files : [];

    if (!noiDung) {
      alert('Vui lòng nhập nội dung bài viết!');
      return;
    }

    try {
      // 🔑 BƯỚC 1: Tạo bài viết trước để lấy idPost từ Server
      let postResult = await createPost({ noiDung });
      if (postResult instanceof Response) {
      postResult = await postResult.json();
      }
      // Lấy idPost trả về từ response backend
      console.log('Kết quả tạo bài viết:', postResult);
      const postId = postResult.idPost || postResult.idBaiViet || postResult.data?.idPost;

      if (!postId) {
        throw new Error('Không nhận được ID bài viết sau khi tạo');
      }

      // 🔑 BƯỚC 2: Duyệt danh sách file ảnh và upload tuần tự bằng postId vừa có
      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          await uploadPostImage(postId, files[i]);
        }
      }

      alert('Đăng bài viết và tải ảnh thành công!');
      form.reset();
      if (typeof closeModal === 'function') closeModal('createPostModal');
      if (typeof loadPosts === 'function') loadPosts();

    } catch (error) {
      console.error('Lỗi khi đăng bài:', error);
      alert(typeof errorMessage === 'function' ? errorMessage(error) : (error.message || 'Có lỗi xảy ra'));
    }
  });
}
document.addEventListener('DOMContentLoaded', function() {
  const inputHinhAnh = document.getElementById('hinhAnhUrl');
  const previewContainer = document.getElementById('previewImages');

  // Kiểm tra xem HTML có các ID này chưa để tránh lỗi
  if (!inputHinhAnh || !previewContainer) {
    console.error("Lỗi: Không tìm thấy input 'hinhAnhUrl' hoặc div 'previewImages' trong HTML!");
    return;
  }

  // Bắt sự kiện khi người dùng chọn file
  inputHinhAnh.addEventListener('change', function(e) {
    previewContainer.innerHTML = ''; // Xóa các ảnh cũ (nếu có) khi người dùng chọn lại file
    const files = e.target.files;
    
    if (files && files.length > 0) {
      // Duyệt qua từng file đã chọn
      Array.from(files).forEach(file => {
        // Chỉ xử lý nếu file đó là hình ảnh
        if (!file.type.startsWith('image/')) return;

        const reader = new FileReader();
        
        reader.onload = function(event) {
          // Tạo thẻ <img> mới
          const img = document.createElement('img');
          img.src = event.target.result;
          
          // CSS cho ảnh đẹp hơn
          img.style.width = '80px';
          img.style.height = '80px';
          img.style.objectFit = 'cover';
          img.style.borderRadius = '8px';
          img.style.border = '1px solid #ccc';
          
          // Đẩy ảnh vào thẻ div
          previewContainer.appendChild(img);
        }
        
        // Đọc file ảnh dưới dạng URL base64
        reader.readAsDataURL(file);
      });
    }
  });
});
export function initImageLightbox() {
  const modal = document.getElementById('imageLightboxModal');
  const modalImg = document.getElementById('lightboxImage');
  const closeBtn = document.querySelector('.lightbox-close');

  if (!modal || !modalImg) return;

  // 1. Lắng nghe sự kiện click vào ảnh .post-img trong vùng chứa bài viết (Event Delegation)
  const postsContainer = document.getElementById('postsContainer') || document.body;
  
  postsContainer.addEventListener('click', (e) => {
    if (e.target && e.target.classList.contains('post-img')) {
      modalImg.src = e.target.src;
      modal.removeAttribute('hidden');
      modal.style.display = 'flex';
    }
  });

  // 2. Đóng modal khi bấm nút X hoặc bấm ra ngoài ảnh
  const closeModalz = () => {
    modal.setAttribute('hidden', '');
    modal.style.display = 'none';
    modalImg.src = '';
  };

  if (closeBtn) closeBtn.addEventListener('click', closeModalz);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModalz();
  });

  // 3. Đóng modal khi nhấn phím ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hasAttribute('hidden')) {
      closeModalz();
    }
  });
}
document.addEventListener('DOMContentLoaded', () => {
  initImageLightbox();
});