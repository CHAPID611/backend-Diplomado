import 'reflect-metadata';
import { DataSource } from 'typeorm';
import 'dotenv/config';

const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [__dirname + '/modules/**/*.entity.{ts,js}'],
  migrations: [__dirname + '/database/migrations/*.{ts,js}'],
  synchronize: false,
  logging: true,
});

async function runMigrations() {
  try {
    await AppDataSource.initialize();
    console.log('🚀 Conexión a la base de datos establecida');

    console.log('📊 Ejecutando migraciones...');
    await AppDataSource.runMigrations();
    console.log('✅ Migraciones ejecutadas correctamente');
  } catch (error) {
    console.error('❌ Error ejecutando migraciones:', error);
  } finally {
    await AppDataSource.destroy();
    console.log('👋 Conexión cerrada');
  }
}

runMigrations(); 