
import { Router } from 'express';
import authRoutes from './auth.routes';
import syncRoutes from './sync.routes';
import voiceRoutes from './voice.routes';
import textRoutes from './text.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/sync', syncRoutes);
router.use('/voice-to-form', voiceRoutes);
router.use('/text-to-form', textRoutes);

export default router;
