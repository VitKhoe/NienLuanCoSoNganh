import db from '../models/db.js';
import { HttpError, sendJson, readJson } from '../utils/helpers.js';
import { requireUser } from '../utils/session.js';

// ---------- Dự án + tin tuyển dụng ----------
export async function createProject(req, res) {
  const idUser = requireUser(req); // người đang đăng nhập
  const data = await readJson(req);
  const { tenDuAn, trangThai } = data;
  const moTa = data.moTa || null;
  const ngayBD = data.ngayBD || null;
  const ngayKT = data.ngayKT || null;

  if (!tenDuAn || !trangThai) {
    throw new HttpError(400, 'Tên dự án và trạng thái không được để trống');
  }

  // Lấy connection từ pool để thực hiện transaction an toàn
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [duAn] = await conn.query(
      `INSERT INTO duan (idUserTao, tenDuAn, moTa, ngayBD, ngayKT, trangThai)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [idUser, tenDuAn, moTa, ngayBD, ngayKT, trangThai]
    );

    await conn.commit();
    sendJson(res, 201, {
      message: 'Tạo dự án thành công',
      idDuAn: duAn.insertId
    });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function getJobs(req, res) {
  const [rows] = await db.query(
    `SELECT t.idTinTuyen, t.idUser, t.idDuAN, t.tieuDe, t.yeuCau,
            t.hanNop, t.trangThai, d.tenDuAn
     FROM tintuyendung t
     LEFT JOIN duan d ON t.idDuAN = d.idDuAn
     ORDER BY t.idTinTuyen DESC`
  );
  sendJson(res, 200, rows);
}
