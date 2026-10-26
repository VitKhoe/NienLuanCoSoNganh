// Nhóm 2 - Mạng xã hội (phần 2): kết nối (kết bạn) giữa người dùng, bảng ketnoi
//   Pending  = đã gửi lời mời, chờ người nhận chấp nhận
//   Accepted = đã là bạn bè
//   Blocked  = bị chặn (ứng dụng chỉ đọc trạng thái này, không tự tạo)

import db from './db.js';
import { HttpError, sendJson } from './helpers.js';
import { requireUser } from './session.js';
import { readObject, toId } from './validate.js';

const PENDING = "(k.trangThai = 'Pending' OR k.trangThai IS NULL)";

// Người dùng phải tồn tại và không bị khóa
export async function assertActiveUser(idUser) {
  const [rows] = await db.query(
    "SELECT idUser FROM user WHERE idUser = ? AND (trangThai = 'Active' OR trangThai IS NULL)",
    [idUser]
  );
  if (rows.length === 0) {
    throw new HttpError(404, 'Không tìm thấy người dùng');
  }
}

// Tập id những người đã là bạn bè (Accepted) của user
export async function getFriendIds(idUser) {
  const [rows] = await db.query(
    `SELECT CASE WHEN idUserGui = ? THEN idUserNhan ELSE idUserGui END AS idBan
     FROM ketnoi
     WHERE trangThai = 'Accepted' AND (idUserGui = ? OR idUserNhan = ?)`,
    [idUser, idUser, idUser]
  );
  return new Set(rows.map((row) => row.idBan));
}

// =========================================================================
// 9. GỬI LỜI MỜI KẾT BẠN  -  POST /api/connections   body: { idUser }
// =========================================================================
export async function sendRequest(req, res) {
  const me = requireUser(req);
  const target = toId((await readObject(req)).idUser, 'Người nhận không hợp lệ');

  if (target === me) {
    throw new HttpError(400, 'Không thể kết nối với chính mình');
  }
  await assertActiveUser(target);

  // Xem giữa hai người đã có quan hệ gì chưa (theo cả hai chiều)
  const [rows] = await db.query(
    `SELECT idUserGui, idUserNhan, trangThai FROM ketnoi
     WHERE (idUserGui = ? AND idUserNhan = ?) OR (idUserGui = ? AND idUserNhan = ?)`,
    [me, target, target, me]
  );
  const status = (row) => row.trangThai ?? 'Pending';

  if (rows.some((row) => status(row) === 'Blocked')) {
    throw new HttpError(403, 'Không thể gửi lời mời kết bạn cho người này');
  }
  if (rows.some((row) => status(row) === 'Accepted')) {
    throw new HttpError(409, 'Hai bạn đã là bạn bè');
  }
  if (rows.some((row) => row.idUserGui === me)) {
    throw new HttpError(409, 'Bạn đã gửi lời mời cho người này rồi');
  }
  if (rows.some((row) => row.idUserGui === target)) {
    throw new HttpError(409, 'Người này đã gửi lời mời cho bạn, hãy vào danh sách lời mời để chấp nhận');
  }

  try {
    await db.query("INSERT INTO ketnoi (idUserGui, idUserNhan, trangThai) VALUES (?, ?, 'Pending')", [
      me,
      target
    ]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      throw new HttpError(409, 'Bạn đã gửi lời mời cho người này rồi');
    }
    throw err;
  }
  sendJson(res, 201, { message: 'Đã gửi lời mời kết bạn' });
}

// =========================================================================
// CHẤP NHẬN LỜI MỜI  -  POST /api/connections/:id/accept   (:id = người đã gửi lời mời)
// =========================================================================
export async function acceptRequest(req, res, params) {
  const me = requireUser(req);
  const sender = Number(params.id);

  const [result] = await db.query(
    `UPDATE ketnoi SET trangThai = 'Accepted'
     WHERE idUserGui = ? AND idUserNhan = ? AND (trangThai = 'Pending' OR trangThai IS NULL)`,
    [sender, me]
  );
  if (result.affectedRows === 0) {
    throw new HttpError(404, 'Không có lời mời nào từ người này');
  }
  sendJson(res, 200, { message: 'Đã chấp nhận lời mời kết bạn' });
}

// =========================================================================
// TỪ CHỐI / THU HỒI LỜI MỜI / HỦY KẾT BẠN  -  DELETE /api/connections/:id   (:id = người kia)
// =========================================================================
export async function removeConnection(req, res, params) {
  const me = requireUser(req);
  const other = Number(params.id);

  // Không xóa quan hệ Blocked để người bị chặn không tự gỡ chặn được
  const [result] = await db.query(
    `DELETE FROM ketnoi
     WHERE ((idUserGui = ? AND idUserNhan = ?) OR (idUserGui = ? AND idUserNhan = ?))
       AND (trangThai <> 'Blocked' OR trangThai IS NULL)`,
    [me, other, other, me]
  );
  if (result.affectedRows === 0) {
    throw new HttpError(404, 'Không có kết nối nào với người này');
  }
  sendJson(res, 200, { message: 'Đã xóa kết nối' });
}

// =========================================================================
// DANH SÁCH  -  GET /api/connections?type=friends|incoming|outgoing
//   friends  : bạn bè
//   incoming : lời mời người khác gửi cho mình
//   outgoing : lời mời mình đã gửi
// =========================================================================
const PERSON = `
  u.idUser, u.userName,
  COALESCE(NULLIF(h.HovaTen, ''), u.userName) AS ten,
  h.avatar, k.createdAt`;

export async function listConnections(req, res, params, query = new URLSearchParams()) {
  const me = requireUser(req);
  const type = query.get('type') || 'friends';

  let sql;
  let args;
  if (type === 'friends') {
    sql = `SELECT ${PERSON}
           FROM ketnoi k
           JOIN user u ON u.idUser = CASE WHEN k.idUserGui = ? THEN k.idUserNhan ELSE k.idUserGui END
           LEFT JOIN hoso h ON h.idUser = u.idUser
           WHERE k.trangThai = 'Accepted' AND (k.idUserGui = ? OR k.idUserNhan = ?)
           ORDER BY ten`;
    args = [me, me, me];
  } else if (type === 'incoming') {
    sql = `SELECT ${PERSON}
           FROM ketnoi k
           JOIN user u ON u.idUser = k.idUserGui
           LEFT JOIN hoso h ON h.idUser = u.idUser
           WHERE k.idUserNhan = ? AND ${PENDING}
           ORDER BY k.createdAt DESC`;
    args = [me];
  } else if (type === 'outgoing') {
    sql = `SELECT ${PERSON}
           FROM ketnoi k
           JOIN user u ON u.idUser = k.idUserNhan
           LEFT JOIN hoso h ON h.idUser = u.idUser
           WHERE k.idUserGui = ? AND ${PENDING}
           ORDER BY k.createdAt DESC`;
    args = [me];
  } else {
    throw new HttpError(400, 'type phải là friends, incoming hoặc outgoing');
  }

  const [rows] = await db.query(sql, args);
  sendJson(res, 200, rows);
}