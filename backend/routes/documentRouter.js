import Router from 'express';
import DocController from '../controllers/DocController.js';
import { handleUpload } from '../middlewares/uploadMiddleware.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
const docRouter = Router();

docRouter.get('/', requireAuth, DocController.list);
docRouter.get('/to-sign', requireAuth, DocController.listToSign);
docRouter.get('/completed', requireAuth, DocController.listCompleted);
docRouter.get('/:id/file', requireAuth, DocController.getFile);
docRouter.get('/:id/signatories', requireAuth, DocController.listSignatories);
docRouter.get('/:id', requireAuth, DocController.getById);
docRouter.get('/:id/resume', requireAuth, DocController.getResume);

docRouter.post('/', requireAuth, handleUpload, DocController.upload);
docRouter.post('/:id/signatories', requireAuth, DocController.addSignatories);
// Reindexação manual — a indexação normal roda sozinha no upload (DocController.upload).
docRouter.post('/:id/rag/ingest', requireAuth, DocController.ingestRag);
docRouter.post('/:id/rag/ask', requireAuth, DocController.askRag);

docRouter.delete('/:id', requireAuth, DocController.remove);

export default docRouter;
