-- ============================================================
-- SQL Mô hình DATABASE cho đồ án Niên luận
-- Web Quản lý Dự án & Mạng xã hội Việc làm
-- (Dùng với: MySQL/MariaDB)
-- ============================================================

-- 0. Xóa dữ liệu cũ (nếu có) trước khi tạo mới
DROP DATABASE IF EXISTS csdl2;
CREATE DATABASE IF NOT EXISTS csdl2 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE csdl2;

-- 1. NGƯỜI DÙNG
CREATE TABLE user (
  idUser INT AUTO_INCREMENT PRIMARY KEY,
  userName VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  pWD VARCHAR(255) NOT NULL,
  trangThai ENUM('Active','Banned') DEFAULT 'Active',
  QuyenCSDL CHAR(9) NOT NULL DEFAULT 'r--rwxrwx',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_email (email),
  UNIQUE KEY uq_user_username (userName)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. HỒ SƠ NGƯỜI DÙNG
CREATE TABLE hoso (
  idHoSo INT AUTO_INCREMENT PRIMARY KEY,
  idUser INT NOT NULL,
  HovaTen VARCHAR(255) NOT NULL,
  avatar VARCHAR(500) DEFAULT NULL,
  anhBia VARCHAR(500) DEFAULT NULL,
  tieuSu TEXT,
  SDT VARCHAR(20) NOT NULL DEFAULT '',
  UNIQUE KEY uq_hoso_user (idUser),
  CONSTRAINT fk_hoso_user FOREIGN KEY (idUser) REFERENCES user (idUser) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. KỸ NĂNG / CHUYÊN MÔN
CREATE TABLE chuyenmon (
  idChuyenMon INT AUTO_INCREMENT PRIMARY KEY,
  idHoSo INT NOT NULL,
  tenKyNang VARCHAR(100) NOT NULL,
  trinhDo ENUM('Beginner','Intermediate','Expert','Master') DEFAULT 'Beginner',
  soNamKinhNghiem INT DEFAULT 0,
  KEY idx_chuyenmon_hoso (idHoSo),
  CONSTRAINT fk_chuyenmon_hoso FOREIGN KEY (idHoSo) REFERENCES hoso (idHoSo) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. DỰ ÁN
CREATE TABLE duan (
  idDuAn INT AUTO_INCREMENT PRIMARY KEY,
  idUserTao INT NOT NULL,
  tenDuAn VARCHAR(255) NOT NULL,
  moTa TEXT,
  ngayBD DATE DEFAULT NULL,
  ngayKT DATE DEFAULT NULL,
  trangThai ENUM('not_started','in_progress','completed') DEFAULT 'not_started',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_duan_nguoitao (idUserTao),
  CONSTRAINT fk_duan_user FOREIGN KEY (idUserTao) REFERENCES user (idUser) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. THÀNH VIÊN DỰ ÁN
CREATE TABLE thanhvienduan (
  idDuAn INT NOT NULL,
  idUser INT NOT NULL,
  vaiTro VARCHAR(50) NOT NULL,
  PRIMARY KEY (idDuAn, idUser),
  KEY idx_tvd_user (idUser),
  CONSTRAINT fk_tvd_duan FOREIGN KEY (idDuAn) REFERENCES duan (idDuAn) ON DELETE CASCADE,
  CONSTRAINT fk_tvd_user FOREIGN KEY (idUser) REFERENCES user (idUser) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. ĐÁNH GIÁ THÀNH VIÊN (khi dự án hoàn thành)
CREATE TABLE danhgia_thanhvien (
  idDuAn INT NOT NULL,
  idNguoiDanhGia INT NOT NULL,
  idUserDuocDanhGia INT NOT NULL,
  diem INT NOT NULL,
  nhanXet TEXT,
  PRIMARY KEY (idDuAn, idNguoiDanhGia, idUserDuocDanhGia),
  CONSTRAINT fk_dg_duan FOREIGN KEY (idDuAn) REFERENCES duan (idDuAn) ON DELETE CASCADE,
  CONSTRAINT fk_dg_nguoidanhgia FOREIGN KEY (idNguoiDanhGia) REFERENCES user (idUser) ON DELETE CASCADE,
  CONSTRAINT fk_dg_nguoiduocdanhgia FOREIGN KEY (idUserDuocDanhGia) REFERENCES user (idUser) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. CÔNG VIỆC (TASK)
CREATE TABLE task (
  idTask INT AUTO_INCREMENT PRIMARY KEY,
  idDuAn INT NOT NULL,
  tenTask VARCHAR(255) NOT NULL,
  moTa TEXT,
  deadLine DATETIME DEFAULT NULL,
  trangThai ENUM('Todo','Doing','Done') DEFAULT 'Todo',
  uuTien ENUM('Gap','Cao','Thap') DEFAULT 'Thap',
  KEY idx_task_duan (idDuAn),
  CONSTRAINT fk_task_duan FOREIGN KEY (idDuAn) REFERENCES duan (idDuAn) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. PHÂN CÔNG CÔNG VIỆC
CREATE TABLE phancong (
  idTask INT NOT NULL,
  idUser INT NOT NULL,
  PRIMARY KEY (idTask, idUser),
  KEY idx_pc_user (idUser),
  CONSTRAINT fk_pc_task FOREIGN KEY (idTask) REFERENCES task (idTask) ON DELETE CASCADE,
  CONSTRAINT fk_pc_user FOREIGN KEY (idUser) REFERENCES user (idUser) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. BÌNH LUẬN CÔNG VIỆC
CREATE TABLE taskcomment (
  idTaskComment INT AUTO_INCREMENT PRIMARY KEY,
  idTask INT NOT NULL,
  idUser INT NOT NULL,
  noiDung TEXT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_tc_task (idTask),
  KEY idx_tc_user (idUser),
  CONSTRAINT fk_tc_task FOREIGN KEY (idTask) REFERENCES task (idTask) ON DELETE CASCADE,
  CONSTRAINT fk_tc_user FOREIGN KEY (idUser) REFERENCES user (idUser) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. TIN TUYỂN DỤNG
CREATE TABLE tintuyendung (
  idTinTuyen INT AUTO_INCREMENT PRIMARY KEY,
  idUser INT NOT NULL,
  idDuAn INT NOT NULL,
  tieuDe VARCHAR(255) NOT NULL,
  yeuCau TEXT NOT NULL,
  hanNop DATE DEFAULT NULL,
  trangThai ENUM('not_started','in_progress','completed') DEFAULT 'not_started',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ttd_user (idUser),
  KEY idx_ttd_duan (idDuAn),
  CONSTRAINT fk_ttd_user FOREIGN KEY (idUser) REFERENCES user (idUser) ON DELETE CASCADE,
  CONSTRAINT fk_ttd_duan FOREIGN KEY (idDuAn) REFERENCES duan (idDuAn) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. ỨNG TUYỂN
CREATE TABLE ungtuyen (
  idUngTuyen INT AUTO_INCREMENT PRIMARY KEY,
  idTinTuyen INT NOT NULL,
  idUser INT NOT NULL,
  loiNhan TEXT,
  trangThai ENUM('Pending','Accepted','Rejected') DEFAULT 'Pending',
  NgayNop DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ut_tintuyen (idTinTuyen),
  KEY idx_ut_user (idUser),
  CONSTRAINT fk_ut_tintuyen FOREIGN KEY (idTinTuyen) REFERENCES tintuyendung (idTinTuyen) ON DELETE CASCADE,
  CONSTRAINT fk_ut_user FOREIGN KEY (idUser) REFERENCES user (idUser) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. CUỘC TRÒ CHUYỆN (1-1 hoặc nhóm)
CREATE TABLE chatbox (
  idChatBox INT AUTO_INCREMENT PRIMARY KEY,
  tenChatBox VARCHAR(255) NOT NULL,
  loai ENUM('Private','Group') NOT NULL,
  UNIQUE KEY uq_chatbox_ten (tenChatBox)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. THÀNH VIÊN TRONG CUỘC TRÒ CHUYỆN
CREATE TABLE grchat (
  idGr INT AUTO_INCREMENT PRIMARY KEY,
  idUser INT NOT NULL,
  idChatBox INT NOT NULL,
  KEY idx_grchat_user (idUser),
  KEY idx_grchat_chatbox (idChatBox),
  CONSTRAINT fk_grchat_user FOREIGN KEY (idUser) REFERENCES user (idUser) ON DELETE CASCADE,
  CONSTRAINT fk_grchat_chatbox FOREIGN KEY (idChatBox) REFERENCES chatbox (idChatBox) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. TIN NHẮN
CREATE TABLE message (
  idMessage INT AUTO_INCREMENT PRIMARY KEY,
  idChatBox INT NOT NULL,
  idUser INT NOT NULL,
  noiDung TEXT NOT NULL,
  thoiGian DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_msg_chatbox (idChatBox),
  KEY idx_msg_user (idUser),
  CONSTRAINT fk_msg_chatbox FOREIGN KEY (idChatBox) REFERENCES chatbox (idChatBox) ON DELETE CASCADE,
  CONSTRAINT fk_msg_user FOREIGN KEY (idUser) REFERENCES user (idUser) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. BÀI VIẾT
CREATE TABLE post (
  idPost INT AUTO_INCREMENT PRIMARY KEY,
  idUser INT NOT NULL,
  noiDung TEXT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_post_user (idUser),
  CONSTRAINT fk_post_user FOREIGN KEY (idUser) REFERENCES user (idUser) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. BÌNH LUẬN BÀI VIẾT
CREATE TABLE comment (
  idComment INT AUTO_INCREMENT PRIMARY KEY,
  idPost INT NOT NULL,
  idUser INT NOT NULL,
  idParentComment INT DEFAULT NULL,
  noiDung TEXT NOT NULL,
  hinhAnhUrl VARCHAR(500) DEFAULT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_cmt_post (idPost),
  KEY idx_cmt_user (idUser),
  KEY idx_cmt_parent (idParentComment),
  CONSTRAINT fk_cmt_post FOREIGN KEY (idPost) REFERENCES post (idPost) ON DELETE CASCADE,
  CONSTRAINT fk_cmt_user FOREIGN KEY (idUser) REFERENCES user (idUser) ON DELETE CASCADE,
  CONSTRAINT fk_cmt_parent FOREIGN KEY (idParentComment) REFERENCES comment (idComment) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. LƯỢT THÍCH BÀI VIẾT
CREATE TABLE `Likepost` (
  idLike INT AUTO_INCREMENT PRIMARY KEY,
  idPost INT NOT NULL,
  idUser INT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_like_post (idPost),
  KEY idx_like_user (idUser),
  CONSTRAINT fk_like_post FOREIGN KEY (idPost) REFERENCES post (idPost) ON DELETE CASCADE,
  CONSTRAINT fk_like_user FOREIGN KEY (idUser) REFERENCES user (idUser) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. LƯU BÀI VIẾT (BOOKMARK)
CREATE TABLE bookmarks (
  user_id INT NOT NULL,
  post_id INT NOT NULL,
  bookmarked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, post_id),
  CONSTRAINT fk_bm_user FOREIGN KEY (user_id) REFERENCES user (idUser) ON DELETE CASCADE,
  CONSTRAINT fk_bm_post FOREIGN KEY (post_id) REFERENCES post (idPost) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. ẢNH ĐÍNH KÈM BÀI VIẾT / BÌNH LUẬN
CREATE TABLE image (
  image_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  post_id INT NOT NULL,
  hinhAnhUrl VARCHAR(500) NOT NULL,
  forWhat INT DEFAULT 0,
  KEY idx_img_user (user_id),
  KEY idx_img_post (post_id),
  CONSTRAINT fk_img_user FOREIGN KEY (user_id) REFERENCES user (idUser) ON DELETE CASCADE,
  CONSTRAINT fk_img_post FOREIGN KEY (post_id) REFERENCES post (idPost) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 20. KẾT NỐI (KẾT BẠN)
CREATE TABLE ketnoi (
  idUserGui INT NOT NULL,
  idUserNhan INT NOT NULL,
  trangThai ENUM('Pending','Accepted','Blocked') DEFAULT 'Pending',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (idUserGui, idUserNhan),
  KEY idx_kn_nhan (idUserNhan),
  CONSTRAINT fk_kn_gui FOREIGN KEY (idUserGui) REFERENCES user (idUser) ON DELETE CASCADE,
  CONSTRAINT fk_kn_nhan FOREIGN KEY (idUserNhan) REFERENCES user (idUser) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 21. VĂN KIỆN GOOGLE DRIVE CỦA DỰ ÁN
CREATE TABLE van_kien (
  van_kien_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  idDuAn INT NOT NULL,
  so_ky_hieu VARCHAR(100) DEFAULT NULL,
  tieu_de VARCHAR(255) NOT NULL,
  drive_url VARCHAR(500) NOT NULL,
  loai_tai_lieu VARCHAR(50) DEFAULT NULL,
  ghi_chu TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_vk_user (user_id),
  KEY idx_vk_duan (idDuAn),
  CONSTRAINT fk_vk_user FOREIGN KEY (user_id) REFERENCES user (idUser) ON DELETE CASCADE,
  CONSTRAINT fk_vk_duan FOREIGN KEY (idDuAn) REFERENCES duan (idDuAn) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 22. FILE TÀI LIỆU CỦA DỰ ÁN (di sản)
CREATE TABLE file (
  idFile INT AUTO_INCREMENT PRIMARY KEY,
  idDuAn INT NOT NULL,
  tenFile VARCHAR(255) NOT NULL,
  urlTruyCap VARCHAR(500) NOT NULL,
  loaiFile VARCHAR(50) DEFAULT NULL,
  KEY idx_file_duan (idDuAn),
  CONSTRAINT fk_file_duan FOREIGN KEY (idDuAn) REFERENCES duan (idDuAn) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 23. THÔNG BÁO
CREATE TABLE thongbao (
  idThongBao INT AUTO_INCREMENT PRIMARY KEY,
  noiDung TEXT NOT NULL,
  urlDich VARCHAR(500) DEFAULT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 24. NGƯỜI NHẬN THÔNG BÁO
CREATE TABLE nguoinhanthongbao (
  idThongBao INT NOT NULL,
  idUser INT NOT NULL,
  daDoc TINYINT(1) DEFAULT 0,
  PRIMARY KEY (idThongBao, idUser),
  KEY idx_nntb_user (idUser),
  CONSTRAINT fk_nntb_thongbao FOREIGN KEY (idThongBao) REFERENCES thongbao (idThongBao) ON DELETE CASCADE,
  CONSTRAINT fk_nntb_user FOREIGN KEY (idUser) REFERENCES user (idUser) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 25. NHẬT KÝ HOẠT ĐỘNG
CREATE TABLE log (
  idLog INT AUTO_INCREMENT PRIMARY KEY,
  idUser INT NOT NULL,
  idDuAn INT DEFAULT NULL,
  hanhDong VARCHAR(255) NOT NULL,
  thoiGian DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_log_user (idUser),
  CONSTRAINT fk_log_user FOREIGN KEY (idUser) REFERENCES user (idUser) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 29. HỌC VẤN CỦA NGƯỜI DÙNG (CV)
CREATE TABLE hoc_van (
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

-- 30. KINH NGHIỆM LÀM VIỆC CỦA NGƯỜI DÙNG (CV)
CREATE TABLE kinh_nghiem (
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

-- 31. TỆP ĐÍNH KÈM CÔNG VIỆC (TASK)
CREATE TABLE task_file (
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

-- 32. LƯU TIN TUYỂN DỤNG
CREATE TABLE luu_tin (
  idUser INT NOT NULL,
  idTinTuyen INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (idUser, idTinTuyen),
  KEY idx_lt_tin (idTinTuyen),
  CONSTRAINT fk_lt_user FOREIGN KEY (idUser) REFERENCES user (idUser) ON DELETE CASCADE,
  CONSTRAINT fk_lt_tin FOREIGN KEY (idTinTuyen) REFERENCES tintuyendung (idTinTuyen) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 26. DANH MỤC KỸ NĂNG (gợi ý cho form kê khai năng lực)
CREATE TABLE ky_nang (
  idKyNang INT AUTO_INCREMENT PRIMARY KEY,
  tenKyNang VARCHAR(100) NOT NULL,
  nhomNganh VARCHAR(100) DEFAULT NULL,
  UNIQUE KEY uq_ky_nang_ten (tenKyNang)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 27. KỸ NĂNG CỦA NGƯỜI DÙNG (năng lực cá nhân)
CREATE TABLE nhan_su_ky_nang (
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

-- 28. CHỨNG CHỈ / BẰNG CẤP CỦA NGƯỜI DÙNG
CREATE TABLE nhan_su_chung_chi (
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
