import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module không có __dirname nên tự tạo
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Thư mục gốc chứa file giao diện
const ROOT_DIR = path.join(__dirname, '..', '..');

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function sendText(res, status, text) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(text);
}

export function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

export function sendFile(res, filePath, contentType) {
  fs.readFile(path.join(ROOT_DIR, filePath), (err, data) => {
    if (err) return sendText(res, 404, 'File not found');
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

// Đọc body và parse JSON với giới hạn dung lượng để phòng ngừa DoS
export function readJson(req, maxSizeBytes = 2 * 1024 * 1024) { // Mặc định tối đa 2MB
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxSizeBytes) {
        req.destroy();
        reject(new HttpError(413, 'Dữ liệu gửi lên vượt quá giới hạn cho phép (tối đa 2MB)'));
        return;
      }
      body += chunk;
    });

    req.on('end', () => {
      if (!body.trim()) {
        return resolve({});
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new HttpError(400, 'Dữ liệu gửi lên không đúng định dạng JSON'));
      }
    });

    req.on('error', (err) => {
      reject(new HttpError(400, err.message || 'Lỗi đọc dữ liệu yêu cầu'));
    });
  });
}
