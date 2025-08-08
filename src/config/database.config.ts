import { DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();
export const databaseConfig: DataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  entities: [__dirname + '/../database/entities/*.{ts,js}'],
  migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
  migrationsRun: true,
  synchronize: false,
  logging: true,
};
