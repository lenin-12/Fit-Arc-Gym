console.log('1. server.js started');
const dotenv = require('dotenv');
dotenv.config();
console.log('2. env loaded, NODE_ENV =', process.env.NODE_ENV);

const app = require('./app');
console.log('3. app.js loaded');

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`4. listening on ${PORT}`));