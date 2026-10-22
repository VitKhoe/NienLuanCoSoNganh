const fs = require('fs');

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function sendText(res, status, text) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(text);
}

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function sendFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) return sendText(res, 404, 'File not found');
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

// Đọc body và parse JSON, sai định dạng thì ném lỗi 400
function readJson(req) {
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

module.exports = { HttpError, sendText, sendJson, sendFile, readJson };
