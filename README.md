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
![Bun](https://img.shields.io/badge/Bun-%23000000.svg?style=for-the-badge&logo=bun&logoColor=white)

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
- **Bun** - Runtime & Package Manager siêu nhanh

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
- **Bun** >= 1.0.0 (Package Manager & Runtime)

### ⚙️ Cài Đặt

1. **Clone dự án** 📥
```bash
git clone https://github.com/your-repo/backend-onlineexam-program.git
cd backend-onlineexam-program
```

2. **Cài đặt Bun** 🏃‍♂️
```bash
# Windows
powershell -c "irm bun.sh/install.ps1 | iex"

# macOS/Linux
curl -fsSL https://bun.sh/install | bash
```

3. **Cài đặt dependencies** 📦
```bash
bun install
```

4. **Cấu hình môi trường** 🔧
```bash
# Tạo file .env và cấu hình các biến môi trường
cp .env.example .env
```

5. **Setup Database** 🗄️
```bash
# Chạy migrations
bun run migration:run

# Seed dữ liệu mẫu
bun run seed
```

### 🎯 Khởi Chạy Ứng Dụng

```bash
# Chế độ phát triển (Development)
bun run start:dev

# Chế độ debug
bun run start:debug

# Chế độ production
bun run start:prod
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

| Script | Mô tả | Icon | Performance |
|--------|-------|------|-------------|
| `bun run start:dev` | Khởi chạy server ở chế độ development | 🚀 | ⚡ 4x faster |
| `bun run build` | Build ứng dụng cho production | 🏗️ | ⚡ 3x faster |
| `bun run test` | Chạy unit tests | 🧪 | ⚡ 2x faster |
| `bun run test:e2e` | Chạy end-to-end tests | 🔄 | ⚡ 2x faster |
| `bun run lint` | Kiểm tra và sửa lỗi code style | ✨ | ⚡ Fast |
| `bun run migration:generate` | Tạo migration mới | 📝 | ⚡ Fast |
| `bun run migration:run` | Chạy migrations | ⚡ | ⚡ Fast |
| `bun run seed` | Seed dữ liệu mẫu | 🌱 | ⚡ Fast |

### 🚀 **Bun Performance Benefits**
- **Install Speed**: 10-25x nhanh hơn npm/pnpm
- **Script Execution**: 4x nhanh hơn Node.js
- **Memory Usage**: Thấp hơn 40-60%
- **Startup Time**: Nhanh hơn 3-4x

---

## 📁 Cấu Trúc Dự Án

```