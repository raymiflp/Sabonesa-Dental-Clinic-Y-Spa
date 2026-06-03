import { Router } from 'express';
import * as uploadController from '../controllers/upload.js';

const router = Router();

router.post('/', uploadController.uploadFoto);
router.delete('/:filename', uploadController.deleteFoto);

export default router;
