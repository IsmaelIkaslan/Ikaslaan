const Datastore = require('@seald-io/nedb');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const users = new Datastore({
  filename: path.join(dataDir, 'users.db'),
  autoload: true
});

const gameStates = new Datastore({
  filename: path.join(dataDir, 'game_states.db'),
  autoload: true
});

// Índices únicos
users.ensureIndex({ fieldName: 'username', unique: true });
gameStates.ensureIndex({ fieldName: 'userId', unique: true });

// Promisify helpers
function dbFind(db, query) {
  return new Promise((resolve, reject) => {
    db.find(query, (err, docs) => err ? reject(err) : resolve(docs));
  });
}

function dbFindOne(db, query) {
  return new Promise((resolve, reject) => {
    db.findOne(query, (err, doc) => err ? reject(err) : resolve(doc));
  });
}

function dbInsert(db, doc) {
  return new Promise((resolve, reject) => {
    db.insert(doc, (err, newDoc) => err ? reject(err) : resolve(newDoc));
  });
}

function dbUpdate(db, query, update, options = {}) {
  return new Promise((resolve, reject) => {
    db.update(query, update, options, (err, numReplaced) => err ? reject(err) : resolve(numReplaced));
  });
}

function dbFindSorted(db, query, sortField, limit) {
  return new Promise((resolve, reject) => {
    db.find(query).sort(sortField).limit(limit).exec((err, docs) => err ? reject(err) : resolve(docs));
  });
}

function initDB() {
  console.log('✅ Base de datos NeDB inicializada');
}

module.exports = { users, gameStates, dbFind, dbFindOne, dbInsert, dbUpdate, dbFindSorted, initDB };
