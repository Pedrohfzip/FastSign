import Router from 'express';
import AuthController from '../controllers/AuthController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const loginRouter = Router();

loginRouter.post('/register', AuthController.register);
loginRouter.post('/login', AuthController.login);
loginRouter.post('/logout', AuthController.logout);
loginRouter.get('/me', AuthController.me);

export default loginRouter;