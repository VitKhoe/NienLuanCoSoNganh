-- ============================================================
-- Bổ sung bảng NĂNG LỰC cho trang "Tài khoản" (không xóa dữ liệu cũ)
-- Chạy:  mysql -u root -p csdl2 < database/add-competency.sql
-- ============================================================
USE csdl2;

-- Danh mục kỹ năng (gợi ý)
CREATE TABLE IF NOT EXISTS ky_nang (
  idKyNang INT AUTO_INCREMENT PRIMARY KEY,
  tenKyNang VARCHAR(100) NOT NULL,
  nhomNganh VARCHAR(100) DEFAULT NULL,
  UNIQUE KEY uq_ky_nang_ten (tenKyNang)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Kỹ năng của người dùng (năng lực cá nhân)
CREATE TABLE IF NOT EXISTS nhan_su_ky_nang (
  id INT AUTO_INCREMENT PRIMARY KEY,
  idUser INT NOT NULL,
  idKyNang INT NOT NULL,
  capDo TINYINT NOT NULL DEFAULT 1,
  soNamKinhNghiem DECIMAL(4,1) DEFAULT 0,
  daXacThuc TINYINT(1) DEFAULT 0,
  UNIQUE KEY uq_nskn (idUser, idKyNang),
  KEY idx_nskn_user (idUser),
  CONSTRAINT fk_nskn_user FOREIGN KEY (idUser) REFERENCES user (idUser) ON DELETE CASCADE,
  CONSTRAINT fk_nskn_kynang FOREIGN KEY (idKyNang) REFERENCES ky_nang (idKyNang) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Chứng chỉ / bằng cấp của người dùng
CREATE TABLE IF NOT EXISTS nhan_su_chung_chi (
  idChungChi INT AUTO_INCREMENT PRIMARY KEY,
  idUser INT NOT NULL,
  tenChungChi VARCHAR(255) NOT NULL,
  toChucCap VARCHAR(255) NOT NULL,
  maChungChi VARCHAR(100) DEFAULT NULL,
  ngayCap DATE DEFAULT NULL,
  ngayHetHan DATE DEFAULT NULL,
  drive_url VARCHAR(500) DEFAULT NULL,
  trangThaiDuyet ENUM('cho_duyet','hop_le','tu_choi') DEFAULT 'cho_duyet',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_nscc_user (idUser),
  CONSTRAINT fk_nscc_user FOREIGN KEY (idUser) REFERENCES user (idUser) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Gợi ý danh mục kỹ năng ban đầu (bỏ qua nếu đã có)
INSERT IGNORE INTO ky_nang (tenKyNang, nhomNganh) VALUES
('Node.js', 'Lập trình'),
('MySQL', 'Cơ sở dữ liệu'),
('Figma', 'Thiết kế'),
('HTML/CSS', 'Lập trình'),
('Python', 'Lập trình'),
('UI/UX', 'Thiết kế');
