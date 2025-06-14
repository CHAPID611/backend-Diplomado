import { DataSource } from 'typeorm';
import { emergencyTypesSeed } from '../../modules/emergencies/seeds/emergency-types.seed';
import { seedRoles } from './roles.seed';
import { config } from 'dotenv';

config();

if (!process.env.DB_HOST || !process.env.DB_PORT || !process.env.DB_USERNAME || 
    !process.env.DB_PASSWORD || !process.env.DB_DATABASE) {
  throw new Error('Faltan variables de entorno necesarias para la base de datos');
}

const dataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
  synchronize: false,
  dropSchema: false,
  migrationsRun: false,
});

async function runSeed() {
  try {
    await dataSource.initialize();
    console.log('Ejecutando seeds...');

    // Ejecutar seeds
    await seedRoles(dataSource);
    await emergencyTypesSeed(dataSource);

    console.log('Seeds ejecutados exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('Error ejecutando seeds:', error);
    process.exit(1);
  }
}

runSeed(); 