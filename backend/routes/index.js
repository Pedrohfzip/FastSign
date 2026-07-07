import Router from 'express';
import docRouter from './documentRouter.js';
import authRouter from './loginRoute.js';
import signRouter from './signRouter.js';

const router = Router();


router.use('/documents', docRouter);
router.use('/auth', authRouter);
router.use('/sign', signRouter);


export default router;