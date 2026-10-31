import createServer from './routes/index.js';

const port = 8088;

createServer().listen(port, () => {
  console.log(`Server chạy tại http://localhost:${port}`);
});
