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
      accountname: 'student01',
      password: await bcrypt.hash('password123', 10),
      email: 'student01@example.com',
      role: 'student',  // Đây sẽ là 'student' | 'teacher' | 'admin'
      isActive: true,
      activationToken: null,
    },
    {
      accountname: 'teacher01',
      password: await bcrypt.hash('password123', 10),
      email: 'teacher01@example.com',
      role: 'teacher',  // Cũng là 'student' | 'teacher' | 'admin'
      isActive: true,
      activationToken: null,
    },
    {
      accountname: 'admin01',
      password: await bcrypt.hash('password123', 10),
      email: 'admin01@example.com',
      role: 'admin',  // 'student' | 'teacher' | 'admin'
      isActive: true,
      activationToken: null,
    },
  ];

  await accountRepo.save(accountsData);

  console.log('✅ Seeded Accounts thành công!');
};
