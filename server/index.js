const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/game');
const { initDB } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Global error handler for uncaught errors
process.on('uncaughtException', (err) => {
  console.error('❌ Error no capturado:', err);
});
process.on('unhandledRejection', (err) => {
  console.error('❌ Promesa rechazada:', err);
});

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public')));

// Init DB
initDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🐷 Del Corral al Corte corriendo en http://0.0.0.0:${PORT}`);
});
