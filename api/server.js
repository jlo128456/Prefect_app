// api/server.js
const express = require('express');
const jsonServer = require('json-server');
const path = require('path');
const cors = require('cors');

const app = express();



// Then set up json-server
const router = jsonServer.router(path.join(__dirname, '..', 'data', 'data.json'));
const middlewares = jsonServer.defaults();
app.use(cors());
app.use(middlewares);
app.use(router);

// Export for Vercel 
module.exports = app;
