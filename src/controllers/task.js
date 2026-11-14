import fs from 'node:fs';
import path from 'node:path';
import { HttpError, sendJson, readJson } from '../utils/helpers.js';
import { requireUser } from '../utils/session.js';
import { readObject, cleanString, toId } from '../utils/validate.js';
import { notify, logActivity } from '../utils/notify.js';
import db from '../models/db.js';
export async function createTask(req, res, params) {
  // Lấy dữ liệu gửi lên từ jsonRequest
  const data = await readJson(req);
  const currentUserId = requireUser(req);

  const { idDuAn, tenTask, moTa, deadLine, trangThai, uuTien } = data || {};

  // 1. Kiểm tra ràng buộc bắt buộc (idDuAn và tenTask)
  if (!idDuAn || !tenTask || !tenTask.trim()) {
    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ message: 'Thiếu thông tin idDuAn hoặc tenTask' }));
  }

  try {
    // 2. Chèn dữ liệu vào bảng `task`
    const [result] = await db.query(
      `INSERT INTO task (idDuAn, tenTask, moTa, deadLine, trangThai, uuTien) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        Number(idDuAn),
        tenTask.trim(),
        moTa ? moTa.trim() : null,
        deadLine || null, // Định dạng DATETIME hoặc NULL
        trangThai || 'Todo', // Khớp chuẩn ENUM('Todo', 'Doing', 'Done')
        uuTien || 'Thap' // Độ ưu tiên: Gap | Cao | Thap
      ]
    );

    await logActivity(idUser, `Tạo công việc "${tenTask.trim()}"`, Number(idDuAn));
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
         t.uuTien,
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
      uuTien: t.uuTien,
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

// =========================================================================
// CÁC CHỨC NĂNG BỔ SUNG (24-30)
// =========================================================================
const VALID_STATUS = ['Todo', 'Doing', 'Done'];
const VALID_PRIORITY = ['Gap', 'Cao', 'Thap'];

// Người dùng phải là thành viên (hoặc chủ) dự án chứa task
async function assertTaskMember(idTask, idUser) {
  const [rows] = await db.query(
    `SELECT 1 FROM task t JOIN thanhvienduan tv ON tv.idDuAn = t.idDuAn WHERE t.idTask = ? AND tv.idUser = ?`,
    [idTask, idUser]
  );
  if (rows.length > 0) return;
  const [owner] = await db.query(
    `SELECT 1 FROM task t JOIN duan d ON d.idDuAn = t.idDuAn WHERE t.idTask = ? AND d.idUserTao = ?`,
    [idTask, idUser]
  );
  if (owner.length === 0) throw new HttpError(403, 'Bạn không có quyền với công việc này');
}

function parseTaskInput(data) {
  const tenTask = cleanString(data.tenTask);
  const trangThai = cleanString(data.trangThai) || 'Todo';
  const uuTien = cleanString(data.uuTien) || 'Thap';
  if (!tenTask || tenTask.length > 255) throw new HttpError(400, 'Tên công việc không được để trống (tối đa 255 ký tự)');
  if (!VALID_STATUS.includes(trangThai)) throw new HttpError(400, 'Trạng thái không hợp lệ (Todo/Doing/Done)');
  if (!VALID_PRIORITY.includes(uuTien)) throw new HttpError(400, 'Độ ưu tiên không hợp lệ (Gap/Cao/Thap)');
  return { tenTask, moTa: cleanString(data.moTa) || null, deadLine: cleanString(data.deadLine) || null, trangThai, uuTien };
}

// 24 + 27. Cập nhật task (thông tin, trạng thái, độ ưu tiên)
export async function updateTask(req, res, params) {
  const idUser = requireUser(req);
  const idTask = toId(params.id, 'ID công việc không hợp lệ');
  await assertTaskMember(idTask, idUser);
  const t = parseTaskInput(await readObject(req));
  const [r] = await db.query('UPDATE task SET tenTask=?, moTa=?, deadLine=?, trangThai=?, uuTien=? WHERE idTask=?', [t.tenTask, t.moTa, t.deadLine, t.trangThai, t.uuTien, idTask]);
  if (r.affectedRows === 0) throw new HttpError(404, 'Không tìm thấy công việc');
  await logActivity(idUser, `Cập nhật công việc #${idTask}`);
  sendJson(res, 200, { success: true, message: 'Đã cập nhật công việc' });
}

// 25. Xóa task
export async function deleteTask(req, res, params) {
  const idUser = requireUser(req);
  const idTask = toId(params.id, 'ID công việc không hợp lệ');
  await assertTaskMember(idTask, idUser);
  const [r] = await db.query('DELETE FROM task WHERE idTask = ?', [idTask]);
  if (r.affectedRows === 0) throw new HttpError(404, 'Không tìm thấy công việc');
  await logActivity(idUser, `Xóa công việc #${idTask}`);
  sendJson(res, 200, { success: true, message: 'Đã xóa công việc' });
}

// 26. Phân công task (thay thế danh sách người thực hiện)
export async function assignTask(req, res, params) {
  const idUser = requireUser(req);
  const idTask = toId(params.id, 'ID công việc không hợp lệ');
  await assertTaskMember(idTask, idUser);
  const data = await readObject(req);
  const idUsers = Array.isArray(data.idUsers)
    ? [...new Set(data.idUsers.map(Number).filter((n) => Number.isInteger(n) && n > 0))]
    : [];
  await db.query('DELETE FROM phancong WHERE idTask = ?', [idTask]);
  for (const uid of idUsers) {
    await db.query('INSERT IGNORE INTO phancong (idTask, idUser) VALUES (?, ?)', [idTask, uid]);
    await notify(uid, `Bạn vừa được phân công công việc #${idTask}`);
  }
  await logActivity(idUser, `Phân công công việc #${idTask}`);
  sendJson(res, 200, { success: true, message: 'Đã cập nhật phân công' });
}

// 28. Bình luận trong task
export async function getTaskComments(req, res, params) {
  const idTask = toId(params.id, 'ID công việc không hợp lệ');
  const [rows] = await db.query(
    `SELECT c.idTaskComment, c.idTask, c.idUser, c.noiDung, c.createdAt,
            COALESCE(NULLIF(h.HovaTen, ''), u.userName) AS tenNguoiDung
     FROM taskcomment c
     JOIN user u ON u.idUser = c.idUser
     LEFT JOIN hoso h ON h.idUser = c.idUser
     WHERE c.idTask = ? ORDER BY c.idTaskComment ASC`,
    [idTask]
  );
  sendJson(res, 200, rows);
}

export async function addTaskComment(req, res, params) {
  const idUser = requireUser(req);
  const idTask = toId(params.id, 'ID công việc không hợp lệ');
  await assertTaskMember(idTask, idUser);
  const noiDung = cleanString((await readObject(req)).noiDung);
  if (!noiDung) throw new HttpError(400, 'Nội dung bình luận không được để trống');
  const [r] = await db.query('INSERT INTO taskcomment (idTask, idUser, noiDung) VALUES (?, ?, ?)', [idTask, idUser, noiDung]);
  sendJson(res, 201, { success: true, idTaskComment: r.insertId });
}

// 29. Tệp đính kèm task (upload)
export async function getTaskFiles(req, res, params) {
  const idTask = toId(params.id, 'ID công việc không hợp lệ');
  const [rows] = await db.query('SELECT idTaskFile, idUser, tenFile, url, loaiFile, createdAt FROM task_file WHERE idTask = ? ORDER BY idTaskFile DESC', [idTask]);
  sendJson(res, 200, rows);
}

export async function uploadTaskFile(req, res, params) {
  const idUser = requireUser(req);
  const idTask = toId(params.id, 'ID công việc không hợp lệ');
  await assertTaskMember(idTask, idUser);
  const parsed = await parseMultipart(req);
  if (!parsed.fileBuffer || parsed.fileBuffer.length === 0) {
    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ message: 'Không tìm thấy file' }));
  }
  const ext = path.extname(parsed.fileName).toLowerCase() || '.bin';
  const uploadDir = path.join(process.cwd(), 'uploads', 'tasks');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  const stored = `task_${idTask}_${Date.now()}${ext}`;
  await fs.promises.writeFile(path.join(uploadDir, stored), parsed.fileBuffer);
  const url = `/uploads/tasks/${stored}`;
  const [r] = await db.query('INSERT INTO task_file (idTask, idUser, tenFile, url) VALUES (?, ?, ?, ?)', [idTask, idUser, parsed.fileName || stored, url]);
  res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
  return res.end(JSON.stringify({ success: true, idTaskFile: r.insertId, url }));
}

// 30. Nhắc nhở deadline -> tạo thông báo cho người được phân công
export async function createTaskReminder(req, res, params) {
  const idUser = requireUser(req);
  const idTask = toId(params.id, 'ID công việc không hợp lệ');
  const [tasks] = await db.query('SELECT idDuAn, tenTask, deadLine FROM task WHERE idTask = ?', [idTask]);
  if (tasks.length === 0) throw new HttpError(404, 'Không tìm thấy công việc');
  const [assignees] = await db.query('SELECT idUser FROM phancong WHERE idTask = ?', [idTask]);
  if (assignees.length === 0) throw new HttpError(400, 'Công việc chưa được phân công cho ai');
  const dl = tasks[0].deadLine ? String(tasks[0].deadLine).slice(0, 10) : 'sớm';
  const [tb] = await db.query('INSERT INTO thongbao (noiDung, urlDich) VALUES (?, ?)', [`Nhắc nhở: công việc "${tasks[0].tenTask}" đến hạn ${dl}`, '/pj_detail.html']);
  for (const a of assignees) await db.query('INSERT IGNORE INTO nguoinhanthongbao (idThongBao, idUser) VALUES (?, ?)', [tb.insertId, a.idUser]);
  sendJson(res, 200, { success: true, message: 'Đã gửi nhắc nhở' });
}

// Phục vụ file tải lên trong task
export function serveTaskFile(req, res, params) {
  const fileName = path.basename(params.id || '');
  const filePath = path.join(process.cwd(), 'uploads', 'tasks', fileName);
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
    res.end(data);
  });
}

// Parser multipart/form-data đơn giản
function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const buf = Buffer.concat(chunks);
      const m = (req.headers['content-type'] || '').match(/boundary=(?:"([^"]+)"|([^;]+))/i);
      if (!m) return resolve({});
      const bBuf = Buffer.from(`--${m[1] || m[2]}`);
      const fn = buf.toString('binary').match(/filename="([^"]+)"/);
      const headerEnd = buf.indexOf('\r\n\r\n');
      if (headerEnd === -1) return resolve({});
      const start = headerEnd + 4;
      const end = buf.lastIndexOf(bBuf) - 2;
      if (start >= end) return resolve({});
      resolve({ fileBuffer: buf.subarray(start, end), fileName: fn ? fn[1] : 'file' });
    });
    req.on('error', reject);
  });
}
