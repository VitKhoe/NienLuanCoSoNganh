import { readJson} from '../utils/helpers.js';
import { requireUser } from '../utils/session.js';
import db from '../models/db.js';
export async function createTask(req, res, params) {
  // Lấy dữ liệu gửi lên từ jsonRequest
  const data = await readJson(req);
  const currentUserId = requireUser(req);

  const { idDuAn, tenTask, moTa, deadLine, trangThai } = data || {};

  // 1. Kiểm tra ràng buộc bắt buộc (idDuAn và tenTask)
  if (!idDuAn || !tenTask || !tenTask.trim()) {
    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ message: 'Thiếu thông tin idDuAn hoặc tenTask' }));
  }

  try {
    // 2. Chèn dữ liệu vào bảng `task`
    const [result] = await db.query(
      `INSERT INTO task (idDuAn, tenTask, moTa, deadLine, trangThai) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        Number(idDuAn),
        tenTask.trim(),
        moTa ? moTa.trim() : null,
        deadLine || null, // Định dạng DATETIME hoặc NULL
        trangThai || 'Todo' // Khớp chuẩn ENUM('Todo', 'Doing', 'Done')
      ]
    );

    res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ 
      success: true, 
      message: 'Tạo công việc thành công',
      idTask: result.insertId 
    }));

  } catch (err) {
    console.error('Lỗi createTask:', err);
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ message: 'Lỗi máy chủ khi tạo công việc' }));
  }
}
export async function getTasksByProject(req, res, params) {
  const urlParams = new URLSearchParams(req.url.split('?')[1]);
  const idDuAn = urlParams.get('idDuAn');

  if (!idDuAn) {
    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ message: 'Thiếu tham số idDuAn' }));
  }

  try {
    // 🔑 Truy vấn JOIN bảng task và phancong để lấy danh sách người thực hiện
    const [rows] = await db.query(
      `SELECT 
         t.*, 
         GROUP_CONCAT(pc.idUser) AS assignedUsers
       FROM task t
       LEFT JOIN phancong pc ON t.idTask = pc.idTask
       WHERE t.idDuAn = ?
       GROUP BY t.idTask
       ORDER BY t.idTask DESC`,
      [Number(idDuAn)]
    );

    // Format lại chuỗi assignedUsers "1,2,3" thành mảng số [1, 2, 3]
    const tasks = rows.map(t => ({
      ...t,
      assignedUsers: t.assignedUsers ? t.assignedUsers.split(',').map(Number) : []
    }));

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify(tasks));
  } catch (err) {
    console.error('Lỗi getTasksByProject:', err);
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ message: 'Lỗi máy chủ khi lấy danh sách công việc' }));
  }
}
export async function getProjectTasks(req, res, params) {
  // Router của bạn tự bóc tách :id trên URL và truyền vào params.id
  const idDuAn = params.id; 

  if (!idDuAn) {
    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ message: 'Thiếu ID dự án' }));
  }

  try {
    // Truy vấn lấy danh sách Task kèm danh sách người phân công (LEFT JOIN)
    const [rows] = await db.query(
      `SELECT 
         t.idTask, 
         t.idDuAn, 
         t.tenTask, 
         t.moTa, 
         t.deadLine, 
         t.trangThai,
         GROUP_CONCAT(
           JSON_OBJECT('idUser', u.idUser, 'tenNguoiDung', u.userName)
         ) AS phanCongData
       FROM task t
       LEFT JOIN phancong pc ON t.idTask = pc.idTask
       LEFT JOIN user u ON pc.idUser = u.idUser
       WHERE t.idDuAn = ?
       GROUP BY t.idTask
       ORDER BY t.idTask DESC`,
      [Number(idDuAn)]
    );

    // Chuẩn hóa kết quả trả về: có phân công thì parse Array, không có trả về null
    const tasks = rows.map(t => ({
      idTask: t.idTask,
      idDuAn: t.idDuAn,
      tenTask: t.tenTask,
      moTa: t.moTa,
      deadLine: t.deadLine,
      trangThai: t.trangThai,
      assignedUsers: t.phanCongData ? JSON.parse(`[${t.phanCongData}]`) : null
    }));

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify(tasks));
  } catch (err) {
    console.error('Lỗi getProjectTasks:', err);
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ message: 'Lỗi máy chủ khi lấy danh sách công việc' }));
  }
}