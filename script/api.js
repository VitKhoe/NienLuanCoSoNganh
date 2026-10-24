// Các hàm gọi API tới server (script/server.js ở thư mục gốc dự án)

// Lỗi do server trả về (mã 4xx/5xx), message chính là nội dung server gửi
export class ApiError extends Error {}

async function request(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new ApiError(await response.text());
  }
  return response;
}

function postJson(url, data) {
  return request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(data)
  });
}

// Câu thông báo phù hợp để hiện cho người dùng khi gọi API lỗi
export function errorMessage(error) {
  return error instanceof ApiError
    ? 'Lỗi Server: ' + error.message
    : 'Không thể kết nối tới Server!';
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