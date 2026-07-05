import Router from 'express';
import docRouter from './documentRouter.js';
import loginRouter from './loginRoute.js';
const router = Router();


router.use('/documents', docRouter);
router.use('/auth', loginRouter);


export default router;