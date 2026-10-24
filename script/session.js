// Mật khẩu (băm bằng scrypt có sẵn trong Node) và phiên đăng nhập (lưu trong bộ nhớ server)

import crypto from 'crypto';
import { promisify } from 'util';
import { HttpError } from './helpers.js';

const scrypt = promisify(crypto.scrypt);

// =========================================================================
// 1. MẬT KHẨU
// Định dạng lưu trong cột pWD:  scrypt$<salt>$<hash>   (khoảng 170 ký tự, vừa cột varchar(255))
// =========================================================================
const KEY_LENGTH = 64;
const HASH_PREFIX = 'scrypt$';

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = (await scrypt(password, salt, KEY_LENGTH)).toString('hex');
  return `${HASH_PREFIX}${salt}$${hash}`;
}

// Tài khoản tạo trước đây còn lưu mật khẩu thô, chưa có tiền tố "scrypt$"
export function isHashed(stored) {
  return stored.startsWith(HASH_PREFIX);
}

function safeEqual(a, b) {
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function verifyPassword(password, stored) {
  if (!isHashed(stored)) {
    return safeEqual(Buffer.from(password), Buffer.from(stored));
  }
  const [, salt, hash] = stored.split('$');
  const actual = await scrypt(password, salt, KEY_LENGTH);
  return safeEqual(actual, Buffer.from(hash, 'hex'));
}

// =========================================================================
// 2. PHIÊN ĐĂNG NHẬP
// Mã phiên ngẫu nhiên gửi cho trình duyệt qua cookie HttpOnly.
// Lưu trong bộ nhớ nên khởi động lại server thì mọi người phải đăng nhập lại.
// =========================================================================
const COOKIE_NAME = 'sid';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 ngày

const sessions = new Map(); // mã phiên -> { idUser, expires }

function readCookie(req, name) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index > 0 && part.slice(0, index).trim() === name) {
      return part.slice(index + 1).trim();
    }
  }
  return null;
}

function setCookie(res, value, maxAgeSeconds) {
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${value}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAgeSeconds}`
  );
}

export function createSession(res, idUser) {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { idUser, expires: Date.now() + SESSION_TTL_MS });
  setCookie(res, token, SESSION_TTL_MS / 1000);
}

export function getSession(req) {
  const token = readCookie(req, COOKIE_NAME);
  const session = token && sessions.get(token);
  if (!session) return null;

  if (session.expires < Date.now()) {
    sessions.delete(token);
    return null;
  }
  return session;
}

export function destroySession(req, res) {
  const token = readCookie(req, COOKIE_NAME);
  if (token) sessions.delete(token);
  setCookie(res, '', 0); // xóa cookie ở trình duyệt
}

// Trả về idUser đang đăng nhập, chưa đăng nhập thì ném lỗi 401
export function requireUser(req) {
  const session = getSession(req);
  if (!session) throw new HttpError(401, 'Bạn chưa đăng nhập');
  return session.idUser;
}

// Dọn các phiên hết hạn mỗi giờ
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of sessions) {
    if (session.expires < now) sessions.delete(token);
  }
}, 60 * 60 * 1000).unref();