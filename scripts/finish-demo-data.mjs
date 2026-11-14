#!/usr/bin/env node
// Hoàn thiện dữ liệu mẫu: đánh giá, tuyển dụng, bài viết, chat, chứng chỉ.
// (Chỉ bổ sung các phần chưa có, không tạo trùng user/dự án đã import.)
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '1234',
  database: process.env.DB_NAME || 'csdl2',
  charset: 'utf8mb4'
});

// Bảng đánh giá thành viên (code đang dùng nhưng CSDL thật còn thiếu)
await conn.query(`CREATE TABLE IF NOT EXISTS danhgia_thanhvien (
  idDuAn INT NOT NULL,
  idNguoiDanhGia INT NOT NULL,
  idUserDuocDanhGia INT NOT NULL,
  diem INT NOT NULL,
  nhanXet TEXT,
  PRIMARY KEY (idDuAn, idNguoiDanhGia, idUserDuocDanhGia),
  CONSTRAINT fk_dg_duan FOREIGN KEY (idDuAn) REFERENCES duan (idDuAn) ON DELETE CASCADE,
  CONSTRAINT fk_dg_nguoidanhgia FOREIGN KEY (idNguoiDanhGia) REFERENCES user (idUser) ON DELETE CASCADE,
  CONSTRAINT fk_dg_nguoiduocdanhgia FOREIGN KEY (idUserDuocDanhGia) REFERENCES user (idUser) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

// Nếu chứng chỉ đã có thì xem như đã hoàn tất
const [dc] = await conn.query('SELECT COUNT(*) c FROM nhan_su_chung_chi');
if (dc[0].c > 0) {
  console.log('Các phần còn lại đã được import, bỏ qua.');
  await conn.end();
  process.exit(0);
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(999);
const ri = (a, b) => a + Math.floor(rand() * (b - a + 1));
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const NOW = Date.now();
function dtime(maxDaysAgo, minDaysAgo = 0) {
  const ago = minDaysAgo + rand() * (maxDaysAgo - minDaysAgo);
  return new Date(NOW - ago * 86400000).toISOString().slice(0, 19).replace('T', ' ');
}
const ddate = (maxDaysAgo) => dtime(maxDaysAgo).slice(0, 10);

const [users] = await conn.query('SELECT idUser FROM user');
const allIds = users.map((r) => r.idUser);
const [projRows] = await conn.query('SELECT idDuAn, trangThai FROM duan');
const projectIds = projRows.map((r) => r.idDuAn);
const completedProjects = projRows.filter((r) => r.trangThai === 'completed').map((r) => r.idDuAn);

// Đánh giá thành viên cho dự án đã hoàn thành
for (const idDuAn of completedProjects) {
  const [members] = await conn.query('SELECT idUser FROM thanhvienduan WHERE idDuAn = ?', [idDuAn]);
  const ids = members.map((m) => m.idUser);
  for (let i = 0; i < ids.length; i++) {
    for (let j = 0; j < ids.length; j++) {
      if (i === j || rand() > 0.6) continue;
      await conn.query(
        'INSERT IGNORE INTO danhgia_thanhvien (idDuAn, idNguoiDanhGia, idUserDuocDanhGia, diem, nhanXet) VALUES (?, ?, ?, ?, ?)',
        [idDuAn, ids[i], ids[j], ri(3, 5), 'Hoàn thành tốt công việc được giao']
      );
    }
  }
}
console.log('Đã tạo đánh giá thành viên.');

// Tuyển dụng (8) + ứng tuyển
const POSITIONS = ['Frontend Developer', 'Backend Developer', 'UI/UX Designer', 'Tester', 'Data Analyst'];
for (let i = 0; i < 8; i++) {
  const idDuAn = pick(projectIds);
  const idUser = pick(allIds);
  const [r] = await conn.query(
    'INSERT INTO tintuyendung (idUser, idDuAn, tieuDe, yeuCau, hanNop, trangThai) VALUES (?, ?, ?, ?, ?, ?)',
    [idUser, idDuAn, 'Tuyển ' + pick(POSITIONS), 'Có kinh nghiệm, nhiệt tình, làm việc nhóm tốt', ddate(20), pick(['not_started', 'in_progress'])]
  );
  const nApply = ri(1, 3);
  for (let k = 0; k < nApply; k++) {
    const u = pick(allIds);
    if (u === idUser) continue;
    await conn.query(
      'INSERT IGNORE INTO ungtuyen (idTinTuyen, idUser, loiNhan, trangThai, NgayNop) VALUES (?, ?, ?, ?, ?)',
      [r.insertId, u, 'Em muốn ứng tuyển vị trí này ạ', pick(['Pending', 'Accepted']), dtime(15)]
    );
  }
}
console.log('Đã tạo 8 tin tuyển dụng kèm ứng tuyển.');

// Bài viết (40) + bình luận + like + bookmark
const POSTS = [
  'Hôm nay nhóm mình vừa hoàn thành xong chức năng đăng nhập, mọi người test thử nhé!',
  'Chia sẻ kinh nghiệm học Node.js cho người mới bắt đầu.',
  'Ai có tài liệu về React hooks hay không cho mình xin với ạ.',
  'Vừa deploy xong bản mới, fix được mấy lỗi hiển thị trên mobile.',
  'Tìm 1 bạn designer để làm chung đồ án cuối kỳ, ai hứng thú ib mình nha.',
  'Mẹo tối ưu truy vấn MySQL: dùng INDEX đúng cách.',
  'Dự án của nhóm mình sắp đến hạn rồi, cảm giác vừa lo vừa háo hức.',
  'Học UI/UX nên bắt đầu từ đâu? Mọi người tư vấn giúp.',
  'Đã thêm tính năng chat cho ứng dụng, mọi người trải nghiệm thử.',
  'Tuyển thêm 2 thành viên cho dự án app di động, chi tiết ở mục tuyển dụng.',
  'Chúc mừng nhóm đã hoàn thành dự án trước deadline! 🎉',
  'Kinh nghiệm làm việc nhóm hiệu quả khi làm đồ án.',
  'So sánh giữa MySQL và MongoDB cho dự án nhỏ.',
  'Ai biết cách xử lý lỗi CORS khi gọi API khác domain không?',
  'Hôm nay review code cho mấy bạn khóa dưới, nhớ lại hồi mình mới học.',
];
const COMMENTS = [
  'Hay quá, cảm ơn bạn đã chia sẻ!', 'Mình cũng đang gặp vấn đề tương tự.',
  'Cho mình xin link tài liệu với ạ.', 'Ủng hộ nhóm, cố lên nha!',
  'Bài viết rất hữu ích, đã lưu lại.', 'Bạn có thể nói rõ hơn phần này không?',
  'Đồng ý với bạn, kinh nghiệm xương máu.', 'Mình apply thử vị trí này nhé.',
  'Chúc mừng nhóm! 🎉', 'Cảm ơn chia sẻ, rất chi tiết.',
];
for (let i = 0; i < 40; i++) {
  const [r] = await conn.query('INSERT INTO post (idUser, noiDung, createdAt) VALUES (?, ?, ?)', [
    pick(allIds), pick(POSTS), dtime(30)
  ]);
  const idPost = r.insertId;
  for (let k = 0; k < ri(0, 3); k++) {
    await conn.query('INSERT INTO comment (idPost, idUser, noiDung, createdAt) VALUES (?, ?, ?, ?)', [
      idPost, pick(allIds), pick(COMMENTS), dtime(30)
    ]);
  }
  const liked = new Set();
  for (let k = 0; k < ri(0, 5); k++) {
    const u = pick(allIds);
    if (liked.has(u)) continue;
    liked.add(u);
    await conn.query('INSERT IGNORE INTO likepost (idPost, idUser, createdAt) VALUES (?, ?, ?)', [idPost, u, dtime(30)]);
  }
  if (rand() < 0.5) {
    await conn.query('INSERT IGNORE INTO bookmarks (user_id, post_id, bookmarked_at) VALUES (?, ?, ?)', [pick(allIds), idPost, dtime(30)]);
  }
}
console.log('Đã tạo 40 bài viết kèm bình luận, like, bookmark.');

// Nhóm chat + tin nhắn
const MSGS = [
  'Chào mọi người!', 'Tuần này ai làm task nào rồi?', 'Mình đã xong phần giao diện.',
  'OK, mình sẽ test.', 'Deadline cuối tuần nhé mọi người.', 'Có cần họp online không?',
  'Mình gửi tài liệu vào drive rồi đó.', 'Cảm ơn bạn!', 'Task mình xong rồi nha.', 'Tối nay họp lúc 8h nhé.'
];
for (const ten of ['Nhóm đồ án Web', 'Hội sinh viên CNTT']) {
  const [r] = await conn.query("INSERT INTO chatbox (tenChatBox, loai) VALUES (?, 'Group')", [ten]);
  const idChatBox = r.insertId;
  const members = [];
  for (let k = 0; k < ri(3, 6); k++) {
    const m = pick(allIds);
    if (members.includes(m)) continue;
    members.push(m);
    await conn.query('INSERT IGNORE INTO grchat (idUser, idChatBox) VALUES (?, ?)', [m, idChatBox]);
  }
  for (let k = 0; k < ri(5, 10); k++) {
    await conn.query('INSERT INTO message (idChatBox, idUser, noiDung, thoiGian) VALUES (?, ?, ?, ?)', [
      idChatBox, pick(members), pick(MSGS), dtime(30)
    ]);
  }
}
console.log('Đã tạo 2 nhóm chat kèm tin nhắn.');

// Chứng chỉ (15)
const CERTS = [
  ['Chứng chỉ AWS Cloud Practitioner', 'Amazon'], ['Chứng chỉ tin học MOS', 'Microsoft'],
  ['IELTS 7.0', 'British Council'], ['Chứng chỉ TOEIC 800', 'ETS'],
  ['Chứng chỉ Google Data Analytics', 'Google'], ['Chứng chỉ UI/UX Design', 'Google'],
];
for (let i = 0; i < 15; i++) {
  const [cname, org] = pick(CERTS);
  await conn.query(
    'INSERT INTO nhan_su_chung_chi (idUser, tenChungChi, toChucCap, maChungChi, ngayCap, ngayHetHan, drive_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [pick(allIds), cname, org, 'CERT-' + ri(1000, 9999), ddate(365), rand() < 0.5 ? ddate(-365) : null, 'https://drive.google.com/file/d/demo']
  );
}
console.log('Đã tạo 15 chứng chỉ.');

const cnt = async (t) => (await conn.query(`SELECT COUNT(*) c FROM ${t}`))[0][0].c;
console.log('\n===== TỔNG KẾT DỮ LIỆU MẪU =====');
console.log('Người dùng:', await cnt('user'));
console.log('Hồ sơ:', await cnt('hoso'));
console.log('Kỹ năng chuyên môn:', await cnt('chuyenmon'));
console.log('Năng lực cá nhân:', await cnt('nhan_su_ky_nang'));
console.log('Kết nối:', await cnt('ketnoi'));
console.log('Dự án:', await cnt('duan'));
console.log('Công việc:', await cnt('task'));
console.log('Tuyển dụng:', await cnt('tintuyendung'));
console.log('Bài viết:', await cnt('post'));
console.log('Bình luận:', await cnt('comment'));
console.log('Lượt thích:', await cnt('likepost'));
console.log('Tin nhắn:', await cnt('message'));
console.log('Chứng chỉ:', await cnt('nhan_su_chung_chi'));

await conn.end();
console.log('\nHoàn tất.');

