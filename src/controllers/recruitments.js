import { HttpError, sendJson, readJson } from '../utils/helpers.js';
import db from '../models/db.js';
import { requireUser } from '../utils/session.js';
import { readObject, cleanString, toId } from '../utils/validate.js';
import { notify } from '../utils/notify.js';
export async function createProjectRecruitments(req, res, params) {
  // 1. Lấy idDuAn từ URL param (:id)
  const idDuAn = params.id;
  
  // 2. Lấy idUser của người đăng (từ session / auth header)
  const currentUserId = req.user?.idUser || req.session?.userId || req.currentUserId; 

  // 3. Lấy body đã được parse JSON
  const data = await readJson(req); 
  const { tieuDe, yeuCau, hanNop, trangThai } = data || {};

  // 4. Kiểm tra các trường dữ liệu bắt buộc theo DB schema
  if (!idDuAn) {
    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ message: 'Thiếu thông tin idDuAn' }));
  }

  if (!tieuDe || !tieuDe.trim() || !yeuCau || !yeuCau.trim()) {
    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ message: 'Tiêu đề và yêu cầu công việc không được để trống' }));
  }

  try {
    // 5. INSERT vào bảng `tintuyendung`
    const [result] = await db.query(
      `INSERT INTO tintuyendung (idUser, idDuAn, tieuDe, yeuCau, hanNop, trangThai) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        Number(requireUser(req)), 
        Number(idDuAn),
        tieuDe.trim(),
        yeuCau.trim(),
        hanNop || null,
        trangThai || 'not_started' // 'not_started' | 'in_progress' | 'completed'
      ]
    );

    res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({
      success: true,
      message: 'Tạo tin tuyển dụng thành công',
      idTinTuyen: result.insertId
    }));

  } catch (err) {
    console.error('Lỗi createProjectRecruitments:', err);
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ message: 'Lỗi máy chủ khi tạo tin tuyển dụng' }));
  }
}

// 13. Ứng tuyển vào tin tuyển dụng
export async function applyRecruitment(req, res, params) {
  const idUser = requireUser(req);
  const idTinTuyen = toId(params.id, 'ID tin tuyển dụng không hợp lệ');
  const loiNhan = cleanString((await readObject(req)).loiNhan) || null;

  const [tin] = await db.query('SELECT idUser FROM tintuyendung WHERE idTinTuyen = ?', [idTinTuyen]);
  if (tin.length === 0) throw new HttpError(404, 'Không tìm thấy tin tuyển dụng');
  if (tin[0].idUser === idUser) throw new HttpError(400, 'Bạn là người đăng tin, không thể tự ứng tuyển');

  const [dup] = await db.query('SELECT idUngTuyen FROM ungtuyen WHERE idTinTuyen = ? AND idUser = ?', [idTinTuyen, idUser]);
  if (dup.length > 0) throw new HttpError(409, 'Bạn đã ứng tuyển tin này rồi');

  const [r] = await db.query('INSERT INTO ungtuyen (idTinTuyen, idUser, loiNhan, trangThai) VALUES (?, ?, ?, "Pending")', [idTinTuyen, idUser, loiNhan]);
  sendJson(res, 201, { success: true, idUngTuyen: r.insertId, message: 'Đã nộp đơn ứng tuyển' });
}

// 14. Danh sách đơn ứng tuyển (chỉ người đăng tin được xem)
export async function listApplications(req, res, params) {
  const idUser = requireUser(req);
  const idTinTuyen = toId(params.id, 'ID tin tuyển dụng không hợp lệ');
  const [tin] = await db.query('SELECT idUser FROM tintuyendung WHERE idTinTuyen = ?', [idTinTuyen]);
  if (tin.length === 0) throw new HttpError(404, 'Không tìm thấy tin tuyển dụng');
  if (tin[0].idUser !== idUser) throw new HttpError(403, 'Bạn không có quyền xem đơn ứng tuyển');

  const [rows] = await db.query(
    `SELECT ug.idUngTuyen, ug.idUser, ug.loiNhan, ug.trangThai, ug.NgayNop,
            COALESCE(NULLIF(h.HovaTen, ''), u.userName) AS tenNguoiDung, u.email
     FROM ungtuyen ug
     JOIN user u ON u.idUser = ug.idUser
     LEFT JOIN hoso h ON h.idUser = ug.idUser
     WHERE ug.idTinTuyen = ? ORDER BY ug.idUngTuyen DESC`,
    [idTinTuyen]
  );
  sendJson(res, 200, rows);
}

// 14. Duyệt / Từ chối đơn (body { trangThai: 'Accepted' | 'Rejected' })
export async function reviewApplication(req, res, params) {
  const idUser = requireUser(req);
  const idUngTuyen = toId(params.id, 'ID đơn không hợp lệ');
  const trangThai = cleanString((await readObject(req)).trangThai);
  if (!['Accepted', 'Rejected'].includes(trangThai)) throw new HttpError(400, 'Trạng thái không hợp lệ (Accepted/Rejected)');

  const [r] = await db.query(
    `UPDATE ungtuyen SET trangThai = ?
     WHERE idUngTuyen = ? AND idTinTuyen IN (SELECT idTinTuyen FROM tintuyendung WHERE idUser = ?)`,
    [trangThai, idUngTuyen, idUser]
  );
  if (r.affectedRows === 0) throw new HttpError(404, 'Không tìm thấy đơn hoặc bạn không có quyền');
  if (trangThai === 'Accepted') {
    const [app] = await db.query('SELECT idUser FROM ungtuyen WHERE idUngTuyen = ?', [idUngTuyen]);
    if (app.length) notify(app[0].idUser, 'Đơn ứng tuyển của bạn đã được duyệt');
  }
  sendJson(res, 200, { success: true, message: trangThai === 'Accepted' ? 'Đã duyệt đơn' : 'Đã từ chối đơn' });
}

// 15. Lưu tin tuyển dụng
export async function saveRecruitment(req, res, params) {
  const idUser = requireUser(req);
  const idTinTuyen = toId(params.id, 'ID tin tuyển dụng không hợp lệ');
  await db.query('INSERT IGNORE INTO luu_tin (idUser, idTinTuyen) VALUES (?, ?)', [idUser, idTinTuyen]);
  sendJson(res, 200, { saved: true, message: 'Đã lưu tin' });
}

export async function unsaveRecruitment(req, res, params) {
  const idUser = requireUser(req);
  const idTinTuyen = toId(params.id, 'ID tin tuyển dụng không hợp lệ');
  await db.query('DELETE FROM luu_tin WHERE idUser = ? AND idTinTuyen = ?', [idUser, idTinTuyen]);
  sendJson(res, 200, { saved: false, message: 'Đã bỏ lưu tin' });
}

// Gợi ý ứng viên phù hợp theo kỹ năng (matching đơn giản theo từ khóa)
export async function suggestCandidates(req, res, params) {
  const idTinTuyen = toId(params.id, 'ID tin tuyển dụng không hợp lệ');
  const [tin] = await db.query('SELECT yeuCau FROM tintuyendung WHERE idTinTuyen = ?', [idTinTuyen]);
  if (tin.length === 0) throw new HttpError(404, 'Không tìm thấy tin tuyển dụng');
  const yeuCau = (tin[0].yeuCau || '').toLowerCase();

  const [rows] = await db.query(
    `SELECT h.idUser, COALESCE(h.HovaTen, u.userName) AS tenNguoiDung,
            GROUP_CONCAT(c.tenKyNang SEPARATOR '|') AS kyNang
     FROM chuyenmon c
     JOIN hoso h ON h.idHoSo = c.idHoSo
     JOIN user u ON u.idUser = h.idUser
     GROUP BY h.idUser, h.HovaTen, u.userName`
  );

  const candidates = rows
    .map((r) => {
      const kyNang = (r.kyNang || '').split('|').filter(Boolean);
      const kyNangKhop = kyNang.filter((s) => yeuCau.includes(s.toLowerCase()));
      return { idUser: r.idUser, tenNguoiDung: r.tenNguoiDung, kyNang, soKyNangKhop: kyNangKhop.length, kyNangKhop };
    })
    .filter((c) => c.soKyNangKhop > 0)
    .sort((a, b) => b.soKyNangKhop - a.soKyNangKhop);

  sendJson(res, 200, candidates);
}