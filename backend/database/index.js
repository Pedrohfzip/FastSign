import { Sequelize } from 'sequelize';

const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'db',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'fastsign',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || '123',
});

export default sequelize;