// Nhóm 2 - Mạng xã hội (phần 3): nhắn tin 1-1 và nhắn tin nhóm
// Bảng: chatbox (cuộc trò chuyện), grchat (ai thuộc cuộc trò chuyện nào), message (tin nhắn)
//
// Lưu ý theo cấu trúc bảng hiện có:
// - chatbox.tenChatBox là UNIQUE: cuộc 1-1 được đặt tên cố định "private:<id nhỏ>-<id lớn>"
//   (nhờ vậy hai người luôn dùng chung một cuộc trò chuyện), còn tên nhóm không được trùng nhau.
// - Server dùng HTTP thuần nên nhận tin mới bằng cách hỏi lại định kỳ (polling) với ?after=<idMessage>.

import db from '../models/db.js';
import { HttpError, sendJson } from '../utils/helpers.js';
import { requireUser } from '../utils/session.js';
import { assertActiveUser, getFriendIds } from './connections.js';
import { readObject, cleanString, toId, parseLimit, parseCursor } from '../utils/validate.js';

const PRIVATE_PREFIX = 'private:';
const MAX_MESSAGE_LENGTH = 2000;
const MAX_GROUP_MEMBERS = 50;

// =========================================================================
// HÀM DÙNG CHUNG
// =========================================================================

async function isMember(idChatBox, idUser) {
  const [rows] = await db.query(
    'SELECT idGr FROM grchat WHERE idChatBox = ? AND idUser = ? LIMIT 1',
    [idChatBox, idUser]
  );
  return rows.length > 0;
}

// Chỉ thành viên mới được xem / nhắn; người ngoài nhận 404 như thể cuộc trò chuyện không tồn tại
async function requireMember(idChatBox, idUser) {
  if (!(await isMember(idChatBox, idUser))) {
    throw new HttpError(404, 'Không tìm thấy cuộc trò chuyện');
  }
}

// Thêm thành viên nếu chưa có (bảng grchat không có khóa duy nhất nên kiểm tra ngay trong INSERT)
function addMember(idChatBox, idUser) {
  return db.query(
    `INSERT INTO grchat (idUser, idChatBox)
     SELECT ?, ? FROM DUAL
     WHERE NOT EXISTS (SELECT 1 FROM grchat WHERE idUser = ? AND idChatBox = ?)`,
    [idUser, idChatBox, idUser, idChatBox]
  );
}

// Thông tin hiển thị của một cuộc trò chuyện đối với người đang xem
// (cuộc 1-1 hiển thị tên + avatar của người kia)
async function loadChat(idChatBox, me) {
  const [rows] = await db.query(
    'SELECT idChatBox, tenChatBox, loai FROM chatbox WHERE idChatBox = ?',
    [idChatBox]
  );
  const chat = rows[0];

  if (chat.loai === 'Group') {
    return { idChatBox, loai: 'Group', ten: chat.tenChatBox, avatar: null, idDoiPhuong: null };
  }

  const [others] = await db.query(
    `SELECT u.idUser, COALESCE(NULLIF(h.HovaTen, ''), u.userName) AS ten, h.avatar
     FROM grchat g
     JOIN user u ON u.idUser = g.idUser
     LEFT JOIN hoso h ON h.idUser = u.idUser
     WHERE g.idChatBox = ? AND g.idUser <> ?
     LIMIT 1`,
    [idChatBox, me]
  );
  const other = others[0];
  return {
    idChatBox,
    loai: 'Private',
    ten: other ? other.ten : 'Người dùng',
    avatar: other ? other.avatar : null,
    idDoiPhuong: other ? other.idUser : null
  };
}

// =========================================================================
// 10. TẠO / MỞ CUỘC TRÒ CHUYỆN
// =========================================================================

// POST /api/chats/private   body: { idUser }
// Mở cuộc trò chuyện 1-1 với một người (chưa có thì tạo, có rồi thì trả về cuộc cũ)
export async function openPrivateChat(req, res) {
  const me = requireUser(req);
  const other = toId((await readObject(req)).idUser, 'Người nhận không hợp lệ');

  if (other === me) {
    throw new HttpError(400, 'Không thể trò chuyện với chính mình');
  }
  await assertActiveUser(other);

  const name = `${PRIVATE_PREFIX}${Math.min(me, other)}-${Math.max(me, other)}`;
  const findChat = () => db.query('SELECT idChatBox FROM chatbox WHERE tenChatBox = ?', [name]);

  let [rows] = await findChat();
  if (rows.length === 0) {
    try {
      await db.query("INSERT INTO chatbox (tenChatBox, loai) VALUES (?, 'Private')", [name]);
    } catch (err) {
      if (err.code !== 'ER_DUP_ENTRY') throw err; // người kia vừa tạo cùng lúc: dùng luôn cuộc đó
    }
    [rows] = await findChat();
  }
  const idChatBox = rows[0].idChatBox;

  // Luôn bảo đảm cả hai đều là thành viên (sửa được cả trường hợp lần tạo trước bị dở dang)
  await addMember(idChatBox, me);
  await addMember(idChatBox, other);

  sendJson(res, 200, await loadChat(idChatBox, me));
}

// POST /api/chats/group   body: { tenChatBox, memberIds: [idUser, ...] }
// Tạo nhóm chat; người tạo tự động là thành viên, các thành viên còn lại phải là bạn bè của người tạo
export async function createGroupChat(req, res) {
  const me = requireUser(req);
  const data = await readObject(req);
  const tenChatBox = cleanString(data.tenChatBox);

  if (!tenChatBox || tenChatBox.length > 255) {
    throw new HttpError(400, 'Tên nhóm không được để trống (tối đa 255 ký tự)');
  }
  if (tenChatBox.toLowerCase().startsWith(PRIVATE_PREFIX)) {
    throw new HttpError(400, `Tên nhóm không được bắt đầu bằng "${PRIVATE_PREFIX}"`);
  }
  if (!Array.isArray(data.memberIds)) {
    throw new HttpError(400, 'memberIds phải là danh sách mã người dùng');
  }

  const memberIds = [
    ...new Set(data.memberIds.map((id) => toId(id, 'Danh sách thành viên không hợp lệ')))
  ].filter((id) => id !== me);

  if (memberIds.length === 0) {
    throw new HttpError(400, 'Nhóm cần có ít nhất một thành viên khác');
  }
  if (memberIds.length + 1 > MAX_GROUP_MEMBERS) {
    throw new HttpError(400, `Nhóm tối đa ${MAX_GROUP_MEMBERS} thành viên`);
  }

  const friends = await getFriendIds(me);
  if (memberIds.some((id) => !friends.has(id))) {
    throw new HttpError(400, 'Chỉ có thể thêm bạn bè (đã kết nối) vào nhóm');
  }

  let idChatBox;
  try {
    const [result] = await db.query("INSERT INTO chatbox (tenChatBox, loai) VALUES (?, 'Group')", [
      tenChatBox
    ]);
    idChatBox = result.insertId;
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      throw new HttpError(409, 'Tên nhóm đã tồn tại, hãy chọn tên khác');
    }
    throw err;
  }

  await addMember(idChatBox, me);
  for (const idUser of memberIds) {
    await addMember(idChatBox, idUser);
  }
  sendJson(res, 201, await loadChat(idChatBox, me));
}

// =========================================================================
// DANH SÁCH CUỘC TRÒ CHUYỆN  -  GET /api/chats
// Cuộc có tin nhắn mới nhất nằm trên cùng
// =========================================================================
export async function listChats(req, res) {
  const me = requireUser(req);

  const [chats] = await db.query(
    `SELECT c.idChatBox, c.tenChatBox, c.loai,
            m.idMessage AS idTinCuoi, m.noiDung AS tinCuoi,
            m.thoiGian AS thoiGianCuoi, m.idUser AS idNguoiGui
     FROM chatbox c
     LEFT JOIN message m
       ON m.idMessage = (SELECT MAX(m2.idMessage) FROM message m2 WHERE m2.idChatBox = c.idChatBox)
     WHERE c.idChatBox IN (SELECT idChatBox FROM grchat WHERE idUser = ?)
     ORDER BY COALESCE(m.idMessage, 0) DESC, c.idChatBox DESC`,
    [me]
  );

  // Với cuộc 1-1: lấy người kia để hiển thị tên + avatar
  const [others] = await db.query(
    `SELECT g.idChatBox, u.idUser, COALESCE(NULLIF(h.HovaTen, ''), u.userName) AS ten, h.avatar
     FROM grchat g
     JOIN chatbox c ON c.idChatBox = g.idChatBox AND c.loai = 'Private'
     JOIN user u ON u.idUser = g.idUser
     LEFT JOIN hoso h ON h.idUser = u.idUser
     WHERE g.idUser <> ? AND g.idChatBox IN (SELECT idChatBox FROM grchat WHERE idUser = ?)`,
    [me, me]
  );
  const otherByChat = new Map();
  for (const row of others) {
    if (!otherByChat.has(row.idChatBox)) otherByChat.set(row.idChatBox, row);
  }

  const preview = (text) => (text.length > 100 ? `${text.slice(0, 100)}…` : text);

  sendJson(
    res,
    200,
    chats.map((chat) => {
      const other = otherByChat.get(chat.idChatBox);
      const isGroup = chat.loai === 'Group';
      return {
        idChatBox: chat.idChatBox,
        loai: chat.loai,
        ten: isGroup ? chat.tenChatBox : other ? other.ten : 'Người dùng',
        avatar: isGroup || !other ? null : other.avatar,
        idDoiPhuong: isGroup || !other ? null : other.idUser,
        tinCuoi: chat.idTinCuoi
          ? {
              idMessage: chat.idTinCuoi,
              noiDung: preview(chat.tinCuoi),
              thoiGian: chat.thoiGianCuoi,
              idNguoiGui: chat.idNguoiGui
            }
          : null
      };
    })
  );
}

// =========================================================================
// TIN NHẮN
// =========================================================================
const MESSAGE_SELECT = `
  SELECT m.idMessage, m.idChatBox, m.idUser, m.noiDung, m.thoiGian,
         COALESCE(NULLIF(h.HovaTen, ''), u.userName) AS tenNguoiGui,
         h.avatar
  FROM message m
  JOIN user u ON u.idUser = m.idUser
  LEFT JOIN hoso h ON h.idUser = m.idUser`;

// GET /api/chats/:id/messages?limit=50&before=<idMessage>&after=<idMessage>
//   (không tham số)  : 50 tin mới nhất
//   before           : các tin cũ hơn tin đó (cuộn lên xem lịch sử)
//   after            : các tin mới hơn tin đó (hỏi định kỳ để nhận tin mới)
// Luôn trả về theo thứ tự cũ -> mới.
export async function getMessages(req, res, params, query = new URLSearchParams()) {
  const me = requireUser(req);
  const idChatBox = Number(params.id);
  await requireMember(idChatBox, me);

  const limit = parseLimit(query.get('limit'), 50, 100);
  const after = parseCursor(query.get('after'), 'after');
  const before = parseCursor(query.get('before'), 'before');
  const ascending = after !== null;

  const [rows] = await db.query(
    `${MESSAGE_SELECT}
     WHERE m.idChatBox = ?
       AND (? IS NULL OR m.idMessage > ?)
       AND (? IS NULL OR m.idMessage < ?)
     ORDER BY m.idMessage ${ascending ? 'ASC' : 'DESC'}
     LIMIT ?`,
    [idChatBox, after, after, before, before, limit]
  );
  sendJson(res, 200, ascending ? rows : rows.reverse());
}

// POST /api/chats/:id/messages   body: { noiDung }
export async function sendMessage(req, res, params) {
  const me = requireUser(req);
  const idChatBox = Number(params.id);
  const noiDung = cleanString((await readObject(req)).noiDung);

  await requireMember(idChatBox, me);
  if (!noiDung) {
    throw new HttpError(400, 'Tin nhắn không được để trống');
  }
  if (noiDung.length > MAX_MESSAGE_LENGTH) {
    throw new HttpError(400, `Tin nhắn tối đa ${MAX_MESSAGE_LENGTH} ký tự`);
  }

  const [result] = await db.query(
    'INSERT INTO message (idChatBox, idUser, noiDung) VALUES (?, ?, ?)',
    [idChatBox, me, noiDung]
  );
  const [rows] = await db.query(`${MESSAGE_SELECT} WHERE m.idMessage = ?`, [result.insertId]);
  sendJson(res, 201, rows[0]);
}