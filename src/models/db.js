import mysql from 'mysql2';

// Tự động nạp file .env nếu có (Node.js 20.12+)
try {
  process.loadEnvFile?.();
} catch {}

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '1234',
  database: process.env.DB_NAME || 'csdl2',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});

// Kiểm tra kết nối ban đầu
pool.getConnection((err, conn) => {
  if (err) {
    console.warn('⚠️ Cảnh báo kết nối MySQL:', err.message);
    console.warn('   Hãy đảm bảo MySQL đang chạy và kiểm tra lại thông tin cấu hình trong .env');
    return;
  }
  console.log('✅ Đã kết nối MySQL qua Connection Pool thành công.');

  conn.release();
});

export default pool.promise();
