import { Router } from 'express';
import { login, register, me } from '../controllers/auth.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';

const router = Router();

router.post('/login', login);
router.post('/register', authMiddleware, requireRole('admin'), register);
router.get('/me', authMiddleware, me);

export default router;
