import express from 'express';
import cors from 'cors';
import { apiRouter } from '../src/api';

const app = express();

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Handle both direct /api/... requests and rewritten /... requests
app.use('/api', apiRouter);
app.use('/', apiRouter);

export default app;
