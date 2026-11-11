import fs from 'fs';
import path from 'path';
import  db  from '../models/db.js'; // Connection MySQL của bạn
import {requireUser} from '../utils/session.js'; // Hàm kiểm tra đăng nhập

/**
 * Lưu ảnh upload vào thư mục và ghi đường dẫn vào CSDL
 */
function parseMultipartData(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      const buffer = Buffer.concat(chunks);
      const contentType = req.headers['content-type'] || '';

      // 1. Tìm boundary string trong Content-Type header
      const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
      if (!match) return resolve(null);

      const boundary = match[1] || match[2];
      const boundaryBuffer = Buffer.from(`--${boundary}`);

      // 2. Tìm tên file gốc (original filename) trong header multipart
      const filenameMatch = buffer.toString('binary').match(/filename="([^"]+)"/);
      const fileName = filenameMatch ? filenameMatch[1] : 'image.jpg';

      // 3. X định vị trí bắt đầu và kết thúc của dữ liệu nhị phân file ảnh (\r\n\r\n)
      const headerEndIndex = buffer.indexOf('\r\n\r\n');
      if (headerEndIndex === -1) return resolve(null);

      const dataStart = headerEndIndex + 4;
      const dataEnd = buffer.lastIndexOf(boundaryBuffer) - 2;

      if (dataStart >= dataEnd) return resolve(null);

      // Cắt lấy Buffer nhị phân file ảnh thực tế
      const fileBuffer = buffer.subarray(dataStart, dataEnd);

      resolve({ fileBuffer, fileName });
    });

    req.on('error', err => reject(err));
  });
}

export async function savePostImage(req, res, params) {
  try {
    const postId = params.id;

    // 1. Kiểm tra đăng nhập
    const userId = requireUser(req);
    if (!userId) {
      res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ message: 'Người dùng chưa đăng nhập hoặc phiên làm việc hết hạn' }));
    }

    if (!postId) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ message: 'Thiếu thông tin postId' }));
    }

    // 2. 🔑 TỰ ĐỘNG PARSE BUFFER NẾU REQ CHƯA CÓ FILEBUFFER
    let fileBuffer = req.fileBuffer || req.body?.fileBuffer;
    let originalName = req.fileName || req.body?.fileName;

    if (!fileBuffer) {
      const parsed = await parseMultipartData(req);
      if (parsed) {
        fileBuffer = parsed.fileBuffer;
        originalName = originalName || parsed.fileName;
      }
    }

    // 3. Kiểm tra fileBuffer sau khi parse
    if (!fileBuffer || fileBuffer.length === 0) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ message: 'Không tìm thấy dữ liệu file ảnh' }));
    }

    // 4. Tạo thư mục vật lý lưu file ảnh
    const uploadDir = path.join(process.cwd(), 'src', 'img', 'uploads', 'posts');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // 5. Tạo tên file duy nhất tránh trùng lặp
    const ext = path.extname(originalName || '') || '.jpg';
    const fileName = `img_${postId}_${Date.now()}_${Math.round(Math.random() * 1e4)}${ext}`;
    const absolutePath = path.join(uploadDir, fileName);

    const relativeUrl = `/uploads/posts/${fileName}`;

    // 6. Ghi file nhị phân vào ổ đĩa
    await fs.promises.writeFile(absolutePath, fileBuffer);

    // 7. Chèn dữ liệu vào bảng `image` trong MySQL
    const [result] = await db.query(
      `INSERT INTO image (user_id, post_id, hinhAnhUrl) VALUES (?, ?, ?)`,
      [Number(userId), Number(postId), relativeUrl]
    );

    // 8. Trả về phản hồi thành công
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
      return res.end(JSON.stringify({ message: error.message || 'Lỗi máy chủ nội bộ khi lưu ảnh' }));
    }
  }
}
export async function handleStaticImages(req, res, params) {
  try {
    // Lấy id từ params do router truyền vào
    const imageId = params.id;

    if (!imageId) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ message: 'Thiếu ID ảnh' }));
    }

    // 1. Truy vấn database lấy hinhAnhUrl từ bảng image
    // Tuỳ thuộc vào thư viện DB bạn dùng (mysql2, Sequelize,...), cú pháp query có thể khác đôi chút.
    // Dưới đây là cú pháp mẫu dùng thư viện mysql2 (promise)
    const [rows] = await db.query('SELECT hinhAnhUrl FROM image WHERE image_id = ?', [imageId]);

    if (rows.length === 0 || !rows[0].hinhAnhUrl) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ message: 'Không tìm thấy dữ liệu ảnh trong CSDL' }));
    }

    const hinhAnhUrl = rows[0].hinhAnhUrl;

    // 2. Tạo đường dẫn an toàn đến file thực tế
    // Dùng path.basename() để chỉ lấy tên file cuối cùng (VD: 'abc.png'),
    // giúp chống lại lỗi bảo mật Directory Traversal nếu hinhAnhUrl chứa '../'
    const fileName = path.basename(hinhAnhUrl);
    const filePath = path.join(process.cwd(),'src', 'img', 'uploads', 'posts', fileName);
    console.log('Đường dẫn file ảnh:', filePath);
    // 3. Kiểm tra file có tồn tại trong ổ cứng không
    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ message: 'Không tìm thấy file ảnh trên hệ thống' }));
      }

      // Set MIME type tương ứng
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = {
        '.jpg':  'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png':  'image/png',
        '.gif':  'image/gif',
        '.webp': 'image/webp'
      };

      res.writeHead(200, {
        'Content-Type': mimeTypes[ext] || 'application/octet-stream',
        'Cache-Control': 'public, max-age=86400' // Cho phép cache 1 ngày
      });

      // Stream trực tiếp dữ liệu file ra response
      fs.createReadStream(filePath).pipe(res);
    });

    return true;
  } catch (error) {
    console.error('Lỗi khi lấy ảnh:', error);
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ message: 'Lỗi server nội bộ' }));
  }
}