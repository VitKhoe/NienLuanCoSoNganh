import fs from 'fs';
import path from 'path';
import db from '../models/db.js';
import { requireUser } from '../utils/session.js';

/**
 * Tách dữ liệu multipart/form-data thủ công bằng Stream Buffer
 */
function parseMultipartData(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      const buffer = Buffer.concat(chunks);
      const contentType = req.headers['content-type'] || '';

      const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
      if (!match) return resolve(null);

      const boundary = match[1] || match[2];
      const boundaryBuffer = Buffer.from(`--${boundary}`);

      const filenameMatch = buffer.toString('binary').match(/filename="([^"]+)"/);
      const fileName = filenameMatch ? filenameMatch[1] : 'image.jpg';

      const headerEndIndex = buffer.indexOf('\r\n\r\n');
      if (headerEndIndex === -1) return resolve(null);

      const dataStart = headerEndIndex + 4;
      const dataEnd = buffer.lastIndexOf(boundaryBuffer) - 2;

      if (dataStart >= dataEnd) return resolve(null);

      const fileBuffer = buffer.subarray(dataStart, dataEnd);
      resolve({ fileBuffer, fileName });
    });

    req.on('error', err => reject(err));
  });
}

/**
 * Lưu ảnh upload vào thư mục uploads/posts (nằm ngoài src để tránh node --watch restart)
 */
export async function savePostImage(req, res, params) {
  try {
    const postId = params.id;
    const userId = requireUser(req);

    if (!postId) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ message: 'Thiếu thông tin postId' }));
    }

    let fileBuffer = req.fileBuffer || req.body?.fileBuffer;
    let originalName = req.fileName || req.body?.fileName;

    if (!fileBuffer) {
      const parsed = await parseMultipartData(req);
      if (parsed) {
        fileBuffer = parsed.fileBuffer;
        originalName = originalName || parsed.fileName;
      }
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ message: 'Không tìm thấy dữ liệu file ảnh' }));
    }

    // Thư mục lưu ảnh đặt tại uploads/posts (thư mục gốc)
    const uploadDir = path.join(process.cwd(), 'uploads', 'posts');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const ext = path.extname(originalName || '') || '.jpg';
    const fileName = `img_${postId}_${Date.now()}_${Math.round(Math.random() * 1e4)}${ext}`;
    const absolutePath = path.join(uploadDir, fileName);
    const relativeUrl = `/uploads/posts/${fileName}`;

    await fs.promises.writeFile(absolutePath, fileBuffer);

    const [result] = await db.query(
      'INSERT INTO image (user_id, post_id, hinhAnhUrl) VALUES (?, ?, ?)',
      [Number(userId), Number(postId), relativeUrl]
    );

    res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({
      success: true,
      message: 'Lưu ảnh bài viết thành công',
      data: {
        image_id: result.insertId,
        user_id: Number(userId),
        post_id: Number(postId),
        hinhAnhUrl: relativeUrl
      }
    }));

  } catch (error) {
    console.error('Lỗi khi lưu ảnh bài viết:', error);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ message: error.message || 'Lỗi máy chủ khi lưu ảnh' }));
    }
  }
}

/**
 * Phục vụ ảnh tĩnh an toàn: hỗ trợ cả tìm theo image_id số HOẶC tên file ảnh
 */
export async function handleStaticImages(req, res, params) {
  try {
    const identifier = params.id;
    if (!identifier) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ message: 'Thiếu định danh ảnh' }));
    }

    let fileName = '';

    // Nếu identifier là số nguyên thuần túy -> truy vấn DB theo image_id
    if (/^\d+$/.test(identifier)) {
      const [rows] = await db.query('SELECT hinhAnhUrl FROM image WHERE image_id = ?', [identifier]);
      if (rows.length === 0 || !rows[0].hinhAnhUrl) {
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ message: 'Không tìm thấy dữ liệu ảnh trong CSDL' }));
      }
      fileName = path.basename(rows[0].hinhAnhUrl);
    } else {
      // Identifier chính là tên file (chống Directory Traversal)
      fileName = path.basename(identifier);
    }

    // Kiểm tra file ở thư mục uploads/posts (hoặc fallback ở src/img/uploads/posts)
    let filePath = path.join(process.cwd(), 'uploads', 'posts', fileName);
    if (!fs.existsSync(filePath)) {
      const fallbackPath = path.join(process.cwd(), 'src', 'img', 'uploads', 'posts', fileName);
      if (fs.existsSync(fallbackPath)) {
        filePath = fallbackPath;
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ message: 'Không tìm thấy file ảnh trên hệ thống' }));
      }
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.jpg':  'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png':  'image/png',
      '.gif':  'image/gif',
      '.webp': 'image/webp',
      '.svg':  'image/svg+xml'
    };

    res.writeHead(200, {
      'Content-Type': mimeTypes[ext] || 'application/octet-stream',
      'Cache-Control': 'public, max-age=86400'
    });

    fs.createReadStream(filePath).pipe(res);

  } catch (error) {
    console.error('Lỗi khi lấy ảnh:', error);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ message: 'Lỗi server nội bộ' }));
    }
  }
}
