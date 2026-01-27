import axios from 'axios';
import fs from 'fs';
import { assemblyAI, OLLAMA_URL, OLLAMA_MODEL } from '../config/config';
import { generateVoicePrompt } from '../utils/prompts';

export class VoiceService {
    static async processVoiceToForm(filePath: string, originalName: string, size: number) {
        console.log('--- Processing Voice to Form with AssemblyAI + Qwen2 ---');
        console.log('File:', originalName, 'Size:', size);

        // 1. Transcribe with AssemblyAI
        const transcript = await assemblyAI.transcripts.transcribe({
            audio: filePath,
            language_code: 'fr',
        });

        if (transcript.status === 'error') {
            throw new Error(transcript.error);
        }

        const text = transcript.text;
        if (!text || text.trim().length === 0) {
            throw new Error('No speech detected');
        }

        // 2. Parse with Local Qwen2
        const prompt = generateVoicePrompt(text);

        const ollamaResponse = await axios.post(OLLAMA_URL, {
            model: OLLAMA_MODEL,
            prompt: prompt,
            stream: false,
            keep_alive: 0,
            options: {
                num_predict: 250,
                temperature: 0,
                num_thread: 2,
                top_p: 0.1
            }
        });

        const resultText = ollamaResponse.data.response;
        const jsonMatch = resultText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("Could not find JSON in Qwen response");

        const resultJson = JSON.parse(jsonMatch[0]);

        // Cleanup local storage
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

        return {
            transcript: text,
            data: resultJson
        };
    }
}
