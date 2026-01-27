
import { Router } from 'express';
import * as syncController from '../controllers/sync.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.post('/patients', syncController.syncPatients);
router.post('/bulletins', syncController.syncBulletins);
router.post('/bordereaux', syncController.syncBordereaux);

export default router;
