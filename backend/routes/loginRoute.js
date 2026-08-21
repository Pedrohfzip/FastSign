import Router from 'express';
import AuthController from '../controllers/AuthController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const loginRouter = Router();

loginRouter.post('/register', AuthController.register);
loginRouter.post('/login', AuthController.login);
loginRouter.post('/logout', AuthController.logout);
loginRouter.get('/me', requireAuth, AuthController.me);
loginRouter.patch('/me', requireAuth, AuthController.updateProfile);
loginRouter.put('/password', requireAuth, AuthController.changePassword);

export default loginRouter;