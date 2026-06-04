import { Router } from 'express';
import { login, register, me, changePassword, verifyPassword } from '../controllers/auth.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/roles.js';

const router = Router();

router.post('/login', login);
router.post('/register', authMiddleware, requireRole('admin'), register);
router.get('/me', authMiddleware, me);
router.post('/change-password', authMiddleware, changePassword);
router.post('/verify-password', authMiddleware, verifyPassword);

export default router;
