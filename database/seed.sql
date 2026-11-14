-- ============================================================
-- Dữ liệu seed mẫu cho DATABASE (MySQL)
-- Dùng khi chưa có dữ liệu thực hoặc muốn demo nhanh.
-- Lưu ý: mật khẩu mẫu "demo-password-scrypt" là chuỗi chưa băm,
-- đăng nhập bằng đúng chuỗi này (hệ thống tự so khớp).
-- ============================================================

-- 1. Người dùng
INSERT INTO user (idUser, userName, email, pWD) VALUES
(1, 'admin', 'admin@demo.com', 'demo-password-scrypt'),
(2, 'nghiem', 'nghiem@demo.com', 'demo-password-scrypt'),
(3, 'huyen', 'huyen@demo.com', 'demo-password-scrypt');

-- 2. Hồ sơ
INSERT INTO hoso (idHoSo, idUser, HovaTen, SDT, avatar, tieuSu) VALUES
(1, 1, 'Quản trị viên', '0901234567', NULL, 'Admin hệ thống'),
(2, 2, 'Nghiêm', '0912345678', NULL, 'Phân tích nghiệp vụ, hỗ trợ phát triển dự án'),
(3, 3, 'Huyền', '0987654321', NULL, 'UI/UX Designer với 3 năm kinh nghiệm');

-- 3. Kỹ năng chuyên môn
INSERT INTO chuyenmon (idChuyenMon, idHoSo, tenKyNang, trinhDo, soNamKinhNghiem) VALUES
(1, 1, 'Node.js', 'Expert', 6),
(2, 1, 'MySQL', 'Intermediate', 4),
(3, 2, 'Phân tích nghiệp vụ', 'Expert', 4),
(4, 3, 'Figma', 'Master', 4);

-- 4. Dự án
INSERT INTO duan (idDuAn, idUserTao, tenDuAn, moTa, ngayBD, ngayKT, trangThai) VALUES
(1, 1, 'Web quản lý dự án trung tâm', 'Xây dựng trang web quản lý dự án cho trường đại học', '2026-10-01', '2026-12-31', 'in_progress');

-- 5. Thành viên dự án
INSERT INTO thanhvienduan (idDuAn, idUser, vaiTro) VALUES
(1, 1, 'quan_ly'),
(1, 2, 'nhan_vien'),
(1, 3, 'nhan_vien');

-- 6. Công việc
INSERT INTO task (idTask, idDuAn, tenTask, moTa, deadLine, trangThai) VALUES
(1, 1, 'Thiết kế giao diện', 'Thiết kế giao diện trang chủ', '2026-11-01 00:00:00', 'Done'),
(2, 1, 'Xây dựng API', 'Xây dựng API Node.js và MySQL', '2026-11-20 00:00:00', 'Doing');

-- 7. Phân công công việc
INSERT INTO phancong (idTask, idUser) VALUES
(1, 3),
(2, 1);

-- 8. Tin tuyển dụng
INSERT INTO tintuyendung (idTinTuyen, idUser, idDuAn, tieuDe, yeuCau, hanNop, trangThai) VALUES
(1, 1, 1, 'Tuyển Frontend Developer', 'Yêu cầu biết HTML, CSS, JavaScript', '2026-12-01', 'not_started');

-- 9. Ứng tuyển
INSERT INTO ungtuyen (idUngTuyen, idTinTuyen, idUser, loiNhan, trangThai) VALUES
(1, 1, 3, 'Em muốn ứng tuyển vị trí này ạ', 'Pending');

-- 10. Cuộc trò chuyện nhóm
INSERT INTO chatbox (idChatBox, tenChatBox, loai) VALUES
(1, 'Team Code MXH Dạo', 'Group');

INSERT INTO grchat (idGr, idChatBox, idUser) VALUES
(1, 1, 1),
(2, 1, 3);

INSERT INTO message (idMessage, idChatBox, idUser, noiDung) VALUES
(1, 1, 3, 'Đã nhận ạ.');

-- 11. Bài viết, bình luận, like, bookmark
INSERT INTO post (idPost, idUser, noiDung) VALUES
(1, 1, 'Chào mừng mọi người đến với dự án!');

INSERT INTO comment (idComment, idPost, idUser, noiDung) VALUES
(1, 1, 2, 'Chúc dự án thành công!');

INSERT INTO `Likepost` (idLike, idPost, idUser) VALUES
(1, 1, 3);

INSERT INTO bookmarks (user_id, post_id) VALUES
(2, 1);

-- 12. Kết nối (kết bạn)
INSERT INTO ketnoi (idUserGui, idUserNhan, trangThai) VALUES
(1, 2, 'Accepted');

-- 13. Danh mục kỹ năng (gợi ý)
INSERT INTO ky_nang (tenKyNang, nhomNganh) VALUES
('Node.js', 'Lập trình'),
('MySQL', 'Cơ sở dữ liệu'),
('Figma', 'Thiết kế'),
('HTML/CSS', 'Lập trình'),
('Python', 'Lập trình'),
('UI/UX', 'Thiết kế');
