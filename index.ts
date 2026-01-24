import express, { Request, Response } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import morgan from 'morgan';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3001;

app.use(morgan('dev'));
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

// Manual log to verify any traffic at all
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

app.get('/', (req, res) => {
    res.send(`
        <h1>CNAM Assistant API</h1>
        <p>Status: Running</p>
        <p>Time: ${new Date().toISOString()}</p>
        <hr>
        <p>Available endpoints:</p>
        <ul>
            <li>GET /api/health</li>
            <li>POST /api/auth/login</li>
            <li>POST /api/auth/signup</li>
            <li>POST /api/voice-to-form</li>
        </ul>
    `);
});

// Handle ghost POST requests from old Next.js clients
app.post('/', (req, res) => {
    res.json({ message: "This is the CNAM API. Please update your client or clear browser cache." });
});

// --- Configuration & Clients ---
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { AssemblyAI } from 'assemblyai';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const upload = multer({ dest: 'uploads/' });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const assemblyAI = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY || '' });
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// --- Auth Routes ---
app.post('/api/auth/signup', async (req: Request, res: Response): Promise<any> => {
    const { name, email, password, cnamIdentifier } = req.body;
    try {
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) return res.status(400).json({ error: 'User already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await (prisma.user.create as any)({
            data: {
                name,
                email,
                password: hashedPassword,
                cnamIdentifier
            }
        });

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (error) {
        console.error("Signup error:", error);
        res.status(500).json({ error: 'Signup failed' });
    }
});

app.post('/api/auth/login', async (req: Request, res: Response): Promise<any> => {
    const { email, password } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(400).json({ error: 'Invalid credentials' });

        const isValid = await bcrypt.compare(password, (user as any).password);
        if (!isValid) return res.status(400).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// --- Middleware ---
const authenticateToken = (req: Request, res: Response, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) return res.sendStatus(403);
        (req as any).user = user;
        next();
    });
};

// --- CNAM Data Mapping (Step 3) ---
const CNAM_CODES_INFO = `
Common codes:
- SC17: Filing (Obturation)
- SC33: Devitalization (Molar)
- SC23: Devitalization (Premolar)
- SC15: Devitalization (Incisor)
- DC: Extraction (Simple)
- DC20: Extraction (Surgical)
- Z: Radiography
`;

// --- Voice to Form Route (Step 2) ---
app.post('/api/voice-to-form', upload.single('audio'), async (req: Request, res: Response): Promise<any> => {
    if (!req.file) {
        return res.status(400).json({ error: 'No audio file provided' });
    }

    const filePath = req.file.path;

    try {
        // 1. Transcribe with AssemblyAI
        const transcript = await assemblyAI.transcripts.transcribe({
            audio: filePath,
            language_code: 'fr', // Assuming Tunisian context implies French/Arabic mix, 'fr' is usually safe for medical terms
        });

        if (transcript.status === 'error') {
            throw new Error(transcript.error);
        }

        const text = transcript.text;
        if (!text) {
            return res.status(400).json({ error: 'No speech detected' });
        }

        // 2. Parse with GPT-4o-mini
        const prompt = `
        You are a Tunisian medical secretary for a dental clinic app.
        The user might want to:
        1. CREATE_BULLETIN: Add a dental act (acts like SC17, DC, extraction).
        2. CREATE_PATIENT: Register a new patient (name, cin, category).
        3. SEARCH_PATIENT: Find a patient by name or ID.
        4. NAVIGATE: Go to a screen (Dashboard, History, Patients, Analytics, Settings).

        Transcript: "${text}"

        Context Codes:
        ${CNAM_CODES_INFO}

        Return ONLY valid JSON in this format:
        {
          "intent": "CREATE_BULLETIN" | "CREATE_PATIENT" | "SEARCH_PATIENT" | "NAVIGATE",
          "entities": {
             "patientName": string | null,
             "acts": string[] | null,
             "fullName": string | null,
             "cin": string | null,
             "category": string | null,
             "query": string | null,
             "destination": string | null
          },
          "transcript": string
        }
        `;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are a helpful assistant that extracts medical data into JSON." },
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" }
        });

        const resultText = completion.choices[0]?.message?.content || "";
        const resultJson = resultText ? JSON.parse(resultText) : {};

        // Cleanup file
        fs.unlinkSync(filePath);

        res.json({
            transcript: text,
            data: resultJson
        });

    } catch (error) {
        console.error('Processing error:', error);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        res.status(500).json({ error: 'Failed to process audio' });
    }
});

// (Superseded by /api/auth routes)

// --- Patient Sync Routes ---
app.post('/api/sync/patients', authenticateToken, async (req: Request, res: Response) => {
    const { patients } = req.body;
    const dentistId = (req as any).user.userId;

    try {
        for (const patient of patients) {
            await prisma.patient.upsert({
                where: { nationalId: patient.nationalId },
                update: {
                    fullName: patient.fullName,
                    birthDate: new Date(patient.birthDate),
                    cnamCategory: patient.cnamCategory,
                    currentPlafondUsage: patient.currentPlafondUsage,
                    dentistId: dentistId
                },
                create: {
                    id: patient.id,
                    nationalId: patient.nationalId,
                    fullName: patient.fullName,
                    birthDate: new Date(patient.birthDate),
                    cnamCategory: patient.cnamCategory,
                    currentPlafondUsage: patient.currentPlafondUsage,
                    dentistId: dentistId
                }
            });
        }
        res.json({ success: true, message: 'Patients synced' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Sync failed' });
    }
});

// --- Bulletin Sync Routes ---
app.post('/api/sync/bulletins', authenticateToken, async (req: Request, res: Response) => {
    const { bulletins } = req.body;
    const dentistId = (req as any).user.userId;

    try {
        for (const bulletin of bulletins) {
            await prisma.bulletin.upsert({
                where: { id: bulletin.id },
                update: {
                    status: bulletin.status,
                    bordereauRef: bulletin.bordereauRef,
                    totalAmount: bulletin.totalAmount,
                    actCodes: Array.isArray(bulletin.actCodes) ? bulletin.actCodes.join(',') : bulletin.actCodes,
                    dentistId: dentistId
                },
                create: {
                    id: bulletin.id,
                    patientId: bulletin.patientId,
                    dentistId: dentistId,
                    visitDate: new Date(bulletin.visitDate),
                    actCodes: Array.isArray(bulletin.actCodes) ? bulletin.actCodes.join(',') : bulletin.actCodes,
                    totalAmount: bulletin.totalAmount,
                    status: bulletin.status,
                    bordereauRef: bulletin.bordereauRef
                }
            });
        }
        res.json({ success: true, message: 'Bulletins synced' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Sync failed' });
    }
});

// --- Bordereau Sync Routes ---
app.post('/api/sync/bordereaux', authenticateToken, async (req: Request, res: Response) => {
    const { bordereaux } = req.body;
    const dentistId = (req as any).user.userId;

    try {
        for (const bordereau of bordereaux) {
            await prisma.bordereau.upsert({
                where: { id: bordereau.id },
                update: {
                    status: bordereau.status,
                    totalAmount: bordereau.totalAmount,
                    expectedPaymentDate: bordereau.expectedPaymentDate ? new Date(bordereau.expectedPaymentDate) : null,
                    dentistId: dentistId
                },
                create: {
                    id: bordereau.id,
                    ref: bordereau.ref,
                    dentistId: dentistId,
                    creationDate: new Date(bordereau.creationDate),
                    totalAmount: bordereau.totalAmount,
                    status: bordereau.status,
                    expectedPaymentDate: bordereau.expectedPaymentDate ? new Date(bordereau.expectedPaymentDate) : null
                }
            });
        }
        res.json({ success: true, message: 'Bordereaux synced' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Sync failed' });
    }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
