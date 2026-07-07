import Router from 'express';
import DocController from '../controllers/DocController.js';
import { handleUpload } from '../middlewares/uploadMiddleware.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
const docRouter = Router();

docRouter.post('/', requireAuth, handleUpload, DocController.upload);
docRouter.get('/', requireAuth, DocController.list);
docRouter.get('/:id/file', requireAuth, DocController.getFile);
docRouter.post('/:id/signatories', requireAuth, DocController.addSignatories);
docRouter.get('/:id/signatories', requireAuth, DocController.listSignatories);


export default docRouter;