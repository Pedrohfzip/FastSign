import Router from 'express';
import DocController from '../controllers/DocController.js';
const docRouter = Router();

docRouter.post('/', DocController.upload);

export default docRouter;