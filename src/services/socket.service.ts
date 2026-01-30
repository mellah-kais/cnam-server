
import { Server, Socket } from 'socket.io';
import { VoiceService } from './voice.service';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export class SocketService {
    private io: Server;
    private sessions: Map<string, {
        buffer: Buffer;
        lastPartialTime: number;
        language: string;
        isProcessing: boolean;
    }> = new Map();

    constructor(io: Server) {
        this.io = io;
        this.setupHandlers();
    }

    private setupHandlers() {
        this.io.on('connection', (socket: Socket) => {
            console.log(`[SOCKET] 👤 Client connected: ${socket.id}`);

            socket.on('start_stream', (data: { lang: string }) => {
                console.log(`[SOCKET] 🎙️ Starting stream for ${socket.id} (lang: ${data.lang})`);
                this.sessions.set(socket.id, {
                    buffer: Buffer.alloc(0),
                    lastPartialTime: Date.now(),
                    language: data.lang || 'ar',
                    isProcessing: false
                });
                socket.emit('stream_ready');
            });

            socket.on('audio_data', async (chunk: Buffer) => {
                const session = this.sessions.get(socket.id);
                if (!session) return;

                session.buffer = Buffer.concat([session.buffer, Buffer.from(chunk)]);

                // Partial transcription every 5 seconds if not currently processing
                const now = Date.now();
                if (now - session.lastPartialTime > 5000 && !session.isProcessing && session.buffer.length > 32000) {
                    this.processPartial(socket, session);
                }
            });

            socket.on('stop_stream', async () => {
                console.log(`[SOCKET] ⏹️ Stopping stream for ${socket.id}`);
                const session = this.sessions.get(socket.id);
                if (!session) return;

                await this.processFinal(socket, session);
                this.sessions.delete(socket.id);
            });

            socket.on('disconnect', () => {
                console.log(`[SOCKET] 💨 Client disconnected: ${socket.id}`);
                this.sessions.delete(socket.id);
            });
        });
    }

    private async processPartial(socket: Socket, session: any) {
        session.isProcessing = true;
        session.lastPartialTime = Date.now();

        try {
            const tempFilePath = path.join('uploads', `partial_${socket.id}_${Date.now()}.wav`);

            // Prepend WAV header so FFmpeg/Whisper can parse the raw PCM stream
            const wavHeader = this.getWavHeader(session.buffer.length);
            const wavContent = Buffer.concat([wavHeader, session.buffer]);

            fs.writeFileSync(tempFilePath, wavContent);

            const result = await VoiceService.transcribeOnly(tempFilePath, session.language);

            socket.emit('transcription_partial', { text: result });

            if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
        } catch (error) {
            console.error('[SOCKET] Partial processing error:', error);
        } finally {
            session.isProcessing = false;
        }
    }

    private async processFinal(socket: Socket, session: any) {
        try {
            const tempFilePath = path.join('uploads', `final_${socket.id}_${Date.now()}.wav`);

            const wavHeader = this.getWavHeader(session.buffer.length);
            const wavContent = Buffer.concat([wavHeader, session.buffer]);

            fs.writeFileSync(tempFilePath, wavContent);

            const result = await VoiceService.processVoiceToForm(
                tempFilePath,
                `stream_${socket.id}.wav`,
                wavContent.length,
                session.language
            );

            socket.emit('transcription_final', result);

            if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
        } catch (error: any) {
            console.error('[SOCKET] Final processing error:', error);
            socket.emit('error', { message: error.message });
        }
    }

    private getWavHeader(dataLength: number): Buffer {
        const sampleRate = 16000;
        const numChannels = 1;
        const bitsPerSample = 16;
        const byteRate = sampleRate * numChannels * bitsPerSample / 8;
        const blockAlign = numChannels * bitsPerSample / 8;

        const header = Buffer.alloc(44);
        header.write('RIFF', 0);
        header.writeUInt32LE(36 + dataLength, 4);
        header.write('WAVE', 8);
        header.write('fmt ', 12);
        header.writeUInt32LE(16, 16);
        header.writeUInt16LE(1, 20); // PCM
        header.writeUInt16LE(numChannels, 22);
        header.writeUInt32LE(sampleRate, 24);
        header.writeUInt32LE(byteRate, 28);
        header.writeUInt16LE(blockAlign, 32);
        header.writeUInt16LE(bitsPerSample, 34);
        header.write('data', 36);
        header.writeUInt32LE(dataLength, 40);

        return header;
    }
}
