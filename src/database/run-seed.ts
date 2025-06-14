import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { seedRoles } from './seeds/roles.seed';

config();

const {
  DB_HOST,
  DB_PORT,
  DB_USERNAME,
  DB_PASSWORD,
  DB_DATABASE,
  NODE_ENV,
  DB_SSL,
} = process.env;

if (!DB_HOST || !DB_PORT || !DB_USERNAME || !DB_PASSWORD || !DB_DATABASE) {
  throw new Error('Faltan variables de entorno requeridas para la base de datos');
}

const dataSource = new DataSource({
  type: 'postgres',
  host: DB_HOST,
  port: parseInt(DB_PORT, 10),
  username: DB_USERNAME,
  password: DB_PASSWORD,
  database: DB_DATABASE,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: NODE_ENV !== 'production',
  logging: NODE_ENV !== 'production',
  ssl: DB_SSL === 'true' ? {
    rejectUnauthorized: false
  } : false,
});

async function runSeed() {
  try {
    await dataSource.initialize();
    console.log('Ejecutando seeders...');

    // Ejecutar seeders
    await seedRoles(dataSource);

    console.log('Seeders ejecutados exitosamente');
    await dataSource.destroy();
  } catch (error) {
    console.error('Error ejecutando seeders:', error);
    process.exit(1);
  }
}

runSeed(); 