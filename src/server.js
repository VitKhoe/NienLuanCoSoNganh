import createServer from './routes/index.js';

// Tự động tải biến môi trường từ file .env nếu có
try {
  process.loadEnvFile?.();
} catch {}

const port = Number(process.env.PORT) || 8088;

createServer().listen(port, () => {
  console.log('==================================================');
  console.log(`Server đang chạy tại: http://localhost:${port}`);
  console.log('==================================================');
});
