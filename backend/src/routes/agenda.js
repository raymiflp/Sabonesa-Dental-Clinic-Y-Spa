import { Router } from 'express';
import * as agendaController from '../controllers/agenda.js';

const router = Router();

router.get('/', agendaController.getAll);
router.post('/', agendaController.create);
router.put('/:id', agendaController.update);
router.delete('/:id', agendaController.remove);

export default router;
