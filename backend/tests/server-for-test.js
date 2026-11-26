
'use strict';

const http = require('node:http');

const app = require('../app');

const server = http.createServer(app);
const host = process.env.HOST || '127.0.0.1';
const port = parseInt(process.env.PORT, 10) || 0;

server.listen(port, host, () => {
  const addr = server.address();
  // Signal to parent process that we are ready
  process.stdout.write(`READY port=${addr.port}\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
