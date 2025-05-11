import { DataSource } from 'typeorm';
import { Accounts } from '../entities/Accounts';
import * as bcrypt from 'bcrypt';
import { AppDataSource } from '../data-source';

async function seed() {
  await AppDataSource.initialize();
  // other logic...
}
seed();
export const seedAccounts = async (dataSource: DataSource) => {
  const accountRepo = AppDataSource.getRepository(Accounts);

  const accountsData: Array<Partial<Accounts>> = [
    {
      accountname: 'PhanKhoa79',
      password: await bcrypt.hash('password123', 10),
      email: 'phankhoa1379@gmail.com',
      role: 'student', // 'student' | 'teacher' | 'admin'
      isActive: false,
      activationToken: null,
    },
    {
      accountname: 'Khoahihi79',
      password: await bcrypt.hash('password123', 10),
      email: 'khoafalke@gmail.com',
      role: 'student', // 'student' | 'teacher' | 'admin'
      isActive: false,
      activationToken: null,
    },
    {
      accountname: 'Khoahoho79',
      password: await bcrypt.hash('password123', 10),
      email: 'kienkhoa1379@gmail.com',
      role: 'student', // 'student' | 'teacher' | 'admin'
      isActive: false,
      activationToken: null,
    },
  ];

  await accountRepo.save(accountsData);

  console.log('✅ Seeded Accounts thành công!');
};
