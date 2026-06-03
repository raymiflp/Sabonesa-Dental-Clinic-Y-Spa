import { Router } from 'express';
import * as presupuestosController from '../controllers/presupuestos.js';

const router = Router();

router.get('/paciente/:pacienteId', presupuestosController.getByPaciente);
router.post('/', presupuestosController.create);
router.put('/:id', presupuestosController.update);
router.delete('/:id', presupuestosController.remove);

export default router;
