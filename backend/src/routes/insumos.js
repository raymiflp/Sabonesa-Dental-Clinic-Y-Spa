import { Router } from 'express';
import * as insumosController from '../controllers/insumos.js';

const router = Router();

router.get('/', insumosController.getAll);
router.get('/:id', insumosController.getById);
router.post('/', insumosController.create);
router.put('/:id', insumosController.update);
router.delete('/:id', insumosController.remove);

export default router;
