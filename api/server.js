// server.js
const jsonServer = require('json-server');
const path = require('path');
const server = jsonServer.create();
const router = jsonServer.router(path.join(__dirname, '..', 'data', 'data.json'));
const middlewares = jsonServer.defaults();
const cors = require('cors');

// Enable CORS
server.use(cors());

// Use JSON Server's default middlewares and router
server.use(middlewares);
server.use(router);

// Export (no `listen()` call here)
module.exports = server;
