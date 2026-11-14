-- Bổ sung Nhóm 6: cột idDuAn cho nhật ký hoạt động
-- Chạy: Get-Content -Raw -Encoding UTF8 database/add-group6.sql | mysql -u root -p1234 csdl2
USE csdl2;

ALTER TABLE log ADD COLUMN idDuAn INT DEFAULT NULL AFTER idUser;
