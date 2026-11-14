// Nhóm 2 - Mạng xã hội (phần 1): bài viết, like, bình luận

import db from '../models/db.js';
import { HttpError, sendJson } from '../utils/helpers.js';
import { getSession, requireUser } from '../utils/session.js';
import { readObject, cleanString, toId, parseLimit, parseCursor } from '../utils/validate.js';
import { notify } from '../utils/notify.js';

// "like" là từ khóa của SQL nên tên bảng phải đặt trong dấu backtick
const LIKE = '`Likepost`';

const MAX_POST_LENGTH = 5000;
const MAX_COMMENT_LENGTH = 2000;

// Người đang đăng nhập (0 nếu chưa đăng nhập - dùng cho API công khai)
function currentUserId(req){
  return getSession(req)?.idUser ?? 0;
}

// =========================================================================
// 6. BÀI VIẾT
// =========================================================================

// Câu SELECT bài viết kèm tên tác giả, số like, số bình luận, mình đã like chưa.
// Tham số đầu tiên (?) là id người đang xem.
const POST_SELECT = `
  SELECT p.idPost, p.idUser, p.noiDung, p.createdAt,
         COALESCE(NULLIF(h.HovaTen, ''), u.userName) AS tenTacGia,
         h.avatar,
         (SELECT COUNT(DISTINCT l.idUser) FROM ${LIKE} l WHERE l.idPost = p.idPost) AS soLike,
         (SELECT COUNT(*) FROM comment c WHERE c.idPost = p.idPost) AS soBinhLuan,
         (SELECT COUNT(*) FROM ${LIKE} l2 WHERE l2.idPost = p.idPost AND l2.idUser = ?) AS daLike,
         EXISTS(SELECT 1 FROM bookmarks b WHERE b.post_id = p.idPost AND b.user_id = ?) AS daMark,
         (SELECT GROUP_CONCAT(i.image_id ORDER BY i.image_id ASC) FROM image i WHERE i.post_id = p.idPost AND i.forWhat = ?) AS imageIds
  FROM post p
  JOIN user u ON u.idUser = p.idUser
  LEFT JOIN hoso h ON h.idUser = p.idUser`;

function formatPost(row) {
  return {
    ...row,
    soLike: Number(row.soLike),
    soBinhLuan: Number(row.soBinhLuan),
    daLike: Number(row.daLike) > 0
  };
}

async function assertPostExists(idPost) {
  const [rows] = await db.query('SELECT idPost FROM post WHERE idPost = ?', [idPost]);
  if (rows.length === 0) {
    throw new HttpError(404, 'Không tìm thấy bài viết');
  }
}

// POST /api/posts   body: { noiDung, hinhAnhUrl }
export async function createPost(req, res) {
  try {
    const idUser = requireUser(req);
    const data = await readObject(req);
    const noiDung = cleanString(data.noiDung);

    if (!noiDung) {
      throw new HttpError(400, 'Nội dung bài viết không được để trống');
    }
    if (noiDung.length > MAX_POST_LENGTH) {
      throw new HttpError(400, `Bài viết tối đa ${MAX_POST_LENGTH} ký tự`);
    }

    // Tạo dòng mới trong bảng post
    const [result] = await db.query(
      'INSERT INTO post (idUser, noiDung) VALUES (?, ?)',
      [idUser, noiDung]
    );

    // Trả về idPost để Client tiếp tục dùng ID này upload ảnh ở Bước 2
    sendJson(res, 201, {
      success: true,
      message: 'Tạo bài viết thành công',
      idPost: result.insertId
    });

  } catch (error) {
    if (error instanceof HttpError) {
      sendJson(res, error.statusCode, { message: error.message });
    } else {
      console.error('Lỗi createPost:', error);
      sendJson(res, 500, { message: 'Lỗi server nội bộ' });
    }
  }
}
// GET /api/posts?limit=20&before=<idPost>   (công khai; đăng nhập thì có thêm "daLike")
// Bài mới nhất trước. Muốn tải thêm bài cũ hơn: truyền before = idPost của bài cuối cùng đã có.
export async function getPosts(req, res, params, query = new URLSearchParams()) {
  const limit = parseLimit(query.get('limit'), 20, 50);
  const before = parseCursor(query.get('before'), 'before');

  const [rows] = await db.query(
    `${POST_SELECT}
     WHERE (? IS NULL OR p.idPost < ?)
     ORDER BY p.idPost DESC
     LIMIT ?`,
    [currentUserId(req),currentUserId(req),0, before, before, limit]
  );
  sendJson(res, 200, rows.map(formatPost));
}

// GET /api/posts/:id
export async function getPost(req, res, params) {
  const [rows] = await db.query(`${POST_SELECT} WHERE p.idPost = ?`, [
    currentUserId(req),currentUserId(req),0,
    Number(params.id)
  ]);
  if (rows.length === 0) {
    throw new HttpError(404, 'Không tìm thấy bài viết');
  }
  sendJson(res, 200, formatPost(rows[0]));
}

// 7. LIKE BÀI VIẾT

async function countLikes(idPost) {
  const [rows] = await db.query(
    `SELECT COUNT(DISTINCT idUser) AS soLike FROM ${LIKE} WHERE idPost = ?`,
    [idPost]
  );
  return Number(rows[0].soLike);
}

// POST /api/posts/:id/like   (like nhiều lần vẫn chỉ tính một)
export async function likePost(req, res, params) {
  const idUser = requireUser(req);
  const idPost = Number(params.id);
  await assertPostExists(idPost);

  await db.query(
    `INSERT INTO ${LIKE} (idPost, idUser)
     SELECT ?, ? FROM DUAL
     WHERE NOT EXISTS (SELECT 1 FROM ${LIKE} WHERE idPost = ? AND idUser = ?)`,
    [idPost, idUser, idPost, idUser]
  );
  const [ownerRows] = await db.query('SELECT idUser FROM post WHERE idPost = ?', [idPost]);
  if (ownerRows.length && ownerRows[0].idUser !== idUser) {
    notify(ownerRows[0].idUser, 'Ai đó vừa thích bài viết của bạn');
  }
  sendJson(res, 200, { daLike: true, soLike: await countLikes(idPost) });
}

// DELETE /api/posts/:id/like   (bỏ like; chưa like thì không có gì xảy ra)
export async function unlikePost(req, res, params) {
  const idUser = requireUser(req);
  const idPost = Number(params.id);
  await assertPostExists(idPost);

  await db.query(`DELETE FROM ${LIKE} WHERE idPost = ? AND idUser = ?`, [idPost, idUser]);
  sendJson(res, 200, { daLike: false, soLike: await countLikes(idPost) });
}

// =========================================================================
// 8. BÌNH LUẬN (thêm / sửa / xóa)
// =========================================================================

const COMMENT_SELECT = `
  SELECT c.idComment, c.idPost, c.idUser, c.idParentComment, c.noiDung, c.hinhAnhUrl, c.createdAt,
         COALESCE(NULLIF(h.HovaTen, ''), u.userName) AS tenNguoiBinhLuan,
         h.avatar
  FROM comment c
  JOIN user u ON u.idUser = c.idUser
  LEFT JOIN hoso h ON h.idUser = c.idUser`;

function readCommentText(value, allowEmpty = false) {
  const noiDung = cleanString(value);
  if (!noiDung && !allowEmpty) {
    throw new HttpError(400, 'Nội dung bình luận không được để trống');
  }
  if (noiDung && noiDung.length > MAX_COMMENT_LENGTH) {
    throw new HttpError(400, `Bình luận tối đa ${MAX_COMMENT_LENGTH} ký tự`);
  }
  return noiDung || '';
}

async function getComment(idComment) {
  try {
    const [rows] = await db.query(`${COMMENT_SELECT} WHERE c.idComment = ?`, [idComment]);
    return rows[0];
  } catch (err) {
    if (err.code === 'ER_BAD_FIELD_ERROR' || err.errno === 1054) {
      const fallbackSelect = `
        SELECT c.idComment, c.idPost, c.idUser, c.idParentComment, c.noiDung, NULL AS hinhAnhUrl, c.createdAt,
               COALESCE(NULLIF(h.HovaTen, ''), u.userName) AS tenNguoiBinhLuan,
               h.avatar
        FROM comment c
        JOIN user u ON u.idUser = c.idUser
        LEFT JOIN hoso h ON h.idUser = c.idUser`;
      const [rows] = await db.query(`${fallbackSelect} WHERE c.idComment = ?`, [idComment]);
      return rows[0];
    }
    throw err;
  }
}

// Lấy bình luận và bảo đảm nó thuộc về người đang đăng nhập
async function getOwnComment(idComment, idUser) {
  const [rows] = await db.query('SELECT idUser FROM comment WHERE idComment = ?', [idComment]);
  if (rows.length === 0) {
    throw new HttpError(404, 'Không tìm thấy bình luận');
  }
  if (rows[0].idUser !== idUser) {
    throw new HttpError(403, 'Bạn chỉ được sửa hoặc xóa bình luận của mình');
  }
}

// GET /api/posts/:id/comments   (công khai; theo thứ tự cũ -> mới, bình luận trả lời có idParentComment)
export async function getComments(req, res, params) {
  const idPost = Number(params.id);
  await assertPostExists(idPost);

  try {
    const [rows] = await db.query(`${COMMENT_SELECT} WHERE c.idPost = ? ORDER BY c.idComment`, [idPost]);
    sendJson(res, 200, rows);
  } catch (err) {
    if (err.code === 'ER_BAD_FIELD_ERROR' || err.errno === 1054) {
      const fallbackSelect = `
        SELECT c.idComment, c.idPost, c.idUser, c.idParentComment, c.noiDung, NULL AS hinhAnhUrl, c.createdAt,
               COALESCE(NULLIF(h.HovaTen, ''), u.userName) AS tenNguoiBinhLuan,
               h.avatar
        FROM comment c
        JOIN user u ON u.idUser = c.idUser
        LEFT JOIN hoso h ON h.idUser = c.idUser`;
      const [rows] = await db.query(`${fallbackSelect} WHERE c.idPost = ? ORDER BY c.idComment`, [idPost]);
      sendJson(res, 200, rows);
    } else {
      throw err;
    }
  }
}

// POST /api/posts/:id/comments   body: { noiDung, idParentComment?, hinhAnhUrl?, hasImage? }
export async function addComment(req, res, params) {
  const idUser = requireUser(req);
  const idPost = Number(params.id);
  const data = await readObject(req);
  const hinhAnhUrl = cleanString(data.hinhAnhUrl) || null;
  const hasImage = Boolean(hinhAnhUrl || data.hasImage);
  const noiDung = readCommentText(data.noiDung, hasImage);
  await assertPostExists(idPost);
  const [ownerRows] = await db.query('SELECT idUser FROM post WHERE idPost = ?', [idPost]);
  if (ownerRows.length && ownerRows[0].idUser !== idUser) {
    notify(ownerRows[0].idUser, 'Ai đó vừa bình luận bài viết của bạn');
  }

  // Trả lời một bình luận khác: bình luận gốc phải cùng bài viết
  let idParentComment = null;
  if (data.idParentComment !== undefined && data.idParentComment !== null && data.idParentComment !== '') {
    idParentComment = toId(data.idParentComment, 'Bình luận gốc không hợp lệ');
    const [parents] = await db.query(
      'SELECT idComment FROM comment WHERE idComment = ? AND idPost = ?',
      [idParentComment, idPost]
    );
    if (parents.length === 0) {
      throw new HttpError(400, 'Bình luận gốc không hợp lệ');
    }
  }

  let result;
  try {
    [result] = await db.query(
      'INSERT INTO comment (idPost, idUser, idParentComment, noiDung, hinhAnhUrl) VALUES (?, ?, ?, ?, ?)',
      [idPost, idUser, idParentComment, noiDung, hinhAnhUrl]
    );
  } catch (err) {
    if (err.code === 'ER_BAD_FIELD_ERROR' || err.errno === 1054) {
      try {
        await db.query('ALTER TABLE comment ADD COLUMN hinhAnhUrl VARCHAR(500) DEFAULT NULL');
        [result] = await db.query(
          'INSERT INTO comment (idPost, idUser, idParentComment, noiDung, hinhAnhUrl) VALUES (?, ?, ?, ?, ?)',
          [idPost, idUser, idParentComment, noiDung, hinhAnhUrl]
        );
      } catch {
        [result] = await db.query(
          'INSERT INTO comment (idPost, idUser, idParentComment, noiDung) VALUES (?, ?, ?, ?)',
          [idPost, idUser, idParentComment, noiDung]
        );
      }
    } else {
      throw err;
    }
  }

  sendJson(res, 201, await getComment(result.insertId));
}

// PUT /api/comments/:id   body: { noiDung, hinhAnhUrl? }
export async function updateComment(req, res, params) {
  const idUser = requireUser(req);
  const idComment = Number(params.id);
  const body = await readObject(req);
  await getOwnComment(idComment, idUser);

  const hasImage = body.hinhAnhUrl !== undefined ? Boolean(body.hinhAnhUrl) : true;
  const noiDung = readCommentText(body.noiDung, hasImage);

  if (body.hinhAnhUrl !== undefined) {
    const hinhAnhUrl = cleanString(body.hinhAnhUrl) || null;
    try {
      await db.query('UPDATE comment SET noiDung = ?, hinhAnhUrl = ? WHERE idComment = ? AND idUser = ?', [
        noiDung,
        hinhAnhUrl,
        idComment,
        idUser
      ]);
    } catch (err) {
      if (err.code === 'ER_BAD_FIELD_ERROR' || err.errno === 1054) {
        await db.query('UPDATE comment SET noiDung = ? WHERE idComment = ? AND idUser = ?', [
          noiDung,
          idComment,
          idUser
        ]);
      } else {
        throw err;
      }
    }
  } else {
    await db.query('UPDATE comment SET noiDung = ? WHERE idComment = ? AND idUser = ?', [
      noiDung,
      idComment,
      idUser
    ]);
  }

  sendJson(res, 200, await getComment(idComment));
}

// DELETE /api/comments/:id   (các bình luận trả lời nó cũng bị xóa theo)
export async function deleteComment(req, res, params) {
  const idUser = requireUser(req);
  const idComment = Number(params.id);
  await getOwnComment(idComment, idUser);

  await db.query('DELETE FROM comment WHERE idComment = ? AND idUser = ?', [idComment, idUser]);
  sendJson(res, 200, { message: 'Đã xóa bình luận' });
}

export async function markPost(req, res, params) {
  const userID = requireUser(req);
  const postID = Number(params.id);

  await db.query('INSERT INTO `bookmarks` (`user_id`, `post_id`, `bookmarked_at`) VALUES (?, ?, NOW())', [userID, postID ]);
  sendJson(res, 200, {marked : true});
}
export async function unMark(req, res, params) {
  const userID = requireUser(req);
  const postID = Number(params.id);
  await db.query(
    'DELETE FROM `bookmarks` WHERE `user_id` = ? AND `post_id` = ?',
    [userID, postID]
  );
  sendJson(res, 200, {marked : false});
}
export async function getMarked(req, res, params) {
  const userID = requireUser(req);
  const postID = Number(params.id);
 const [rows] = await db.query(
    'SELECT 1 FROM `bookmarks` WHERE `user_id` = ? AND `post_id` = ? LIMIT 1',
    [userID, postID]
  );

  const marked = rows.length > 0;

  sendJson(res, 200, { marked });
}
export async function searchUsers(req, res, params) {
  // Lấy từ khóa tìm kiếm từ Query URL (/api/users/search?q=abc)
  const urlParams = new URLSearchParams(req.url.split('?')[1]);
  const keyword = urlParams.get('q') || '';

  if (!keyword || keyword.trim() === '') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify([]));
  }

  try {
    const searchTerm = `%${keyword.trim()}%`;
    const [users] = await db.query(
      `SELECT idUser, userName, email 
       FROM user
       WHERE userName LIKE ? OR email LIKE ? 
       LIMIT 10`,
      [searchTerm, searchTerm]
    );

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify(users));
  } catch (err) {
    console.error('Lỗi searchUsers:', err);
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ message: 'Lỗi server khi tìm kiếm' }));
  }
}