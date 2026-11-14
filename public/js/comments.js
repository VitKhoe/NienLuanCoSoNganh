// Bình luận của một bài viết: xem, thêm, trả lời, sửa, xóa (bảng comment)

import { fetchComments, addComment, updateComment, deleteComment, uploadCommentImage, errorMessage } from './api.js';
import { escapeHtml, formatDateTime, showMessage } from './ui.js';

// Trạng thái riêng của từng khung bình luận (mỗi bài viết có một khung)
const panels = new WeakMap();

const SKELETON = `
  <p class="message" data-role="message" hidden></p>
  <ul class="comment-list" data-role="list"></ul>
  <form class="comment-form" data-role="form">
    <div class="comment-hint" data-role="hint" hidden>
      <span data-role="hint-text"></span>
      <button type="button" class="link-button" data-action="cancel">Hủy</button>
    </div>
    <div class="comment-preview" data-role="preview" hidden>
      <img class="comment-preview-img" data-role="preview-img" src="" alt="Ảnh bình luận">
      <button type="button" class="comment-preview-remove" data-action="remove-image" title="Xóa ảnh">&times;</button>
    </div>
    <div class="comment-form-row">
      <input type="text" data-role="input" maxlength="2000" placeholder="Viết bình luận..." autocomplete="off">
      <input type="file" data-role="image-input" accept="image/*" style="display: none;">
      <button type="button" class="comment-btn-img" data-action="pick-image" title="Đính kèm ảnh">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
      </button>
      <button type="submit" class="btn btn-primary btn-sm" data-role="submit">Gửi</button>
    </div>
  </form>`;

const part = (panel, role) => panel.querySelector(`[data-role="${role}"]`);

// ---------- Hiển thị ----------

function renderComment(comment, me, repliesHtml) {
  const own = me && comment.idUser === me.idUser;
  const ownButtons = own
    ? `<button type="button" class="link-button" data-action="edit">Sửa</button>
       <button type="button" class="link-button link-danger" data-action="delete">Xóa</button>`
    : '';

  const imageHtml = comment.hinhAnhUrl
    ? `<div class="comment-image-box">
         <img src="${escapeHtml(comment.hinhAnhUrl)}" alt="Ảnh bình luận" class="comment-img post-img" loading="lazy">
       </div>`
    : '';

  const textHtml = comment.noiDung
    ? `<span class="comment-text">${escapeHtml(comment.noiDung)}</span>`
    : '';

  return `
    <li class="comment" data-id="${comment.idComment}">
      <div class="comment-body">
        <strong class="comment-author">${escapeHtml(comment.tenNguoiBinhLuan)}</strong>
        ${textHtml}
        ${imageHtml}
        <div class="comment-meta">
          <small class="text-muted">${formatDateTime(comment.createdAt)}</small>
          <button type="button" class="link-button" data-action="reply">Trả lời</button>
          ${ownButtons}
        </div>
      </div>
      ${repliesHtml ? `<ul class="comment-replies">${repliesHtml}</ul>` : ''}
    </li>`;
}

// Dựng danh sách phẳng từ server thành cây: bình luận trả lời nằm lồng trong bình luận gốc
function renderTree(comments, me) {
  const ids = new Set(comments.map((comment) => comment.idComment));
  const children = new Map();

  for (const comment of comments) {
    // Bình luận trả lời một bình luận không còn trong danh sách thì xem như bình luận gốc
    const parent = ids.has(comment.idParentComment) ? comment.idParentComment : 0;
    if (!children.has(parent)) children.set(parent, []);
    children.get(parent).push(comment);
  }

  const renderLevel = (parent) =>
    (children.get(parent) || [])
      .map((comment) => renderComment(comment, me, renderLevel(comment.idComment)))
      .join('');

  return renderLevel(0);
}

// ---------- Trạng thái của ô nhập: thêm mới / trả lời / sửa ----------

function setMode(panel, state, mode, target = null) {
  state.mode = mode;
  state.target = target;
  state.selectedFile = null;
  state.existingImageUrl = null;

  const input = part(panel, 'input');
  const hint = part(panel, 'hint');
  const fileInput = part(panel, 'image-input');
  const preview = part(panel, 'preview');
  const previewImg = part(panel, 'preview-img');

  if (fileInput) fileInput.value = '';
  hint.hidden = mode === 'new';
  part(panel, 'submit').textContent = mode === 'edit' ? 'Lưu' : 'Gửi';

  if (mode === 'reply') {
    part(panel, 'hint-text').textContent = `Đang trả lời ${target.tenNguoiBinhLuan}`;
    input.value = '';
    if (preview) preview.hidden = true;
    if (previewImg) previewImg.src = '';
  } else if (mode === 'edit') {
    part(panel, 'hint-text').textContent = 'Đang sửa bình luận';
    input.value = target.noiDung || '';
    if (target.hinhAnhUrl) {
      state.existingImageUrl = target.hinhAnhUrl;
      if (previewImg) previewImg.src = target.hinhAnhUrl;
      if (preview) preview.hidden = false;
    } else {
      if (preview) preview.hidden = true;
      if (previewImg) previewImg.src = '';
    }
  } else {
    input.value = '';
    if (preview) preview.hidden = true;
    if (previewImg) previewImg.src = '';
  }
  if (mode !== 'new') input.focus();
}

async function reload(panel, state) {
  state.comments = await fetchComments(state.idPost);

  part(panel, 'list').innerHTML = state.comments.length
    ? renderTree(state.comments, state.me)
    : '<li class="empty-text">Chưa có bình luận nào.</li>';

  // Cập nhật số bình luận hiển thị trên bài viết
  const counter = state.postEl.querySelector('[data-role="comment-count"]');
  if (counter) counter.textContent = `${state.comments.length} bình luận`;
}

async function handleDelete(panel, state, comment) {
  if (!confirm('Xóa bình luận này? Các câu trả lời của nó cũng bị xóa.')) return;

  await deleteComment(comment.idComment);
  if (state.target && state.target.idComment === comment.idComment) setMode(panel, state, 'new');
  await reload(panel, state);
}

async function handleSubmit(panel, state) {
  const noiDung = part(panel, 'input').value.trim();
  const file = state.selectedFile;
  const existingImage = state.existingImageUrl;

  if (!noiDung && !file && !existingImage) return;

  const submitBtn = part(panel, 'submit');
  submitBtn.disabled = true;

  try {
    if (state.mode === 'edit') {
      await updateComment(state.target.idComment, {
        noiDung,
        hinhAnhUrl: file ? null : (existingImage || null)
      });
      if (file) {
        await uploadCommentImage(state.target.idComment, file);
      }
    } else {
      const data = {
        noiDung,
        hasImage: Boolean(file)
      };
      if (state.mode === 'reply') data.idParentComment = state.target.idComment;
      const res = await addComment(state.idPost, data);
      const newCommentId = res.idComment || res.id;
      if (file && newCommentId) {
        await uploadCommentImage(newCommentId, file);
      }
    }

    setMode(panel, state, 'new');
    await reload(panel, state);
  } finally {
    submitBtn.disabled = false;
  }
}

// ---------- Khởi tạo khung bình luận (một lần cho mỗi bài viết) ----------

function initPanel(panel, postEl, me) {
  panel.innerHTML = SKELETON;
  const state = {
    idPost: Number(postEl.dataset.id),
    postEl,
    me,
    comments: [],
    mode: 'new',
    target: null,
    selectedFile: null,
    existingImageUrl: null
  };
  panels.set(panel, state);

  const message = part(panel, 'message');
  const fileInput = part(panel, 'image-input');

  // Xử lý chọn ảnh
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        showMessage(message, 'Vui lòng chọn file hình ảnh', 'error');
        fileInput.value = '';
        return;
      }
      state.selectedFile = file;
      state.existingImageUrl = null;
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        const preview = part(panel, 'preview');
        const previewImg = part(panel, 'preview-img');
        if (previewImg && preview) {
          previewImg.src = loadEvt.target.result;
          preview.hidden = false;
        }
      };
      reader.readAsDataURL(file);
    });
  }

  panel.addEventListener('click', async (e) => {
    const button = e.target.closest('[data-action]');
    if (!button) return;
    e.stopPropagation(); // không để bảng tin ở ngoài xử lý lại cùng cú bấm này

    const item = button.closest('.comment');
    const comment = item
      ? state.comments.find((c) => c.idComment === Number(item.dataset.id))
      : null;
    const action = button.dataset.action;

    try {
      showMessage(message, '');
      if (action === 'cancel') {
        setMode(panel, state, 'new');
      } else if (action === 'pick-image') {
        if (fileInput) fileInput.click();
      } else if (action === 'remove-image') {
        state.selectedFile = null;
        state.existingImageUrl = null;
        if (fileInput) fileInput.value = '';
        const preview = part(panel, 'preview');
        if (preview) preview.hidden = true;
        const previewImg = part(panel, 'preview-img');
        if (previewImg) previewImg.src = '';
      } else if (action === 'reply' && comment) {
        setMode(panel, state, 'reply', comment);
      } else if (action === 'edit' && comment) {
        setMode(panel, state, 'edit', comment);
      } else if (action === 'delete' && comment) {
        await handleDelete(panel, state, comment);
      }
    } catch (error) {
      showMessage(message, errorMessage(error), 'error');
    }
  });

  part(panel, 'form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      showMessage(message, '');
      await handleSubmit(panel, state);
    } catch (error) {
      showMessage(message, errorMessage(error), 'error');
    }
  });

  return state;
}

// Bấm nút Bình luận: mở khung (tải bình luận) hoặc đóng khung lại
export async function toggleComments(postEl, me) {
  const panel = postEl.querySelector('[data-role="comments"]');

  if (!panel.hidden) {
    panel.hidden = true;
    return;
  }
  panel.hidden = false;

  const state = panels.get(panel) || initPanel(panel, postEl, me);
  try {
    await reload(panel, state);
  } catch (error) {
    showMessage(part(panel, 'message'), errorMessage(error), 'error');
  }
}