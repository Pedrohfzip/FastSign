import Router from 'express';
import SavedSignatoryController from '../controllers/SavedSignatoryController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const savedSignatoryRouter = Router();

savedSignatoryRouter.get('/', requireAuth, SavedSignatoryController.list);
savedSignatoryRouter.delete('/:id', requireAuth, SavedSignatoryController.remove);

export default savedSignatoryRouter;
