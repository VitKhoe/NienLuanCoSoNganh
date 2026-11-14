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

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);

// Nhận diện loại ảnh thật từ magic bytes (không tin tưởng phần mở rộng)
function sniffImageType(buf) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return '.jpg';
  if (buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return '.png';
  if (buf.length >= 4 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return '.gif';
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return '.webp';
  return null;
}

// Trả về phần mở rộng an toàn theo nội dung thật của file; null nếu không phải ảnh
function resolveImageExt(fileBuffer, originalName) {
  const sniffed = sniffImageType(fileBuffer);
  if (!sniffed) return null;
  const ext = (path.extname(originalName || '') || '').toLowerCase();
  return ALLOWED_EXTS.has(ext) ? ext : sniffed;
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

    if (fileBuffer.length > MAX_IMAGE_BYTES) {
      res.writeHead(413, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ message: 'Ảnh vượt quá giới hạn 5MB' }));
    }

    const ext = resolveImageExt(fileBuffer, originalName);
    if (!ext) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ message: 'Chỉ chấp nhận file ảnh (JPG, PNG, GIF, WebP)' }));
    }

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

export async function saveCommentImage(req, res, params) {
  try {
    const commentId = params.id;
    const userId = requireUser(req);

    if (!commentId) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ message: 'Thiếu thông tin commentId' }));
    }

    const [commentRows] = await db.query(
      'SELECT idComment, idPost, idUser FROM comment WHERE idComment = ?',
      [Number(commentId)]
    );
    if (commentRows.length === 0) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ message: 'Không tìm thấy bình luận' }));
    }
    if (commentRows[0].idUser !== Number(userId)) {
      res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ message: 'Bạn không có quyền sửa bình luận này' }));
    }

    const postId = commentRows[0].idPost;

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

    const uploadDir = path.join(process.cwd(), 'uploads', 'posts');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    if (fileBuffer.length > MAX_IMAGE_BYTES) {
      res.writeHead(413, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ message: 'Ảnh vượt quá giới hạn 5MB' }));
    }

    const ext = resolveImageExt(fileBuffer, originalName);
    if (!ext) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ message: 'Chỉ chấp nhận file ảnh (JPG, PNG, GIF, WebP)' }));
    }

    const fileName = `cmt_${commentId}_${Date.now()}_${Math.round(Math.random() * 1e4)}${ext}`;
    const absolutePath = path.join(uploadDir, fileName);
    const relativeUrl = `/uploads/posts/${fileName}`;

    await fs.promises.writeFile(absolutePath, fileBuffer);

    // Cập nhật đường dẫn ảnh vào bảng comment
    try {
      await db.query('UPDATE comment SET hinhAnhUrl = ? WHERE idComment = ?', [relativeUrl, Number(commentId)]);
    } catch (colErr) {
      if (colErr.code === 'ER_BAD_FIELD_ERROR' || colErr.errno === 1054) {
        try {
          await db.query('ALTER TABLE comment ADD COLUMN hinhAnhUrl VARCHAR(500) DEFAULT NULL');
          await db.query('UPDATE comment SET hinhAnhUrl = ? WHERE idComment = ?', [relativeUrl, Number(commentId)]);
        } catch (alterErr) {
          console.error('Lỗi thêm cột hinhAnhUrl vào bảng comment:', alterErr);
        }
      } else {
        throw colErr;
      }
    }

    // Ghi nhận vào bảng image phụ (nếu có)
    try {
      await db.query(
        'INSERT INTO image (user_id, post_id, hinhAnhUrl, forWhat) VALUES (?, ?, ?, ?)',
        [Number(userId), Number(postId), relativeUrl, 1]
      );
    } catch {}

    res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({
      success: true,
      message: 'Lưu ảnh bình luận thành công',
      data: {
        idComment: Number(commentId),
        hinhAnhUrl: relativeUrl
      }
    }));
  } catch (error) {
    console.error('Lỗi khi lưu ảnh bình luận:', error);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ message: error.message || 'Lỗi máy chủ khi lưu ảnh' }));
    }
  }
}

/**
 * Upload ảnh đại diện: lưu vào uploads/avatars và cập nhật hoso.avatar
 */
export async function saveAvatar(req, res) {
  try {
    const idUser = requireUser(req);

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
    if (fileBuffer.length > MAX_IMAGE_BYTES) {
      res.writeHead(413, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ message: 'Ảnh vượt quá giới hạn 5MB' }));
    }

    const ext = resolveImageExt(fileBuffer, originalName);
    if (!ext) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ message: 'Chỉ chấp nhận file ảnh (JPG, PNG, GIF, WebP)' }));
    }

    const uploadDir = path.join(process.cwd(), 'uploads', 'avatars');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileName = `avatar_${idUser}_${Date.now()}${ext}`;
    await fs.promises.writeFile(path.join(uploadDir, fileName), fileBuffer);
    const relativeUrl = `/uploads/avatars/${fileName}`;

    await db.query('UPDATE hoso SET avatar = ? WHERE idUser = ?', [relativeUrl, idUser]);

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ success: true, message: 'Đã cập nhật ảnh đại diện', avatar: relativeUrl }));
  } catch (error) {
    console.error('Lỗi khi lưu ảnh đại diện:', error);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ message: error.message || 'Lỗi máy chủ khi lưu ảnh' }));
    }
  }
}

/**
 * Phục vụ ảnh đại diện từ uploads/avatars (chống directory traversal)
 */
export function handleStaticAvatar(req, res, params) {
  const fileName = path.basename(params.id || '');
  if (!fileName) {
    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ message: 'Thiếu tên file ảnh' }));
  }
  const filePath = path.join(process.cwd(), 'uploads', 'avatars', fileName);
  const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' };
  const ext = path.extname(fileName).toLowerCase();
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ message: 'Không tìm thấy file ảnh' }));
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}
export async function getAvatar(req, res, params) {
  try {
    const idUser = params.id;
    if (!idUser) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ message: 'Thiếu thông tin idUser' }));
    }

    const [rows] = await db.query('SELECT avatar FROM hoso WHERE idUser = ?', [Number(idUser)]);
    if (rows.length === 0 || !rows[0].avatar) {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ message: 'Không tìm thấy ảnh đại diện cho người dùng này' }));
    }

    const avatarUrl = rows[0].avatar;
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ avatarUrl }));
  } catch (error) {
    console.error('Lỗi khi lấy ảnh đại diện:', error);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ message: error.message || 'Lỗi máy chủ khi lấy ảnh đại diện' }));
    }
  }  
}