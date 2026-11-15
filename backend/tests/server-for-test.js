/**
 * server-for-test.js — Minimal server launcher for integration tests.
 *
 * Spawned as a child process by tests/api.test.js.
 * Writes "READY port=<N>" to stdout when the server is listening.
 * All env vars are set by the parent test process.
 */
'use strict';

const http = require('node:http');

// These must already be set by the parent (api.test.js spawn env):
// NODE_ENV=test, DISABLE_AUTO_CONNECT=true, OPENAI_API_KEY=''

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
