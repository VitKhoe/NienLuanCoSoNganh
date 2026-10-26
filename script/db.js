import mysql from 'mysql2';

const connection = mysql.createConnection({
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '1234',
  database: 'csdl2'
});

connection.connect((err) => {
  if (err) {
    console.log('Lỗi kết nối SQL:', err.message);
    return;
  }
  console.log('Đã kết nối SQL');
});

// Dùng dạng promise để viết async/await cho gọn
export default connection.promise();