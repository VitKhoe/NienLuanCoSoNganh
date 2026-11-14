-- Bổ sung Nhóm 3: bảng lưu tin tuyển dụng
-- Chạy: Get-Content -Raw -Encoding UTF8 database/add-group3.sql | mysql -u root -p1234 csdl2
USE csdl2;

CREATE TABLE IF NOT EXISTS luu_tin (
  idUser INT NOT NULL,
  idTinTuyen INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (idUser, idTinTuyen),
  KEY idx_lt_tin (idTinTuyen),
  CONSTRAINT fk_lt_user FOREIGN KEY (idUser) REFERENCES user (idUser) ON DELETE CASCADE,
  CONSTRAINT fk_lt_tin FOREIGN KEY (idTinTuyen) REFERENCES tintuyendung (idTinTuyen) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
