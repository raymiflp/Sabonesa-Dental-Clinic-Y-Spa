import { Router } from 'express';
import * as historialController from '../controllers/historialClinico.js';

const router = Router();

router.get('/paciente/:pacienteId', historialController.getByPaciente);
router.post('/', historialController.create);
router.put('/:id', historialController.update);
router.delete('/:id', historialController.remove);

export default router;
