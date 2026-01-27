
import { Request, Response } from 'express';
import { VoiceService } from '../services/voice.service';
import fs from 'fs';

export const processVoice = async (req: Request, res: Response) => {
    const file = (req as any).file;
    if (!file) {
        return res.status(400).json({ error: 'No audio file provided' });
    }

    const filePath = file.path;

    try {
        const result = await VoiceService.processVoiceToForm(filePath, file.originalname, file.size);
        res.json(result);
    } catch (error: any) {
        console.error('Processing error:', error.message);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

        res.status(500).json({
            error: 'Failed to process audio',
            details: error.message,
            tip: 'Ensure Ollama is running on the server'
        });
    }
};
