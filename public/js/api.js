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
async function getJson(url) {
  const token = localStorage.getItem('token') || '';
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Lỗi máy chủ (${res.status})`);
  }
  return data;
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
// Lấy toàn bộ danh mục kỹ năng chuẩn để đổ gợi ý
export function getAllSkillsCatalog() {
  return getJson('/api/ky-nang');
}

// Lấy kỹ năng & chứng chỉ của user hiện tại
export function getMyCompetency() {
  return getJson('/api/account/nang-luc');
}

// Lưu / Cập nhật kỹ năng
export function saveMySkill(data) {
  return postJson('/api/account/ky-nang', data);
}

// Xóa kỹ năng khỏi hồ sơ
export function deleteMySkill(id) {
  return deleteJson(`/api/account/ky-nang/${id}`);
}

// Thêm / Cập nhật chứng chỉ
export function saveMyCertification(data) {
  return postJson('/api/account/chung-chi', data);
}

// Xóa chứng chỉ
export function deleteMyCertification(idChungChi) {
  return deleteJson(`/api/account/chung-chi/${idChungChi}`);
}

// Thêm / Cập nhật học vấn
export function saveMyEducation(data) {
  return postJson('/api/account/hoc-van', data);
}

// Xóa học vấn
export function deleteMyEducation(id) {
  return deleteJson(`/api/account/hoc-van/${id}`);
}

// Thêm / Cập nhật kinh nghiệm làm việc
export function saveMyWorkExperience(data) {
  return postJson('/api/account/kinh-nghiem', data);
}

// Xóa kinh nghiệm làm việc
export function deleteMyWorkExperience(id) {
  return deleteJson(`/api/account/kinh-nghiem/${id}`);
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

// data: { noiDung, idParentComment?, hinhAnhUrl?, hasImage? }
export async function addComment(idPost, data) {
  const response = await postJson(`/api/posts/${idPost}/comments`, data);
  return response.json();
}

export async function uploadCommentImage(idComment, file) {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('fileName', file.name);

  const response = await fetch(`/api/comments/${idComment}/images`, {
    method: 'POST',
    body: formData
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || `Lỗi khi tải ảnh ${file.name}`);
  }
  return result;
}

export async function updateComment(idComment, data) {
  const body = typeof data === 'string' ? { noiDung: data } : data;
  const response = await jsonRequest('PUT', `/api/comments/${idComment}`, body);
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
export async function fetchProjectDocuments(idDuAn) {
  try {
    const res = await fetch(`/api/du-an/${idDuAn}/van-kien`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
      }
    });

    if (!res.ok) return [];
    const result = await res.json();
    return Array.isArray(result) ? result : (result.data || []);
  } catch (err) {
    console.error('Lỗi khi lấy danh sách văn kiện:', err);
    return [];
  }
}
// Lấy danh sách văn kiện của một dự án


// Thêm liên kết văn kiện Google Drive vào dự án
export function addProjectDocument(idDuAn, data) {
  return postJson(`/api/du-an/${idDuAn}/van-kien`, data);
}

// Gỡ/Xóa liên kết văn kiện
export function deleteProjectDocument(vanKienId) {
  return deleteJson(`/api/van-kien/${vanKienId}`);
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
// Upload ảnh đại diện, trả về đường dẫn ảnh đã lưu
export async function uploadAvatar(file) {
  const formData = new FormData();
  formData.append('image', file);
  const res = await fetch('/api/me/avatar', { method: 'POST', body: formData });
  const result = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(result.message || 'Lỗi khi tải ảnh lên');
  return result.avatar || result.hinhAnhUrl;
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

// ---------- Công việc (Task) ----------
export async function updateTask(idTask, data) {
  const response = await jsonRequest('PUT', `/api/tasks/${idTask}`, data);
  return response.json();
}
export async function deleteTask(idTask) {
  const response = await request(`/api/tasks/${idTask}`, { method: 'DELETE' });
  return response.json();
}
export async function assignTask(idTask, idUsers) {
  const response = await jsonRequest('POST', `/api/tasks/${idTask}/assign`, { idUsers });
  return response.json();
}
export async function getTaskComments(idTask) {
  return getJson(`/api/tasks/${idTask}/comments`);
}
export async function addTaskComment(idTask, noiDung) {
  const response = await jsonRequest('POST', `/api/tasks/${idTask}/comments`, { noiDung });
  return response.json();
}
export async function getTaskFiles(idTask) {
  return getJson(`/api/tasks/${idTask}/files`);
}
export async function uploadTaskFile(idTask, file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`/api/tasks/${idTask}/files`, { method: 'POST', body: formData });
  const result = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(result.message || 'Lỗi khi tải file');
  return result;
}
export async function createTaskReminder(idTask) {
  const response = await request(`/api/tasks/${idTask}/reminder`, { method: 'POST' });
  return response.json();
}

// ---------- Tuyển dụng: ứng tuyển & lưu tin ----------
export async function applyRecruitment(idTinTuyen, loiNhan) {
  const response = await jsonRequest('POST', `/api/tin-tuyen-dung/${idTinTuyen}/apply`, { loiNhan });
  return response.json();
}
export async function getApplications(idTinTuyen) {
  return getJson(`/api/tin-tuyen-dung/${idTinTuyen}/ung-tuyen`);
}
export async function reviewApplication(idUngTuyen, trangThai) {
  const response = await jsonRequest('PUT', `/api/ung-tuyen/${idUngTuyen}`, { trangThai });
  return response.json();
}
export async function saveRecruitment(idTinTuyen) {
  const response = await request(`/api/tin-tuyen-dung/${idTinTuyen}/luu`, { method: 'POST' });
  return response.json();
}
export async function unsaveRecruitment(idTinTuyen) {
  const response = await request(`/api/tin-tuyen-dung/${idTinTuyen}/luu`, { method: 'DELETE' });
  return response.json();
}

// ---------- Thông báo & thống kê ----------
export async function getNotifications() {
  return getJson('/api/notifications');
}
export async function markNotificationRead(id) {
  const response = await request(`/api/notifications/${id}/read`, { method: 'POST' });
  return response.json();
}
export async function markAllNotificationsRead() {
  const response = await request('/api/notifications/read-all', { method: 'POST' });
  return response.json();
}
export async function getStatistics() {
  return getJson('/api/statistics');
}

// ---------- File dự án & gợi ý ứng viên & admin ----------
export async function getProjectFiles(idDuAn) {
  return getJson(`/api/projects/${idDuAn}/files`);
}
export async function uploadProjectFile(idDuAn, file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`/api/projects/${idDuAn}/files`, { method: 'POST', body: formData });
  const result = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(result.message || 'Lỗi khi tải file');
  return result;
}
export async function suggestCandidates(idTinTuyen) {
  return getJson(`/api/tin-tuyen-dung/${idTinTuyen}/goi-y`);
}
export async function getAdminUsers() {
  return getJson('/api/admin/users');
}
export async function setUserStatus(idUser, trangThai) {
  const response = await jsonRequest('PUT', `/api/admin/users/${idUser}/status`, { trangThai });
  return response.json();
}
export async function getAvatarURL(id) {
  const response = await request(`/api/me/avatar/${id}`, {
    method: 'GET'
  });
  // request(withQuery('/api/posts', { limit, before }));
  return response.json();
}