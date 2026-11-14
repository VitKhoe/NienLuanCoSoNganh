-- Bổ sung cho Nhóm 1: ảnh bìa + học vấn + kinh nghiệm làm việc (CV)
-- Chạy: Get-Content -Raw -Encoding UTF8 database/add-group1.sql | mysql -u root -p1234 csdl2
USE csdl2;

ALTER TABLE hoso ADD COLUMN anhBia VARCHAR(500) DEFAULT NULL AFTER avatar;

CREATE TABLE IF NOT EXISTS hoc_van (
  idHocVan INT AUTO_INCREMENT PRIMARY KEY,
  idUser INT NOT NULL,
  truongHoc VARCHAR(255) NOT NULL,
  chuyenNganh VARCHAR(255) DEFAULT NULL,
  bangCap VARCHAR(100) DEFAULT NULL,
  namBatDau INT DEFAULT NULL,
  namKetThuc INT DEFAULT NULL,
  moTa TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_hv_user (idUser),
  CONSTRAINT fk_hv_user FOREIGN KEY (idUser) REFERENCES user (idUser) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS kinh_nghiem (
  idKinhNghiem INT AUTO_INCREMENT PRIMARY KEY,
  idUser INT NOT NULL,
  tenCongTy VARCHAR(255) NOT NULL,
  viTri VARCHAR(255) DEFAULT NULL,
  moTa TEXT,
  ngayBatDau DATE DEFAULT NULL,
  ngayKetThuc DATE DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_kn_user (idUser),
  CONSTRAINT fk_kn_user FOREIGN KEY (idUser) REFERENCES user (idUser) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
