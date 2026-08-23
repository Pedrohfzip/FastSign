import Router from 'express';
import SignController from '../controllers/SignController.js';
import { signReadLimiter, signWriteLimiter } from '../middlewares/signRateLimitMiddleware.js';
const signRouter = Router();

signRouter.get('/:accessToken', signReadLimiter, SignController.getByToken);
signRouter.get('/:accessToken/file', signReadLimiter, SignController.getFile);
signRouter.post('/:accessToken', signWriteLimiter, SignController.sign);

export default signRouter;