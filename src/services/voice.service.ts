import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';
import { WHISPER_URL, OLLAMA_URL, OLLAMA_MODEL } from '../config/config';
import { generateVoicePrompt, WHISPER_INITIAL_PROMPTS } from '../utils/prompts';

export class VoiceService {
    static async processVoiceToForm(filePath: string, originalName: string, size: number, lang: string = 'ar') {
        console.log('='.repeat(60));
        console.log('[VOICE-TO-FORM] 🎤 New request');
        console.log('[VOICE-TO-FORM] 📁 File:', originalName, 'Size:', size, 'bytes');

        const startTime = Date.now();

        // 1. Transcribe with Local Whisper
        const initialPrompt = (WHISPER_INITIAL_PROMPTS[lang] || WHISPER_INITIAL_PROMPTS['ar']) as string;

        // Build Whisper URL with parameters
        const urlParams: any = {
            task: 'transcribe',
            language: lang,
            encode: 'true',
            output: 'json',
            initial_prompt: initialPrompt
        };

        const whisperParams = new URLSearchParams(urlParams);

        const fullWhisperUrl = `${WHISPER_URL}?${whisperParams.toString()}`;
        console.log('[WHISPER] 📤 Sending audio to:', fullWhisperUrl);

        const formData = new FormData();
        // Standard Whisper API usually expects 'file' or 'audio_file'
        formData.append('audio_file', fs.createReadStream(filePath), {
            filename: originalName,
            contentType: 'audio/wav'
        });

        let text: string;
        try {
            const whisperResponse = await axios.post(fullWhisperUrl, formData, {
                headers: {
                    ...formData.getHeaders(),
                },
                maxBodyLength: Infinity,
                maxContentLength: Infinity,
                timeout: 300000, // 5 minutes timeout for large model
            });

            // Whisper response handling
            if (typeof whisperResponse.data === 'string') {
                text = whisperResponse.data;
            } else if (whisperResponse.data.text) {
                text = whisperResponse.data.text;
            } else if (whisperResponse.data.transcription) {
                text = whisperResponse.data.transcription;
            } else {
                text = JSON.stringify(whisperResponse.data);
            }

            console.log('[WHISPER] ✅ Transcription:', text);
            console.log(`[WHISPER] ⏱️ Time: ${Date.now() - startTime}ms`);
        } catch (error: any) {
            console.log('[WHISPER] ❌ Error:', error.message);
            if (error.response) {
                console.log('[WHISPER] 📦 Response data:', error.response.data);
            }
            throw new Error(`Whisper transcription failed: ${error.message}`);
        }

        if (!text || text.trim().length === 0) {
            throw new Error('No speech detected');
        }

        // 2. Parse with Local LLM (Ollama)
        const ollamaStartTime = Date.now();
        const prompt = generateVoicePrompt(text.trim(), lang);
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
