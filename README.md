# Web Quản Lý Dự Án & Mạng Xã Hội Việc Làm (Nhóm 5)

> Đồ án học phần: Quản lý dự án + Việc làm + Mạng xã hội việc làm
> Công nghệ: Node.js + HTML + CSS + JavaScript + MySQL (mysql2)
> Ngắn gọn, dễ hiểu, dễ chạy

## 1. Giới thiệu

Website phục vụ 3 vai trò chính:

1. **Quản lý dự án**: thực hiện dữ liệu, đăng bài, quản lý project.
2. **Việc làm**: đăng tin tuyển dụng, ứng tuyển, tra cứu người liên hệ.
3. **Mạng xã hội việc làm**: giao lưu, chia sẻ bài viết, kết nối thông tin giữa người dùng.

## 2. Yêu cầu

- Node.js >= 18.
- MySQL/MariaDB, cấu hình qua file `.env`.
- HTML, CSS, JavaScript thuần. Không dùng framework PHP/React/Vue/Svelte.
- Thư mục `uploads/` dùng để lưu ảnh tải lên.

## 3. Cài đặt

### 0. Chuẩn bị

- MySQL/MariaDB: MySQL Workbench, phpMyAdmin, hoặc dòng lệnh.
- Node.js: [nodejs.org](https://nodejs.org).

### 1. Sao chép cấu hình

```bash
cp .env.example .env
```

Cấu hình mặc định:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=1234
DB_NAME=csdl2
PORT=8088
```

### 2. Tạo database

```bash
mysql -u root -p < database/schema.sql
```

Nếu gặp lỗi font, thử:

```bash
mysql -u root -p --default-character-set=utf8mb4 csdl2 < database/schema.sql
```

Sau đó nạp dữ liệu mẫu:

```bash
npm run init-db
```

### 3. Chạy

```bash
npm install
npm start
# hoặc
npm run dev
```

Trang web: `http://localhost:8088`.

## 4. Các trang

### Trang chính

- `/` - Trang chủ: điểm nhanh, số liệu, project chính, tuyển dụng, blog, bài viết.
- `/account.html` - Hồ sơ, kỹ năng, profile.
- `/friends.html` - Kết nối, nhắn tin, danh sách bạn bè.
- `/duan.html` - Dự án, tiến độ.
- `/pj_detail.html` - Chi tiết project: thành viên, tiến độ, tuyển dụng, thông tin.
- `/chat.html` - Nhắn tin, trò chuyện.
- `/login_signup.html` - Đăng nhập, đăng ký.

### Quyền truy cập

- Chưa đăng nhập: không thể truy cập các trang chính.
- Đã đăng nhập: thông tin theo `idUser` của người dùng.

## 5. Lưu ý

- Thông tin người dùng chỉ được chỉnh sửa, không xóa.
- Dữ liệu demo để minh họa, dễ hiểu.
- Tránh lộ thông tin cá nhân của người dùng.
- Cần cấu hình đúng để chạy ổn định.
