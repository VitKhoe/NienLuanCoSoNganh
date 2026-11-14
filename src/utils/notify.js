// Helper chung: đẩy thông báo + ghi nhật ký hoạt động
import db from '../models/db.js';

// Tạo thông báo cho một người dùng
export async function notify(idUser, noiDung, urlDich = null) {
  if (!idUser) return;
  try {
    const [r] = await db.query('INSERT INTO thongbao (noiDung, urlDich) VALUES (?, ?)', [noiDung, urlDich]);
    await db.query('INSERT IGNORE INTO nguoinhanthongbao (idThongBao, idUser) VALUES (?, ?)', [r.insertId, idUser]);
  } catch { /* bỏ qua lỗi thông báo, không làm hỏng luồng chính */ }
}

// Ghi nhật ký hoạt động (idDuAn tùy chọn để lọc theo dự án)
export async function logActivity(idUser, hanhDong, idDuAn = null) {
  if (!idUser) return;
  try {
    await db.query('INSERT INTO log (idUser, idDuAn, hanhDong) VALUES (?, ?, ?)', [idUser, idDuAn, hanhDong]);
  } catch { /* bỏ qua lỗi log */ }
}
