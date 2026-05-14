const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { User, GameState, dbFindOne, dbInsert } = require('../db');
const { SECRET } = require('../middleware/auth');

const router = express.Router();

// REGISTER
router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  if (username.length < 3)    return res.status(400).json({ error: 'El nombre debe tener al menos 3 caracteres' });
  if (password.length < 4)    return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres' });

  try {
    const existing = await dbFindOne(User, { username });
    if (existing) return res.status(409).json({ error: 'Ese nombre ya está en uso' });

    const hashed = await bcrypt.hash(password, 10);
    const newUser = await dbInsert(User, { username, password: hashed });

    const initialPigs = [
      { id: 1, name: 'Porky', weight: 5, quality: 'media', food: [], experience: 0, stage: 'cochinillo' },
      { id: 2, name: 'Peppa', weight: 4, quality: 'media', food: [], experience: 0, stage: 'cochinillo' }
    ];
    await dbInsert(GameState, { userId: newUser._id, pigs: initialPigs });

    const token = jwt.sign({ id: newUser._id, username }, SECRET, { expiresIn: '30d' });
    res.cookie('token', token, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000 });
    res.json({ success: true, username, message: '¡Bienvenido a la granja!' });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Ese nombre ya está en uso' });
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Usuario y contraseña requeridos' });

  try {
    const user = await dbFindOne(User, { username });
    if (!user) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

    const token = jwt.sign({ id: user._id, username: user.username }, SECRET, { expiresIn: '30d' });
    res.cookie('token', token, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000 });
    res.json({ success: true, username: user.username, message: '¡Bienvenido de vuelta!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// LOGOUT
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

// CHECK SESSION
router.get('/me', (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.json({ loggedIn: false });
  try {
    const decoded = jwt.verify(token, SECRET);
    res.json({ loggedIn: true, username: decoded.username });
  } catch {
    res.json({ loggedIn: false });
  }
});

module.exports = router;
