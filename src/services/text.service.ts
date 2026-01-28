import axios from 'axios';
import { OLLAMA_URL, OLLAMA_MODEL } from '../config/config';
import { generateVoicePrompt } from '../utils/prompts';

export class TextService {
    static async processTextToForm(text: string) {
        console.log('--- Processing Text to Form with Qwen2 ---');
        console.log('Input text:', text);

        const startTime = Date.now();

        // Parse with Local Qwen2
        const prompt = generateVoicePrompt(text);

        const ollamaResponse = await axios.post(OLLAMA_URL, {
            model: OLLAMA_MODEL,
            prompt: prompt,
            stream: false,
            keep_alive: 0,
            options: {
                num_predict: 250,
                temperature: 0,
                num_thread: 4,
                top_p: 0.1
            }
        });

        const resultText = ollamaResponse.data.response;
        const jsonMatch = resultText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("Could not find JSON in Qwen response");

        const resultJson = JSON.parse(jsonMatch[0]);

        console.log(`Ollama processing took ${Date.now() - startTime}ms`);

        return {
            transcript: text,
            data: resultJson
        };
    }
}
