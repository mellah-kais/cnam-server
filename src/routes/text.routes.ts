import { Router, Request, Response } from 'express';
import { TextService } from '../services/text.service';

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<any> => {
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
        return res.status(400).json({ error: 'No text provided' });
    }

    try {
        const result = await TextService.processTextToForm(text);
        res.json(result);
    } catch (error: any) {
        console.error('Text processing error:', error.message);
        res.status(500).json({
            error: 'Failed to process text',
            details: error.message,
        });
    }
});

export default router;
