import Router from 'express';
import SignController from '../controllers/SignController.js';
const signRouter = Router();

signRouter.get('/:accessToken', SignController.getByToken);
signRouter.post('/:accessToken', SignController.sign);

export default signRouter;