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
            t.hanNop, t.trangThai, t.created_at, d.tenDuAn
     FROM tintuyendung t
     LEFT JOIN duan d ON t.idDuAN = d.idDuAn
     ORDER BY t.created_at DESC, t.idTinTuyen DESC`
  );
  sendJson(res, 200, rows);
}

// 34. Trích xuất dữ liệu thống kê (dữ liệu thô cho Frontend vẽ biểu đồ)
export async function getStatistics(req, res) {
  const [[users], [duAn], [task], [post], [tin]] = await Promise.all([
    db.query('SELECT COUNT(*) c FROM user'),
    db.query('SELECT COUNT(*) c FROM duan'),
    db.query('SELECT COUNT(*) c FROM task'),
    db.query('SELECT COUNT(*) c FROM post'),
    db.query('SELECT COUNT(*) c FROM tintuyendung')
  ]);
  const [taskByStatus] = await db.query('SELECT trangThai, COUNT(*) soLuong FROM task GROUP BY trangThai');
  const [duAnByStatus] = await db.query('SELECT trangThai, COUNT(*) soLuong FROM duan GROUP BY trangThai');
  const [taskDone] = await db.query("SELECT SUM(trangThai='Done') hoanThanh, COUNT(*) tong FROM task");
  const [tienDo] = await db.query(
    `SELECT d.idDuAn, d.tenDuAn,
            SUM(t.trangThai='Done') hoanThanh, COUNT(t.idTask) tong
     FROM duan d LEFT JOIN task t ON t.idDuAn = d.idDuAn
     GROUP BY d.idDuAn, d.tenDuAn ORDER BY d.idDuAn DESC LIMIT 20`
  );

  sendJson(res, 200, {
    tongQuan: {
      soNguoiDung: users[0].c,
      soDuAn: duAn[0].c,
      soTask: task[0].c,
      soBaiViet: post[0].c,
      soTinTuyenDung: tin[0].c
    },
    taskTheoTrangThai: taskByStatus,
    duAnTheoTrangThai: duAnByStatus,
    taskHoanThanh: { hoanThanh: Number(taskDone[0].hoanThanh || 0), tong: Number(taskDone[0].tong || 0) },
    tienDoDuAn: tienDo
  });
}

// 33. Nhật ký hoạt động (toàn hệ thống hoặc lọc theo dự án ?idDuAn=)
export async function getActivityLog(req, res, params, query = new URLSearchParams()) {
  const idDuAn = query.get('idDuAn');
  let sql = `SELECT l.idLog, l.idUser, l.idDuAn, l.hanhDong, l.thoiGian,
                    COALESCE(NULLIF(h.HovaTen, ''), u.userName) AS tenNguoiDung
             FROM log l
             JOIN user u ON u.idUser = l.idUser
             LEFT JOIN hoso h ON h.idUser = l.idUser`;
  const args = [];
  if (idDuAn) {
    sql += ' WHERE l.idDuAn = ?';
    args.push(Number(idDuAn));
  }
  sql += ' ORDER BY l.idLog DESC LIMIT 100';
  const [rows] = await db.query(sql, args);
  sendJson(res, 200, rows);
}
