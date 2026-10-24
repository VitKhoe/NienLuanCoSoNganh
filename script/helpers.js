import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module không có __dirname nên tự tạo
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Thư mục chứa file giao diện (index.html, style.css...)
const ROOT_DIR = path.join(__dirname, '..');
console.log('Thư mục giao diện:', ROOT_DIR);
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

// Đọc body và parse JSON, sai định dạng thì ném lỗi 400
export function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new HttpError(400, 'Dữ liệu gửi lên không đúng định dạng JSON'));
      }
    });
  });
}