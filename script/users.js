// Nhóm 1 - Người dùng & Hồ sơ:
// đăng ký, đăng nhập, đăng xuất, hồ sơ cá nhân, kỹ năng chuyên môn

import db from './db.js';
import { HttpError, sendJson, readJson } from './helpers.js';
import {
  hashPassword,
  verifyPassword,
  isHashed,
  createSession,
  destroySession,
  requireUser
} from './session.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9 .-]{8,20}$/;
const SKILL_LEVELS = ['Beginner', 'Intermediate', 'Expert', 'Master'];

// =========================================================================
// HÀM DÙNG CHUNG
// =========================================================================

// Đọc body JSON và chắc chắn nó là một object
async function readObject(req) {
  const data = await readJson(req);
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new HttpError(400, 'Dữ liệu gửi lên không hợp lệ');
  }
  return data;
}

// Chuỗi đã cắt khoảng trắng ('' nếu giá trị không phải chuỗi)
function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

// Tạo hồ sơ mặc định cho user (không làm gì nếu đã có)
function createProfile(idUser, userName) {
  return db.query(
    `INSERT INTO hoso (idUser, HovaTen, SDT) VALUES (?, ?, '')
     ON DUPLICATE KEY UPDATE idUser = idUser`,
    [idUser, userName]
  );
}

// Lấy hồ sơ của user, chưa có thì tạo (tài khoản cũ có thể chưa có hồ sơ)
async function getOrCreateProfile(idUser) {
  const sql = `
    SELECT u.idUser, u.userName, u.email, h.idHoSo, h.HovaTen, h.avatar, h.tieuSu, h.SDT
    FROM user u
    LEFT JOIN hoso h ON h.idUser = u.idUser
    WHERE u.idUser = ?`;

  let [rows] = await db.query(sql, [idUser]);
  if (rows.length === 0) {
    throw new HttpError(401, 'Tài khoản không còn tồn tại');
  }

  if (rows[0].idHoSo === null) {
    await createProfile(idUser, rows[0].userName);
    [rows] = await db.query(sql, [idUser]);
  }
  return rows[0];
}

function toProfileJson(row) {
  return {
    idUser: row.idUser,
    userName: row.userName,
    email: row.email,
    HovaTen: row.HovaTen,
    avatar: row.avatar,
    tieuSu: row.tieuSu,
    SDT: row.SDT
  };
}

// =========================================================================
// 1. ĐĂNG KÝ  -  POST /signup
// =========================================================================
export async function signup(req, res) {
  const data = await readObject(req);
  const userName = cleanString(data.username);
  const email = cleanString(data.email).toLowerCase();
  const password = typeof data.password === 'string' ? data.password : '';

  if (userName.length < 3 || userName.length > 50) {
    throw new HttpError(400, 'Tên đăng nhập phải từ 3 đến 50 ký tự');
  }
  if (email.length > 255 || !EMAIL_RE.test(email)) {
    throw new HttpError(400, 'Email không hợp lệ');
  }
  if (password.length < 6 || password.length > 128) {
    throw new HttpError(400, 'Mật khẩu phải từ 6 đến 128 ký tự');
  }

  let idUser;
  try {
    const [result] = await db.query(
      'INSERT INTO user (userName, email, pWD) VALUES (?, ?, ?)',
      [userName, email, await hashPassword(password)]
    );
    idUser = result.insertId;
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      const trungTen = /userName/i.test(err.sqlMessage || '');
      throw new HttpError(409, trungTen ? 'Tên đăng nhập đã tồn tại' : 'Email đã được sử dụng');
    }
    throw err;
  }

  // Tạo hồ sơ đi kèm; nếu lỗi thì hồ sơ sẽ được tạo lại ở lần dùng đầu tiên
  try {
    await createProfile(idUser, userName);
  } catch (err) {
    console.log('Lỗi tạo hồ sơ khi đăng ký:', err.message);
  }

  sendJson(res, 201, { message: 'Đăng ký thành công' });
}

// =========================================================================
// 2. ĐĂNG NHẬP  -  POST /login
// =========================================================================
export async function login(req, res) {
  const data = await readObject(req);
  const email = cleanString(data.email).toLowerCase();
  const password = typeof data.password === 'string' ? data.password : '';

  if (!email || !password) {
    throw new HttpError(400, 'Vui lòng nhập email và mật khẩu');
  }

  const [rows] = await db.query(
    'SELECT idUser, userName, email, pWD, trangThai FROM user WHERE email = ?',
    [email]
  );
  const user = rows[0];

  // Cùng một thông báo cho "không có email" và "sai mật khẩu"
  if (!user || !(await verifyPassword(password, user.pWD))) {
    throw new HttpError(401, 'Sai email hoặc mật khẩu');
  }
  if (user.trangThai === 'Banned') {
    throw new HttpError(403, 'Tài khoản đã bị khóa');
  }

  // Tài khoản cũ còn lưu mật khẩu thô: đăng nhập thành công thì băm lại
  if (!isHashed(user.pWD)) {
    await db.query('UPDATE user SET pWD = ? WHERE idUser = ?', [
      await hashPassword(password),
      user.idUser
    ]);
  }

  destroySession(req, res); // bỏ phiên cũ (nếu có) trước khi cấp phiên mới
  createSession(res, user.idUser);
  sendJson(res, 200, {
    message: 'Đăng nhập thành công',
    user: { idUser: user.idUser, userName: user.userName, email: user.email }
  });
}

// =========================================================================
// 3. ĐĂNG XUẤT  -  POST /logout
// =========================================================================
export async function logout(req, res) {
  destroySession(req, res);
  sendJson(res, 200, { message: 'Đã đăng xuất' });
}

// =========================================================================
// 4. HỒ SƠ CÁ NHÂN
// =========================================================================

// GET /api/me
export async function getMe(req, res) {
  const profile = await getOrCreateProfile(requireUser(req));
  sendJson(res, 200, toProfileJson(profile));
}

// PUT /api/me/profile   body: { HovaTen, avatar, tieuSu, SDT }
export async function updateProfile(req, res) {
  const idUser = requireUser(req);
  const data = await readObject(req);

  const HovaTen = cleanString(data.HovaTen);
  const avatar = cleanString(data.avatar) || null;
  const tieuSu = cleanString(data.tieuSu) || null;
  const SDT = cleanString(data.SDT);

  if (!HovaTen || HovaTen.length > 255) {
    throw new HttpError(400, 'Họ và tên không được để trống (tối đa 255 ký tự)');
  }
  if (avatar && avatar.length > 500) {
    throw new HttpError(400, 'Đường dẫn avatar tối đa 500 ký tự');
  }
  if (tieuSu && tieuSu.length > 2000) {
    throw new HttpError(400, 'Tiểu sử tối đa 2000 ký tự');
  }
  if (SDT && !PHONE_RE.test(SDT)) {
    throw new HttpError(400, 'Số điện thoại không hợp lệ');
  }

  await getOrCreateProfile(idUser); // bảo đảm đã có hồ sơ để cập nhật
  await db.query(
    'UPDATE hoso SET HovaTen = ?, avatar = ?, tieuSu = ?, SDT = ? WHERE idUser = ?',
    [HovaTen, avatar, tieuSu, SDT, idUser]
  );

  sendJson(res, 200, toProfileJson(await getOrCreateProfile(idUser)));
}

// =========================================================================
// 5. KỸ NĂNG CHUYÊN MÔN (bảng chuyenmon)
// =========================================================================

async function getProfileId(req) {
  const profile = await getOrCreateProfile(requireUser(req));
  return profile.idHoSo;
}

// Kiểm tra dữ liệu kỹ năng gửi lên
function readSkill(data) {
  const tenKyNang = cleanString(data.tenKyNang);
  const trinhDo = data.trinhDo ? data.trinhDo : 'Beginner';
  const soNamKinhNghiem = data.soNamKinhNghiem === undefined || data.soNamKinhNghiem === ''
    ? 0
    : Number(data.soNamKinhNghiem);

  if (!tenKyNang || tenKyNang.length > 100) {
    throw new HttpError(400, 'Tên kỹ năng không được để trống (tối đa 100 ký tự)');
  }
  if (!SKILL_LEVELS.includes(trinhDo)) {
    throw new HttpError(400, 'Trình độ không hợp lệ');
  }
  if (!Number.isInteger(soNamKinhNghiem) || soNamKinhNghiem < 0 || soNamKinhNghiem > 60) {
    throw new HttpError(400, 'Số năm kinh nghiệm phải là số nguyên từ 0 đến 60');
  }
  return { tenKyNang, trinhDo, soNamKinhNghiem };
}

// Không cho một người có 2 kỹ năng trùng tên (exceptId: bỏ qua chính kỹ năng đang sửa)
async function assertSkillNameFree(idHoSo, tenKyNang, exceptId = 0) {
  const [rows] = await db.query(
    'SELECT idChuyenMon FROM chuyenmon WHERE idHoSo = ? AND tenKyNang = ? AND idChuyenMon <> ?',
    [idHoSo, tenKyNang, exceptId]
  );
  if (rows.length > 0) {
    throw new HttpError(409, 'Kỹ năng này đã có trong hồ sơ');
  }
}

// GET /api/me/skills
export async function getSkills(req, res) {
  const idHoSo = await getProfileId(req);
  const [rows] = await db.query(
    `SELECT idChuyenMon, tenKyNang, trinhDo, soNamKinhNghiem
     FROM chuyenmon WHERE idHoSo = ? ORDER BY idChuyenMon`,
    [idHoSo]
  );
  sendJson(res, 200, rows);
}

// POST /api/me/skills   body: { tenKyNang, trinhDo, soNamKinhNghiem }
export async function addSkill(req, res) {
  const idHoSo = await getProfileId(req);
  const skill = readSkill(await readObject(req));
  await assertSkillNameFree(idHoSo, skill.tenKyNang);

  const [result] = await db.query(
    'INSERT INTO chuyenmon (idHoSo, tenKyNang, trinhDo, soNamKinhNghiem) VALUES (?, ?, ?, ?)',
    [idHoSo, skill.tenKyNang, skill.trinhDo, skill.soNamKinhNghiem]
  );
  sendJson(res, 201, { idChuyenMon: result.insertId, ...skill });
}

// PUT /api/me/skills/:id
export async function updateSkill(req, res, params) {
  const idHoSo = await getProfileId(req);
  const idChuyenMon = Number(params.id);
  const skill = readSkill(await readObject(req));

  // Chỉ được sửa kỹ năng thuộc hồ sơ của mình
  const [owned] = await db.query(
    'SELECT idChuyenMon FROM chuyenmon WHERE idChuyenMon = ? AND idHoSo = ?',
    [idChuyenMon, idHoSo]
  );
  if (owned.length === 0) {
    throw new HttpError(404, 'Không tìm thấy kỹ năng');
  }
  await assertSkillNameFree(idHoSo, skill.tenKyNang, idChuyenMon);

  await db.query(
    `UPDATE chuyenmon SET tenKyNang = ?, trinhDo = ?, soNamKinhNghiem = ?
     WHERE idChuyenMon = ? AND idHoSo = ?`,
    [skill.tenKyNang, skill.trinhDo, skill.soNamKinhNghiem, idChuyenMon, idHoSo]
  );
  sendJson(res, 200, { idChuyenMon, ...skill });
}

// DELETE /api/me/skills/:id
export async function deleteSkill(req, res, params) {
  const idHoSo = await getProfileId(req);

  const [result] = await db.query(
    'DELETE FROM chuyenmon WHERE idChuyenMon = ? AND idHoSo = ?',
    [Number(params.id), idHoSo]
  );
  if (result.affectedRows === 0) {
    throw new HttpError(404, 'Không tìm thấy kỹ năng');
  }
  sendJson(res, 200, { message: 'Đã xóa kỹ năng' });
}