import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'mysql',
  host: configService.get('DB_HOST'),
  port: configService.get('DB_PORT'),
  username: configService.get('DB_USERNAME'),
  password: configService.get('DB_PASSWORD'),
  database: configService.get('DB_DATABASE'),
  entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
  synchronize: configService.get('NODE_ENV') !== 'production',
  logging: configService.get('NODE_ENV') !== 'production',
  ssl: configService.get('DB_SSL') === 'true' ? {
    rejectUnauthorized: false
  } : false,
  migrations: [join(__dirname, '..', 'database', 'migrations', '*.{ts,js}')],
  migrationsRun: true,
}); 