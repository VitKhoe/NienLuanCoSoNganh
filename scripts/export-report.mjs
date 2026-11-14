#!/usr/bin/env node
// Xuất báo cáo đối chiếu đồ án ra file Word (.docx)
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType } from 'docx';
import fs from 'node:fs';

function cell(text, opts = {}) {
  return new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text: String(text), bold: !!opts.bold, color: opts.color })] })],
  });
}
function statusColor(t) {
  if (String(t).includes('✅')) return '1B7A33';
  if (String(t).includes('⚠️')) return 'B45309';
  if (String(t).includes('❌')) return 'B91C1C';
  return undefined;
}
function makeTable(headers, rows) {
  const h = new TableRow({ tableHeader: true, children: headers.map((x) => cell(x, { bold: true })) });
  const r = rows.map((row) => new TableRow({ children: row.map((c, i) => cell(c, { color: statusColor(c) })) }));
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [h, ...r] });
}
const H1 = (t) => new Paragraph({ text: t, heading: HeadingLevel.HEADING_1 });
const H2 = (t) => new Paragraph({ text: t, heading: HeadingLevel.HEADING_2 });
const P = (t) => new Paragraph({ text: t, spacing: { after: 120 } });
const B = (t) => new Paragraph({ text: t, bullet: { level: 0 }, spacing: { after: 60 } });

const groups = [
  {
    title: 'Nhóm 1: Quản lý Người dùng & Hồ sơ (User & Profile)',
    note: 'Khá tốt',
    rows: [
      ['1', 'Đăng ký tài khoản', '✅ Hoàn thành', 'POST /signup, băm mật khẩu scrypt'],
      ['2', 'Đăng nhập', '✅ Hoàn thành', 'POST /login'],
      ['3', 'Đăng xuất', '✅ Hoàn thành', 'POST /logout'],
      ['4', 'Cập nhật hồ sơ cá nhân', '⚠️ Một phần', 'Đổi tên/avatar/tiểu sử/SĐT (PUT /api/me/profile). Thiếu: ảnh bìa'],
      ['5', 'Quản lý hồ sơ năng lực (CV)', '⚠️ Một phần', 'Kỹ năng + chứng chỉ đã có. Thiếu: học vấn, kinh nghiệm làm việc'],
    ],
  },
  {
    title: 'Nhóm 2: Mạng xã hội & Kết nối (Social & Networking)',
    note: 'Hoàn chỉnh',
    rows: [
      ['6', 'Đăng bài viết', '✅ Hoàn thành', 'POST /api/posts'],
      ['7', 'Thả like bài viết', '✅ Hoàn thành', 'POST/DELETE /api/posts/:id/like'],
      ['8', 'Bình luận (thêm/sửa/xóa)', '✅ Hoàn thành', 'POST /api/posts/:id/comments, PUT/DELETE /api/comments/:id'],
      ['9', 'Theo dõi / kết nối', '✅ Hoàn thành', 'POST /api/connections, accept, remove'],
      ['10', 'Nhắn tin 1-1 & nhóm', '✅ Hoàn thành', 'chat.js (openPrivateChat, createGroupChat, sendMessage)'],
      ['11', 'Lưu bài viết (bookmark)', '✅ Hoàn thành', 'POST/DELETE /api/posts/:id/mark'],
    ],
  },
  {
    title: 'Nhóm 3: Tuyển dụng & Tìm việc dự án (Recruitment & Job Matching)',
    note: 'Gần như chưa làm',
    rows: [
      ['12', 'Đăng tin tuyển dụng', '✅ Hoàn thành', 'POST /api/projects/:id/recruitments'],
      ['13', 'Ứng tuyển (Apply)', '❌ Chưa có', 'Bảng ungtuyen đã có nhưng không có API nộp đơn'],
      ['14', 'Quản lý đơn ứng tuyển (duyệt/từ chối)', '❌ Chưa có', 'Không có endpoint'],
      ['15', 'Lưu tin tuyển dụng', '❌ Chưa có', 'Không có'],
    ],
  },
  {
    title: 'Nhóm 4: Quản lý Dự án (Project Management)',
    note: 'Hoàn chỉnh',
    rows: [
      ['16', 'Tạo dự án mới', '✅ Hoàn thành', 'POST /api/projects'],
      ['17', 'Cập nhật thông tin dự án', '✅ Hoàn thành', 'PUT /api/projects/:id'],
      ['18', 'Xóa / Đóng dự án', '✅ Hoàn thành', 'DELETE /api/projects/:id, PATCH .../close'],
      ['19', 'Xem chi tiết dự án', '✅ Hoàn thành', 'GET /api/project/:id'],
      ['20', 'Quản lý vai trò thành viên', '✅ Hoàn thành', 'POST /api/projects/:id/members (quan_ly/nhan_vien/khach)'],
      ['21', 'Xóa thành viên khỏi dự án', '✅ Hoàn thành', 'DELETE /api/projects/rmmember'],
      ['22', 'Thoát dự án', '✅ Hoàn thành', 'POST /api/projects/:id/leave'],
    ],
  },
  {
    title: 'Nhóm 5: Quản lý Công việc (Task Management)',
    note: 'Mới làm một phần nhỏ',
    rows: [
      ['23', 'Tạo Task', '✅ Hoàn thành', 'POST /api/tasks'],
      ['24', 'Cập nhật thông tin Task', '❌ Chưa có', 'Không có updateTask; chưa có độ ưu tiên (Gấp/Cao/Thấp)'],
      ['25', 'Xóa Task', '❌ Chưa có', 'Không có endpoint'],
      ['26', 'Phân công Task (Assign)', '❌ Chưa có', 'Bảng phancong có, chỉ đọc được (getProjectTasks), chưa có API gán'],
      ['27', 'Cập nhật trạng thái Task', '❌ Chưa có', 'Chưa có endpoint chuyển Todo -> Doing -> Done'],
      ['28', 'Thảo luận trong Task', '❌ Chưa có', 'Bảng taskcomment có nhưng không có API'],
      ['29', 'Quản lý tệp đính kèm', '⚠️ Một phần', 'Có link Google Drive cho dự án + upload ảnh bài viết/bình luận. Thiếu upload tài liệu vào Task'],
      ['30', 'Tạo nhắc nhở (Reminder)', '❌ Chưa có', 'Không có'],
    ],
  },
  {
    title: 'Nhóm 6: Hệ thống & Dữ liệu báo cáo (System & Reporting)',
    note: 'Chưa làm gì',
    rows: [
      ['32', 'Quản lý thông báo (Notifications)', '❌ Chưa có', 'Bảng thongbao/nguoinhanthongbao có nhưng không có API'],
      ['33', 'Nhật ký hoạt động (Activity Log)', '❌ Chưa có', 'Bảng log có nhưng không code nào ghi/đọc'],
      ['34', 'Trích xuất dữ liệu thống kê', '❌ Chưa có', 'Không có API thống kê/biểu đồ'],
    ],
  },
];

const entities = [
  'Phân tích thực thể trong DB (đầy đủ):',
  'user, hoso, chuyenmon  →  post, likepost, comment, ketnoi, chatbox, message  →  tintuyendung, ungtuyen  →  duan, thanhvienduan, task, phancong, taskcomment, file  →  log, thongbao.',
  'Thực tế còn nhiều bảng hơn kế hoạch: image, bookmarks, van_kien, danhgia_thanhvien, ky_nang, nhan_su_ky_nang, nhan_su_chung_chi.',
  'DB được thiết kế đủ bảng, nhưng nhiều bảng chưa có code dùng tới (ungtuyen, taskcomment, log, thongbao, file).',
];

const improvements = [
  ['Mở rộng kho lưu trữ (file văn bản, ảnh)', '⚠️ Một phần', 'Chỉ có ảnh (post/comment) + link Drive; chưa upload file văn bản chung, chưa upload vào task'],
  ['Quản lý nhân sự chi tiết (năng lực chuyên môn)', '✅ Đã có', 'ky_nang, nhan_su_ky_nang, nhan_su_chung_chi'],
  ['Quản lý số lượng tuyển dụng, chuyên môn phù hợp', '❌ Chưa có', 'Chưa có cơ chế matching'],
  ['Mở rộng lưu trữ chứng chỉ', '✅ Đã có', 'Bảng nhan_su_chung_chi'],
  ['Mở rộng quản lý công việc', '⚠️ Một phần', 'Thiếu update/delete/assign/comment/priority/reminder'],
  ['Trang quản lý riêng cho admin', '❌ Chưa có', 'Cột QuyenCSDL có nhưng không dùng'],
];

const conclusions = [
  ['Nhóm 2 (Social)', '✅ 100%'],
  ['Nhóm 4 (Project)', '✅ 100%'],
  ['Nhóm 1 (User/Profile)', '🟡 ~70%'],
  ['Nhóm 3 (Recruitment)', '🔴 ~25% (chỉ đăng tin)'],
  ['Nhóm 5 (Task)', '🔴 ~20% (chỉ tạo + xem)'],
  ['Nhóm 6 (System/Report)', '🔴 0%'],
];

const recommendations = [
  'Nhóm 5 (Task): cập nhật/xóa task, phân công, chuyển trạng thái, comment trong task (bảng đã có sẵn, chỉ cần viết API + giao diện).',
  'Nhóm 3 (Recruitment): API ứng tuyển + duyệt/từ chối + lưu tin (bảng ungtuyen đã có sẵn).',
  'Nhóm 6 (System): thông báo + nhật ký hoạt động + API thống kê.',
  'Admin page + ảnh bìa + học vấn/kinh nghiệm trong CV.',
];

const children = [];
children.push(new Paragraph({ text: 'BÁO CÁO ĐỐI CHIẾU ĐỒ ÁN VỚI BẢN KẾ HOẠCH', heading: HeadingLevel.TITLE }));
children.push(P('Đánh giá mức độ hoàn thiện của đồ án "Web Quản lý Dự án & Mạng xã hội Việc làm" so với bản kế hoạch 34 tính năng / 6 nhóm.'));

children.push(H1('Tổng quan'));
children.push(P('Kết quả: khoảng 18/33 tính năng hoàn chỉnh (~54%), 3 tính năng làm dở, 12 tính năng chưa có.'));

for (const g of groups) {
  children.push(H2(`${g.title} — ${g.note}`));
  children.push(makeTable(['#', 'Tính năng', 'Trạng thái', 'Ghi chú'], g.rows));
}

children.push(H1('Phân tích thực thể'));
for (const e of entities) children.push(P(e));

children.push(H1('Đối chiếu mục "Cần cải thiện"'));
children.push(makeTable(['Yêu cầu', 'Trạng thái', 'Ghi chú'], improvements));

children.push(H1('Kết luận'));
children.push(makeTable(['Nhóm', 'Mức độ'], conclusions));
children.push(P('Gợi ý thứ tự hoàn thiện:'));
for (const r of recommendations) children.push(B(r));

const doc = new Document({ sections: [{ children }] });
const buf = await Packer.toBuffer(doc);
const out = 'docs/Bao-cao-danh-gia-do-an.docx';
fs.mkdirSync('docs', { recursive: true });
fs.writeFileSync(out, buf);
console.log('Đã tạo file:', out);


