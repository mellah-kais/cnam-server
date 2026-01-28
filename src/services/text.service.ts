import axios from 'axios';
import { OLLAMA_URL, OLLAMA_MODEL } from '../config/config';
import { generateVoicePrompt } from '../utils/prompts';

export class TextService {
    static async processTextToForm(text: string) {
        console.log('='.repeat(60));
        console.log('[TEXT-TO-FORM] 🎤 Received text:', text);
        console.log('[TEXT-TO-FORM] ⏱️ Starting processing...');

        const startTime = Date.now();

        // Parse with Local Qwen2
        const prompt = generateVoicePrompt(text);
        console.log('[OLLAMA] 📤 Sending prompt to:', OLLAMA_URL);
        console.log('[OLLAMA] 🤖 Model:', OLLAMA_MODEL);
        console.log('[OLLAMA] 📝 Prompt preview:', prompt.substring(0, 200) + '...');

        try {
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
            console.log('[OLLAMA] ✅ Raw response:', resultText);

            const jsonMatch = resultText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                console.log('[OLLAMA] ❌ No JSON found in response');
                throw new Error("Could not find JSON in Qwen response");
            }

            const resultJson = JSON.parse(jsonMatch[0]);
            console.log('[OLLAMA] 🎯 Parsed JSON:', JSON.stringify(resultJson, null, 2));
            console.log(`[TEXT-TO-FORM] ⏱️ Total time: ${Date.now() - startTime}ms`);
            console.log('='.repeat(60));

            return {
                transcript: text,
                data: resultJson
            };
        } catch (error: any) {
            console.log('[OLLAMA] ❌ Error:', error.message);
            throw error;
        }
    }
}

