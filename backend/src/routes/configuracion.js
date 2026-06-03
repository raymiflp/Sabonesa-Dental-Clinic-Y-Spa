import { Router } from 'express';
import * as configuracionController from '../controllers/configuracion.js';

const router = Router();

router.get('/', configuracionController.getAll);
router.put('/', configuracionController.update);

export default router;
