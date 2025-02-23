// api/server.js
const express = require('express');
const path = require('path');
const cors = require('cors');
const jsonServer = require('json-server');

const app = express();

// Serve static files from ./public (same folder as server.js)
app.use(express.static(path.join(__dirname, 'public')));

// Setup json-server to serve from ./data/data.json
const router = jsonServer.router(path.join(__dirname, 'data', 'data.json'));
console.log('Resolved data.json path:', path.join(__dirname, 'data', 'data.json'));
const middlewares = jsonServer.defaults();

app.use(cors());
app.use(middlewares);
app.use(router);

module.exports = app;
