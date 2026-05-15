const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/corral';

// Schemas
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const gameStateSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true },
  money:  { type: Number, default: 150 },
  score:  { type: Number, default: 0 },
  level:  { type: Number, default: 1 },
  pigs:   { type: Array,  default: [] },
  seeds:  { type: Object, default: { acorn: 0, carrot: 0, wheat: 0 } },
  updatedAt: { type: Date, default: Date.now }
});

const User      = mongoose.model('User',      userSchema);
const GameState = mongoose.model('GameState', gameStateSchema);

let useInMemory = false;
const inMemoryData = {
  users: [],
  gameStates: []
};

async function initDB() {
  try {
    await mongoose.connect(MONGO_URI);
    useInMemory = false;
    console.log('✅ MongoDB conectado');
  } catch (err) {
    useInMemory = true;
    console.error('⚠️ MongoDB no disponible, usando almacenamiento local en memoria:', err.message);
  }
}

function getCollection(modelName) {
  if (modelName === 'User') return inMemoryData.users;
  if (modelName === 'GameState') return inMemoryData.gameStates;
  throw new Error(`Modelo desconocido para fallback: ${modelName}`);
}

function matchQuery(doc, query) {
  return Object.entries(query).every(([key, value]) => {
    if (doc[key] == null) return false;
    return String(doc[key]) === String(value);
  });
}

function ensureId(doc) {
  if (!doc._id) doc._id = new mongoose.Types.ObjectId();
  return doc;
}

async function dbFindOne(Model, query) {
  if (!useInMemory) return Model.findOne(query).lean();
  const collection = getCollection(Model.modelName);
  const result = collection.find(doc => matchQuery(doc, query));
  return result ? { ...result } : null;
}

async function dbInsert(Model, doc) {
  if (!useInMemory) return Model.create(doc);
  const collection = getCollection(Model.modelName);
  if (Model.modelName === 'User' && collection.some(item => item.username === doc.username)) {
    const err = new Error('duplicate key'); err.code = 11000; throw err;
  }
  if (Model.modelName === 'GameState' && collection.some(item => String(item.userId) === String(doc.userId))) {
    const err = new Error('duplicate key'); err.code = 11000; throw err;
  }
  const newDoc = ensureId({ ...doc, updatedAt: new Date() });
  collection.push(newDoc);
  return { ...newDoc };
}

async function dbUpdate(Model, query, upd) {
  if (!useInMemory) return Model.updateOne(query, upd);
  const collection = getCollection(Model.modelName);
  const index = collection.findIndex(doc => matchQuery(doc, query));
  if (index === -1) return { matchedCount: 0, modifiedCount: 0 };
  collection[index] = { ...collection[index], ...upd, updatedAt: new Date() };
  return { matchedCount: 1, modifiedCount: 1 };
}

async function dbFindSorted(Model, query, sort, limit) {
  if (!useInMemory) return Model.find(query).sort(sort).limit(limit).lean();
  const collection = getCollection(Model.modelName).filter(doc => matchQuery(doc, query));
  const [sortKey, sortOrder] = Object.entries(sort)[0] || [];
  const sorted = collection.slice().sort((a, b) => {
    const aValue = a[sortKey];
    const bValue = b[sortKey];
    if (aValue === bValue) return 0;
    return (aValue > bValue ? 1 : -1) * (sortOrder === -1 ? -1 : 1);
  });
  return sorted.slice(0, limit).map(item => ({ ...item }));
}

module.exports = { User, GameState, dbFindOne, dbInsert, dbUpdate, dbFindSorted, initDB };
