// Trang bạn bè (views/friends.html): bạn bè, lời mời nhận được, lời mời đã gửi

import {
  ensureLoggedIn,
  fetchConnections,
  acceptFriendRequest,
  removeConnection,
  openPrivateChat,
  errorMessage
} from './api.js';
import { escapeHtml, showMessage } from './ui.js';
import { initNavbar } from './navbar.js';

const getEl = (id) => document.getElementById(id);

const TYPES = ['friends', 'incoming', 'outgoing'];

const EMPTY_TEXT = {
  friends: 'Bạn chưa có bạn bè nào. Hãy bấm Kết bạn ở các bài viết trên trang chủ.',
  incoming: 'Không có lời mời kết bạn nào đang chờ bạn.',
  outgoing: 'Bạn chưa gửi lời mời nào.'
};

// Các nút trên mỗi người: [hành động, chữ trên nút, lớp CSS]
const ACTIONS = {
  friends: [
    ['message', 'Nhắn tin', 'btn-outline-success'],
    ['unfriend', 'Hủy kết bạn', 'btn-outline-danger']
  ],
  incoming: [
    ['accept', 'Chấp nhận', 'btn-success'],
    ['decline', 'Từ chối', 'btn-outline-danger']
  ],
  outgoing: [['cancel', 'Thu hồi', 'btn-outline-danger']]
};

const DONE_TEXT = {
  accept: 'Đã chấp nhận lời mời kết bạn.',
  decline: 'Đã từ chối lời mời.',
  cancel: 'Đã thu hồi lời mời.',
  unfriend: 'Đã hủy kết bạn.'
};

let current = 'friends';
let lists = { friends: [], incoming: [], outgoing: [] };

// ---------- Hiển thị ----------

function renderPerson(person, type) {
  const initial = (person.ten || '?').trim().charAt(0).toUpperCase();
  const buttons = ACTIONS[type]
    .map(([action, label, css]) => `<button type="button" class="btn ${css} btn-sm" data-action="${action}">${label}</button>`)
    .join('');

  return `
    <li class="person" data-id="${person.idUser}">
      <div class="avatar">${escapeHtml(initial)}</div>
      <div class="person-info">
        <strong>${escapeHtml(person.ten)}</strong><br>
        <small class="text-muted">@${escapeHtml(person.userName)}</small>
      </div>
      <div class="person-actions">${buttons}</div>
    </li>`;
}

function render() {
  document.querySelectorAll('[data-tab]').forEach((tab) => {
    tab.classList.toggle('is-active', tab.dataset.tab === current);
  });
  TYPES.forEach((type) => {
    getEl(`count-${type}`).textContent = lists[type].length;
  });

  getEl('friendList').innerHTML = lists[current].length
    ? lists[current].map((person) => renderPerson(person, current)).join('')
    : `<li class="empty-text">${EMPTY_TEXT[current]}</li>`;
}

async function loadLists() {
  const results = await Promise.all(TYPES.map((type) => fetchConnections(type)));
  TYPES.forEach((type, index) => {
    lists[type] = results[index];
  });
  render();
}

// ---------- Hành động ----------

async function handleAction(action, person) {
  if (action === 'message') {
    const chat = await openPrivateChat(person.idUser);
    window.location.href = `/chat.html?chat=${chat.idChatBox}`;
    return;
  }
  if (action === 'unfriend' && !confirm(`Hủy kết bạn với ${person.ten}?`)) return;

  if (action === 'accept') await acceptFriendRequest(person.idUser);
  else await removeConnection(person.idUser); // decline, cancel, unfriend

  showMessage(getEl('friendsMessage'), DONE_TEXT[action], 'success');
  await loadLists();
}

function initEvents() {
  document.querySelectorAll('[data-tab]').forEach((tab) => {
    tab.addEventListener('click', () => {
      current = tab.dataset.tab;
      showMessage(getEl('friendsMessage'), '');
      render();
    });
  });

  getEl('friendList').addEventListener('click', async (e) => {
    const button = e.target.closest('[data-action]');
    if (!button) return;

    const id = Number(button.closest('.person').dataset.id);
    const person = lists[current].find((item) => item.idUser === id);
    if (!person) return;

    try {
      await handleAction(button.dataset.action, person);
    } catch (error) {
      showMessage(getEl('friendsMessage'), errorMessage(error), 'error');
    }
  });
}

// ---------- Khởi động ----------
async function init() {
  const me = await ensureLoggedIn(); // chưa đăng nhập thì tự chuyển trang
  if (!me) return;
  await loadLists();
}

initNavbar();
initEvents();
init().catch((error) => {
  console.error('Lỗi khi tải trang bạn bè:', error);
  showMessage(getEl('friendsMessage'), 'Không thể tải danh sách bạn bè.', 'error');
});