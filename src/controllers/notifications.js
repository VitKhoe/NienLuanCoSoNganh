// Nhóm 6 - Thông báo (Notifications): danh sách + đánh dấu đã đọc

import db from '../models/db.js';
import { sendJson } from '../utils/helpers.js';
import { requireUser } from '../utils/session.js';

// Danh sách thông báo của người đang đăng nhập (mới nhất trước)
export async function listNotifications(req, res) {
  const idUser = requireUser(req);
  const [rows] = await db.query(
    `SELECT t.idThongBao, t.noiDung, t.urlDich, t.createdAt, n.daDoc
     FROM nguoinhanthongbao n
     JOIN thongbao t ON t.idThongBao = n.idThongBao
     WHERE n.idUser = ?
     ORDER BY t.idThongBao DESC LIMIT 50`,
    [idUser]
  );
  const [unread] = await db.query(
    'SELECT COUNT(*) c FROM nguoinhanthongbao WHERE idUser = ? AND daDoc = 0',
    [idUser]
  );
  sendJson(res, 200, { notifications: rows, unread: unread[0].c });
}

// Đánh dấu một thông báo đã đọc
export async function markRead(req, res, params) {
  const idUser = requireUser(req);
  const id = Number(params.id);
  await db.query('UPDATE nguoinhanthongbao SET daDoc = 1 WHERE idThongBao = ? AND idUser = ?', [id, idUser]);
  sendJson(res, 200, { success: true });
}

// Đánh dấu tất cả đã đọc
export async function markAllRead(req, res) {
  const idUser = requireUser(req);
  await db.query('UPDATE nguoinhanthongbao SET daDoc = 1 WHERE idUser = ?', [idUser]);
  sendJson(res, 200, { success: true });
}
