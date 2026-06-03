import { Router } from 'express';
import * as pacientesController from '../controllers/pacientes.js';

const router = Router();

router.get('/', pacientesController.getAll);
router.get('/:id', pacientesController.getById);
router.post('/', pacientesController.create);
router.put('/:id', pacientesController.update);
router.delete('/:id', pacientesController.remove);

export default router;
