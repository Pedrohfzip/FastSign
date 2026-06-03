import { readdirSync } from 'fs';
import { join, basename as _basename } from 'path';
import { fileURLToPath } from 'url';
import Sequelize from 'sequelize';
import process from 'process';
import config from '../config/config.json' assert { type: 'json' };

// Recriando __filename e __dirname para ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = _basename(__filename); // só o nome do arquivo atual

const basename = _basename(__filename);
const env = process.env.NODE_ENV || 'development';
const envConfig = config[env];
const db = {};

let sequelize;
if (envConfig.use_env_variable) {
  sequelize = new Sequelize(process.env[envConfig.use_env_variable], envConfig);
} else {
  sequelize = new Sequelize(envConfig.database, envConfig.username, envConfig.password, envConfig);
}

// import() é assíncrono, então precisamos de uma função async
const files = readdirSync(new URL('.', import.meta.url).pathname)
  .filter(file =>
    file.indexOf('.') !== 0 &&
    file !== basename &&
    file.slice(-3) === '.js' &&
    file.indexOf('.test.js') === -1
  );

for (const file of files) {
  const { default: modelDefiner } = await import(join(new URL('.', import.meta.url).pathname, file));
  const model = modelDefiner(sequelize, Sequelize.DataTypes);
  db[model.name] = model;
}

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

export default db;