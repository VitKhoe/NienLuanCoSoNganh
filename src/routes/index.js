import http from 'http';
import * as handlers from '../controllers/handlers.js';
import * as users from '../controllers/users.js';
import * as social from '../controllers/social.js';
import * as connections from '../controllers/connections.js';
import * as chat from '../controllers/chat.js';
import { sendText, sendFile } from '../utils/helpers.js';

// File tĩnh: đường dẫn URL -> [file, content-type]
const staticFiles = {
  '/': ['views/index.html', 'text/html; charset=utf-8'],
  '/index.html': ['views/index.html', 'text/html; charset=utf-8'],
  '/main_page.html': ['views/index.html', 'text/html; charset=utf-8'],
  '/login_signup.html': ['views/login_signup.html', 'text/html; charset=utf-8'],
  '/account.html': ['views/account.html', 'text/html; charset=utf-8'],
  '/friends.html': ['views/friends.html', 'text/html; charset=utf-8'],
  '/chat.html': ['views/chat.html', 'text/html; charset=utf-8'],
  '/projects.html': ['views/projects.html', 'text/html; charset=utf-8'],
  '/css/style.css': ['public/css/style.css', 'text/css; charset=utf-8'],
  '/css/account.css': ['public/css/account.css', 'text/css; charset=utf-8'],
  '/css/social.css': ['public/css/social.css', 'text/css; charset=utf-8'],
  '/bootstrap.min.css': ['bootstrap.min.css', 'text/css'],
  '/bootstrap.bundle.js': ['bootstrap.bundle.js', 'text/javascript'],
  '/js/main.js': ['public/js/main.js', 'text/javascript; charset=utf-8'],
  '/js/ui.js': ['public/js/ui.js', 'text/javascript; charset=utf-8'],
  '/js/posts.js': ['public/js/posts.js', 'text/javascript; charset=utf-8'],
  '/js/recruitments.js': ['public/js/recruitments.js', 'text/javascript; charset=utf-8'],
  '/js/projects.js': ['public/js/projects.js', 'text/javascript; charset=utf-8'],
  '/js/api.js': ['public/js/api.js', 'text/javascript; charset=utf-8'],
  '/js/navbar.js': ['public/js/navbar.js', 'text/javascript; charset=utf-8'],
  '/js/login.js': ['public/js/login.js', 'text/javascript; charset=utf-8'],
  '/js/account.js': ['public/js/account.js', 'text/javascript; charset=utf-8'],
  '/js/comments.js': ['public/js/comments.js', 'text/javascript; charset=utf-8'],
  '/js/relations.js': ['public/js/relations.js', 'text/javascript; charset=utf-8'],
  '/js/friends.js': ['public/js/friends.js', 'text/javascript; charset=utf-8'],
  '/js/messages.js': ['public/js/messages.js', 'text/javascript; charset=utf-8']
};

// API không có id trong đường dẫn: "METHOD /đường-dẫn" -> hàm xử lý
const routes = {
  // Nhóm 1: người dùng & hồ sơ
  'POST /signup': users.signup,
  'POST /login': users.login,
  'POST /logout': users.logout,
  'GET /api/me': users.getMe,
  'PUT /api/me/profile': users.updateProfile,
  'GET /api/me/skills': users.getSkills,
  'POST /api/me/skills': users.addSkill,

  // Nhóm 2: mạng xã hội
  'GET /api/posts': social.getPosts,
  'POST /api/posts': social.createPost,
  'GET /api/connections': connections.listConnections,
  'POST /api/connections': connections.sendRequest,
  'GET /api/chats': chat.listChats,
  'POST /api/chats/private': chat.openPrivateChat,
  'POST /api/chats/group': chat.createGroupChat,

  // Dự án + tuyển dụng
  'POST /api/projects': handlers.createProject,
  'GET /api/tin-tuyen-dung': handlers.getJobs
};

// API có id trong đường dẫn (":id" chỉ nhận số), VD: PUT /api/me/skills/5
function withId(method, path, handler) {
  return { method, pattern: new RegExp(`^${path.replace(':id', '(\\d+)')}$`), handler };
}

const paramRoutes = [
  // Nhóm 1
  withId('PUT', '/api/me/skills/:id', users.updateSkill),
  withId('DELETE', '/api/me/skills/:id', users.deleteSkill),

  // Nhóm 2: bài viết, like, bình luận
  withId('GET', '/api/posts/:id', social.getPost),
  withId('POST', '/api/posts/:id/like', social.likePost),
  withId('DELETE', '/api/posts/:id/like', social.unlikePost),
  withId('GET', '/api/posts/:id/comments', social.getComments),
  withId('POST', '/api/posts/:id/comments', social.addComment),
  withId('PUT', '/api/comments/:id', social.updateComment),
  withId('DELETE', '/api/comments/:id', social.deleteComment),

  // Nhóm 2: kết nối
  withId('POST', '/api/connections/:id/accept', connections.acceptRequest),
  withId('DELETE', '/api/connections/:id', connections.removeConnection),

  // Nhóm 2: tin nhắn
  withId('GET', '/api/chats/:id/messages', chat.getMessages),
  withId('POST', '/api/chats/:id/messages', chat.sendMessage)
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

export default function createServer() {
  return http.createServer(async (req, res) => {
    console.log('Request:', req.method, req.url);

    const [pathname, queryString = ''] = req.url.split('?'); // tách phần ?query
    const query = new URLSearchParams(queryString);

    const file = staticFiles[pathname];
    if (file) return sendFile(res, file[0], file[1]);

    const found = findRoute(req.method, pathname);
    if (!found) return sendText(res, 404, 'Not found');

    try {
      await found.handler(req, res, found.params, query);
    } catch (err) {
      if (err.status) return sendText(res, err.status, err.message);
      console.log('Lỗi server:', err.message);
      sendText(res, 500, 'Lỗi server');
    }
  });
}