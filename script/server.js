const http = require('http');
const handlers = require('./handlers');
const { sendText, sendFile } = require('./helpers');

// File tĩnh: đường dẫn URL -> [file, content-type]
const staticFiles = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/main_page.html': ['main_page.html', 'text/html; charset=utf-8'],
  '/login_signup.html': ['login_signup.html', 'text/html; charset=utf-8'],
  '/style.css': ['style.css', 'text/css'],
  '/bootstrap.min.css': ['bootstrap.min.css', 'text/css'],
  '/bootstrap.bundle.js': ['bootstrap.bundle.js', 'text/javascript']
};

// API: "METHOD /đường-dẫn" -> hàm xử lý
const routes = {
  'POST /login': handlers.login,
  'POST /signup': handlers.signup,
  'POST /api/projects': handlers.createProject,
  'GET /api/posts': handlers.getPosts,
  'POST /api/posts': handlers.createPost,
  'GET /api/tin-tuyen-dung': handlers.getJobs
};

const server = http.createServer(async (req, res) => {
  console.log('Request:', req.method, req.url);

  const file = staticFiles[req.url];
  if (file) return sendFile(res, file[0], file[1]);

  const handler = routes[`${req.method} ${req.url}`];
  if (!handler) return sendText(res, 404, 'Not found');

  try {
    await handler(req, res);
  } catch (err) {
    if (err.status) return sendText(res, err.status, err.message);
    console.log('Lỗi server:', err.message);
    sendText(res, 500, 'Lỗi server');
  }
});

server.listen(8088, () => {
  console.log('Server chạy tại http://localhost:8088');
});
