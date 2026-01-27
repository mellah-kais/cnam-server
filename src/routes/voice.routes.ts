
import { Router } from 'express';
import multer from 'multer';
import * as voiceController from '../controllers/voice.controller';

const upload = multer({ dest: 'uploads/' });
const router = Router();

router.post('/', upload.single('audio'), voiceController.processVoice);

export default router;
