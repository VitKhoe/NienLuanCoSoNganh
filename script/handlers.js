const db = require('./db');
const { HttpError, sendText, sendJson, sendFile, readJson } = require('./helpers');

const ID_USER_TAM = 1; // TODO: lấy từ session/token

// ---------- Tài khoản ----------
async function login(req, res) {
  const { email, password } = await readJson(req);

  const [rows] = await db.query(
    'SELECT * FROM user WHERE email = ? AND pWD = ?',
    [email, password]
  );

  if (rows.length === 0) {
    return sendText(res, 401, 'Sai email hoặc mật khẩu');
  }
  console.log('Đăng nhập thành công');
  sendFile(res, 'index.html', 'text/html; charset=utf-8');
}

async function signup(req, res) {
  const { username, email, password } = await readJson(req);

  await db.query(
    'INSERT INTO user (username, email, pWD) VALUES (?, ?, ?)',
    [username, email, password]
  );
  sendText(res, 201, 'Đăng ký thành công');
}

// ---------- Dự án + tin tuyển dụng ----------
async function createProject(req, res) {
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
      [ID_USER_TAM, tenDuAn, moTa, ngayBD, ngayKT, trangThai]
    );

    const [tin] = await db.query(
      `INSERT INTO TinTuyenDung (idUser, idDuAN, tieuDe, yeuCau, hanNop, trangThai)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [ID_USER_TAM, duAn.insertId, tieuDe, yeuCau, ngayKT, 'Đang tuyển']
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

async function getJobs(req, res) {
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
async function createPost(req, res) {
  const { noiDung, hinhAnhUrl } = await readJson(req);

  if (!noiDung) {
    throw new HttpError(400, 'Nội dung bài viết không được để trống');
  }

  const [result] = await db.query(
    'INSERT INTO Post (idUser, noiDung, hinhAnhUrl, createdAt) VALUES (?, ?, ?, NOW())',
    [ID_USER_TAM, noiDung, hinhAnhUrl || null]
  );
  sendJson(res, 201, { message: 'Đăng bài viết thành công', idPost: result.insertId });
}

async function getPosts(req, res) {
  const [rows] = await db.query(
    'SELECT idPost, idUser, noiDung, hinhAnhUrl, createdAt FROM Post ORDER BY createdAt DESC'
  );
  sendJson(res, 200, rows);
}

module.exports = { login, signup, createProject, getJobs, createPost, getPosts };
