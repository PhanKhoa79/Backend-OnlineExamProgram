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
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)
![Redis](https://img.shields.io/badge/redis-%23DD0031.svg?style=for-the-badge&logo=redis&logoColor=white)

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

**Database & Cache** 🗄️

- **PostgreSQL** - Hệ quản trị cơ sở dữ liệu quan hệ
- **Redis** - In-memory cache và session store
- **TypeORM** v0.3.22 - Object-Relational Mapping

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

**DevOps & Deployment** 🚀

- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **Health Checks** - Service monitoring
- **Multi-stage Build** - Optimized images

</td>
</tr>
</table>

---

## 🐳 Cài Đặt với Docker (Khuyến nghị)

### 📋 Yêu Cầu Hệ Thống

- **Docker** >= 20.x
- **Docker Compose** >= 2.x
- **Git** để clone project

### ⚙️ Cài Đặt Nhanh

1. **Clone dự án** 📥

```bash
git clone https://github.com/your-repo/backend-onlineexam-program.git
cd backend-onlineexam-program
```

2. **Cấu hình môi trường** 🔧

```bash
# Tạo file .env từ template
cp .env.example .env

# Chỉnh sửa các biến môi trường cần thiết
nano .env
```

3. **Khởi chạy với Docker** 🚀

```bash
# Build và khởi chạy tất cả services
docker-compose up -d --build

# Kiểm tra trạng thái services
docker-compose ps

# Xem logs
docker-compose logs -f api
```

🌐 **API sẽ chạy tại:** `http://localhost:5000/api`

### 🔧 Quản Lý Container

```bash
# Dừng tất cả services
docker-compose down

# Dừng và xóa volumes (CẢNH BÁO: Sẽ mất dữ liệu)
docker-compose down -v

# Rebuild chỉ API service
docker-compose up -d --build api

# Xem logs real-time
docker-compose logs -f

# Truy cập vào container
docker-compose exec api sh
```

### 🗄️ Quản Lý Database

```bash
# Chạy migrations
docker-compose exec api npm run migration:run

# Seed dữ liệu mẫu
docker-compose exec api npm run seed

# Backup database
docker-compose exec postgres pg_dump -U postgres online_exam > backup.sql

# Restore database
docker-compose exec -T postgres psql -U postgres online_exam < backup.sql
```

---

## 🛠️ Cài Đặt Thủ Công (Development)

### 📋 Yêu Cầu Hệ Thống

- **Node.js** >= 16.x
- **PostgreSQL** >= 12.x
- **Redis** >= 6.x
- **npm** hoặc **yarn**

### ⚙️ Cài Đặt

1. **Clone dự án** 📥

```bash
git clone https://github.com/your-repo/backend-onlineexam-program.git
cd backend-onlineexam-program
```

2. **Cài đặt dependencies** 📦

```bash
bun install
# hoặc
npm install
```

3. **Cấu hình môi trường** 🔧

```bash
# Tạo file .env và cấu hình các biến môi trường
cp .env.example .env
```

4. **Setup Database** 🗄️

```bash
# Tạo database PostgreSQL
createdb online_exam

# Chạy migrations
npm run migration:run

# Seed dữ liệu mẫu
npm run seed
```

### 🎯 Khởi Chạy Ứng dụng

```bash
# Chế độ phát triển (Development)
bun run start:dev

# Chế độ debug
bun run start:debug

# Chế độ production
bun run start:prod
```

---

## 🔧 Cấu Hình Environment Variables

### 📄 File .env mẫu

```env
# =================================
# APPLICATION CONFIGURATION
# =================================
NODE_ENV=production
API_PORT=5000

# =================================
# DATABASE CONFIGURATION
# =================================
DB_TYPE=postgres
DB_HOST=postgres  # localhost nếu không dùng docker
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_secure_password
DB_DATABASE=online_exam

# =================================
# REDIS CONFIGURATION
# =================================
REDIS_HOST=redis  # localhost nếu không dùng docker
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# =================================
# JWT CONFIGURATION
# =================================
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
JWT_EXPIRES_IN=1d
JWT_REFRESH_EXPIRES_IN=7d

# =================================
# CORS & FRONTEND CONFIGURATION
# =================================
CLIENT_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000

# =================================
# EMAIL CONFIGURATION
# =================================
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
MAIL_FROM=your-email@gmail.com
```

### 🔑 Các Biến Quan Trọng

| Biến | Mô tả | Ví dụ | Bắt buộc |
|------|-------|-------|----------|
| `DB_PASSWORD` | Mật khẩu database | `MySecretPassword123` | ✅ |
| `JWT_SECRET` | Secret key cho JWT | `super-secret-key-256-bit` | ✅ |
| `EMAIL_USER` | Email để gửi thông báo | `noreply@yourapp.com` | ✅ |
| `CLIENT_URL` | URL của frontend | `https://yourapp.com` | ✅ |
| `REDIS_PASSWORD` | Mật khẩu Redis | `redis-password` | ❌ |

---

## 🎯 Chức Năng Chính

### 👥 **Quản Lý Người Dùng**
- 🔐 **Xác thực & Phân quyền**: Đăng nhập/đăng xuất với JWT
- 👤 **Profile Management**: Quản lý thông tin cá nhân
- 🎭 **Role-based Access**: Phân quyền Giáo viên/Học sinh/Admin

### 📚 **Quản Lý Học Tập**
- 🏫 **Classes**: Quản lý lớp học và khóa học
- 📖 **Subjects**: Quản lý môn học
- 👨‍🎓 **Students**: Quản lý thông tin học sinh

### 📝 **Hệ Thống Thi Cử**
- ❓ **Questions Management**: Tạo và quản lý ngân hàng câu hỏi
- 📋 **Exam Creation**: Tạo đề thi với cấu hình linh hoạt
- 📅 **Exam Scheduling**: Lập lịch thi và phân công
- ✅ **Answer Processing**: Xử lý và lưu trữ bài làm

### 🛡️ **An Toàn & Giám Sát**
- 🔍 **Anti-Cheat System**: Hệ thống chống gian lận
- 📊 **Monitoring Logs**: Ghi log hoạt động thi cử
- 🚫 **Token Blacklist**: Quản lý token bị vô hiệu hóa

---

## 🔧 Scripts Hữu Ích

### 🐳 Docker Commands

| Command | Mô tả | Icon |
|---------|-------|------|
| `docker-compose up -d --build` | Build và khởi chạy tất cả services | 🚀 |
| `docker-compose down` | Dừng tất cả services | 🛑 |
| `docker-compose logs -f api` | Xem logs API real-time | 📋 |
| `docker-compose exec api npm run migration:run` | Chạy database migrations | 🗄️ |
| `docker-compose exec api npm run seed` | Seed dữ liệu mẫu | 🌱 |

### 💻 Development Commands

| Command | Mô tả | Icon |
|---------|-------|------|
| `bun run start:dev` | Khởi chạy development server | 🚀 |
| `bun run build` | Build cho production | 🏗️ |
| `bun run test` | Chạy unit tests | 🧪 |
| `bun run lint` | Kiểm tra code style | ✨ |

---

## 🌐 API Endpoints

### 🔐 Authentication
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/logout` - Đăng xuất
- `POST /api/auth/refresh` - Refresh token

### 👥 Users & Accounts
- `GET /api/account` - Lấy thông tin tài khoản
- `PUT /api/account` - Cập nhật thông tin
- `POST /api/account` - Tạo tài khoản mới

### 📚 Academic Management
- `GET /api/classes` - Danh sách lớp học
- `GET /api/subjects` - Danh sách môn học
- `GET /api/students` - Danh sách học sinh

### 📝 Exam System
- `GET /api/exam` - Danh sách kỳ thi
- `POST /api/exam` - Tạo kỳ thi mới
- `GET /api/questions` - Ngân hàng câu hỏi

📚 **API Documentation**: Truy cập `/api/docs` để xem Swagger documentation

---

## 🚀 Production Deployment

### 🌍 Deploy với Docker

1. **Chuẩn bị server**
```bash
# Cài đặt Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Cài đặt Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

2. **Deploy application**
```bash
# Clone code
git clone https://github.com/your-repo/backend-onlineexam-program.git
cd backend-onlineexam-program

# Cấu hình production environment
cp .env.example .env
# Chỉnh sửa .env với thông tin production

# Deploy
docker-compose -f docker-compose.yml up -d --build
```

3. **Setup Nginx (Reverse Proxy)**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🔍 Troubleshooting

### ❌ Lỗi thường gặp

**1. Container không khởi động được**
```bash
# Kiểm tra logs
docker-compose logs api

# Kiểm tra port conflict
netstat -tulpn | grep :5000
```

**2. Database connection failed**
```bash
# Kiểm tra PostgreSQL container
docker-compose logs postgres

# Test connection
docker-compose exec postgres psql -U postgres -d online_exam -c "SELECT 1;"
```

**3. Redis connection failed**
```bash
# Kiểm tra Redis container
docker-compose logs redis

# Test connection
docker-compose exec redis redis-cli ping
```

**4. Environment variables không load**
```bash
# Kiểm tra file .env
cat .env

# Restart container
docker-compose restart api
```

---

## 🤝 Đóng Góp

1. Fork dự án
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Tạo Pull Request

---

## 📝 License

Dự án này được phân phối dưới giấy phép MIT. Xem file `LICENSE` để biết thêm chi tiết.

---

## 📞 Liên Hệ

- **Email**: phankhoa1379@gmail.com

---

<div align="center">

**🎓 Được phát triển với ❤️ bởi Phan Khoa**

Made with ❤️ in Vietnam 🇻🇳

</div>
