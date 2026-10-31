// Trang tin nhắn (views/chat.html): danh sách cuộc trò chuyện, nhắn tin 1-1 và nhóm.
// Tin mới được nhận bằng cách hỏi lại server định kỳ (polling).

import {
  ensureLoggedIn,
  fetchChats,
  fetchMessages,
  sendMessage,
  openPrivateChat,
  createGroupChat,
  fetchConnections,
  errorMessage,
  getProjectDetail
} from './api.js';
import { escapeHtml, formatDateTime, showMessage, initModals, closeModal } from './ui.js';
import { initNavbar } from './navbar.js';

const getEl = (id) => document.getElementById(id);

const POLL_MS = 3000;       // hỏi tin mới của cuộc đang mở mỗi 3 giây
const LIST_MS = 8000;       // làm mới danh sách cuộc trò chuyện mỗi 8 giây

let me = null;
let chats = [];
let current = null;         // cuộc trò chuyện đang mở
let lastMessageId = null;   // idMessage của tin mới nhất đã hiển thị

// ---------- Danh sách cuộc trò chuyện ----------

function renderChatItem(chat) {
  const initial = (chat.ten || '?').trim().charAt(0).toUpperCase();
  const active = current && chat.idChatBox === current.idChatBox ? 'is-active' : '';
  const last = chat.tinCuoi;
  const preview = last
    ? `${last.idNguoiGui === me.idUser ? 'Bạn: ' : ''}${last.noiDung}`
    : 'Chưa có tin nhắn';

  return `
    <li class="chat-item ${active}" data-id="${chat.idChatBox}">
      <div class="avatar">${escapeHtml(initial)}</div>
      <div class="chat-item-info">
        <div class="chat-item-name">${escapeHtml(chat.ten)}${chat.loai === 'Group' ? ' <span class="badge">Nhóm</span>' : ''}</div>
        <div class="chat-item-preview">${escapeHtml(preview)}</div>
      </div>
    </li>`;
}

function renderChatList() {
  getEl('chatList').innerHTML = chats.length
    ? chats.map(renderChatItem).join('')
    : '<li class="empty-text">Chưa có cuộc trò chuyện nào. Hãy bấm Nhắn tin ở trang Bạn bè, hoặc tạo nhóm mới.</li>';
}

async function loadChats() {
  chats = await fetchChats();
  if (current) current = chats.find((chat) => chat.idChatBox === current.idChatBox) || current;
  renderChatList();
}

// ---------- Tin nhắn ----------

function parseJoinRequest(noiDung) {
  if (!noiDung || !noiDung.startsWith('[JOIN_REQUEST]')) return null;

  try {
    // 1. Xóa chữ [JOIN_REQUEST] và khoảng trắng thừa ở 2 đầu
    const jsonString = noiDung.replace('[JOIN_REQUEST]', '').trim();
    
    // 2. Ép kiểu về Object
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Lỗi parse JSON tin nhắn:', error);
    return null;
  }
}
function isJoinRequest(noiDung){
  if (typeof noiDung !== 'string' || !noiDung.startsWith('[JOIN_REQUEST]')) {
    return false;
  }
  return true;
}

async function renderMessage(message) {
  const own = message.idUser === me.idUser;
  const sender = !own && current.loai === 'Group'
    ? `<span class="chat-sender">${escapeHtml(message.tenNguoiGui)}</span>`
    : '';
  
  if (isJoinRequest(message.noiDung)){
    const data = parseJoinRequest(message.noiDung);
    const projectId = data.idDuAn;
    const projectData = await getProjectDetail(projectId);
    const members = projectData.thanhVien || [];
    const currentUserId = message.idUser;

    let isMember = members.some(m => Number(m.idUser) === Number(currentUserId)) || 
                   Number(projectData.idUserTao) === Number(currentUserId);
    if (!own) isMember = false;

    return `
    <div class="chat-message ${isMember ? 'chat-message-own' : ''}" data-id="${message.idMessage}">
      <div class="join-request-card">
        <div class="request-header">
          <span><strong>Yêu cầu tham gia dự án</strong></span>
        </div>
        <div class="request-body">
          <div class="project-title">📁 ${escapeHtml(data.tenDuAn)}</div>
        </div>
        <div class="request-actions">
          ${own 
            ? `<span class="request-status pending">${isMember ? "Bạn đã là thành viên" :"⏳ Đã gửi yêu cầu (Đang chờ duyệt)"}</span>`
            : `<button class="btn-accept" onclick="handleAcceptJoin(${data.idDuAn}, ${message.idUser}, ${message.idMessage})">
                 ✓ Đồng ý
               </button>
               <button class="btn-reject" onclick="handleRejectJoin(${data.idDuAn}, ${message.idUser}, ${message.idMessage}, '${escapeHtml(data.tenDuAn)}')">
                 ✕ Từ chối
               </button>`
          }
        </div>
        <span class="chat-time">${formatDateTime(message.thoiGian)}</span>
      </div>
      </div>
    `;
  }else {
    return `
    <div class="chat-message ${own ? 'chat-message-own' : ''}" data-id="${message.idMessage}">
      ${sender}
      <span class="chat-text">${escapeHtml(message.noiDung)}</span>
      <span class="chat-time">${formatDateTime(message.thoiGian)}</span>
    </div>`;
  }
  
}
async function handleAcceptJoin(idDuAn, idUserXin, idMessage) {
  if (!confirm('Bạn có chắc chắn muốn duyệt thành viên này vào dự án?')) return;

  try {
    // 1. Gọi API backend thêm người dùng vào bảng thanhvienduan
    const res = await fetch(`/api/projects/${idDuAn}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idUser: idUserXin,
        vaiTro: 'nhan_vien' // Mặc định vai trò thành viên
      })
    });

    const result = await res.json();

    if (res.ok) {
      // 2. Gửi tin nhắn thông báo chấp nhận vào phòng chat
      if (typeof sendMessage === 'function') {
        await sendMessage(current.idChatBox, '✓ Yêu cầu tham gia dự án đã được chấp nhận!');
      }

      // 3. Cập nhật giao diện nút bấm thành trạng thái "Đã chấp nhận"
      const msgElement = document.querySelector(`[data-id="${idMessage}"]`);
      if (msgElement) {
        const actionDiv = msgElement.querySelector('.request-actions');
        if (actionDiv) {
          actionDiv.innerHTML = `<span class="request-status success">✓ Đã chấp nhận tham gia</span>`;
        }
      }
    } else {
      alert(result.message || 'Không thể chấp nhận yêu cầu tham gia.');
    }
  } catch (err) {
    console.error('Lỗi khi chấp nhận tham gia:', err);
    alert('Không thể kết nối đến máy chủ.');
  }
}
window.handleAcceptJoin = handleAcceptJoin;
async function handleRejectJoin(idDuAn, idUserXin, idMessage, mss) {
  if (!confirm('Bạn có chắc chắn muốn từ chối yêu cầu tham gia dự án này?')) return;

  // Cập nhật ngay giao diện nút bấm thành trạng thái "Đã từ chối"
  const msgElement = document.querySelector(`[data-id="${idMessage}"]`);
  await sendMessage(current.idChatBox, "Bạn đã bị từ chối khỏi dự án " + mss);
  if (msgElement) {
    const actionDiv = msgElement.querySelector('.request-actions');
    if (actionDiv) {
      actionDiv.innerHTML = `<span class="request-status rejected">✕ Đã từ chối yêu cầu</span>`;
    }
  }
}
window.handleRejectJoin = handleRejectJoin;
// Thêm các tin chưa hiển thị vào cuối khung chat (tin đã có thì bỏ qua)
async function appendMessages(messages, { forceScroll = false } = {}) {
  const fresh = messages.filter((m) => lastMessageId === null || m.idMessage > lastMessageId);
  if (fresh.length === 0) return;

  const box = getEl('messageList');
  const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 80;

  const htmlArray = await Promise.all(fresh.map(renderMessage));
  box.insertAdjacentHTML('beforeend', htmlArray.join(''));
  lastMessageId = fresh[fresh.length - 1].idMessage;

  if (forceScroll || nearBottom) box.scrollTop = box.scrollHeight;
}

async function selectChat(idChatBox) {
  let chat = chats.find((item) => item.idChatBox === idChatBox);
  if (!chat) {
    await loadChats();
    chat = chats.find((item) => item.idChatBox === idChatBox);
  }
  if (!chat) {
    showMessage(getEl('chatMessage'), 'Không tìm thấy cuộc trò chuyện này.', 'error');
    return;
  }

  current = chat;
  lastMessageId = null;
  showMessage(getEl('chatMessage'), '');

  getEl('chatEmpty').hidden = true;
  getEl('chatPane').hidden = false;
  document.querySelector('.chat-layout').classList.add('is-chat-open');
  getEl('chatTitle').textContent = chat.ten;
  getEl('messageList').innerHTML = '';
  renderChatList();
  window.history.replaceState(null, '', `?chat=${idChatBox}`);

  try {
    const messages = await fetchMessages(idChatBox);
    if (current.idChatBox !== idChatBox) return; // người dùng đã chuyển sang cuộc khác
    appendMessages(messages, { forceScroll: true });
  } catch (error) {
    showMessage(getEl('chatMessage'), errorMessage(error), 'error');
  }
  getEl('messageInput').focus();
}

// Hỏi server xem cuộc đang mở có tin mới không
async function poll() {
  if (!current || document.hidden) return;
  const idChatBox = current.idChatBox;

  try {
    const params = lastMessageId === null ? {} : { after: lastMessageId };
    const messages = await fetchMessages(idChatBox, params);
    if (!current || current.idChatBox !== idChatBox) return;
    appendMessages(messages);
  } catch (error) {
    console.error('Lỗi khi hỏi tin nhắn mới:', error);
  }
}

function initMessageForm() {
  getEl('formMessage').addEventListener('submit', async (e) => {
    e.preventDefault();

    const input = getEl('messageInput');
    const text = input.value.trim();
    if (!text || !current) return;
    input.value = '';

    try {
      const message = await sendMessage(current.idChatBox, text);
      appendMessages([message], { forceScroll: true });
      loadChats().catch((error) => console.error(error));
    } catch (error) {
      input.value = text; // không mất nội dung đã gõ
      showMessage(getEl('chatMessage'), errorMessage(error), 'error');
    }
  });
}

// ---------- Tạo nhóm ----------

async function loadGroupFriends() {
  const box = getEl('groupMembers');
  box.innerHTML = '<p class="text-muted">Đang tải...</p>';

  try {
    const friends = await fetchConnections('friends');
    box.innerHTML = friends.length
      ? friends
          .map((friend) => `<label class="check-row"><input type="checkbox" value="${friend.idUser}"><span>${escapeHtml(friend.ten)}</span></label>`)
          .join('')
      : '<p class="text-muted">Bạn chưa có bạn bè để thêm vào nhóm.</p>';
  } catch (error) {
    box.innerHTML = '';
    showMessage(getEl('groupMessage'), errorMessage(error), 'error');
  }
}

function initGroupForm() {
  getEl('btnNewGroup').addEventListener('click', () => {
    showMessage(getEl('groupMessage'), '');
    getEl('groupName').value = '';
    loadGroupFriends();
  });

  getEl('formGroup').addEventListener('submit', async (e) => {
    e.preventDefault();

    const memberIds = [...getEl('groupMembers').querySelectorAll('input:checked')].map((input) => Number(input.value));
    try {
      const chat = await createGroupChat({ tenChatBox: getEl('groupName').value, memberIds });
      closeModal('createGroupModal');
      await loadChats();
      await selectChat(chat.idChatBox);
    } catch (error) {
      showMessage(getEl('groupMessage'), errorMessage(error), 'error');
    }
  });
}

// ---------- Khởi động ----------

function initEvents() {
  getEl('chatList').addEventListener('click', (e) => {
    const item = e.target.closest('.chat-item');
    if (item) selectChat(Number(item.dataset.id));
  });

  // Trên điện thoại: nút quay lại danh sách
  getEl('btnBack').addEventListener('click', () => {
    document.querySelector('.chat-layout').classList.remove('is-chat-open');
  });
}

// Mở sẵn một cuộc trò chuyện theo địa chỉ: ?chat=<idChatBox> hoặc ?with=<idUser>
async function openFromUrl() {
  const params = new URLSearchParams(window.location.search);

  if (params.get('with')) {
    const chat = await openPrivateChat(Number(params.get('with')));
    await loadChats();
    await selectChat(chat.idChatBox);
  } else if (params.get('chat')) {
    await selectChat(Number(params.get('chat')));
  }
}

async function init() {
  me = await ensureLoggedIn(); // chưa đăng nhập thì tự chuyển trang
  if (!me) return;

  await loadChats();
  await openFromUrl();

  setInterval(poll, POLL_MS);
  setInterval(() => loadChats().catch((error) => console.error(error)), LIST_MS);
}

initModals();
initNavbar();
initEvents();
initMessageForm();
initGroupForm();
init().catch((error) => {
  console.error('Lỗi khi tải trang tin nhắn:', error);
  showMessage(getEl('chatMessage'), 'Không thể tải tin nhắn.', 'error');
});