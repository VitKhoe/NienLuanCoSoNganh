// Nhóm 1 (bổ sung) - Năng lực: danh mục kỹ năng, kỹ năng & chứng chỉ của người dùng
// Bảng: ky_nang (danh mục), nhan_su_ky_nang (kỹ năng của user), nhan_su_chung_chi (chứng chỉ)

import db from '../models/db.js';
import { HttpError, sendJson } from '../utils/helpers.js';
import { requireUser } from '../utils/session.js';
import { readObject, cleanString } from '../utils/validate.js';

// GET /api/ky-nang  -> danh mục kỹ năng chuẩn (để đổ gợi ý)
export async function listSkillsCatalog(req, res) {
  const [rows] = await db.query(
    'SELECT tenKyNang, nhomNganh FROM ky_nang ORDER BY tenKyNang'
  );
  sendJson(res, 200, rows);
}

// GET /api/account/nang-luc  -> kỹ năng + chứng chỉ của người đang đăng nhập
export async function getMyCompetency(req, res) {
  const idUser = requireUser(req);

  const [skills] = await db.query(
    `SELECT nsk.id, k.tenKyNang, k.nhomNganh, nsk.capDo, nsk.soNamKinhNghiem, nsk.daXacThuc
     FROM nhan_su_ky_nang nsk
     JOIN ky_nang k ON k.idKyNang = nsk.idKyNang
     WHERE nsk.idUser = ?
     ORDER BY k.tenKyNang`,
    [idUser]
  );

  const [certs] = await db.query(
    `SELECT idChungChi, tenChungChi, toChucCap, maChungChi, ngayCap, ngayHetHan, drive_url, trangThaiDuyet
     FROM nhan_su_chung_chi
     WHERE idUser = ?
     ORDER BY idChungChi DESC`,
    [idUser]
  );

  const [hocVan] = await db.query(
    `SELECT idHocVan, truongHoc, chuyenNganh, bangCap, namBatDau, namKetThuc, moTa
     FROM hoc_van WHERE idUser = ? ORDER BY COALESCE(namKetThuc, namBatDau, 0) DESC`,
    [idUser]
  );

  const [kinhNghiem] = await db.query(
    `SELECT idKinhNghiem, tenCongTy, viTri, moTa, ngayBatDau, ngayKetThuc
     FROM kinh_nghiem WHERE idUser = ? ORDER BY COALESCE(ngayKetThuc, ngayBatDau, '1900-01-01') DESC`,
    [idUser]
  );

  sendJson(res, 200, { skills, certs, hocVan, kinhNghiem });
}

// POST /api/account/ky-nang  body: { tenKyNang, nhomNganh, capDo, soNamKinhNghiem }
// (upsert theo idUser + tenKyNang, nên có thể dùng để thêm mới lẫn sửa)
export async function saveMySkill(req, res) {
  const idUser = requireUser(req);
  const data = await readObject(req);
  const tenKyNang = cleanString(data.tenKyNang);
  const nhomNganh = cleanString(data.nhomNganh) || null;
  const capDo = Number(data.capDo) || 1;
  const soNamKinhNghiem = Number(data.soNamKinhNghiem) || 0;

  if (!tenKyNang || tenKyNang.length > 100) {
    throw new HttpError(400, 'Tên kỹ năng không được để trống (tối đa 100 ký tự)');
  }
  if (!Number.isInteger(capDo) || capDo < 1 || capDo > 4) {
    throw new HttpError(400, 'Cấp độ kỹ năng phải từ 1 đến 4');
  }

  // Tìm (hoặc tạo mới) kỹ năng trong danh mục
  let [rows] = await db.query('SELECT idKyNang FROM ky_nang WHERE tenKyNang = ?', [tenKyNang]);
  let idKyNang;
  if (rows.length === 0) {
    const [r] = await db.query(
      'INSERT INTO ky_nang (tenKyNang, nhomNganh) VALUES (?, ?)',
      [tenKyNang, nhomNganh]
    );
    idKyNang = r.insertId;
  } else {
    idKyNang = rows[0].idKyNang;
    if (nhomNganh) {
      await db.query('UPDATE ky_nang SET nhomNganh = ? WHERE idKyNang = ?', [nhomNganh, idKyNang]);
    }
  }

  // Upsert năng lực của user
  await db.query(
    `INSERT INTO nhan_su_ky_nang (idUser, idKyNang, capDo, soNamKinhNghiem)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE capDo = VALUES(capDo), soNamKinhNghiem = VALUES(soNamKinhNghiem)`,
    [idUser, idKyNang, capDo, soNamKinhNghiem]
  );

  sendJson(res, 200, { success: true, message: 'Đã lưu kỹ năng' });
}

// DELETE /api/account/ky-nang/:id
export async function deleteMySkill(req, res, params) {
  const idUser = requireUser(req);
  const id = Number(params.id);
  const [result] = await db.query(
    'DELETE FROM nhan_su_ky_nang WHERE id = ? AND idUser = ?',
    [id, idUser]
  );
  if (result.affectedRows === 0) {
    throw new HttpError(404, 'Không tìm thấy kỹ năng');
  }
  sendJson(res, 200, { success: true, message: 'Đã xóa kỹ năng' });
}

// POST /api/account/chung-chi  body: { idChungChi?, tenChungChi, toChucCap, maChungChi, ngayCap, ngayHetHan, drive_url }
export async function saveMyCertification(req, res) {
  const idUser = requireUser(req);
  const data = await readObject(req);
  const idChungChi = data.idChungChi ? Number(data.idChungChi) : null;
  const tenChungChi = cleanString(data.tenChungChi);
  const toChucCap = cleanString(data.toChucCap);
  const maChungChi = cleanString(data.maChungChi) || null;
  const ngayCap = cleanString(data.ngayCap) || null;
  const ngayHetHan = cleanString(data.ngayHetHan) || null;
  const drive_url = cleanString(data.drive_url) || null;

  if (!tenChungChi || !toChucCap) {
    throw new HttpError(400, 'Tên chứng chỉ và tổ chức cấp không được để trống');
  }
  if (drive_url && !/^https:\/\/(drive|docs)\.google\.com\/.+/i.test(drive_url)) {
    throw new HttpError(400, 'Đường dẫn minh chứng phải là link Google Drive hợp lệ');
  }

  if (idChungChi) {
    const [result] = await db.query(
      `UPDATE nhan_su_chung_chi
       SET tenChungChi = ?, toChucCap = ?, maChungChi = ?, ngayCap = ?, ngayHetHan = ?, drive_url = ?
       WHERE idChungChi = ? AND idUser = ?`,
      [tenChungChi, toChucCap, maChungChi, ngayCap, ngayHetHan, drive_url, idChungChi, idUser]
    );
    if (result.affectedRows === 0) {
      throw new HttpError(404, 'Không tìm thấy chứng chỉ');
    }
  } else {
    await db.query(
      `INSERT INTO nhan_su_chung_chi (idUser, tenChungChi, toChucCap, maChungChi, ngayCap, ngayHetHan, drive_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [idUser, tenChungChi, toChucCap, maChungChi, ngayCap, ngayHetHan, drive_url]
    );
  }

  sendJson(res, 200, { success: true, message: 'Đã lưu chứng chỉ' });
}

// DELETE /api/account/chung-chi/:id
export async function deleteMyCertification(req, res, params) {
  const idUser = requireUser(req);
  const idChungChi = Number(params.id);
  const [result] = await db.query(
    'DELETE FROM nhan_su_chung_chi WHERE idChungChi = ? AND idUser = ?',
    [idChungChi, idUser]
  );
  if (result.affectedRows === 0) {
    throw new HttpError(404, 'Không tìm thấy chứng chỉ');
  }
  sendJson(res, 200, { success: true, message: 'Đã xóa chứng chỉ' });
}

// POST /api/account/hoc-van  body: { idHocVan?, truongHoc, chuyenNganh, bangCap, namBatDau, namKetThuc, moTa }
export async function saveMyEducation(req, res) {
  const idUser = requireUser(req);
  const data = await readObject(req);
  const idHocVan = data.idHocVan ? Number(data.idHocVan) : null;
  const truongHoc = cleanString(data.truongHoc);
  const chuyenNganh = cleanString(data.chuyenNganh) || null;
  const bangCap = cleanString(data.bangCap) || null;
  const namBatDau = data.namBatDau ? Number(data.namBatDau) : null;
  const namKetThuc = data.namKetThuc ? Number(data.namKetThuc) : null;
  const moTa = cleanString(data.moTa) || null;

  if (!truongHoc || truongHoc.length > 255) {
    throw new HttpError(400, 'Tên trường không được để trống (tối đa 255 ký tự)');
  }

  if (idHocVan) {
    const [r] = await db.query(
      `UPDATE hoc_van SET truongHoc = ?, chuyenNganh = ?, bangCap = ?, namBatDau = ?, namKetThuc = ?, moTa = ?
       WHERE idHocVan = ? AND idUser = ?`,
      [truongHoc, chuyenNganh, bangCap, namBatDau, namKetThuc, moTa, idHocVan, idUser]
    );
    if (r.affectedRows === 0) throw new HttpError(404, 'Không tìm thấy học vấn');
  } else {
    await db.query(
      `INSERT INTO hoc_van (idUser, truongHoc, chuyenNganh, bangCap, namBatDau, namKetThuc, moTa)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [idUser, truongHoc, chuyenNganh, bangCap, namBatDau, namKetThuc, moTa]
    );
  }
  sendJson(res, 200, { success: true, message: 'Đã lưu học vấn' });
}

// DELETE /api/account/hoc-van/:id
export async function deleteMyEducation(req, res, params) {
  const idUser = requireUser(req);
  const [r] = await db.query('DELETE FROM hoc_van WHERE idHocVan = ? AND idUser = ?', [Number(params.id), idUser]);
  if (r.affectedRows === 0) throw new HttpError(404, 'Không tìm thấy học vấn');
  sendJson(res, 200, { success: true, message: 'Đã xóa học vấn' });
}

// POST /api/account/kinh-nghiem  body: { idKinhNghiem?, tenCongTy, viTri, moTa, ngayBatDau, ngayKetThuc }
export async function saveMyWorkExperience(req, res) {
  const idUser = requireUser(req);
  const data = await readObject(req);
  const idKinhNghiem = data.idKinhNghiem ? Number(data.idKinhNghiem) : null;
  const tenCongTy = cleanString(data.tenCongTy);
  const viTri = cleanString(data.viTri) || null;
  const moTa = cleanString(data.moTa) || null;
  const ngayBatDau = cleanString(data.ngayBatDau) || null;
  const ngayKetThuc = cleanString(data.ngayKetThuc) || null;

  if (!tenCongTy || tenCongTy.length > 255) {
    throw new HttpError(400, 'Tên công ty không được để trống (tối đa 255 ký tự)');
  }

  if (idKinhNghiem) {
    const [r] = await db.query(
      `UPDATE kinh_nghiem SET tenCongTy = ?, viTri = ?, moTa = ?, ngayBatDau = ?, ngayKetThuc = ?
       WHERE idKinhNghiem = ? AND idUser = ?`,
      [tenCongTy, viTri, moTa, ngayBatDau, ngayKetThuc, idKinhNghiem, idUser]
    );
    if (r.affectedRows === 0) throw new HttpError(404, 'Không tìm thấy kinh nghiệm');
  } else {
    await db.query(
      `INSERT INTO kinh_nghiem (idUser, tenCongTy, viTri, moTa, ngayBatDau, ngayKetThuc)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [idUser, tenCongTy, viTri, moTa, ngayBatDau, ngayKetThuc]
    );
  }
  sendJson(res, 200, { success: true, message: 'Đã lưu kinh nghiệm' });
}

// DELETE /api/account/kinh-nghiem/:id
export async function deleteMyWorkExperience(req, res, params) {
  const idUser = requireUser(req);
  const [r] = await db.query('DELETE FROM kinh_nghiem WHERE idKinhNghiem = ? AND idUser = ?', [Number(params.id), idUser]);
  if (r.affectedRows === 0) throw new HttpError(404, 'Không tìm thấy kinh nghiệm');
  sendJson(res, 200, { success: true, message: 'Đã xóa kinh nghiệm' });
}
