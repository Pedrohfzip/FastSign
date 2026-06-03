import express from 'express';
import cors from 'cors';
import sequelize from './database/index.js';

const app = express();

app.use(cors());
app.use(express.json());


app.listen(3000, async ()  => {
    try{
        await sequelize.authenticate();
        console.log('Database connection has been established successfully.');
        console.log('Server is running on port 3000');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
});