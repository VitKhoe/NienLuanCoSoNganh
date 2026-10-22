const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '1234',
  database: process.env.DB_NAME || 'csdl2'
});

connection.connect((err) => {
  if (err) {
    console.log('Lỗi kết nối SQL:', err.message);
    return;
  }
  console.log('Đã kết nối SQL');
});

// Dùng dạng promise để viết async/await cho gọn
module.exports = connection.promise();
