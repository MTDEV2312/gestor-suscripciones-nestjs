import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env relative to current working directory
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const isPostgres = process.env.DB_TYPE === 'postgres';
const isCompiled = __filename.endsWith('.js') || __dirname.includes('dist');

const entitiesPath = isCompiled
  ? path.resolve(__dirname, '../**/*.entity.js')
  : path.resolve(__dirname, '../**/*.entity.ts');

const migrationsPath = isCompiled
  ? path.resolve(__dirname, './migrations/*.js')
  : path.resolve(__dirname, './migrations/*.ts');

export const dataSourceOptions: DataSourceOptions = isPostgres
  ? {
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'postgres',
      synchronize: false,
      logging: process.env.DB_LOGGING === 'true',
      entities: [entitiesPath],
      migrations: [migrationsPath],
    }
  : {
      type: 'better-sqlite3',
      database: process.env.DB_DATABASE || 'database.sqlite',
      synchronize: false,
      logging: process.env.DB_LOGGING === 'true',
      entities: [entitiesPath],
      migrations: [migrationsPath],
    };

export const AppDataSource = new DataSource(dataSourceOptions);
export default AppDataSource;
