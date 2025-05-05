import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { databaseConfig } from './config/database.config';
import { seedAccounts } from './database/seeders/accounts.seeder';

const AppDataSource = new DataSource(databaseConfig);

AppDataSource.initialize()
  .then(async () => {
    await seedAccounts(AppDataSource);
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Error seeding data:', err);
    process.exit(1);
  });
