import fs from 'node:fs';
import path from 'node:path';
import db from '../models/db.js';
import { HttpError, sendJson } from '../utils/helpers.js';
import { requireUser } from '../utils/session.js';
import { readObject, toId } from '../utils/validate.js';

// Hàm phụ tự nhận diện loại tài liệu từ URL Google Drive
function detectGoogleDriveType(url) {
  if (url.includes('/folders/')) return 'folder';
  if (url.includes('/document/')) return 'document';
  if (url.includes('/spreadsheets/')) return 'spreadsheet';
  if (url.includes('/presentation/')) return 'presentation';
  return 'pdf_or_other';
}

// 1. Thêm liên kết văn kiện Google Drive vào dự án
export async function addProjectDocument(req, res, params) {
  try {
    const idDuAn = params.id;
    const userId = requireUser(req);
    if (!userId) {
      res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ message: 'Người dùng chưa đăng nhập' }));
    }

    const { so_ky_hieu, tieu_de, drive_url, ghi_chu } = await readObject(req);
    //console.log('Dữ liệu nhận được:', readObject(req));
    if (!tieu_de || !drive_url) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ message: 'Vui lòng nhập tiêu đề và đường dẫn Google Drive' }));
    }

    const cleanUrl = drive_url.trim();
    const isGoogleDriveUrl = /^https:\/\/(drive|docs)\.google\.com\/.+/i.test(cleanUrl);
    if (!isGoogleDriveUrl) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ message: 'Link không hợp lệ. Vui lòng dùng link từ drive.google.com hoặc docs.google.com' }));
    }

    const loaiTaiLieu = detectGoogleDriveType(cleanUrl);

    const [result] = await db.query(
      `INSERT INTO van_kien (user_id, idDuAn, so_ky_hieu, tieu_de, drive_url, loai_tai_lieu, ghi_chu)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [Number(userId), Number(idDuAn), so_ky_hieu || null, tieu_de.trim(), cleanUrl, loaiTaiLieu, ghi_chu || null]
    );

    res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({
      success: true,
      message: 'Đã gắn văn kiện Google Drive vào dự án',
      data: {
        van_kien_id: result.insertId,
        loai_tai_lieu: loaiTaiLieu
      }
    }));

  } catch (error) {
    console.error('Lỗi thêm văn kiện Drive:', error);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ message: 'Lỗi máy chủ nội bộ' }));
    }
  }
}

// 2. Lấy danh sách văn kiện của một dự án
export async function getProjectDocuments(req, res, params) {
  try {
    const idDuAn = params.id;

    const [rows] = await db.query(
      `SELECT 
        vk.van_kien_id,
        vk.user_id,
        vk.so_ky_hieu,
        vk.tieu_de,
        vk.drive_url,
        vk.loai_tai_lieu,
        vk.ghi_chu,
        vk.created_at,
        COALESCE(NULLIF(h.HovaTen, ''), u.userName) AS nguoiDang
      FROM van_kien vk
      JOIN user u ON vk.user_id = u.idUser
      LEFT JOIN hoso h ON u.idUser = h.idUser
      WHERE vk.idDuAn = ?
      ORDER BY vk.created_at DESC`,
      [Number(idDuAn)]
    );

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ success: true, data: rows }));

  } catch (error) {
    console.error('Lỗi lấy danh sách văn kiện:', error);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ message: 'Lỗi máy chủ nội bộ' }));
    }
  }
}

// 3. Tệp đính kèm dự án (upload file văn bản, ảnh vào bảng file)
export async function getProjectFiles(req, res, params) {
  const idDuAn = toId(params.id, 'ID dự án không hợp lệ');
  const [rows] = await db.query('SELECT idFile, idDuAn, tenFile, urlTruyCap, loaiFile FROM file WHERE idDuAn = ? ORDER BY idFile DESC', [idDuAn]);
  sendJson(res, 200, rows);
}

export async function uploadProjectFile(req, res, params) {
  const idUser = requireUser(req);
  const idDuAn = toId(params.id, 'ID dự án không hợp lệ');
  const parsed = await parseMultipart(req);
  if (!parsed.fileBuffer || parsed.fileBuffer.length === 0) {
    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ message: 'Không tìm thấy file' }));
  }
  const ext = path.extname(parsed.fileName).toLowerCase();
  const uploadDir = path.join(process.cwd(), 'uploads', 'files');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  const stored = `file_${idDuAn}_${Date.now()}${ext}`;
  await fs.promises.writeFile(path.join(uploadDir, stored), parsed.fileBuffer);
  const url = `/uploads/files/${stored}`;
  const [r] = await db.query('INSERT INTO file (idDuAn, tenFile, urlTruyCap, loaiFile) VALUES (?, ?, ?, ?)', [idDuAn, parsed.fileName || stored, url, ext.replace('.', '') || null]);
  res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
  return res.end(JSON.stringify({ success: true, idFile: r.insertId, url }));
}

export function serveProjectFile(req, res, params) {
  const fileName = path.basename(params.id || '');
  const filePath = path.join(process.cwd(), 'uploads', 'files', fileName);
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
    res.end(data);
  });
}

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