import { Router } from 'express';
import * as cloudinaryController from '../controllers/cloudinary.js';

const router = Router();

router.post('/upload', cloudinaryController.upload);
router.delete('/:publicId', cloudinaryController.remove);
router.post('/delete-by-url', cloudinaryController.removeByUrl);

export default router;
