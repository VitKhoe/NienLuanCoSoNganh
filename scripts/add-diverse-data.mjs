#!/usr/bin/env node
// Bổ sung dữ liệu mẫu ĐA NGÀNH NGHỀ + SỰ KIỆN (không chỉ công nghệ)
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '1234',
  database: process.env.DB_NAME || 'csdl2',
  charset: 'utf8mb4'
});

// Nếu đã import thì bỏ qua
const [ex] = await conn.query("SELECT idUser FROM user WHERE userName = 'lehongphuc'");
if (ex.length) {
  console.log('Dữ liệu đa ngành đã được import, bỏ qua.');
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
const rand = mulberry32(777);
const ri = (a, b) => a + Math.floor(rand() * (b - a + 1));
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const NOW = Date.now();
function dtime(maxDaysAgo, minDaysAgo = 0) {
  const ago = minDaysAgo + rand() * (maxDaysAgo - minDaysAgo);
  return new Date(NOW - ago * 86400000).toISOString().slice(0, 19).replace('T', ' ');
}
const ddate = (maxDaysAgo) => dtime(maxDaysAgo).slice(0, 10);

const PWD = '123456';
const LEVELS = ['Beginner', 'Intermediate', 'Expert', 'Master'];

// 1. Người dùng đa ngành nghề (15)
const DIVERSE_USERS = [
  ['lehongphuc', 'Lê Hồng Phúc', 'phuc.lehong@gmail.com', 'Quản lý sự kiện'],
  ['nguyenthuthuy', 'Nguyễn Thu Thủy', 'thuy.nguyenthu@gmail.com', 'Chuyên viên marketing'],
  ['tranvannam', 'Trần Văn Nam', 'nam.tranvan@gmail.com', 'Kiến trúc sư'],
  ['phamthilan', 'Phạm Thị Lan', 'lan.phamthi@gmail.com', 'Kế toán'],
  ['doquanghai', 'Đỗ Quang Hải', 'hai.doquang@gmail.com', 'Đầu bếp'],
  ['vungocmai', 'Vũ Ngọc Mai', 'mai.vungoc@gmail.com', 'Giáo viên'],
  ['hoangvantu', 'Hoàng Văn Tú', 'tu.hoangvan@gmail.com', 'Nhiếp ảnh gia'],
  ['buithihanh', 'Bùi Thị Hạnh', 'hanh.buithi@gmail.com', 'Điều dưỡng viên'],
  ['lyminhquan', 'Lý Minh Quân', 'quan.lyminh@gmail.com', 'Hướng dẫn viên du lịch'],
  ['ngothithao', 'Ngô Thị Thảo', 'thao.ngothi@gmail.com', 'Nhà thiết kế thời trang'],
  ['dangcongthanh', 'Đặng Công Thành', 'thanh.dangcong@gmail.com', 'Kỹ sư xây dựng'],
  ['trinhhoangyen', 'Trịnh Hoàng Yến', 'yen.trinhhoang@gmail.com', 'MC truyền thông'],
  ['phanvanloc', 'Phan Văn Lộc', 'loc.phanvan@gmail.com', 'Nhân viên kinh doanh'],
  ['tathingoc', 'Tạ Thị Ngọc', 'ngoc.tathi@gmail.com', 'Chuyên viên nhân sự'],
  ['haminhdat', 'Hà Minh Đạt', 'dat.haminh@gmail.com', 'Biên tập viên video'],
];

const PROF_SKILLS = {
  'Quản lý sự kiện': ['Tổ chức sự kiện', 'Quản lý ngân sách'],
  'Chuyên viên marketing': ['Marketing', 'Quảng cáo'],
  'Kiến trúc sư': ['Kiến trúc'],
  'Kế toán': ['Kế toán'],
  'Đầu bếp': ['Nấu ăn'],
  'Giáo viên': ['Giảng dạy'],
  'Nhiếp ảnh gia': ['Nhiếp ảnh'],
  'Điều dưỡng viên': ['Điều dưỡng'],
  'Hướng dẫn viên du lịch': ['Du lịch'],
  'Nhà thiết kế thời trang': ['Thiết kế thời trang'],
  'Kỹ sư xây dựng': ['Xây dựng'],
  'MC truyền thông': ['Tổ chức sự kiện', 'Giao tiếp'],
  'Nhân viên kinh doanh': ['Bán hàng'],
  'Chuyên viên nhân sự': ['Quản lý nhân sự'],
  'Biên tập viên video': ['Biên tập video'],
};

// 2. Mở rộng danh mục kỹ năng đa ngành
const DIVERSE_KY_NANG = [
  ['Tổ chức sự kiện', 'Sự kiện'], ['Marketing', 'Kinh doanh'], ['Quảng cáo', 'Marketing'],
  ['Kế toán', 'Tài chính'], ['Kiến trúc', 'Xây dựng'], ['Nấu ăn', 'Ẩm thực'],
  ['Nhiếp ảnh', 'Nghệ thuật'], ['Bán hàng', 'Kinh doanh'], ['Quản lý nhân sự', 'Hành chính'],
  ['Biên tập video', 'Truyền thông'], ['Giao tiếp', 'Kỹ năng mềm'], ['Giảng dạy', 'Giáo dục'],
  ['Du lịch', 'Dịch vụ'], ['Thiết kế thời trang', 'Nghệ thuật'], ['Điều dưỡng', 'Y tế'],
  ['Xây dựng', 'Xây dựng'], ['Quản lý ngân sách', 'Tài chính'], ['Chăm sóc khách hàng', 'Dịch vụ'],
];
for (let i = 0; i < DIVERSE_KY_NANG.length; i++) {
  const [ten, nhom] = DIVERSE_KY_NANG[i];
  await conn.query('INSERT IGNORE INTO ky_nang (tenKyNang, nhomNganh) VALUES (?, ?)', [ten, nhom]);
}
const [kynangRows] = await conn.query('SELECT idKyNang, tenKyNang FROM ky_nang');
const KY_NANG = Object.fromEntries(kynangRows.map((r) => [r.tenKyNang, r.idKyNang]));

const diverseIds = [];
for (const [uname, hovaten, email, nghe] of DIVERSE_USERS) {
  const [r] = await conn.query(
    'INSERT INTO user (userName, email, pWD, trangThai, createdAt) VALUES (?, ?, ?, ?, ?)',
    [uname, email, PWD, 'Active', dtime(30, 1)]
  );
  const idUser = r.insertId;
  diverseIds.push(idUser);

  await conn.query(
    'INSERT INTO hoso (idUser, HovaTen, SDT, avatar, tieuSu) VALUES (?, ?, ?, NULL, ?)',
    [idUser, hovaten, '09' + ri(10000000, 99999999), nghe + ' với kinh nghiệm làm dự án thực tế']
  );

  for (const skillName of PROF_SKILLS[nghe] || []) {
    const [h] = await conn.query('SELECT idHoSo FROM hoso WHERE idUser = ?', [idUser]);
    const idHoSo = h[0].idHoSo;
    await conn.query(
      'INSERT INTO chuyenmon (idHoSo, tenKyNang, trinhDo, soNamKinhNghiem) VALUES (?, ?, ?, ?)',
      [idHoSo, skillName, pick(LEVELS), ri(1, 8)]
    );
    if (KY_NANG[skillName]) {
      await conn.query(
        'INSERT IGNORE INTO nhan_su_ky_nang (idUser, idKyNang, capDo, soNamKinhNghiem) VALUES (?, ?, ?, ?)',
        [idUser, KY_NANG[skillName], ri(2, 4), ri(1, 8)]
      );
    }
  }
}
console.log('Đã tạo', diverseIds.length, 'người dùng đa ngành.');

const [users] = await conn.query('SELECT idUser FROM user');
const allIds = users.map((r) => r.idUser);

// Kết nối mới giữa các người dùng
{
  const pairs = new Set();
  for (let i = 0; i < 20; i++) {
    const a = pick(allIds), b = pick(allIds);
    if (a === b) continue;
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (pairs.has(key)) continue;
    pairs.add(key);
    await conn.query(
      'INSERT IGNORE INTO ketnoi (idUserGui, idUserNhan, trangThai, createdAt) VALUES (?, ?, ?, ?)',
      [a, b, rand() < 0.85 ? 'Accepted' : 'Pending', dtime(30)]
    );
  }
}

// 3. Dự án đa ngành nghề + sự kiện (14)
const DIVERSE_PROJECTS = [
  ['Hội chợ ẩm thực mùa xuân', 'Tổ chức hội chợ ẩm thực với 30 gian hàng tại công viên trung tâm'],
  ['Lễ hội âm nhạc sinh viên', 'Chương trình biểu diễn âm nhạc của các câu lạc bộ sinh viên'],
  ['Giải chạy từ thiện 5km', 'Giải chạy gây quỹ cho trẻ em vùng cao'],
  ['Đêm nhạc gây quỹ từ thiện', 'Chương trình ca nhạc gây quỹ cho bệnh nhi ung thư'],
  ['Hội thảo khởi nghiệp xanh', 'Hội thảo chia sẻ về mô hình khởi nghiệp bền vững'],
  ['Sự kiện ra mắt thương hiệu trà sữa', 'Sự kiện ra mắt và dùng thử sản phẩm miễn phí'],
  ['Xây dựng nhà văn hóa thôn', 'Thi công nhà văn hóa phục vụ sinh hoạt cộng đồng'],
  ['Cải tạo sân chơi trẻ em', 'Cải tạo và lắp đặt thiết bị sân chơi cho trẻ em'],
  ['Chiến dịch marketing Tết', 'Chiến dịch quảng bá sản phẩm dịp Tết Nguyên Đán'],
  ['Mở chuỗi quán cà phê', 'Lên kế hoạch mở 3 chi nhánh quán cà phê trong năm'],
  ['Khóa học kỹ năng mềm', 'Tổ chức khóa học kỹ năng mềm miễn phí cho sinh viên'],
  ['Chương trình khám sức khỏe cộng đồng', 'Khám và tư vấn sức khỏe miễn phí cho người dân'],
  ['Tour du lịch sinh thái miền Tây', 'Tour 3 ngày 2 đêm khám phá miền sông nước'],
  ['Bộ sưu tập áo dài xuân', 'Thiết kế và trình diễn bộ sưu tập áo dài Tết'],
];
const TASKS = [
  ['Lập kế hoạch tổng thể', 'Xây dựng kế hoạch chi tiết cho dự án'],
  ['Chuẩn bị nguồn lực', 'Huy động nhân sự và vật tư'],
  ['Triển khai thực hiện', 'Tiến hành các hạng mục chính'],
  ['Quảng bá & truyền thông', 'Truyền thông thu hút người tham gia'],
  ['Tổng kết & nghiệm thu', 'Tổng kết kết quả và rút kinh nghiệm'],
];
const newProjectIds = [];
for (let i = 0; i < DIVERSE_PROJECTS.length; i++) {
  const [ten, moTa] = DIVERSE_PROJECTS[i];
  const idUserTao = pick(allIds);
  const trangThai = i < 3 ? 'completed' : pick(['not_started', 'in_progress']);
  const [r] = await conn.query(
    'INSERT INTO duan (idUserTao, tenDuAn, moTa, ngayBD, ngayKT, trangThai, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [idUserTao, ten, moTa, ddate(30), i < 3 ? ddate(1) : null, trangThai, dtime(30)]
  );
  const idDuAn = r.insertId;
  newProjectIds.push(idDuAn);

  const members = [idUserTao];
  for (let k = 0; k < ri(2, 4); k++) {
    const m = pick(allIds);
    if (members.includes(m)) continue;
    members.push(m);
    await conn.query(
      'INSERT IGNORE INTO thanhvienduan (idDuAn, idUser, vaiTro) VALUES (?, ?, ?)',
      [idDuAn, m, pick(['nhan_vien', 'quan_ly', 'khach'])]
    );
  }
  for (let k = 0; k < ri(2, 4); k++) {
    const [tname, tmoTa] = TASKS[k];
    const [tr] = await conn.query(
      'INSERT INTO task (idDuAn, tenTask, moTa, deadLine, trangThai) VALUES (?, ?, ?, ?, ?)',
      [idDuAn, tname, tmoTa, dtime(20), pick(['Todo', 'Doing', 'Done'])]
    );
    await conn.query('INSERT IGNORE INTO phancong (idTask, idUser) VALUES (?, ?)', [tr.insertId, pick(members)]);
  }
}
console.log('Đã tạo', newProjectIds.length, 'dự án đa ngành/sự kiện.');

// 4. Tuyển dụng đa ngành (12)
const DIVERSE_POSITIONS = [
  'Nhân viên marketing', 'Kiến trúc sư', 'Đầu bếp', 'MC sự kiện', 'Kế toán',
  'Nhiếp ảnh gia', 'Hướng dẫn viên du lịch', 'Điều dưỡng viên', 'Giáo viên',
  'Thiết kế thời trang', 'Nhân viên kinh doanh', 'Biên tập viên video',
];
for (let i = 0; i < 12; i++) {
  const idDuAn = pick(newProjectIds);
  const idUser = pick(allIds);
  const [r] = await conn.query(
    'INSERT INTO tintuyendung (idUser, idDuAn, tieuDe, yeuCau, hanNop, trangThai) VALUES (?, ?, ?, ?, ?, ?)',
    [idUser, idDuAn, 'Tuyển ' + DIVERSE_POSITIONS[i], 'Nhiệt tình, trách nhiệm, có kinh nghiệm là một lợi thế', ddate(20), pick(['not_started', 'in_progress'])]
  );
  for (let k = 0; k < ri(1, 3); k++) {
    const u = pick(allIds);
    if (u === idUser) continue;
    await conn.query(
      'INSERT IGNORE INTO ungtuyen (idTinTuyen, idUser, loiNhan, trangThai, NgayNop) VALUES (?, ?, ?, ?, ?)',
      [r.insertId, u, 'Em muốn ứng tuyển vị trí này ạ', pick(['Pending', 'Accepted']), dtime(15)]
    );
  }
}
console.log('Đã tạo 12 tin tuyển dụng đa ngành.');

// 5. Bài viết về sự kiện & đa ngành (20)
const DIVERSE_POSTS = [
  'Tuần này có hội chợ ẩm thực ở công viên trung tâm, mọi người ghé ủng hộ nhé!',
  'Đăng ký tham gia giải chạy từ thiện 5km ngay hôm nay, chỉ còn 50 suất.',
  'Cần tìm 2 tình nguyện viên cho chương trình khám sức khỏe cộng đồng.',
  'Chia sẻ kinh nghiệm tổ chức sự kiện ngoài trời khi thời tiết mưa.',
  'Bộ sưu tập áo dài xuân sắp ra mắt, mời mọi người đến xem buổi trình diễn.',
  'Công thức nấu ăn ngon cho buổi tiệc cuối năm của công ty.',
  'Cảm ơn mọi người đã tham gia lễ hội âm nhạc hôm qua! 🎶',
  'Tuyển cộng tác viên chụp ảnh cho lễ hội, có nhuận bút.',
  'Lịch trình tour du lịch miền Tây 3 ngày 2 đêm, giá ưu đãi cho sinh viên.',
  'Khóa học kỹ năng mềm miễn phí, đăng ký tại văn phòng Đoàn trường.',
  'Dự án cải tạo sân chơi trẻ em đã hoàn thành, cảm ơn nhà tài trợ!',
  'Kinh nghiệm quản lý ngân sách khi tổ chức sự kiện quy mô lớn.',
  'Mời mọi người đến dùng thử trà sữa miễn phí vào cuối tuần này.',
  'Tuyển gia sư tiếng Anh cho các em nhỏ, lịch linh hoạt.',
  'Góc chia sẻ: làm thế nào để chụp ảnh sự kiện đẹp?',
  'Nhà văn hóa thôn vừa khánh thành, bà con đến sinh hoạt nhé.',
  'Hướng dẫn chuẩn bị gian hàng cho hội chợ cuối năm.',
  'Chương trình gây quỹ đã quyên được 50 triệu, cảm ơn cộng đồng!',
  'Tìm đối tác cung cấp hoa tươi cho sự kiện cưới.',
  'Bí quyết chăm sóc khách hàng trong ngành dịch vụ.',
];
const DIVERSE_COMMENTS = [
  'Hay quá, cảm ơn bạn đã chia sẻ!', 'Mình sẽ tham gia!', 'Ủng hộ chương trình nha.',
  'Đăng ký ở đâu vậy bạn?', 'Rất ý nghĩa, cố lên!', 'Cho mình xin thêm thông tin.',
  'Mình sẽ rủ bạn bè cùng đi.', 'Cảm ơn ban tổ chức!', 'Chúc chương trình thành công!',
  'Bài viết hữu ích, đã lưu.',
];
for (let i = 0; i < 20; i++) {
  const [r] = await conn.query('INSERT INTO post (idUser, noiDung, createdAt) VALUES (?, ?, ?)', [
    pick(allIds), DIVERSE_POSTS[i], dtime(30)
  ]);
  const idPost = r.insertId;
  for (let k = 0; k < ri(0, 3); k++) {
    await conn.query('INSERT INTO comment (idPost, idUser, noiDung, createdAt) VALUES (?, ?, ?, ?)', [
      idPost, pick(allIds), pick(DIVERSE_COMMENTS), dtime(30)
    ]);
  }
  const liked = new Set();
  for (let k = 0; k < ri(0, 5); k++) {
    const u = pick(allIds);
    if (liked.has(u)) continue;
    liked.add(u);
    await conn.query('INSERT IGNORE INTO likepost (idPost, idUser, createdAt) VALUES (?, ?, ?)', [idPost, u, dtime(30)]);
  }
}
console.log('Đã tạo 20 bài viết về sự kiện & đa ngành.');

const cnt = async (t) => (await conn.query(`SELECT COUNT(*) c FROM ${t}`))[0][0].c;
console.log('\n===== TỔNG KẾT DỮ LIỆU MẪU =====');
console.log('Người dùng:', await cnt('user'));
console.log('Hồ sơ:', await cnt('hoso'));
console.log('Kỹ năng chuyên môn:', await cnt('chuyenmon'));
console.log('Danh mục kỹ năng:', await cnt('ky_nang'));
console.log('Năng lực cá nhân:', await cnt('nhan_su_ky_nang'));
console.log('Kết nối:', await cnt('ketnoi'));
console.log('Dự án:', await cnt('duan'));
console.log('Công việc:', await cnt('task'));
console.log('Tuyển dụng:', await cnt('tintuyendung'));
console.log('Bài viết:', await cnt('post'));
console.log('Bình luận:', await cnt('comment'));
console.log('Lượt thích:', await cnt('likepost'));

await conn.end();
console.log('\nHoàn tất bổ sung dữ liệu đa ngành.');


