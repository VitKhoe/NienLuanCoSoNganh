import http from 'http';
import * as handlers from './handlers.js';
import * as users from './users.js';
import { sendText, sendFile } from './helpers.js';

// File tĩnh: đường dẫn URL -> [file, content-type]
const staticFiles = {
  '/': ['public/index.html', 'text/html; charset=utf-8'],
  '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/main_page.html': ['main_page.html', 'text/html; charset=utf-8'],
  '/login_signup.html': ['public/login_signup.html', 'text/html; charset=utf-8'],
  '/account.html': ['public/account.html', 'text/html; charset=utf-8'],
  '/css/style.css': ['css/Style.css', 'text/css'],
  '/css/account.css': ['css/account.css', 'text/css; charset=utf-8'],
  '/bootstrap.min.css': ['bootstrap.min.css', 'text/css'],
  '/bootstrap.bundle.js': ['bootstrap.bundle.js', 'text/javascript'],
  '/script/main.js': ['script/Main.js', 'text/javascript'],
  '/script/ui.js': ['script/ui.js', 'text/javascript'],
  '/script/posts.js': ['script/post.js', 'text/javascript'],
  '/script/recruitments.js': ['script/recruitments.js', 'text/javascript'],
  '/script/projects.js': ['script/projects.js', 'text/javascript'],
  '/script/api.js': ['script/api.js', 'text/javascript'],
  '/script/navbar.js': ['script/navbar.js', 'text/javascript'],
  '/script/login.js': ['script/login.js', 'text/javascript'],
  '/script/account.js': ['script/account.js', 'text/javascript']
};

// API: "METHOD /đường-dẫn" -> hàm xử lý
const routes = {
  // Nhóm 1: người dùng & hồ sơ
  'POST /signup': users.signup,
  'POST /login': users.login,
  'POST /logout': users.logout,
  'GET /api/me': users.getMe,
  'PUT /api/me/profile': users.updateProfile,
  'GET /api/me/skills': users.getSkills,
  'POST /api/me/skills': users.addSkill,

  // Dự án, bài viết
  'POST /api/projects': handlers.createProject,
  'GET /api/posts': handlers.getPosts,
  'POST /api/posts': handlers.createPost,
  'GET /api/tin-tuyen-dung': handlers.getJobs
};

// API có id trong đường dẫn, VD: PUT /api/me/skills/5
const paramRoutes = [
  { method: 'PUT', pattern: /^\/api\/me\/skills\/(\d+)$/, handler: users.updateSkill },
  { method: 'DELETE', pattern: /^\/api\/me\/skills\/(\d+)$/, handler: users.deleteSkill }
];

function findRoute(method, pathname) {
  const handler = routes[`${method} ${pathname}`];
  if (handler) return { handler, params: {} };

  for (const route of paramRoutes) {
    const match = route.method === method && route.pattern.exec(pathname);
    if (match) return { handler: route.handler, params: { id: match[1] } };
  }
  return null;
}

const server = http.createServer(async (req, res) => {
  console.log('Request:', req.method, req.url);

  const pathname = req.url.split('?')[0]; // bỏ phần ?query

  const file = staticFiles[pathname];
  if (file) return sendFile(res, file[0], file[1]);

  const found = findRoute(req.method, pathname);
  if (!found) return sendText(res, 404, 'Not found');

  try {
    await found.handler(req, res, found.params);
  } catch (err) {
    if (err.status) return sendText(res, err.status, err.message);
    console.log('Lỗi server:', err.message);
    sendText(res, 500, 'Lỗi server');
  }
});

server.listen(8088, () => {
  console.log('Server chạy tại http://localhost:8088');
});