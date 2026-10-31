// Bảng tin: danh sách bài viết, đăng bài, like, bình luận, kết bạn và nhắn tin ngay từ bài viết

import {
  fetchPosts,
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
  unMark
} from './api.js';
import { escapeHtml, formatDateTime, closeModal } from './ui.js';
import { loadRelations } from './relations.js';
import { toggleComments } from './comments.js';

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

function renderPost(post) {
  const initial = (post.tenTacGia || '?').trim().charAt(0).toUpperCase();

  // Chỉ hiện ảnh khi hinhAnhUrl không null/rỗng
  const imageHTML = post.hinhAnhUrl
    ? `<div class="post-image">
         <img src="${escapeHtml(post.hinhAnhUrl)}" alt="Post image">
       </div>`
    : '';

  return `
    <article class="card post" data-id="${post.idPost}" data-user="${post.idUser}">
      <div class="card-body">
        <div class="post-header">
          <div class="avatar">${escapeHtml(initial)}</div>
          <div class="post-meta">
            <h6 class="post-author">${escapeHtml(post.tenTacGia)}</h6>
            <small class="text-muted">${formatDateTime(post.createdAt)}</small>
          </div>
          <div class="post-tools" data-role="tools">${toolsHtml(post.idUser)}</div>
        </div>

        <p class="post-content">${escapeHtml(post.noiDung)}</p>
        ${imageHTML}

        <div class="post-stats text-muted">
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
    const posts = await fetchPosts({ limit: PAGE_SIZE });

    if (!posts || posts.length === 0) {
      container.innerHTML = '<p class="empty-text">Chưa có bài viết nào.</p>';
      return;
    }
    container.innerHTML = posts.map(renderPost).join('') + moreHtml(posts);
    oldestId = posts[posts.length - 1].idPost;
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
