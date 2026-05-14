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

async function initDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB conectado');
  } catch (err) {
    console.error('⚠️ MongoDB no disponible, usando JSON local:', err.message);
    // No hacer process.exit — el servidor sigue funcionando con JSON fallback
  }
}

async function dbFindOne(Model, query)       { return Model.findOne(query).lean(); }
async function dbInsert(Model, doc)          { return Model.create(doc); }
async function dbUpdate(Model, query, upd)   { return Model.updateOne(query, upd); }
async function dbFindSorted(Model, query, sort, limit) {
  return Model.find(query).sort(sort).limit(limit).lean();
}

module.exports = { User, GameState, dbFindOne, dbInsert, dbUpdate, dbFindSorted, initDB };
