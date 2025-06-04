# Student Import/Export API Documentation

## Overview
Hệ thống cung cấp các API để import và export danh sách sinh viên từ/ra file Excel (.xlsx) và CSV (.csv).

## API Endpoints

### 1. Import Students from File

**POST** `/student/import`

Import danh sách sinh viên từ file Excel hoặc CSV.

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Body (Form Data):**
- `file`: File Excel (.xlsx) hoặc CSV (.csv)
- `type`: `"xlsx"` hoặc `"csv"`

**Response:**
```json
{
  "message": "Import sinh viên thành công",
  "data": {
    "success": 2,
    "failed": 0,
    "errors": [],
    "createdStudents": [
      {
        "id": 1,
        "studentCode": "SV001",
        "fullName": "Nguyễn Văn A"
      }
    ]
  }
}
```

### 2. Export Students to File

**POST** `/student/export?format=excel`

Export danh sách sinh viên ra file Excel hoặc CSV.

**Query Parameters:**
- `format`: `"excel"` hoặc `"csv"`

**Body:**
```json
{
  "students": [
    {
      "id": 1,
      "studentCode": "SV001",
      "fullName": "Nguyễn Văn A",
      "gender": "Nam",
      "dateOfBirth": "2000-01-01",
      "email": "nguyenvana@example.com",
      "phoneNumber": "0123456789",
      "address": "Hà Nội",
      "classId": 1
    }
  ]
}
```

**Response:**
File download với tên `students.xlsx` hoặc `students.csv`

### 3. Download Template File

**GET** `/student/download-template?type=xlsx`

Tải file mẫu để import sinh viên.

**Query Parameters:**
- `type`: `"xlsx"` hoặc `"csv"`

**Response:**
File download với tên `student_template.xlsx` hoặc `student_template.csv`

## File Format Specification

### Excel/CSV Columns (theo thứ tự):

1. **Student Code** (required) - Mã sinh viên
2. **Full Name** (required) - Họ tên đầy đủ
3. **Gender** (required) - Giới tính: "Nam", "Nữ", hoặc "Khác"
4. **Date of Birth** (required) - Ngày sinh (format: YYYY-MM-DD)
5. **Email** (optional) - Email sinh viên
6. **Phone Number** (optional) - Số điện thoại
7. **Address** (optional) - Địa chỉ
8. **Class ID** (required) - ID của lớp

### Sample Data:

| Student Code | Full Name | Gender | Date of Birth | Email | Phone Number | Address | Class ID |
|-------------|-----------|--------|---------------|-------|--------------|---------|----------|
| SV001 | Nguyễn Văn A | Nam | 2000-01-01 | nguyenvana@example.com | 0123456789 | Hà Nội | 1 |
| SV002 | Trần Thị B | Nữ | 2001-02-15 | tranthib@example.com | 0987654321 | Hồ Chí Minh | 2 |

## Validation Rules

1. **Student Code**: Bắt buộc, tối đa 50 ký tự, phải unique
2. **Full Name**: Bắt buộc
3. **Gender**: Bắt buộc, chỉ chấp nhận "Nam", "Nữ", "Khác"
4. **Date of Birth**: Bắt buộc, format ISO date string (YYYY-MM-DD)
5. **Email**: Tùy chọn, phải là email hợp lệ, phải unique nếu có
6. **Phone Number**: Tùy chọn, tối đa 15 ký tự
7. **Address**: Tùy chọn
8. **Class ID**: Bắt buộc, phải tồn tại trong hệ thống

## Error Handling

### Import Errors:
- File không đúng định dạng
- Dữ liệu không hợp lệ
- Student Code hoặc Email đã tồn tại
- Class ID không tồn tại
- Thiếu các trường bắt buộc

### Response khi có lỗi:
```json
{
  "message": "Import sinh viên thành công",
  "data": {
    "success": 1,
    "failed": 1,
    "errors": [
      {
        "index": 1,
        "studentCode": "SV002",
        "error": "Email đã tồn tại"
      }
    ],
    "createdStudents": [...]
  }
}
```

## Permissions Required

- **Import**: `student:create`
- **Export**: `student:view`
- **Download Template**: `student:view`

## Notes

- File upload được giới hạn ở định dạng .xlsx và .csv
- File sẽ được tự động xóa sau khi import
- Export hỗ trợ encoding UTF-8 với BOM cho tiếng Việt
- Bulk import sử dụng transaction để đảm bảo tính nhất quán dữ liệu 