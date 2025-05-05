import { DataSource } from 'typeorm';
import { databaseConfig } from '../config/database.config';

export const AppDataSource = new DataSource(databaseConfig);

AppDataSource.initialize()
  .then(() => {
    console.log('✅ DataSource initialized');
    console.log('📦 Database connected:', AppDataSource.options.database);
    console.log('📦 Entities loaded:');
    console.log(AppDataSource.entityMetadatas.map((e) => e.name));
  })
  .catch((error) => console.error('❌ Error initializing DataSource:', error));
