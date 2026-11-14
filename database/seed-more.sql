-- ============================================================
-- Dữ liệu mẫu BỔ SUNG (thêm vào CSDL hiện có, không xóa gì)
-- Mật khẩu tất cả tài khoản mới: 123456
-- Dùng INSERT IGNORE nên chạy lại nhiều lần cũng không trùng.
-- ============================================================
USE csdl2;

-- 1. Tài khoản mới (idUser từ 101)
INSERT IGNORE INTO user (idUser, userName, email, pWD, trangThai) VALUES
(101, 'nguyenvanan',  'an.nguyen@gmail.com',   '123456', 'Active'),
(102, 'tranthibich',  'bich.tran@gmail.com',   '123456', 'Active'),
(103, 'levancuong',   'cuong.le@gmail.com',    '123456', 'Active'),
(104, 'phamthidung',  'dung.pham@gmail.com',   '123456', 'Active'),
(105, 'hoangminhduc', 'duc.hoang@gmail.com',   '123456', 'Active'),
(106, 'vothihong',    'hong.vo@gmail.com',     '123456', 'Active');

-- 2. Hồ sơ
INSERT IGNORE INTO hoso (idHoSo, idUser, HovaTen, SDT, avatar, tieuSu) VALUES
(101, 101, 'Nguyễn Văn An',  '0901000001', NULL, 'Sinh viên CNTT, đam mê lập trình web'),
(102, 102, 'Trần Thị Bích',  '0901000002', NULL, 'UI/UX Designer'),
(103, 103, 'Lê Văn Cường',   '0901000003', NULL, 'Backend Developer'),
(104, 104, 'Phạm Thị Dung',  '0901000004', NULL, 'QA / Tester'),
(105, 105, 'Hoàng Minh Đức', '0901000005', NULL, 'Data Analyst'),
(106, 106, 'Võ Thị Hồng',     '0901000006', NULL, 'Project Manager');

-- 3. Kỹ năng chuyên môn (bảng chuyenmon)
INSERT IGNORE INTO chuyenmon (idChuyenMon, idHoSo, tenKyNang, trinhDo, soNamKinhNghiem) VALUES
(100, 101, 'JavaScript', 'Intermediate', 2),
(101, 101, 'HTML/CSS',   'Expert',       3),
(102, 102, 'Figma',      'Expert',       3),
(103, 103, 'Node.js',    'Intermediate', 2),
(104, 103, 'MySQL',      'Beginner',     1),
(105, 104, 'Selenium',   'Intermediate', 2),
(106, 105, 'Python',     'Expert',       4),
(107, 106, 'Jira',       'Expert',       5);

-- 4. Danh mục kỹ năng bổ sung (bảng ky_nang)
INSERT IGNORE INTO ky_nang (idKyNang, tenKyNang, nhomNganh) VALUES
(100, 'JavaScript', 'Lập trình'),
(101, 'React',      'Lập trình'),
(102, 'Selenium',   'Kiểm thử'),
(103, 'Jira',       'Quản lý dự án');

-- 5. Năng lực cá nhân (bảng nhan_su_ky_nang)
INSERT IGNORE INTO nhan_su_ky_nang (id, idUser, idKyNang, capDo, soNamKinhNghiem) VALUES
(100, 101, 100, 3, 2.0),
(101, 102,   3, 4, 3.0),
(102, 103,   1, 3, 2.0),
(103, 105,   5, 4, 4.0),
(104, 106, 103, 4, 5.0);

-- 6. Kết nối (kết bạn) giữa các tài khoản
INSERT IGNORE INTO ketnoi (idUserGui, idUserNhan, trangThai) VALUES
(101, 102, 'Accepted'),
(101, 103, 'Accepted'),
(102, 104, 'Accepted'),
(103, 105, 'Accepted'),
(106, 101, 'Accepted');

-- 7. Dự án mẫu mới
INSERT IGNORE INTO duan (idDuAn, idUserTao, tenDuAn, moTa, ngayBD, ngayKT, trangThai) VALUES
(100, 106, 'Ứng dụng di động đặt đồ ăn', 'Xây dựng app đặt đồ ăn cho sinh viên', '2026-11-01', '2027-02-28', 'in_progress');

INSERT IGNORE INTO thanhvienduan (idDuAn, idUser, vaiTro) VALUES
(100, 106, 'quan_ly'),
(100, 101, 'nhan_vien'),
(100, 102, 'nhan_vien'),
(100, 103, 'nhan_vien');

-- 8. Công việc + phân công
INSERT IGNORE INTO task (idTask, idDuAn, tenTask, moTa, deadLine, trangThai) VALUES
(100, 100, 'Thiết kế giao diện mobile', 'Thiết kế màn hình chính và luồng đặt món', '2026-11-30 00:00:00', 'Doing'),
(101, 100, 'Xây dựng API backend', 'Thiết kế REST API cho app', '2026-12-15 00:00:00', 'Todo');

INSERT IGNORE INTO phancong (idTask, idUser) VALUES
(100, 102),
(101, 103);

-- 9. Tin tuyển dụng + ứng tuyển
INSERT IGNORE INTO tintuyendung (idTinTuyen, idUser, idDuAn, tieuDe, yeuCau, hanNop, trangThai) VALUES
(100, 106, 100, 'Tuyển lập trình viên React Native', 'Biết React Native, có kinh nghiệm mobile', '2026-12-31', 'not_started');

INSERT IGNORE INTO ungtuyen (idUngTuyen, idTinTuyen, idUser, loiNhan, trangThai) VALUES
(100, 100, 101, 'Em có kinh nghiệm React, muốn thử sức mảng mobile ạ', 'Pending');

-- 10. Bài viết + tương tác
INSERT IGNORE INTO post (idPost, idUser, noiDung) VALUES
(100, 106, 'Nhóm mình đang tuyển thêm 1 bạn React Native, ai quan tâm thì ứng tuyển nhé!'),
(101, 101, 'Vừa hoàn thành xong module đăng nhập bằng session, mọi người test thử nhé.');

INSERT IGNORE INTO comment (idComment, idPost, idUser, noiDung) VALUES
(100, 100, 102, 'Để em giới thiệu cho bạn cùng lớp nha!'),
(101, 101, 103, 'Chạy ổn rồi, chúc mừng nha!');

INSERT IGNORE INTO likepost (idLike, idPost, idUser) VALUES
(100, 100, 101),
(101, 100, 102),
(102, 101, 106);

INSERT IGNORE INTO bookmarks (user_id, post_id) VALUES
(103, 100),
(104, 101);
