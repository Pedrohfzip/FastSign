import Router from 'express';
import DocController from '../controllers/DocController.js';
import { handleUpload } from '../middlewares/uploadMiddleware.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
const docRouter = Router();

docRouter.post('/', requireAuth, handleUpload, DocController.upload);
docRouter.get('/', requireAuth, DocController.list);
docRouter.get('/to-sign', requireAuth, DocController.listToSign);
docRouter.get('/:id/file', requireAuth, DocController.getFile);
docRouter.post('/:id/signatories', requireAuth, DocController.addSignatories);
docRouter.get('/:id/signatories', requireAuth, DocController.listSignatories);
docRouter.get('/:id', requireAuth, DocController.getById);
docRouter.delete('/:id', requireAuth, DocController.remove);
docRouter.get('/:id/resume', requireAuth, DocController.getResume);

export default docRouter;