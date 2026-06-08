import express from 'express';
import cors from 'cors';
import sequelize from './database/index.js';
import router from './routes/index.js';
const app = express();

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());


app.use('/api', router);

const start = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database conectado.');

        app.listen(3001, () => {
            console.log('Server rodando na porta 3001');
        });
    } catch (error) {
        console.error('Erro ao conectar banco:', error);
        process.exit(1); // encerra se o banco falhou
    }
};

start();