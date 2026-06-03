import { Router } from 'express';
import * as procedimientosController from '../controllers/procedimientos.js';

const router = Router();

router.get('/', procedimientosController.getAll);
router.get('/categorias', procedimientosController.getCategorias);
router.post('/', procedimientosController.create);
router.put('/:id', procedimientosController.update);
router.delete('/:id', procedimientosController.remove);
router.post('/categorias', procedimientosController.createCategoria);
router.put('/categorias/:id', procedimientosController.updateCategoria);
router.delete('/categorias/:id', procedimientosController.deleteCategoria);

export default router;
