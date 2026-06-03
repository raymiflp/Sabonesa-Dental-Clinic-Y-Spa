import { Router } from 'express';
import * as crediticioController from '../controllers/crediticio.js';

const router = Router();

router.get('/', crediticioController.getAll);
router.get('/paciente/:pacienteId', crediticioController.getByPaciente);
router.post('/', crediticioController.create);
router.put('/:id', crediticioController.update);
router.delete('/:id', crediticioController.remove);

export default router;
