import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';
import { VOSK_URL, OLLAMA_URL, OLLAMA_MODEL } from '../config/config';
import { generateVoicePrompt } from '../utils/prompts';

export class VoiceService {
    static async processVoiceToForm(filePath: string, originalName: string, size: number) {
        console.log('='.repeat(60));
        console.log('[VOICE-TO-FORM] 🎤 New request');
        console.log('[VOICE-TO-FORM] 📁 File:', originalName, 'Size:', size, 'bytes');

        const startTime = Date.now();

        // 1. Transcribe with Local Vosk
        console.log('[VOSK] 📤 Sending audio to:', VOSK_URL);

        const formData = new FormData();
        formData.append('audio', fs.createReadStream(filePath), {
            filename: originalName,
            contentType: 'audio/wav'
        });

        let text: string;
        try {
            const voskResponse = await axios.post(VOSK_URL, formData, {
                headers: {
                    ...formData.getHeaders(),
                },
                maxBodyLength: Infinity,
                maxContentLength: Infinity,
                timeout: 60000,
            });

            // Vosk response handling
            if (typeof voskResponse.data === 'string') {
                text = voskResponse.data;
            } else if (voskResponse.data.text) {
                text = voskResponse.data.text;
            } else {
                text = JSON.stringify(voskResponse.data);
            }

            console.log('[VOSK] ✅ Transcription:', text);
            console.log(`[VOSK] ⏱️ Time: ${Date.now() - startTime}ms`);
        } catch (error: any) {
            console.log('[VOSK] ❌ Error:', error.message);
            if (error.response) {
                console.log('[VOSK] 📦 Response data:', error.response.data);
            }
            throw new Error(`Vosk transcription failed: ${error.message}`);
        }

        if (!text || text.trim().length === 0) {
            throw new Error('No speech detected');
        }

        // 2. Parse with Local Qwen2
        const ollamaStartTime = Date.now();
        const prompt = generateVoicePrompt(text.trim());
        console.log('[OLLAMA] 📤 Sending to:', OLLAMA_URL);
        console.log('[OLLAMA] 🤖 Model:', OLLAMA_MODEL);

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
            console.log(`[OLLAMA] ⏱️ Time: ${Date.now() - ollamaStartTime}ms`);

            const jsonMatch = resultText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                console.log('[OLLAMA] ❌ No JSON found in response');
                throw new Error("Could not find JSON in Qwen response");
            }

            const resultJson = JSON.parse(jsonMatch[0]);
            console.log('[OLLAMA] 🎯 Parsed JSON:', JSON.stringify(resultJson, null, 2));

            // Cleanup local storage
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

            console.log(`[VOICE-TO-FORM] ⏱️ Total time: ${Date.now() - startTime}ms`);
            console.log('='.repeat(60));

            return {
                transcript: text.trim(),
                data: resultJson
            };
        } catch (error: any) {
            console.log('[OLLAMA] ❌ Error:', error.message);
            throw error;
        }
    }
}
