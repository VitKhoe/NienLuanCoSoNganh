import db from '../models/db.js';
import { HttpError, sendJson, readJson } from '../utils/helpers.js';
import { requireUser } from '../utils/session.js';
import { readObject, cleanString, toId, parseLimit } from '../utils/validate.js';
import { addMember } from './chat.js';

const MAX_NAME_LENGTH = 255;
const MAX_TEXT_LENGTH = 5000;
const VALID_STATUSES = ['not_started', 'in_progress', 'completed'];
const VALID_ROLES = ['quan_ly', 'nhan_vien', 'khach'];
const PRIVATE_PREFIX = 'private:';

function currentUserId(req) {
  return getSession(req)?.idUser ?? 0;
}

async function assertProjectExists(idDuAn) {
  const [rows] = await db.query('SELECT idDuAn, idUserTao, trangThai FROM duan WHERE idDuAn = ?', [idDuAn]);
  if (rows.length === 0) {
    throw new HttpError(404, 'Không tìm thấy dự án');
  }
  return rows[0];
}
async function getUserRole(idDuAn, idUser) {
  const [rows] = await db.query(
    'SELECT vaiTro FROM thanhvienduan WHERE idDuAn = ? AND idUser = ?',
    [idDuAn, idUser]
  );
  return rows.length > 0 ? rows[0].vaiTro : null;
}
async function requireProjectManager(idDuAn, idUser) {
  const project = await assertProjectExists(idDuAn);
  if (project.idUserTao === idUser) return project;

  const role = await getUserRole(idDuAn, idUser);
  if (role !== 'quan_ly') {
    throw new HttpError(403, 'Bạn không có quyền quản lý dự án này');
  }
  return project;
}
export async function createProject(req, res) {
  const idUser = requireUser(req);
  const data = await readObject(req) || await readJson(req);

  const tenDuAn = cleanString(data.tenDuAn);
  const trangThai = cleanString(data.trangThai) || 'not_started';
  const moTa = cleanString(data.moTa) || null;
  const ngayBD = cleanString(data.ngayBD) || null;
  const ngayKT = cleanString(data.ngayKT) || null;

  if (!tenDuAn) {
    throw new HttpError(400, 'Tên dự án không được để trống');
  }

  try {
    // 1. Thêm dự án mới
    // LƯU Ý: mysql2 trả về [ResultSetHeader, FieldPacket], gán biến insertResult cho phần tử đầu tiên
    const [insertResult] = await db.query(
      `INSERT INTO duan (idUserTao, tenDuAn, moTa, ngayBD, ngayKT, trangThai)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [idUser, tenDuAn, moTa, ngayBD, ngayKT, trangThai]
    );

    // Lấy ID vừa tạo
    const idDuAnVuaTao = insertResult.insertId;

    // Kiểm tra an toàn trước khi chạy câu lệnh tiếp theo
    if (!idDuAnVuaTao) {
      throw new HttpError(500, 'Không lấy được ID dự án từ database. Hãy kiểm tra lại AUTO_INCREMENT');
    }

    // 2. Thêm người tạo vào bảng thành viên dự án
    await db.query(
      `INSERT INTO thanhvienduan (idDuAn, idUser, vaiTro)
       VALUES (?, ?, ?)`,
      [idDuAnVuaTao, idUser, 'quan_ly']
    );

    // 3. Trả về phản hồi cho Client
    return sendJson(res, 201, {
      message: 'Tạo dự án thành công',
      idDuAn: idDuAnVuaTao
    });

  } catch (err) {
    console.error('LỖI THỰC TẾ TẠI SERVER:', err);
    throw err;
  }
}
export async function updateProject(req, res, params) {
  const idUser = requireUser(req);
  const idDuAn = Number(params.id);
  await requireProjectManager(idDuAn, idUser);

  const data = await readObject(req);
  const tenDuAn = cleanString(data.tenDuAn);
  const moTa = cleanString(data.moTa) || null;
  const ngayBD = cleanString(data.ngayBD) || null;
  const ngayKT = cleanString(data.ngayKT) || null;
  const trangThai = cleanString(data.trangThai);

  if (!tenDuAn) {
    throw new HttpError(400, 'Tên dự án không được để trống');
  }
  if (trangThai && !VALID_STATUSES.includes(trangThai)) {
    throw new HttpError(400, 'Trạng thái dự án không hợp lệ');
  }

  await db.query(
    `UPDATE duan 
     SET tenDuAn = ?, moTa = ?, ngayBD = ?, ngayKT = ?, trangThai = COALESCE(NULLIF(?, ''), trangThai)
     WHERE idDuAn = ?`,
    [tenDuAn, moTa, ngayBD, ngayKT, trangThai, idDuAn]
  );

  sendJson(res, 200, { message: 'Cập nhật dự án thành công' });
}
export async function deleteProject(req, res, params) {
  const idUser = requireUser(req);
  const idDuAn = Number(params.id);

  const project = await assertProjectExists(idDuAn);
  if (project.idUserTao !== idUser) {
    throw new HttpError(403, 'Chỉ người tạo mới có quyền xóa dự án này');
  }

  await db.query('DELETE FROM duan WHERE idDuAn = ?', [idDuAn]);
  sendJson(res, 200, { message: 'Đã xóa dự án thành công' });
}

export async function closeProject(req, res, params) {
  const idUser = requireUser(req);
  const idDuAn = Number(params.id);
  await requireProjectManager(idDuAn, idUser);

  await db.query('UPDATE duan SET trangThai = "completed" WHERE idDuAn = ?', [idDuAn]);
  sendJson(res, 200, { message: 'Đã hoàn thành/đóng dự án' });
}
export async function getProjects(req, res) {
  const idUser = requireUser(req);

  // Lấy danh sách dự án kèm vai trò của user
  const [rows] = await db.query(
    `SELECT d.idDuAn, d.tenDuAn, d.moTa, d.trangThai, d.ngayBD, d.ngayKT, d.idUserTao, h.userName
     FROM duan d
     LEFT JOIN user h ON d.idUserTao = h.idUser
     ORDER BY d.created_at DESC`,
    [idUser]
  );
  // WHERE tv.idUser = ?
  sendJson(res, 200, rows);
}
export async function getProjectDetail(req, res, params) {
  const idDuAn = Number(params.id);
  await assertProjectExists(idDuAn);
  const idUser = requireUser(req);
  const [projects] = await db.query(
    `SELECT d.*, 
            COALESCE(NULLIF(h.HovaTen, ''), u.userName) AS tenNguoiTao,
            h.avatar AS avatarNguoiTao
     FROM duan d
     JOIN user u ON u.idUser = d.idUserTao
     LEFT JOIN hoso h ON h.idUser = d.idUserTao
     WHERE d.idDuAn = ?`,
    [idDuAn]
  );

  const [members] = await db.query(
    `SELECT tv.idUser, tv.vaiTro,
            COALESCE(NULLIF(h.HovaTen, ''), u.userName) AS tenThanhVien,
            h.avatar
     FROM thanhvienduan tv
     JOIN user u ON u.idUser = tv.idUser
     LEFT JOIN hoso h ON h.idUser = tv.idUser
     WHERE tv.idDuAn = ?
     ORDER BY FIELD(tv.vaiTro, 'quan_ly', 'nhan_vien', 'khach')`,
    [idDuAn]
  );

  sendJson(res, 200, {
    ...projects[0],
    thanhVien: members
  });
}

export async function assignMemberRole(req, res, params) {
  const currentUserId = requireUser(req);
  const idDuAn = Number(params.id);
  await requireProjectManager(idDuAn, currentUserId);

  const data = await readObject(req);
  const targetUserId = toId(data.idUser, 'Mã thành viên không hợp lệ');
  const vaiTro = cleanString(data.vaiTro);

  if (!VALID_ROLES.includes(vaiTro)) {
    throw new HttpError(400, 'Vai trò không hợp lệ (cho phép: quan_ly, nhan_vien, khach)');
  }

  const [users] = await db.query('SELECT idUser FROM user WHERE idUser = ?', [targetUserId]);
  if (users.length === 0) {
    throw new HttpError(404, 'Thành viên không tồn tại trong hệ thống');
  }

  await db.query(
    `INSERT INTO thanhvienduan (idDuAn, idUser, vaiTro)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE vaiTro = VALUES(vaiTro)`,
    [idDuAn, targetUserId, vaiTro]
  );

  sendJson(res, 200, { message: 'Cập nhật thành viên và vai trò thành công' });
}
export async function removeMember(req, res, params) {
  const data = await readJson(req);
  const currentUserId = requireUser(req);
  const idDuAn = data.idDuAn; 
  const targetUserId = data.idUser;

  const project = await requireProjectManager(idDuAn, currentUserId);

  if (targetUserId === project.idUserTao) {
    throw new HttpError(400, 'Không thể xóa người tạo khỏi dự án');
  }

  const [result] = await db.query(
    'DELETE FROM thanhvienduan WHERE idDuAn = ? AND idUser = ?',
    [idDuAn, targetUserId]
  );

  if (result.affectedRows === 0) {
    throw new HttpError(404, 'Thành viên không có trong dự án');
  }

  sendJson(res, 200, { message: 'Đã xóa thành viên khỏi dự án' });
}
export async function leaveProject(req, res, params) {
  const idUser = requireUser(req);
  const idDuAn = Number(params.id);

  const project = await assertProjectExists(idDuAn);

  if (project.idUserTao === idUser) {
    throw new HttpError(400, 'Trưởng dự án không thể rút khỏi dự án. Hãy chuyển quyền hoặc xóa dự án.');
  }

  const [result] = await db.query(
    'DELETE FROM thanhvienduan WHERE idDuAn = ? AND idUser = ?',
    [idDuAn, idUser]
  );

  if (result.affectedRows === 0) {
    throw new HttpError(400, 'Bạn không phải là thành viên dự án này');
  }

  sendJson(res, 200, { message: 'Bạn đã rời khỏi dự án thành công' });
}
export async function reviewMember(req, res, params) {
  const idNguoiDanhGia = requireUser(req);
  const idDuAn = Number(params.id);

  const project = await assertProjectExists(idDuAn);

  if (project.trangThai !== 'completed') {
    throw new HttpError(400, 'Chỉ có thể đánh giá thành viên khi dự án đã hoàn thành');
  }

  const data = await readObject(req);
  const idUserDuocDanhGia = toId(data.idUserDuocDanhGia, 'Thành viên được đánh giá không hợp lệ');
  const diem = Number(data.diem);
  const nhanXet = cleanString(data.nhanXet) || null;

  if (!Number.isInteger(diem) || diem < 1 || diem > 5) {
    throw new HttpError(400, 'Điểm đánh giá phải là số nguyên từ 1 đến 5');
  }

  if (idNguoiDanhGia === idUserDuocDanhGia) {
    throw new HttpError(400, 'Bạn không thể tự đánh giá chính mình');
  }

  const roleEvaluator = await getUserRole(idDuAn, idNguoiDanhGia);
  const roleTarget = await getUserRole(idDuAn, idUserDuocDanhGia);

  if (!roleEvaluator || !roleTarget) {
    throw new HttpError(400, 'Cả người đánh giá và người được đánh giá phải thuộc dự án');
  }

  await db.query(
    `INSERT INTO danhgia_thanhvien (idDuAn, idNguoiDanhGia, idUserDuocDanhGia, diem, nhanXet)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE diem = VALUES(diem), nhanXet = VALUES(nhanXet)`,
    [idDuAn, idNguoiDanhGia, idUserDuocDanhGia, diem, nhanXet]
  );

  sendJson(res, 200, { message: 'Đánh giá thành viên thành công' });
}
export async function requestJoinProject(req, res, params) {
  const me = requireUser(req);
  const idDuAn = Number(params.id);

  if (!idDuAn) {
    throw new HttpError(400, 'ID dự án không hợp lệ');
  }

  // 1. Lấy thông tin dự án & người tạo
  const [projects] = await db.query(
    `SELECT idDuAn, tenDuAn, idUserTao FROM duan WHERE idDuAn = ?`,
    [idDuAn]
  );

  if (projects.length === 0) {
    throw new HttpError(404, 'Không tìm thấy dự án');
  }

  const project = projects[0];
  const ownerId = project.idUserTao;

  if (ownerId === me) {
    throw new HttpError(400, 'Bạn là chủ dự án, không thể tự gửi yêu cầu tham gia');
  }

  const [existingMember] = await db.query(
    `SELECT 1 FROM thanhvienduan WHERE idDuAn = ? AND idUser = ?`,
    [idDuAn, me]
  );
  if (existingMember.length > 0) {
    throw new HttpError(400, 'Bạn đã là thành viên của dự án này');
  }

  const name = `${PRIVATE_PREFIX}${Math.min(me, ownerId)}-${Math.max(me, ownerId)}`;
  const findChat = () => db.query('SELECT idChatBox FROM chatbox WHERE tenChatBox = ?', [name]);

  let [rows] = await findChat();
  if (rows.length === 0) {
    try {
      await db.query("INSERT INTO chatbox (tenChatBox, loai) VALUES (?, 'Private')", [name]);
    } catch (err) {
      if (err.code !== 'ER_DUP_ENTRY') throw err;
    }
    [rows] = await findChat();
  }
  const idChatBox = rows[0].idChatBox;

  await addMember(idChatBox, me);
  await addMember(idChatBox, ownerId);

  const payload = {
    type: 'JOIN_REQUEST',
    idDuAn: project.idDuAn,
    tenDuAn: project.tenDuAn,
    status: 'pending'
  };
  const noiDungChuanHoa = `[JOIN_REQUEST] ${JSON.stringify(payload)}`;

  const [msgResult] = await db.query(
    `INSERT INTO message (idChatBox, idUser, noiDung) VALUES (?, ?, ?)`,
    [idChatBox, me, noiDungChuanHoa]
  );

  return sendJson(res, 201, {
    message: 'Đã gửi yêu cầu tham gia dự án thành công!',
    idChatBox,
    idMessage: msgResult.insertId
  });
}