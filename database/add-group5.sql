-- Bổ sung Nhóm 5: độ ưu tiên task + bảng tệp đính kèm task
-- Chạy: Get-Content -Raw -Encoding UTF8 database/add-group5.sql | mysql -u root -p1234 csdl2
USE csdl2;

ALTER TABLE task ADD COLUMN uuTien ENUM('Gap','Cao','Thap') DEFAULT 'Thap' AFTER trangThai;

CREATE TABLE IF NOT EXISTS task_file (
  idTaskFile INT AUTO_INCREMENT PRIMARY KEY,
  idTask INT NOT NULL,
  idUser INT NOT NULL,
  tenFile VARCHAR(255) NOT NULL,
  url VARCHAR(500) NOT NULL,
  loaiFile VARCHAR(100) DEFAULT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_tf_task (idTask),
  CONSTRAINT fk_tf_task FOREIGN KEY (idTask) REFERENCES task (idTask) ON DELETE CASCADE,
  CONSTRAINT fk_tf_user FOREIGN KEY (idUser) REFERENCES user (idUser) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
