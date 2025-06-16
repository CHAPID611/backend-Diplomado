import 'reflect-metadata';
import { DataSource } from 'typeorm';
import 'dotenv/config';

// Importar funciones de seed
import { seedRoles } from './roles.seed';
import { seedBloodTypes } from './blood-types.seed';
import { seedStates } from './new-states.seed';
import { seedRanges } from './new-ranges.seed';
import { seedCompetencias } from './new-competencias.seed';
import { emergencyTypesSeed } from './emergency-types.seed';

const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [__dirname + '/../../modules/**/*.entity.{ts,js}'],
  synchronize: false,
  logging: false,
});

async function runSeeds() {
  try {
    await AppDataSource.initialize();
    console.log('🚀 Conexión a la base de datos establecida');

    console.log('📊 Ejecutando seeds...');
    
    await seedRoles(AppDataSource);
    await emergencyTypesSeed(AppDataSource);
    await seedBloodTypes(AppDataSource);
    await seedStates(AppDataSource);
    await seedRanges(AppDataSource);
    await seedCompetencias(AppDataSource);

    console.log('✅ Todos los seeds ejecutados correctamente');
  } catch (error) {
    console.error('❌ Error ejecutando seeds:', error);
  } finally {
    await AppDataSource.destroy();
    console.log('👋 Conexión cerrada');
  }
}

runSeeds(); 