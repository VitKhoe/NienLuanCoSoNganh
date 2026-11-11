import { readJson } from '../utils/helpers.js';
import db from '../models/db.js';
import { getSession, requireUser } from '../utils/session.js';
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