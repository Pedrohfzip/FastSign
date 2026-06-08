import Router from 'express';
import docRouter from './documentRouter.js';

const router = Router();


router.use('/documents', docRouter);



export default router;