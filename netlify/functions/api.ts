import express from 'express';
import serverless from 'serverless-http';
import { apiRouter } from '../../src/api';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api', apiRouter);
app.use('/', apiRouter);

export const handler = serverless(app);
