#!/usr/bin/env node
// Sinh dữ liệu mẫu mô phỏng ~30 người dùng hoạt động trong 1 tháng
// Chạy:  node scripts/generate-demo-data.mjs
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '1234',
  database: process.env.DB_NAME || 'csdl2',
  charset: 'utf8mb4'
});

// PRNG có hạt để kết quả ổn định giữa các lần chạy
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261113);
const ri = (a, b) => a + Math.floor(rand() * (b - a + 1));
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const NOW = Date.now();
function dtime(maxDaysAgo, minDaysAgo = 0) {
  const ago = minDaysAgo + rand() * (maxDaysAgo - minDaysAgo);
  return new Date(NOW - ago * 86400000).toISOString().slice(0, 19).replace('T', ' ');
}
const ddate = (maxDaysAgo) => dtime(maxDaysAgo).slice(0, 10);

// Nếu đã import rồi thì bỏ qua (tránh trùng khi chạy lại)
const [exists] = await conn.query("SELECT idUser FROM user WHERE userName = 'domai'");
if (exists.length) {
  console.log('Dữ liệu mẫu đã được import trước đó, bỏ qua.');
  await conn.end();
  process.exit(0);
}

const PWD = '123456';

const NAMES = [
  ['domai', 'Đỗ Thị Mai', 'do.thi.mai@gmail.com'],
  ['vuducthang', 'Vũ Đức Thắng', 'thang.vu@gmail.com'],
  ['ngothanhtung', 'Ngô Thanh Tùng', 'tung.ngo@gmail.com'],
  ['buiquanghuy', 'Bùi Quang Huy', 'huy.bui@gmail.com'],
  ['dangthuha', 'Đặng Thu Hà', 'ha.dang@gmail.com'],
  ['lygiabao', 'Lý Gia Bảo', 'bao.ly@gmail.com'],
  ['trinhminhkhoa', 'Trịnh Minh Khoa', 'khoa.trinh@gmail.com'],
  ['phanthanhtruc', 'Phan Thanh Trúc', 'truc.phan@gmail.com'],
  ['dinhcongvinh', 'Đinh Công Vinh', 'vinh.dinh@gmail.com'],
  ['tangocanh', 'Tạ Ngọc Ánh', 'anh.ta@gmail.com'],
  ['havanam', 'Hà Văn Nam', 'nam.ha@gmail.com'],
  ['luuthiquynh', 'Lưu Thị Quỳnh', 'quynh.luu@gmail.com'],
  ['maixuanphuc', 'Mai Xuân Phúc', 'phuc.mai@gmail.com'],
  ['doankimngan', 'Đoàn Kim Ngân', 'ngan.doan@gmail.com'],
  ['truonghuudat', 'Trương Hữu Đạt', 'dat.truong@gmail.com'],
  ['nguyenhoanglong', 'Nguyễn Hoàng Long', 'long.nguyen@gmail.com'],
  ['phamgiahan', 'Phạm Gia Hân', 'han.pham@gmail.com'],
  ['lethithanh', 'Lê Thị Thanh', 'thanh.le@gmail.com'],
  ['vuongtuankiet', 'Vương Tuấn Kiệt', 'kiet.vuong@gmail.com'],
  ['tranbaochau', 'Trần Bảo Châu', 'chau.tran@gmail.com'],
];

const BIOS = [
  'Sinh viên CNTT năng động, thích làm dự án thực tế',
  'Frontend developer, đam mê UI/UX',
  'Backend developer, chuyên Node.js và MySQL',
  'Thiết kế đồ họa, yêu thích sáng tạo',
  'Data analyst, thích khám phá dữ liệu',
  'Quản lý dự án, giỏi tổ chức và điều phối',
];

const SKILLS = [
  ['JavaScript', 'Intermediate'], ['Node.js', 'Expert'], ['MySQL', 'Intermediate'],
  ['HTML/CSS', 'Expert'], ['Figma', 'Expert'], ['Python', 'Expert'],
  ['React', 'Intermediate'], ['UI/UX', 'Intermediate'], ['Java', 'Beginner'],
  ['PHP', 'Intermediate'], ['Selenium', 'Intermediate'], ['Jira', 'Expert'],
];

const [kynangRows] = await conn.query('SELECT idKyNang, tenKyNang FROM ky_nang');
const KY_NANG = Object.fromEntries(kynangRows.map((r) => [r.tenKyNang, r.idKyNang]));

const userIds = [];
for (let i = 0; i < NAMES.length; i++) {
  const [uname, hovaten, email] = NAMES[i];
  const [r] = await conn.query(
    'INSERT INTO user (userName, email, pWD, trangThai, createdAt) VALUES (?, ?, ?, ?, ?)',
    [uname, email, PWD, 'Active', dtime(30, 1)]
  );
  const idUser = r.insertId;
  userIds.push(idUser);

  const [h] = await conn.query(
    'INSERT INTO hoso (idUser, HovaTen, SDT, avatar, tieuSu) VALUES (?, ?, ?, NULL, ?)',
    [idUser, hovaten, '09' + ri(10000000, 99999999), pick(BIOS)]
  );
  const idHoSo = h.insertId;

  const chosen = [];
  const nSkill = ri(1, 3);
  for (let k = 0; k < nSkill; k++) {
    const s = pick(SKILLS);
    if (chosen.includes(s[0])) continue;
    chosen.push(s[0]);
    await conn.query(
      'INSERT INTO chuyenmon (idHoSo, tenKyNang, trinhDo, soNamKinhNghiem) VALUES (?, ?, ?, ?)',
      [idHoSo, s[0], s[1], ri(0, 5)]
    );
  }
  for (const name of chosen) {
    if (KY_NANG[name]) {
      await conn.query(
        'INSERT IGNORE INTO nhan_su_ky_nang (idUser, idKyNang, capDo, soNamKinhNghiem) VALUES (?, ?, ?, ?)',
        [idUser, KY_NANG[name], ri(1, 4), ri(0, 4)]
      );
    }
  }
}
console.log('Đã tạo', userIds.length, 'người dùng mới.');

const [allUsers] = await conn.query('SELECT idUser FROM user');
const allIds = allUsers.map((r) => r.idUser);

// Kết nối (kết bạn) - khoảng 45 quan hệ
{
  const pairs = new Set();
  for (let i = 0; i < 45; i++) {
    const a = pick(allIds), b = pick(allIds);
    if (a === b) continue;
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (pairs.has(key)) continue;
    pairs.add(key);
    await conn.query(
      'INSERT IGNORE INTO ketnoi (idUserGui, idUserNhan, trangThai, createdAt) VALUES (?, ?, ?, ?)',
      [a, b, rand() < 0.8 ? 'Accepted' : 'Pending', dtime(30)]
    );
  }
  console.log('Đã tạo', pairs.size, 'kết nối.');
}

// Dự án (8) + thành viên + công việc + phân công
const PROJECTS = [
  ['Website quản lý thư viện', 'Xây dựng website quản lý sách và mượn trả cho thư viện trường'],
  ['App học tiếng Anh', 'Ứng dụng học từ vựng tiếng Anh cho sinh viên'],
  ['Hệ thống điểm danh QR', 'Điểm danh bằng mã QR cho lớp học'],
  ['Website bán hàng online', 'Trang thương mại điện tử bán đồ công nghệ'],
  ['App đặt lịch sân bóng', 'Ứng dụng đặt sân bóng đá online'],
  ['Diễn đàn sinh viên', 'Diễn đàn trao đổi học tập cho sinh viên'],
  ['Hệ thống khảo sát trực tuyến', 'Công cụ tạo và thống kê khảo sát'],
  ['App quản lý chi tiêu', 'Ứng dụng theo dõi thu chi cá nhân'],
];
const TASKS = [
  ['Khảo sát yêu cầu', 'Thu thập yêu cầu từ người dùng'],
  ['Thiết kế giao diện', 'Thiết kế UI/UX cho ứng dụng'],
  ['Xây dựng cơ sở dữ liệu', 'Thiết kế và tạo bảng dữ liệu'],
  ['Phát triển chức năng chính', 'Lập trình các chức năng cốt lõi'],
  ['Kiểm thử và sửa lỗi', 'Test và fix bug trước khi bàn giao'],
];
const projectIds = [];
const completedProjects = [];
for (let i = 0; i < PROJECTS.length; i++) {
  const [ten, moTa] = PROJECTS[i];
  const idUserTao = pick(allIds);
  const trangThai = i < 2 ? 'completed' : pick(['not_started', 'in_progress']);
  const [r] = await conn.query(
    'INSERT INTO duan (idUserTao, tenDuAn, moTa, ngayBD, ngayKT, trangThai, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [idUserTao, ten, moTa, ddate(30), i < 2 ? ddate(1) : null, trangThai, dtime(30)]
  );
  const idDuAn = r.insertId;
  projectIds.push(idDuAn);
  if (trangThai === 'completed') completedProjects.push(idDuAn);

  const members = [idUserTao];
  const nMem = ri(2, 4);
  for (let k = 0; k < nMem; k++) {
    const m = pick(allIds);
    if (members.includes(m)) continue;
    members.push(m);
    await conn.query(
      'INSERT IGNORE INTO thanhvienduan (idDuAn, idUser, vaiTro) VALUES (?, ?, ?)',
      [idDuAn, m, pick(['nhan_vien', 'quan_ly', 'khach'])]
    );
  }

  const nTask = ri(2, 4);
  for (let k = 0; k < nTask; k++) {
    const [tname, tmoTa] = TASKS[k];
    const [tr] = await conn.query(
      'INSERT INTO task (idDuAn, tenTask, moTa, deadLine, trangThai) VALUES (?, ?, ?, ?, ?)',
      [idDuAn, tname, tmoTa, dtime(20), pick(['Todo', 'Doing', 'Done'])]
    );
    await conn.query('INSERT IGNORE INTO phancong (idTask, idUser) VALUES (?, ?)', [tr.insertId, pick(members)]);
  }
}
console.log('Đã tạo', projectIds.length, 'dự án.');

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

// Tuyển dụng (8) + ứng tuyển
const POSITIONS = ['Frontend Developer', 'Backend Developer', 'UI/UX Designer', 'Tester', 'Data Analyst'];
for (let i = 0; i < 8; i++) {
  const idDuAn = pick(projectIds);
  const idUser = pick(allIds);
  const [r] = await conn.query(
    'INSERT INTO tintuyendung (idUser, idDuAn, tieuDe, yeuCau, hanNop, trangThai) VALUES (?, ?, ?, ?, ?, ?)',
    [idUser, idDuAn, 'Tuyển ' + pick(POSITIONS), 'Có kinh nghiệm, nhiệt tình, làm việc nhóm tốt', ddate(20), pick(['not_started', 'in_progress'])]
  );
  const idTinTuyen = r.insertId;
  const nApply = ri(1, 3);
  for (let k = 0; k < nApply; k++) {
    const u = pick(allIds);
    if (u === idUser) continue;
    await conn.query(
      'INSERT IGNORE INTO ungtuyen (idTinTuyen, idUser, loiNhan, trangThai, NgayNop) VALUES (?, ?, ?, ?, ?)',
      [idTinTuyen, u, 'Em muốn ứng tuyển vị trí này ạ', pick(['Pending', 'Accepted']), dtime(15)]
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
  'Hay quá, cảm ơn bạn đã chia sẻ!',
  'Mình cũng đang gặp vấn đề tương tự.',
  'Cho mình xin link tài liệu với ạ.',
  'Ủng hộ nhóm, cố lên nha!',
  'Bài viết rất hữu ích, đã lưu lại.',
  'Bạn có thể nói rõ hơn phần này không?',
  'Đồng ý với bạn, kinh nghiệm xương máu.',
  'Mình apply thử vị trí này nhé.',
  'Chúc mừng nhóm! 🎉',
  'Cảm ơn chia sẻ, rất chi tiết.',
];
for (let i = 0; i < 40; i++) {
  const [r] = await conn.query('INSERT INTO post (idUser, noiDung, createdAt) VALUES (?, ?, ?)', [
    pick(allIds), pick(POSTS), dtime(30)
  ]);
  const idPost = r.insertId;
  const nCmt = ri(0, 3);
  for (let k = 0; k < nCmt; k++) {
    await conn.query('INSERT INTO comment (idPost, idUser, noiDung, createdAt) VALUES (?, ?, ?, ?)', [
      idPost, pick(allIds), pick(COMMENTS), dtime(30)
    ]);
  }
  const nLike = ri(0, 5);
  const liked = new Set();
  for (let k = 0; k < nLike; k++) {
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

// Trò chuyện nhóm + tin nhắn
const MSGS = [
  'Chào mọi người!', 'Tuần này ai làm task nào rồi?', 'Mình đã xong phần giao diện.',
  'OK, mình sẽ test.', 'Deadline cuối tuần nhé mọi người.', 'Có cần họp online không?',
  'Mình gửi tài liệu vào drive rồi đó.', 'Cảm ơn bạn!', 'Task mình xong rồi nha.', 'Tối nay họp lúc 8h nhé.'
];
const GROUPS = ['Nhóm đồ án Web', 'Hội sinh viên CNTT'];
for (const ten of GROUPS) {
  const [r] = await conn.query("INSERT INTO chatbox (tenChatBox, loai) VALUES (?, 'Group')", [ten]);
  const idChatBox = r.insertId;
  const members = [];
  const n = ri(3, 6);
  for (let k = 0; k < n; k++) {
    const m = pick(allIds);
    if (members.includes(m)) continue;
    members.push(m);
    await conn.query('INSERT IGNORE INTO grchat (idUser, idChatBox) VALUES (?, ?)', [m, idChatBox]);
  }
  const nMsg = ri(5, 10);
  for (let k = 0; k < nMsg; k++) {
    await conn.query('INSERT INTO message (idChatBox, idUser, noiDung, thoiGian) VALUES (?, ?, ?, ?)', [
      idChatBox, pick(members), pick(MSGS), dtime(30)
    ]);
  }
}
console.log('Đã tạo 2 nhóm chat kèm tin nhắn.');

// Chứng chỉ (15)
const CERTS = [
  ['Chứng chỉ AWS Cloud Practitioner', 'Amazon'],
  ['Chứng chỉ tin học MOS', 'Microsoft'],
  ['IELTS 7.0', 'British Council'],
  ['Chứng chỉ TOEIC 800', 'ETS'],
  ['Chứng chỉ Google Data Analytics', 'Google'],
  ['Chứng chỉ UI/UX Design', 'Google'],
];
for (let i = 0; i < 15; i++) {
  const [cname, org] = pick(CERTS);
  await conn.query(
    'INSERT INTO nhan_su_chung_chi (idUser, tenChungChi, toChucCap, maChungChi, ngayCap, ngayHetHan, drive_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [pick(allIds), cname, org, 'CERT-' + ri(1000, 9999), ddate(365), rand() < 0.5 ? ddate(-365) : null, 'https://drive.google.com/file/d/demo']
  );
}
console.log('Đã tạo 15 chứng chỉ.');

// Tổng kết
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
console.log('\nHoàn tất import dữ liệu mẫu.');


