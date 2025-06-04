# 🎓 Hệ Thống Thi Trực Tuyến - Backend API

<p align="center">
  <a href="http://nestjs.com/" target="blank">
    <img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" />
  </a>
</p>

<div align="center">

![NestJS](https://img.shields.io/badge/nestjs-%23E0234E.svg?style=for-the-badge&logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/postgresql-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-black?style=for-the-badge&logo=JSON%20web%20tokens)

</div>

---

## 📖 Giới Thiệu Dự Án

**Hệ Thống Thi Trực Tuyến** là một nền tảng backend mạnh mẽ được phát triển để hỗ trợ việc tổ chức các kỳ thi trực tuyến một cách hiệu quả và an toàn. Hệ thống cung cấp đầy đủ các chức năng quản lý thi cử từ việc tạo đề thi, quản lý học sinh, giám sát thi, đến chấm điểm và thống kê kết quả.

### 🚀 Công Nghệ Sử Dụng

<table>
<tr>
<td align="center">

**Backend Framework** 🏗️
- **NestJS** v11.0.1 - Framework Node.js tiên tiến
- **TypeScript** - Ngôn ngữ lập trình type-safe
- **Express** - Web framework nhanh chóng

</td>
<td align="center">

**Database & ORM** 🗄️
- **PostgreSQL** - Hệ quản trị cơ sở dữ liệu quan hệ
- **TypeORM** v0.3.22 - Object-Relational Mapping
- **Migrations** - Quản lý phiên bản database

</td>
</tr>
<tr>
<td align="center">

**Authentication & Security** 🔐
- **JWT** (JSON Web Tokens) - Xác thực người dùng
- **Passport.js** - Middleware xác thực
- **bcrypt** - Mã hóa mật khẩu
- **Helmet** - Bảo mật HTTP headers

</td>
<td align="center">

**Additional Features** ⚡
- **Nodemailer** - Gửi email thông báo
- **Multer** - Upload file/hình ảnh
- **ExcelJS** - Xuất/nhập dữ liệu Excel
- **Class Validator** - Validation dữ liệu

</td>
</tr>
</table>

---

## 🚀 Khởi Động Dự Án

### 📋 Yêu Cầu Hệ Thống

- **Node.js** >= 16.x
- **PostgreSQL** >= 12.x
- **PNPM** (Package Manager)

### ⚙️ Cài Đặt

1. **Clone dự án** 📥
```bash
git clone https://github.com/your-repo/backend-onlineexam-program.git
cd backend-onlineexam-program
```

2. **Cài đặt dependencies** 📦
```bash
pnpm install
```

3. **Cấu hình môi trường** 🔧
```bash
# Tạo file .env và cấu hình các biến môi trường
cp .env.example .env
```

4. **Setup Database** 🗄️
```bash
# Chạy migrations
pnpm run migration:run

# Seed dữ liệu mẫu
pnpm run seed
```

### 🎯 Khởi Chạy Ứng Dụng

```bash
# Chế độ phát triển (Development)
pnpm run start:dev

# Chế độ debug
pnpm run start:debug

# Chế độ production
pnpm run start:prod
```

🌐 **Server sẽ chạy tại:** `http://localhost:5000`

---

## 🎯 Chức Năng Chính

### 👥 **Quản Lý Người Dùng**
- 🔐 **Xác thực & Phân quyền**: Đăng nhập/đăng xuất với JWT
- 👤 **Profile Management**: Quản lý thông tin cá nhân
- 🎭 **Role-based Access**: Phân quyền Giáo viên/Học sinh/Admin
- 🖼️ **Avatar Upload**: Tải lên ảnh đại diện

### 📚 **Quản Lý Học Tập**
- 🏫 **Classes**: Quản lý lớp học và khóa học
- 📖 **Subjects**: Quản lý môn học
- 👨‍🎓 **Students**: Quản lý thông tin học sinh
- 👩‍🏫 **Teachers**: Quản lý thông tin giáo viên

### 📝 **Hệ Thống Thi Cử**
- ❓ **Questions Management**: Tạo và quản lý ngân hàng câu hỏi
- 📋 **Exam Creation**: Tạo đề thi với cấu hình linh hoạt
- 📅 **Exam Scheduling**: Lập lịch thi và phân công
- ✅ **Answer Processing**: Xử lý và lưu trữ bài làm
- 🏆 **Result Management**: Chấm điểm và thống kê kết quả

### 🛡️ **An Toàn & Giám Sát**
- 🔍 **Anti-Cheat System**: Hệ thống chống gian lận
- 📊 **Monitoring Logs**: Ghi log hoạt động thi cử
- 🚫 **Token Blacklist**: Quản lý token bị vô hiệu hóa
- ⏰ **Session Control**: Kiểm soát thời gian làm bài

### 📧 **Thông Báo & Giao Tiếp**
- ✉️ **Email Notifications**: Gửi thông báo qua email
- 🔔 **In-app Notifications**: Thông báo trong ứng dụng
- 📤 **Automated Alerts**: Cảnh báo tự động

### 📊 **Báo Cáo & Thống Kê**
- 📈 **Performance Analytics**: Phân tích hiệu suất học tập
- 📋 **Excel Export/Import**: Xuất/nhập dữ liệu Excel
- 🎯 **Custom Reports**: Báo cáo tùy chỉnh

---

## 🔧 Scripts Hữu Ích

| Script | Mô tả | Icon |
|--------|-------|------|
| `pnpm run start:dev` | Khởi chạy server ở chế độ development | 🚀 |
| `pnpm run build` | Build ứng dụng cho production | 🏗️ |
| `pnpm run test` | Chạy unit tests | 🧪 |
| `pnpm run test:e2e` | Chạy end-to-end tests | 🔄 |
| `pnpm run lint` | Kiểm tra và sửa lỗi code style | ✨ |
| `pnpm run migration:generate` | Tạo migration mới | 📝 |
| `pnpm run migration:run` | Chạy migrations | ⚡ |
| `pnpm run seed` | Seed dữ liệu mẫu | 🌱 |

---

## 📁 Cấu Trúc Dự Án

```
src/
├── 📁 modules/           # Các module chức năng
│   ├── 🔐 auth/         # Xác thực & phân quyền
│   ├── 👤 account/      # Quản lý tài khoản
│   ├── 📝 exam/         # Quản lý thi cử
│   ├── ❓ questions/    # Ngân hàng câu hỏi
│   ├── 👨‍🎓 student/     # Quản lý học sinh
│   ├── 📚 subject/      # Quản lý môn học
│   ├── 🏫 classes/      # Quản lý lớp học
│   ├── ✅ answer/       # Xử lý bài làm
│   ├── 📧 email/        # Gửi email
│   └── ☁️ cloudinary/   # Upload file
├── 🗄️ database/         # Cấu hình database
│   ├── entities/        # Định nghĩa bảng
│   ├── migrations/      # Database migrations
│   └── seeders/         # Dữ liệu mẫu
├── ⚙️ config/           # Cấu hình ứng dụng
└── 🛠️ common/           # Utilities & helpers
```

---

## 🤝 Đóng Góp

Chúng tôi hoan nghênh mọi đóng góp từ cộng đồng! 

1. 🍴 Fork dự án
2. 🌿 Tạo branch mới (`git checkout -b feature/AmazingFeature`)
3. 💻 Commit thay đổi (`git commit -m 'Add some AmazingFeature'`)
4. 📤 Push lên branch (`git push origin feature/AmazingFeature`)
5. 🔍 Mở Pull Request

---

## 📄 License

Dự án này được phân phối dưới giấy phép **UNLICENSED**. Xem file `LICENSE` để biết thêm chi tiết.

---

## 📞 Liên Hệ & Hỗ Trợ

- 📧 **Email**: phankhoa1379@gmail.com
- 🌐 **Website**: https://www.facebook.com/phan.khoa.905202/

---

<div align="center">

**🌟 Nếu dự án hữu ích, hãy cho chúng tôi một star! ⭐**

*Made with ❤️ by Phan Khoa*

</div>
