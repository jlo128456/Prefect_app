const express = require('express');
const jsonServer = require('json-server');
const path = require('path');
const cors = require('cors');

const app = express();

// Serve static files from the public folder
app.use(express.static(path.join(__dirname, '..', 'public')));

const router = jsonServer.router(path.join(__dirname, '..', 'data', 'data.json'));
const middlewares = jsonServer.defaults();

app.use(cors());
app.use(middlewares);
app.use(router);

// Instead of app.listen(), export the app for Vercel
module.exports = app;
