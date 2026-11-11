// Các hàm gọi API tới máy chủ (src/server.js)

// Lỗi do server trả về (mã 4xx/5xx), message chính là nội dung server gửi
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new ApiError(await response.text(), response.status);
  }
  return response;
}

function jsonRequest(method, url, data) {
  return request(url, {
    method,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(data)
  });
}

function postJson(url, data) {
  return jsonRequest('POST', url, data);
}

// Gắn ?a=1&b=2 vào địa chỉ, bỏ qua tham số không có giá trị
function withQuery(url, params = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) query.set(key, value);
  }
  const text = query.toString();
  return text ? `${url}?${text}` : url;
}

// Câu thông báo phù hợp để hiện cho người dùng khi gọi API lỗi
export function errorMessage(error) {
  return error instanceof ApiError
    ? 'Lỗi Server: ' + error.message
    : 'Không thể kết nối tới Server!';
}

// ---------- Tài khoản ----------
export function signup(data) {
  return postJson('/signup', data);
}

export async function login(data) {
  const response = await postJson('/login', data);
  return response.json();
}

export function logout() {
  return request('/logout', { method: 'POST' });
}

// Thông tin + hồ sơ của người đang đăng nhập (401 nếu chưa đăng nhập)
export async function fetchMe() {
  const response = await request('/api/me');
  return response.json();
}

// Người đang đăng nhập: chỉ hỏi server một lần rồi dùng lại
let mePromise = null;
export function getCurrentUser() {
  if (!mePromise) {
    mePromise = fetchMe().catch((error) => {
      mePromise = null; // lần sau cho phép hỏi lại
      throw error;
    });
  }
  return mePromise;
}

// Chưa đăng nhập thì chuyển về trang đăng nhập. Trả về hồ sơ nếu đã đăng nhập.
export async function ensureLoggedIn() {
  try {
    const currentUser = await getCurrentUser();
    
    const userId = currentUser.idUser || currentUser.id;

    if (userId) {
      localStorage.setItem('currentUserId', userId);
    }
    
    return currentUser;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      window.location.href = '/login_signup.html';
      return null;
    }
    throw error;
  }
}

// ---------- Hồ sơ cá nhân ----------
export async function updateProfile(data) {
  const response = await jsonRequest('PUT', '/api/me/profile', data);
  return response.json();
}

// ---------- Kỹ năng chuyên môn ----------
export async function fetchSkills() {
  const response = await request('/api/me/skills');
  return response.json();
}

export async function addSkill(data) {
  const response = await postJson('/api/me/skills', data);
  return response.json();
}

export async function updateSkill(id, data) {
  const response = await jsonRequest('PUT', `/api/me/skills/${id}`, data);
  return response.json();
}

export function deleteSkill(id) {
  return request(`/api/me/skills/${id}`, { method: 'DELETE' });
}

// ---------- Bài viết ----------
// { limit, before }: before = idPost của bài cuối cùng đã có, để lấy các bài cũ hơn
export async function fetchPosts({ limit, before } = {}) {
  const response = await request(withQuery('/api/posts', { limit, before }));
  return response.json();
}

export function createPost(data) {
  return postJson('/api/posts', data);
}

// ---------- Like ----------
export async function likePost(idPost) {
  const response = await request(`/api/posts/${idPost}/like`, { method: 'POST' });
  return response.json();
}

export async function unlikePost(idPost) {
  const response = await request(`/api/posts/${idPost}/like`, { method: 'DELETE' });
  return response.json();
}

// ---------- Bình luận ----------
export async function fetchComments(idPost) {
  const response = await request(`/api/posts/${idPost}/comments`);
  return response.json();
}

// data: { noiDung, idParentComment? }
export async function addComment(idPost, data) {
  const response = await postJson(`/api/posts/${idPost}/comments`, data);
  return response.json();
}

export async function updateComment(idComment, noiDung) {
  const response = await jsonRequest('PUT', `/api/comments/${idComment}`, { noiDung });
  return response.json();
}

export function deleteComment(idComment) {
  return request(`/api/comments/${idComment}`, { method: 'DELETE' });
}

// ---------- Kết nối (kết bạn) ----------
// type: 'friends' | 'incoming' | 'outgoing'
export async function fetchConnections(type = 'friends') {
  const response = await request(withQuery('/api/connections', { type }));
  return response.json();
}

export function sendFriendRequest(idUser) {
  return postJson('/api/connections', { idUser });
}

// idUser = người đã gửi lời mời cho mình
export function acceptFriendRequest(idUser) {
  return request(`/api/connections/${idUser}/accept`, { method: 'POST' });
}

// Từ chối lời mời / thu hồi lời mời đã gửi / hủy kết bạn
export function removeConnection(idUser) {
  return request(`/api/connections/${idUser}`, { method: 'DELETE' });
}

// ---------- Tin nhắn ----------
export async function fetchChats() {
  const response = await request('/api/chats');
  return response.json();
}

export async function openPrivateChat(idUser) {
  const response = await postJson('/api/chats/private', { idUser });
  return response.json();
}

// data: { tenChatBox, memberIds: [idUser, ...] }
export async function createGroupChat(data) {
  const response = await postJson('/api/chats/group', data);
  return response.json();
}

// { limit, before, after }: after = idMessage cuối cùng đã có (để nhận tin mới)
export async function fetchMessages(idChatBox, { limit, before, after } = {}) {
  const response = await request(withQuery(`/api/chats/${idChatBox}/messages`, { limit, before, after }));
  return response.json();
}

export async function sendMessage(idChatBox, noiDung) {
  const response = await postJson(`/api/chats/${idChatBox}/messages`, { noiDung });
  return response.json();
}

// ---------- Dự án + tin tuyển dụng ----------
export function createProject(data) {
  return postJson('/api/projects', data);
}

export async function fetchJobs() {
  const response = await request('/api/tin-tuyen-dung');
  return response.json();
}

// gắn book mark
export async function bookMark(idPost){
  const response = await request(`/api/posts/${idPost}/mark`, { method: 'POST' });
  return response.json();
}

// unmark
export async function unMark(idPost){
  const response = await request(`/api/posts/${idPost}/mark`, { method: 'DELETE' });
  return response.json();
}

export async function createProjectNon_TT(data) {
  const response = await request('/api/projects-nontintuyen', {
    method: 'POST',
    body: JSON.stringify(data)
  });
  return response.json();
}
export async function updateProject(idDuAn, data) {
  const response = await request(`/api/projects/${idDuAn}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
  return response.json();
} 
export async function deleteProject(idDuAn) {
  const response = await request(`/api/projects/${idDuAn}`, {
    method: 'DELETE'
  });
  return response.json();
}
export async function closeProject(idDuAn) {
  const response = await request(`/api/projects/${idDuAn}/close`, {
    method: 'PATCH'
  });
  return response.json();
}
export async function getProjectDetail(idDuAn) {
  const response = await request(`/api/project/${idDuAn}`, {
    method: 'GET'
  });
  // request(withQuery('/api/posts', { limit, before }));
  return response.json();
}
export async function assignMemberRole(idDuAn, { idUser, vaiTro }) {
  const response = await request(`/api/projects/${idDuAn}/members`, {
    method: 'POST',
    body: JSON.stringify({ idUser, vaiTro })
  });
  return response.json();
}
export async function removeMember(idDuAn, userId) {
  const res = await jsonRequest('DELETE', `/api/projects/rmmember`, { idDuAn : idDuAn, idUser: userId });
  return res;
}

export async function leaveProject(idDuAn) {
  const response = await request(`/api/projects/${idDuAn}/leave`, {
    method: 'POST'
  });
  return response.json();
}
export async function reviewMember(idDuAn, { idUserDuocDanhGia, diem, nhanXet }) {
  const response = await request(`/api/projects/${idDuAn}/reviews`, {
    method: 'POST',
    body: JSON.stringify({ idUserDuocDanhGia, diem, nhanXet })
  });
  return response.json();
}
export async function fetchProjects() {
  const response = await request('/api/projects');
  return response.json();
}

export async function createRecruitments(idDuAn, data) {
  const response = await fetch(`/api/projects/${idDuAn}/recruitments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      tieuDe: data?.tieuDe ? data.tieuDe.trim() : '',
      yeuCau: data?.yeuCau ? data.yeuCau.trim() : '',
      hanNop: data?.hanNop || null,
      trangThai: data?.trangThai || 'not_started'
    })
  });

  return response.json();
}
export async function uploadPostImage(postId, file) {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`/api/posts/${postId}/images`, {
    method: 'POST',
    body: formData // Gửi dạng multipart/form-data
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Lỗi khi tải ảnh lên');
  }

  // Trả về data chứa image_id và hinhAnhUrl vừa tạo thành công
  return result.data; 
}