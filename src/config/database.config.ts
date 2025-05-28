import { registerAs } from '@nestjs/config';

export default registerAs('database', () => {
  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT;
  const username = process.env.DB_USERNAME;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_DATABASE;

  if (!host || !port || !username || !password || !database) {
    throw new Error('Missing required database configuration');
  }

  return {
    type: 'mysql',
    host,
    port: parseInt(port, 10),
    username,
    password,
    database,
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: process.env.NODE_ENV === 'development',
  };
}); 