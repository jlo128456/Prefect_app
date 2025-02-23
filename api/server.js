// server.js
import express from 'express';
import path from 'path';
import cors from 'cors';
import jsonServer from 'json-server';
import { fileURLToPath } from 'url';

const app = express();

// Create __dirname since it's not available in ES modules.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from the public folder
app.use(express.static(path.join(__dirname, 'public')));

// Setup json-server to serve from data/data.json
const router = jsonServer.router(path.join(__dirname, 'data', 'data.json'));
console.log('Resolved data.json path:', path.join(__dirname, 'data', 'data.json'));
const middlewares = jsonServer.defaults();

app.use(cors());
app.use(middlewares);
app.use(router);

export default app;
