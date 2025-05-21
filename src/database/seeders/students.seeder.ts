// seedStudents.ts
import { DataSource } from 'typeorm';
import { AppDataSource } from '../data-source';
import { Students } from '../entities/Students';
import { Accounts } from '../entities/Accounts';
import { Classes } from '../entities/Classes';
import { Cohorts } from '../entities/Cohorts';

async function seed() {
  await AppDataSource.initialize();
  await seedStudents(AppDataSource);
  await AppDataSource.destroy();
}

export const seedStudents = async (dataSource: DataSource) => {
  const studentRepo = dataSource.getRepository(Students);

  const studentsData: Partial<Students>[] = [
    {
      studentCode: 'SV001',
      fullName: 'Nguyễn Văn A',
      gender: 'Nam',
      dateOfBirth: '2000-01-15',
      phoneNumber: '0901234567',
      email: 'nguyenvana@example.com',
      address: 'Hà Nội',
      // gán foreign key bằng object có id tương ứng
      account: { id: 1 } as Accounts,
      class: { id: 1 } as Classes,
      cohort: { id: 1 } as Cohorts,
    },
    {
      studentCode: 'SV002',
      fullName: 'Trần Thị B',
      gender: 'Nữ',
      dateOfBirth: '2000-02-20',
      phoneNumber: '0912345678',
      email: 'tranthib@example.com',
      address: 'Hồ Chí Minh',
      account: { id: 2 } as Accounts,
      class: { id: 1 } as Classes,
      cohort: { id: 1 } as Cohorts,
    },
    {
      studentCode: 'SV003',
      fullName: 'Lê Văn C',
      gender: 'Khác',
      dateOfBirth: '2000-03-10',
      phoneNumber: null,
      email: null,
      address: null,
      account: { id: 3 } as Accounts,
      class: { id: 2 } as Classes,
      cohort: { id: 2 } as Cohorts,
    },
  ];

  await studentRepo.save(studentsData);
  console.log('✅ Seeded Students thành công!');
};

seed();
