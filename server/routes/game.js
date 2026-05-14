const express = require('express');
const { User, GameState, dbFindOne, dbUpdate, dbFindSorted } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const SEED_PRICES     = { acorn: 30, carrot: 15, wheat: 5 };
const FOOD_QUALITY    = { acorn: 'alta', carrot: 'media', wheat: 'baja' };
const FOOD_WEIGHT_GAIN = { acorn: 3, carrot: 2, wheat: 1 };

// GET estado
router.get('/state', authMiddleware, async (req, res) => {
  try {
    const state = await dbFindOne(GameState, { userId: req.user.id });
    if (!state) return res.status(404).json({ error: 'Estado no encontrado' });
    res.json({ money: state.money, score: state.score, level: state.level, pigs: state.pigs, seeds: state.seeds });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

// COMPRAR semillas
router.post('/buy-seeds', authMiddleware, async (req, res) => {
  const { seedType, quantity } = req.body;
  if (!SEED_PRICES[seedType]) return res.status(400).json({ error: 'Tipo de semilla inválido' });
  try {
    const state = await dbFindOne(GameState, { userId: req.user.id });
    const cost = SEED_PRICES[seedType] * quantity;
    if (state.money < cost) return res.status(400).json({ error: 'Dinero insuficiente' });
    const seeds = { ...state.seeds, [seedType]: (state.seeds[seedType] || 0) + quantity };
    const newMoney = state.money - cost;
    await dbUpdate(GameState, { userId: req.user.id }, { $set: { money: newMoney, seeds } });
    res.json({ success: true, money: newMoney, seeds });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

// DAR DE COMER
router.post('/feed-pig', authMiddleware, async (req, res) => {
  const { pigId, foodType } = req.body;
  if (!FOOD_QUALITY[foodType]) return res.status(400).json({ error: 'Tipo de comida inválido' });
  try {
    const state = await dbFindOne(GameState, { userId: req.user.id });
    const seeds = { ...state.seeds };
    if (!seeds[foodType] || seeds[foodType] <= 0) return res.status(400).json({ error: 'No tienes esa comida' });
    const pigs = state.pigs.map(p => ({ ...p }));
    const pig = pigs.find(p => p.id === pigId);
    if (!pig) return res.status(404).json({ error: 'Cerdo no encontrado' });
    pig.weight += FOOD_WEIGHT_GAIN[foodType];
    pig.experience = (pig.experience || 0) + 1;
    pig.food = [...(pig.food || []), foodType];
    const foodCounts = pig.food.reduce((acc, f) => { acc[f] = (acc[f]||0)+1; return acc; }, {});
    const dominant = Object.entries(foodCounts).sort((a,b)=>b[1]-a[1])[0][0];
    pig.quality = FOOD_QUALITY[dominant];
    pig.stage = pig.weight >= 30 ? 'cerdo' : 'cochinillo';
    seeds[foodType] -= 1;
    await dbUpdate(GameState, { userId: req.user.id }, { $set: { pigs, seeds } });
    res.json({ success: true, pig, seeds });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

// ACTUALIZAR dinero
router.post('/update-money', authMiddleware, async (req, res) => {
  const { amount } = req.body;
  try {
    const state = await dbFindOne(GameState, { userId: req.user.id });
    const newMoney = state.money + amount;
    await dbUpdate(GameState, { userId: req.user.id }, { $set: { money: newMoney } });
    res.json({ success: true, money: newMoney });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

// ELIMINAR cerdo
router.post('/remove-pig', authMiddleware, async (req, res) => {
  const { pigId } = req.body;
  try {
    const state = await dbFindOne(GameState, { userId: req.user.id });
    const pigs = state.pigs.filter(p => p.id !== pigId);
    await dbUpdate(GameState, { userId: req.user.id }, { $set: { pigs } });
    res.json({ success: true, pigs });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

// PUNTUACIÓN
router.post('/score', authMiddleware, async (req, res) => {
  const { points } = req.body;
  try {
    const state = await dbFindOne(GameState, { userId: req.user.id });
    const newScore = Math.max(0, state.score + points);
    await dbUpdate(GameState, { userId: req.user.id }, { $set: { score: newScore } });
    res.json({ success: true, score: newScore });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

// LEADERBOARD
router.get('/leaderboard', async (req, res) => {
  try {
    const topStates = await dbFindSorted(GameState, {}, { score: -1 }, 10);
    const result = await Promise.all(topStates.map(async s => {
      const user = await dbFindOne(User, { _id: s.userId });
      return { username: user ? user.username : 'Desconocido', score: s.score, level: s.level };
    }));
    res.json(result);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

module.exports = router;
