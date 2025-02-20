const jsonServer = require('json-server');
const server = jsonServer.create();
const router = jsonServer.router('./data/data.json');
const middlewares = jsonServer.defaults();
const cors = require('cors');

// Enable CORS for all origins (or specify a particular origin)
server.use(cors());
server.use(middlewares);
server.use(router);

server.listen(3000, () => {
  console.log('JSON Server is running on http://localhost:3000');
}); 
