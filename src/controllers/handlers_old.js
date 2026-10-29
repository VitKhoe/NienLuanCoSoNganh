import db from '../models/db.js';
import { HttpError, sendJson, readJson } from '../utils/helpers.js';
import { requireUser } from '../utils/session.js';

// (Đăng ký / đăng nhập đã chuyển sang users.js)

// ---------- Dự án + tin tuyển dụng ----------
export async function createProject(req, res) {
  const idUser = requireUser(req); // người đang đăng nhập
  const data = await readJson(req);
  // console.log('Dữ liệu nhận được từ client:', data);
  const { tenDuAn, trangThai } = data;
  const moTa = data.moTa || null;
  const ngayBD = data.ngayBD || null;
  const ngayKT = data.ngayKT || null;

  if (!tenDuAn || !trangThai) {
    throw new HttpError(400, 'Tên dự án và trạng thái không được để trống');
  }

  const tieuDe = data.tieuDeTuyenDung || `Tuyển thành viên tham gia dự án: ${tenDuAn}`;
  const yeuCau = data.yeuCauTuyenDung || moTa || `Yêu cầu có chuyên môn phù hợp với dự án ${tenDuAn}.`;

  // Transaction: tạo dự án và tin tuyển dụng, lỗi bước nào thì hủy cả hai
  // await db.beginTransaction();
  // const [rows] = await db.query(
  // "SHOW CREATE TABLE tintuyendung"
  // );

  // console.log(rows);
  try {
    const [duAn] = await db.query(
      `INSERT INTO DuAn (idUserTao, tenDuAn, moTa, ngayBD, ngayKT, trangThai)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [idUser, tenDuAn, moTa, ngayBD, ngayKT, trangThai]
    );
    console.log('Dự án đã được tạo với id:', duAn.insertId);
    const [tin] = await db.query(
      `INSERT INTO TinTuyenDung (idUser, idDuAN, tieuDe, yeuCau, hanNop, trangThai)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [idUser, duAn.insertId, tieuDe, yeuCau, ngayKT, trangThai]
    );
    

    await db.commit();
    sendJson(res, 201, {
      message: 'Tạo dự án và tin tuyển dụng thành công',
      idDuAn: duAn.insertId,
      idTinTuyen: tin.insertId
    });
  } catch (err) {
    await db.rollback();
    throw err;
  }
}

export async function getJobs(req, res) {
  const [rows] = await db.query(
    `SELECT t.idTinTuyen, t.idUser, t.idDuAn, t.tieuDe, t.yeuCau,
            t.hanNop, t.trangThai, d.tenDuAn
     FROM TinTuyenDung t
     LEFT JOIN DuAn d ON t.idDuAN = d.idDuAn
     ORDER BY t.idTinTuyen DESC`
  );
  sendJson(res, 200, rows);
}

// ---------- Bài viết ----------
export async function createPost(req, res) {
  const idUser = requireUser(req); // người đang đăng nhập
  const { noiDung, hinhAnhUrl } = await readJson(req);

  if (!noiDung) {
    throw new HttpError(400, 'Nội dung bài viết không được để trống');
  }
  if (!idUser) {
    throw new HttpError(401, 'Người dùng chưa đăng nhập');
  }
  const [result] = await db.query(
    'INSERT INTO Post (idUser, noiDung, hinhAnhUrl, createdAt) VALUES (?, ?, ?, NOW())',
    [idUser, noiDung, hinhAnhUrl || null]
  );
  sendJson(res, 201, { message: 'Đăng bài viết thành công', idPost: result.insertId });
}

export async function getPosts(req, res) {
  const [rows] = await db.query(
    `SELECT 
    p.idPost,
    p.idUser,
    p.noiDung,
    p.hinhAnhUrl,
    p.createdAt,
    u.userName
    FROM Post p
    INNER JOIN  user u
        ON p.idUser = u.idUser
    ORDER BY p.createdAt DESC;`
  );
  sendJson(res, 200, rows);
}

export async function createLike(req, res) {
  const idUser = requireUser(req); // người đang đăng nhập
  const { idPost } = await readJson(req);
  
  if (!idPost) {
    throw new HttpError(400, 'idPost không được để trống');
  }
  if (idUser === undefined) {
    throw new HttpError(401, 'Người dùng chưa đăng nhập');
  }

  const [result] = await db.query(
    'INSERT INTO LikePost (idUser, idPost, createdAt) VALUES (?, ?, NOW())',
    [idUser, idPost]
  );
  sendJson(res, 201, { message: 'Thích bài viết thành công', idLike: result.insertId });

}
export async function deleteLikes(req, res) {
  const idUser = requireUser(req); // người đang đăng nhập
  const { idPost } = await readJson(req);
  
  if (!idPost) {
    throw new HttpError(400, 'idPost không được để trống');
  }
  if (idUser === undefined) {
    throw new HttpError(401, 'Người dùng chưa đăng nhập');
  }

  const [result] = await db.query(
    'DELETE FROM LikePost WHERE idUser = ? AND idPost = ?',
    [idUser, idPost]
  );
  sendJson(res, 200, { message: 'Bỏ thích bài viết thành công', affectedRows: result.affectedRows });
}

export async function getLikes(req, res) {
  const { idPost } = req.query;
  
  if (!idPost) {
    throw new HttpError(400, 'idPost không được để trống');
  }

  const [rows] = await db.query(
    'SELECT * FROM LikePost WHERE idPost = ?',
    [idPost]
  );
  let likeCount = rows.length;
  sendJson(res, 200, { likeCount });
}

export async function createcomment(req, res) {
  const idUser = requireUser(req); // người đang đăng nhập
  const { idPost, noiDung, idParentComment } = await readJson(req);
  
  if (!idPost || !noiDung) {
    throw new HttpError(400, 'idPost và nội dung bình luận không được để trống');
  }
  if (idUser === undefined) {
    throw new HttpError(401, 'Người dùng chưa đăng nhập');
  }
  
  const [result] = await db.query(
    'INSERT INTO Comment (idUser, idPost, noiDung, idParentComment, createdAt) VALUES (?, ?, ?, ?, NOW())',
    [idUser, idPost, noiDung, idParentComment || null]
  );
  sendJson(res, 201, { message: 'Bình luận thành công', idComment: result.insertId });
}
export async function deleteComment(req, res) {
  const idUser = requireUser(req); // người đang đăng nhập
  const { idComment } = await readJson(req);
  
  if (!idComment) {
    throw new HttpError(400, 'idComment không được để trống');
  }
  if (idUser === undefined) {
    throw new HttpError(401, 'Người dùng chưa đăng nhập');
  }

  const [result] = await db.query(
    'DELETE FROM Comment WHERE idUser = ? AND idComment = ?',
    [idUser, idComment]
  );
  sendJson(res, 200, { message: 'Xóa bình luận thành công', affectedRows: result.affectedRows });
}
export async function updateComment(req, res) {
  const idUser = requireUser(req); // người đang đăng nhập
  const { idComment, noiDung } = await readJson(req);     
  if (!idComment || !noiDung) {
    throw new HttpError(400, 'idComment và nội dung bình luận không được để trống');
  }
  if (idUser === undefined) {
    throw new HttpError(401, 'Người dùng chưa đăng nhập');
  }

  const [result] = await db.query(
    'UPDATE Comment SET noiDung = ? WHERE idUser = ? AND idComment = ?',
    [noiDung, idUser, idComment]
  );
  sendJson(res, 200, { message: 'Cập nhật bình luận thành công', affectedRows: result.affectedRows });
}

export async function getComments(req, res) {
  const { idPost } = req.query;
  
  if (!idPost) {
    throw new HttpError(400, 'idPost không được để trống');
  }

  const [rows] = await db.query(
    `SELECT c.idComment, c.idUser, c.idPost, c.noiDung, c.idParentComment, c.createdAt, u.userName
     FROM Comment c
     INNER JOIN user u ON c.idUser = u.idUser
     WHERE c.idPost = ?
     ORDER BY c.createdAt ASC`,
    [idPost]
  );
  sendJson(res, 200, rows);
}
