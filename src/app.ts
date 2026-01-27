
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import routes from './routes';

const app = express();

app.use(morgan('dev'));
app.use(cors());
app.use(express.json());

// Main status endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

// Manual log to verify any traffic at all
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Entry page
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

// Mount Routes
app.use('/api', routes);

// Handle ghost POST requests from old Next.js clients
app.post('/', (req, res) => {
    res.json({ message: "This is the CNAM API. Please update your client or clear browser cache." });
});

export default app;
