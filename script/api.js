// Các hàm gọi API tới server (script/server.js ở thư mục gốc dự án)

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

// Chưa đăng nhập thì chuyển về trang đăng nhập. Trả về hồ sơ nếu đã đăng nhập.
export async function ensureLoggedIn() {
  try {
    return await fetchMe();
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
export async function fetchPosts() {
  const response = await request('/api/posts');
  return response.json();
}

export function createPost(data) {
  return postJson('/api/posts', data);
}

// ---------- Dự án + tin tuyển dụng ----------
export function createProject(data) {
  return postJson('/api/projects', data);
}

export async function fetchJobs() {
  const response = await request('/api/tin-tuyen-dung');
  return response.json();
}