const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

async function createStudentTemplates() {
  // Ensure templates directory exists
  const templatesDir = path.join(process.cwd(), 'uploads', 'templates');
  if (!fs.existsSync(templatesDir)) {
    fs.mkdirSync(templatesDir, { recursive: true });
  }

  // Create Excel template
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Students');

  // Define columns
  worksheet.columns = [
    { header: 'Student Code', key: 'studentCode', width: 15 },
    { header: 'Full Name', key: 'fullName', width: 25 },
    { header: 'Gender', key: 'gender', width: 10 },
    { header: 'Date of Birth', key: 'dateOfBirth', width: 15 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Phone Number', key: 'phoneNumber', width: 15 },
    { header: 'Address', key: 'address', width: 30 },
    { header: 'Class ID', key: 'classId', width: 10 },
  ];

  // Add sample data
  worksheet.addRow({
    studentCode: 'SV001',
    fullName: 'Nguyễn Văn A',
    gender: 'Nam',
    dateOfBirth: '2000-01-01',
    email: 'nguyenvana@example.com',
    phoneNumber: '0123456789',
    address: 'Hà Nội',
    classId: 1,
  });

  worksheet.addRow({
    studentCode: 'SV002',
    fullName: 'Trần Thị B',
    gender: 'Nữ',
    dateOfBirth: '2001-02-15',
    email: 'tranthib@example.com',
    phoneNumber: '0987654321',
    address: 'Hồ Chí Minh',
    classId: 2,
  });

  // Style header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };

  // Save Excel file
  const excelPath = path.join(templatesDir, 'student_template.xlsx');
  await workbook.xlsx.writeFile(excelPath);

  // Create CSV template
  const csvContent = [
    'studentCode,fullName,gender,dateOfBirth,email,phoneNumber,address,classId',
    'SV001,Nguyễn Văn A,Nam,2000-01-01,nguyenvana@example.com,0123456789,Hà Nội,1',
    'SV002,Trần Thị B,Nữ,2001-02-15,tranthib@example.com,0987654321,Hồ Chí Minh,2'
  ].join('\n');

  const csvPath = path.join(templatesDir, 'student_template.csv');
  fs.writeFileSync(csvPath, '\uFEFF' + csvContent, 'utf8'); // Add BOM for UTF-8

  console.log('✅ Student templates created successfully!');
  console.log(`📄 Excel template: ${excelPath}`);
  console.log(`📄 CSV template: ${csvPath}`);
}

// Run if called directly
if (require.main === module) {
  createStudentTemplates().catch(console.error);
}

module.exports = { createStudentTemplates }; 