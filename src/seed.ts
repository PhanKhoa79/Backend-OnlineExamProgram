import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { databaseConfig } from './config/database.config';

const AppDataSource = new DataSource(databaseConfig);

AppDataSource.initialize()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Error seeding data:', err);
    process.exit(1);
  });
