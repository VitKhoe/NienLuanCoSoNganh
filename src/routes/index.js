import http from 'http';
import * as handlers from '../controllers/handlers.js';
import * as users from '../controllers/users.js';
import * as social from '../controllers/social.js';
import * as connections from '../controllers/connections.js';
import * as chat from '../controllers/chat.js';
import * as project from '../controllers/project.js';
import { sendText, sendFile } from '../utils/helpers.js';
import * as task from '../controllers/task.js';
import * as re from '../controllers/recruitments.js';
import * as img from '../img/callImage.js';
import * as drive from '../controllers/drive.js';
import * as competency from '../controllers/competency.js';
import * as notifications from '../controllers/notifications.js';
import * as admin from '../controllers/admin.js';

// File tĩnh: đường dẫn URL -> [file, content-type]
const staticFiles = {
  '/': ['views/index.html', 'text/html; charset=utf-8'],
  '/index.html': ['views/index.html', 'text/html; charset=utf-8'],
  '/main_page.html': ['views/index.html', 'text/html; charset=utf-8'],
  '/login_signup.html': ['views/login_signup.html', 'text/html; charset=utf-8'],
  '/account.html': ['views/account.html', 'text/html; charset=utf-8'],
  '/friends.html': ['views/friends.html', 'text/html; charset=utf-8'],
  '/pj_detail.html': ['views/pj_detail.html', 'text/html; charset=utf-8'],
  '/chat.html': ['views/chat.html', 'text/html; charset=utf-8'],
  '/duan.html': ['views/duan.html', 'text/html; charset=utf-8'],
  '/admin.html': ['views/admin.html', 'text/html; charset=utf-8'],
  '/css/style.css': ['public/css/style.css', 'text/css; charset=utf-8'],
  '/css/account.css': ['public/css/account.css', 'text/css; charset=utf-8'],
  '/css/social.css': ['public/css/social.css', 'text/css; charset=utf-8'],
  '/css/project.css': ['public/css/project.css', 'text/css; charset=utf-8'],
  '/css/project-detail.css': ['public/css/project-detail.css', 'text/css; charset=utf-8'],
  '/js/main.js': ['public/js/main.js', 'text/javascript; charset=utf-8'],
  '/js/ui.js': ['public/js/ui.js', 'text/javascript; charset=utf-8'],
  '/js/posts.js': ['public/js/posts.js', 'text/javascript; charset=utf-8'],
  '/js/recruitments.js': ['public/js/recruitments.js', 'text/javascript; charset=utf-8'],
  '/js/projects.js': ['public/js/projects.js', 'text/javascript; charset=utf-8'],
  '/js/api.js': ['public/js/api.js', 'text/javascript; charset=utf-8'],
  '/js/navbar.js': ['public/js/navbar.js', 'text/javascript; charset=utf-8'],
  '/js/login.js': ['public/js/login.js', 'text/javascript; charset=utf-8'],
  '/js/account.js': ['public/js/account.js', 'text/javascript; charset=utf-8'],
  '/js/account2.js': ['public/js/account2.js', 'text/javascript; charset=utf-8'],
  '/js/comments.js': ['public/js/comments.js', 'text/javascript; charset=utf-8'],
  '/js/relations.js': ['public/js/relations.js', 'text/javascript; charset=utf-8'],
  '/js/friends.js': ['public/js/friends.js', 'text/javascript; charset=utf-8'],
  '/js/messages.js': ['public/js/messages.js', 'text/javascript; charset=utf-8'],
  '/js/project.js': ['public/js/project.js', 'text/javascript; charset=utf-8'],
  '/js/pj_detail.js': ['public/js/pj_detail.js', 'text/javascript; charset=utf-8']
};

// API không có id trong đường dẫn: "METHOD /đường-dẫn" -> hàm xử lý
const routes = {
  // Nhóm 1: người dùng & hồ sơ
  'POST /signup': users.signup,
  'POST /login': users.login,
  'POST /logout': users.logout,
  'GET /api/me': users.getMe,
  'PUT /api/me/profile': users.updateProfile,
  'POST /api/me/avatar': img.saveAvatar,
  'GET /api/me/skills': users.getSkills,
  'POST /api/me/skills': users.addSkill,

  // Nhóm 1 (bổ sung): năng lực - kỹ năng & chứng chỉ
  'GET /api/ky-nang': competency.listSkillsCatalog,
  'GET /api/account/nang-luc': competency.getMyCompetency,
  'POST /api/account/ky-nang': competency.saveMySkill,
  'POST /api/account/chung-chi': competency.saveMyCertification,
  'POST /api/account/hoc-van': competency.saveMyEducation,
  'POST /api/account/kinh-nghiem': competency.saveMyWorkExperience,

  // Nhóm 2: mạng xã hội
  'GET /api/posts': social.getPosts,
  'POST /api/posts': social.createPost,
  'GET /api/connections': connections.listConnections,
  'POST /api/connections': connections.sendRequest,
  'GET /api/chats': chat.listChats,
  'POST /api/chats/private': chat.openPrivateChat,
  'POST /api/chats/group': chat.createGroupChat,
  'GET /api/users/search': social.searchUsers,

  // Dự án + tuyển dụng
  'POST /api/projects': handlers.createProject,
  'POST /api/projects-nontintuyen': project.createProject,
  'GET /api/projects': project.getProjects,
  'GET /api/tin-tuyen-dung': handlers.getJobs,
  'GET /api/statistics': handlers.getStatistics,
  'GET /api/activity-log': handlers.getActivityLog,
  'GET /api/notifications': notifications.listNotifications,
  'POST /api/notifications/read-all': notifications.markAllRead,
  'GET /api/admin/users': admin.listUsers,

  'POST /api/tasks': task.createTask
};

// API có id trong đường dẫn (":id" chỉ nhận số), VD: PUT /api/me/skills/5
function withId(method, path, handler) {
  return { method, pattern: new RegExp(`^${path.replace(':id', '(\\d+)')}$`), handler };
}

const paramRoutes = [
  // Nhóm 1
  withId('PUT', '/api/me/skills/:id', users.updateSkill),
  withId('DELETE', '/api/me/skills/:id', users.deleteSkill),
  withId('DELETE', '/api/account/ky-nang/:id', competency.deleteMySkill),
  withId('DELETE', '/api/account/chung-chi/:id', competency.deleteMyCertification),
  withId('DELETE', '/api/account/hoc-van/:id', competency.deleteMyEducation),
  withId('DELETE', '/api/account/kinh-nghiem/:id', competency.deleteMyWorkExperience),
  withId('POST', '/api/notifications/:id/read', notifications.markRead),
  withId('GET', '/api/me/avatar/:id', img.getAvatar),

  // Nhóm 2: bài viết, like, bình luận
  withId('GET', '/api/posts/:id', social.getPost),
  withId('POST', '/api/posts/:id/like', social.likePost),
  withId('DELETE', '/api/posts/:id/like', social.unlikePost),
  withId('GET', '/api/posts/:id/comments', social.getComments),
  withId('POST', '/api/posts/:id/comments', social.addComment),
  withId('PUT', '/api/comments/:id', social.updateComment),
  withId('DELETE', '/api/comments/:id', social.deleteComment),
  withId('POST', '/api/comments/:id/images', img.saveCommentImage),
  withId('POST', '/api/posts/:id/mark', social.markPost),
  withId('DELETE', '/api/posts/:id/mark', social.unMark),

  // Nhóm 2: kết nối
  withId('POST', '/api/connections/:id/accept', connections.acceptRequest),
  withId('DELETE', '/api/connections/:id', connections.removeConnection),

  // Nhóm 2: tin nhắn
  withId('GET', '/api/chats/:id/messages', chat.getMessages),
  withId('POST', '/api/chats/:id/messages', chat.sendMessage),
  //nhom 3: project
  withId('GET', '/api/project/:id', project.getProjectDetail),        
  withId('PUT', '/api/projects/:id', project.updateProject),
  withId('DELETE', '/api/projects/:id', project.deleteProject),
  withId('PATCH', '/api/projects/:id/close', project.closeProject),
  withId('POST', '/api/projects/:id/members', project.assignMemberRole),
  withId('POST', '/api/projects/:id/leave', project.leaveProject),
  withId('POST', '/api/projects/:id/reviews', project.reviewMember),
  withId('POST', '/api/projects/:id/join-request', project.requestJoinProject),
  withId('DELETE', '/api/projects/rmmember', project.removeMember),
  withId('GET', '/api/project/:id/tasks', task.getProjectTasks),
  withId('PUT', '/api/tasks/:id', task.updateTask),
  withId('DELETE', '/api/tasks/:id', task.deleteTask),
  withId('POST', '/api/tasks/:id/assign', task.assignTask),
  withId('GET', '/api/tasks/:id/comments', task.getTaskComments),
  withId('POST', '/api/tasks/:id/comments', task.addTaskComment),
  withId('GET', '/api/tasks/:id/files', task.getTaskFiles),
  withId('POST', '/api/tasks/:id/files', task.uploadTaskFile),
  withId('POST', '/api/tasks/:id/reminder', task.createTaskReminder),
  { method: 'GET', pattern: /^\/uploads\/tasks\/([^/]+)$/, handler: task.serveTaskFile },
  withId('POST', '/api/projects/:id/recruitments', re.createProjectRecruitments),
  withId('POST', '/api/tin-tuyen-dung/:id/apply', re.applyRecruitment),
  withId('GET', '/api/tin-tuyen-dung/:id/ung-tuyen', re.listApplications),
  withId('PUT', '/api/ung-tuyen/:id', re.reviewApplication),
  withId('POST', '/api/tin-tuyen-dung/:id/luu', re.saveRecruitment),
  withId('DELETE', '/api/tin-tuyen-dung/:id/luu', re.unsaveRecruitment),
  withId('GET', '/api/tin-tuyen-dung/:id/goi-y', re.suggestCandidates),
  withId('GET', '/api/projects/:id/files', drive.getProjectFiles),
  withId('POST', '/api/projects/:id/files', drive.uploadProjectFile),
  { method: 'GET', pattern: /^\/uploads\/files\/([^/]+)$/, handler: drive.serveProjectFile },
  withId('PUT', '/api/admin/users/:id/status', admin.setUserStatus),
  // Nhóm 4: ảnh
  { method: 'GET', pattern: /^\/uploads\/posts\/([^/]+)$/, handler: img.handleStaticImages },
  { method: 'GET', pattern: /^\/uploads\/avatars\/([^/]+)$/, handler: img.handleStaticAvatar },
  withId('POST', '/api/posts/:id/images', img.savePostImage),
  withId('POST', '/api/du-an/:id/van-kien', drive.addProjectDocument),
  withId('GET', '/api/du-an/:id/van-kien', drive.getProjectDocuments)
  
]

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