import Router from 'express';
import docRouter from './documentRouter.js';
import authRouter from './loginRoute.js';
const router = Router();


router.use('/documents', docRouter);
router.use('/auth', authRouter);



export default router;