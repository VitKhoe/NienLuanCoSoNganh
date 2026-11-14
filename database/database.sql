-- ============================================
-- SQL Mô hình DATABASE cho đồ án Niên luận
-- Web Quản lý Dự án & Mạng xã hội Việc làm
-- (Dùng với: MySQL/MariaDB)
-- ============================================

-- 0. Xóa dữ liệu cũ (nếu có) trước khi tạo mới
DROP DATABASE IF EXISTS csdl2;
CREATE DATABASE IF NOT EXISTS csdl2 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE csdl2;

-- 1. BẢNG USER (NGƯỜI DÙNG)
-- idUser: Mã định danh của người dùng
-- userName: Tên đăng nhập
-- email: Email đăng nhập, liên hệ
-- pWD: Mật khẩu đã băm (scrypt)
CREATE TABLE user (
  idUser INT AUTO_INCREMENT PRIMARY KEY,
  userName VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  pWD VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. HỒ SƠ CỦA NGƯỜI DÙNG
-- idHoSo: Mã định danh hồ sơ
-- idUser: Liên kết với bảng user
-- HovaTen: Tên hiển thị
-- SDT: Số điện thoại
-- avatar: Đường dẫn ảnh đại diện (trong uploads)
-- tieuSu: Tiểu sử / kỹ năng của người dùng
CREATE TABLE hoso (
  idHoSo INT AUTO_INCREMENT PRIMARY KEY,
  idUser INT NOT NULL,
  HovaTen VARCHAR(255) DEFAULT NULL,
  SDT VARCHAR(30) DEFAULT NULL,
  avatar VARCHAR(500) DEFAULT NULL,
  tieuSu TEXT,
  CONSTRAINT fk_hoso_user FOREIGN KEY (idUser) REFERENCES user(idUser) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. KỸ NĂNG / CHUYÊN MÔN
-- idChuyenMon: Mã định danh kỹ năng
-- idHoSo: Liên kết với bảng hồ sơ
-- tenKyNang: Tên kỹ năng
-- trinhDo: Trình độ: Beginner, Intermediate, Expert, Master
-- soNamKinhNghiem: Số năm kinh nghiệm tham khảo
CREATE TABLE chuyenmon (
  idChuyenMon INT AUTO_INCREMENT PRIMARY KEY,
  idHoSo INT NOT NULL,
  tenKyNang VARCHAR(100) NOT NULL,
  trinhDo VARCHAR(20) NOT NULL,
  soNamKinhNghiem INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_chuyenmon_hoso FOREIGN KEY (idHoSo) REFERENCES hoso(idHoSo) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
