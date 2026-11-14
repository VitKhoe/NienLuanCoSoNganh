// Nhóm 6 (bổ sung) - Trang quản trị: kiểm tra quyền + quản lý người dùng

import db from '../models/db.js';
import { HttpError, sendJson } from '../utils/helpers.js';
import { requireUser } from '../utils/session.js';
import { readObject } from '../utils/validate.js';

// Admin là tài khoản có QuyenCSDL = 'rwxrwxrwx'
export async function assertAdmin(req) {
  const idUser = requireUser(req);
  const [rows] = await db.query('SELECT QuyenCSDL FROM user WHERE idUser = ?', [idUser]);
  if (rows.length === 0 || rows[0].QuyenCSDL !== 'rwxrwxrwx') {
    throw new HttpError(403, 'Bạn không có quyền quản trị');
  }
  return idUser;
}

// Danh sách người dùng (chỉ admin)
export async function listUsers(req, res) {
  await assertAdmin(req);
  const [rows] = await db.query(
    `SELECT u.idUser, u.userName, u.email, u.trangThai, u.QuyenCSDL, u.createdAt,
            COALESCE(h.HovaTen, '') AS HovaTen
     FROM user u LEFT JOIN hoso h ON h.idUser = u.idUser
     ORDER BY u.idUser`
  );
  sendJson(res, 200, rows);
}

// Khóa / mở khóa tài khoản (chỉ admin)
export async function setUserStatus(req, res, params) {
  await assertAdmin(req);
  const id = Number(params.id);
  const trangThai = (await readObject(req)).trangThai;
  if (!['Active', 'Banned'].includes(trangThai)) throw new HttpError(400, 'Trạng thái không hợp lệ (Active/Banned)');
  await db.query('UPDATE user SET trangThai = ? WHERE idUser = ?', [trangThai, id]);
  sendJson(res, 200, { success: true });
}