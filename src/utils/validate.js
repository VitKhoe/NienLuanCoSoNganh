// Hàm kiểm tra / làm sạch dữ liệu đầu vào dùng chung cho các API

import { HttpError, readJson } from './helpers.js';

// Đọc body JSON và chắc chắn nó là một object
export async function readObject(req) {
  const data = await readJson(req);
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new HttpError(400, 'Dữ liệu gửi lên không hợp lệ');
  }
  return data;
}

// Chuỗi đã cắt khoảng trắng ('' nếu giá trị không phải chuỗi)
export function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

// Chuyển giá trị thành mã (số nguyên dương), sai thì ném lỗi 400
export function toId(value, message = 'Mã không hợp lệ') {
  const number = Number(value);
  if (value === null || value === '' || !Number.isInteger(number) || number <= 0) {
    throw new HttpError(400, message);
  }
  return number;
}

// Tham số ?limit=...: mặc định `fallback`, tối đa `max`
export function parseLimit(value, fallback, max) {
  if (value === null || value === undefined || value === '') return fallback;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) {
    throw new HttpError(400, 'Tham số limit không hợp lệ');
  }
  return Math.min(number, max);
}

// Tham số phân trang ?before=... / ?after=... (mã của bản ghi); không có thì trả về null
export function parseCursor(value, name) {
  if (value === null || value === undefined || value === '') return null;
  return toId(value, `Tham số ${name} không hợp lệ`);
}