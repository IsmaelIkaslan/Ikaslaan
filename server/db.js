const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const USERS_FILE = path.join(dataDir, 'users.json');
const STATES_FILE = path.join(dataDir, 'states.json');

function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return []; }
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

const users = { 
  findOne: (q) => readJSON(USERS_FILE).find(u => Object.keys(q).every(k => u[k] === q[k])) || null,
  insert: (doc) => { const all = readJSON(USERS_FILE); doc._id = Date.now().toString(36) + Math.random().toString(36).slice(2); all.push(doc); writeJSON(USERS_FILE, all); return doc; },
  find: (q) => readJSON(USERS_FILE).filter(u => Object.keys(q).every(k => u[k] === q[k]))
};

const gameStates = {
  findOne: (q) => readJSON(STATES_FILE).find(s => Object.keys(q).every(k => s[k] === q[k])) || null,
  insert: (doc) => { const all = readJSON(STATES_FILE); doc._id = Date.now().toString(36) + Math.random().toString(36).slice(2); all.push(doc); writeJSON(STATES_FILE, all); return doc; },
  update: (q, upd) => { 
    const all = readJSON(STATES_FILE); 
    const idx = all.findIndex(s => Object.keys(q).every(k => s[k] === q[k]));
    if (idx !== -1) { 
      if (upd.$set) Object.assign(all[idx], upd.$set);
      writeJSON(STATES_FILE, all); 
    }
  },
  findSorted: (sortField, limit) => {
    const all = readJSON(STATES_FILE);
    const key = Object.keys(sortField)[0];
    const dir = sortField[key];
    return all.sort((a,b) => dir === -1 ? (b[key]||0)-(a[key]||0) : (a[key]||0)-(b[key]||0)).slice(0, limit);
  }
};

async function dbFindOne(db, q) { return db.findOne(q); }
async function dbInsert(db, doc) { return db.insert(doc); }
async function dbUpdate(db, q, upd) { return db.update(q, upd); }
async function dbFindSorted(db, q, sort, limit) { return db.findSorted(sort, limit); }

function initDB() { console.log('✅ Base de datos JSON inicializada'); }

module.exports = { users, gameStates, dbFindOne, dbInsert, dbUpdate, dbFindSorted, initDB };
