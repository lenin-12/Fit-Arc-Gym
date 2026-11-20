const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

let replSet;

async function connect() {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await mongoose.connect(replSet.getUri(), { dbName: 'fitarc_test' });
 
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
  
  await Promise.all(Object.values(mongoose.models).map((m) => m.createCollection().catch(() => {})));
}

async function clear() {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
}

async function disconnect() {
  await mongoose.disconnect();
  if (replSet) await replSet.stop();
}

module.exports = { connect, clear, disconnect };