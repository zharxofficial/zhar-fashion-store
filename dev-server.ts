// Local development only: serves the Vite frontend and the same /api used on Vercel.
import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import api from './api/index.ts';

const app = express();
app.use(api);
const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
app.use(vite.middlewares);
app.listen(3000, () => console.log('ZHĀR dev server: http://localhost:3000'));
