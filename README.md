# NienLuanCoSoNganh

Ứng dụng web mạng xã hội, kết nối dự án và tìm việc làm.

## Chạy ứng dụng

1. Cài dependencies bằng `npm install`.
2. Tạo database MySQL từ `database/csdl2.sql`, sau đó cấu hình kết nối trong `src/models/db.js`.
3. Chạy `npm run dev` để khởi động máy chủ tại `http://localhost:8088`, hoặc `npm start`.

## Cấu trúc dự án

```text
database/         Lược đồ và dữ liệu SQL
public/           CSS và JavaScript phía trình duyệt
src/
  controllers/    Xử lý yêu cầu và nghiệp vụ
  models/         Kết nối dữ liệu
  routes/         Khai báo API và phục vụ trang
  utils/          Hàm dùng chung, session và kiểm tra dữ liệu
  server.js       Điểm khởi chạy máy chủ
views/            Các trang HTML
```
