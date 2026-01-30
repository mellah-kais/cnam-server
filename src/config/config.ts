
import { AssemblyAI } from 'assemblyai';
import dotenv from 'dotenv';
dotenv.config();

export const assemblyAI = new AssemblyAI({
    apiKey: process.env.ASSEMBLYAI_API_KEY || ''
});

export const WHISPER_URL = process.env.WHISPER_URL || 'http://172.17.0.1:9000/asr';
export const OLLAMA_URL = process.env.OLLAMA_URL || 'http://172.17.0.1:11434/api/generate';
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:0.5b-instruct-q4_0';
export const JWT_SECRET = process.env.JWT_SECRET || 'secret';

