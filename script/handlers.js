import db from './db.js';
import { HttpError, sendJson, readJson } from './helpers.js';
import { requireUser } from './session.js';

// (Đăng ký / đăng nhập đã chuyển sang users.js)

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

  const tieuDe = data.tieuDeTuyenDung || `Tuyển thành viên tham gia dự án: ${tenDuAn}`;
  const yeuCau = data.yeuCauTuyenDung || moTa || `Yêu cầu có chuyên môn phù hợp với dự án ${tenDuAn}.`;

  // Transaction: tạo dự án và tin tuyển dụng, lỗi bước nào thì hủy cả hai
  await db.beginTransaction();
  try {
    const [duAn] = await db.query(
      `INSERT INTO DuAn (idUserTao, tenDuAn, moTa, ngayBD, ngayKT, trangThai)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [idUser, tenDuAn, moTa, ngayBD, ngayKT, trangThai]
    );

    const [tin] = await db.query(
      `INSERT INTO TinTuyenDung (idUser, idDuAN, tieuDe, yeuCau, hanNop, trangThai)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [idUser, duAn.insertId, tieuDe, yeuCau, ngayKT, 'Đang tuyển']
    );

    await db.commit();
    sendJson(res, 201, {
      message: 'Tạo dự án và tin tuyển dụng thành công',
      idDuAn: duAn.insertId,
      idTinTuyen: tin.insertId
    });
  } catch (err) {
    await db.rollback();
    throw err;
  }
}

export async function getJobs(req, res) {
  const [rows] = await db.query(
    `SELECT t.idTinTuyen, t.idUser, t.idDuAN, t.tieuDe, t.yeuCau,
            t.hanNop, t.trangThai, d.tenDuAn
     FROM TinTuyenDung t
     LEFT JOIN DuAn d ON t.idDuAN = d.idDuAn
     ORDER BY t.idTinTuyen DESC`
  );
  sendJson(res, 200, rows);
}

// ---------- Bài viết ----------
export async function createPost(req, res) {
  const idUser = requireUser(req); // người đang đăng nhập
  const { noiDung, hinhAnhUrl } = await readJson(req);

  if (!noiDung) {
    throw new HttpError(400, 'Nội dung bài viết không được để trống');
  }

  const [result] = await db.query(
    'INSERT INTO Post (idUser, noiDung, hinhAnhUrl, createdAt) VALUES (?, ?, ?, NOW())',
    [idUser, noiDung, hinhAnhUrl || null]
  );
  sendJson(res, 201, { message: 'Đăng bài viết thành công', idPost: result.insertId });
}

export async function getPosts(req, res) {
  const [rows] = await db.query(
    'SELECT idPost, idUser, noiDung, hinhAnhUrl, createdAt FROM Post ORDER BY createdAt DESC'
  );
  sendJson(res, 200, rows);
}