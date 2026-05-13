// ===== GAME STATE & CORE =====
const Game = {
  state: null,
  gameCanvas: null,
  gameCtx: null,
  animFrame: null,
  time: 0,

  async start(username) {
    document.getElementById('player-name').textContent = username;
    showScreen('game');

    // Load state
    await this.loadState();

    // Init world map — wait one frame so the DOM has rendered and flex sizes are calculated
    const worldCanvas = document.getElementById('world-canvas');
    requestAnimationFrame(() => {
      worldCanvas.width  = worldCanvas.parentElement.offsetWidth  || window.innerWidth;
      worldCanvas.height = worldCanvas.parentElement.offsetHeight || (window.innerHeight - 100);
      World.init(worldCanvas, username);
    });

    // Resize world canvas on window resize
    window.addEventListener('resize', () => {
      worldCanvas.width  = worldCanvas.offsetWidth;
      worldCanvas.height = worldCanvas.offsetHeight;
    });

    // Back to world button
    document.getElementById('btn-back-world').addEventListener('click', () => {
      document.getElementById('world-overlay').classList.remove('hidden');
      document.getElementById('sections-container').classList.add('hidden');
    });

    // Nav buttons (inside sections)
    document.querySelectorAll('.nav-btn[data-section]').forEach(btn => {
      btn.addEventListener('click', () => {
        Game.showSection(btn.dataset.section);
      });
    });

    // Init sections
    Corral.render();
    Shop.init();
  },

  resizeCanvas() {
    this.gameCanvas.width = window.innerWidth;
    this.gameCanvas.height = window.innerHeight;
  },

  async loadState() {
    const data = await API.get('/api/game/state');
    this.state = data;
    this.updateHUD();
    return data;
  },

  updateHUD() {
    if (!this.state) return;
    document.getElementById('player-money').textContent = this.state.money.toFixed(0);
    document.getElementById('player-score').textContent = this.state.score;
  },

  showSection(section) {
    document.getElementById('world-overlay').classList.add('hidden');
    document.getElementById('sections-container').classList.remove('hidden');
    document.querySelectorAll('.nav-btn[data-section]').forEach(b => {
      b.classList.toggle('active', b.dataset.section === section);
    });
    document.querySelectorAll('.game-section').forEach(s => {
      s.classList.toggle('active', s.id === `section-${section}`);
    });
    if (section === 'ranking') this.loadLeaderboard();
    if (section === 'tienda')  Shop.updateInventory();
    if (section === 'corral')  Corral.render();
  },

  animateBackground() {
    const ctx = this.gameCtx;
    const canvas = this.gameCanvas;
    this.time++;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const W = canvas.width;
    const H = canvas.height;
    const t = (Math.sin(this.time * 0.0008) + 1) / 2;

    // Pixel sky bands
    const bands = 6;
    const bandH = H * 0.6 / bands;
    for (let i = 0; i < bands; i++) {
      const r = Math.floor(20 + t * 100 + i * 5);
      const g = Math.floor(10 + t * 160 + i * 3);
      const b = Math.floor(30 + t * 180 - i * 10);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(0, i * bandH, W, bandH + 1);
    }

    // Ground tiles
    ctx.fillStyle = '#5a9e3a';
    ctx.fillRect(0, H * 0.6, W, H * 0.15);
    ctx.fillStyle = '#4a8a2e';
    ctx.fillRect(0, H * 0.75, W, H * 0.25);

    // Pixel grass tufts
    ctx.fillStyle = '#3a7a1e';
    for (let x = 0; x < W; x += 24) {
      ctx.fillRect(x,      H * 0.6 - 8,  4, 8);
      ctx.fillRect(x + 8,  H * 0.6 - 12, 4, 12);
      ctx.fillRect(x + 16, H * 0.6 - 6,  4, 6);
    }

    // Dirt path
    ctx.fillStyle = '#c8a46e';
    ctx.fillRect(0, H * 0.72, W, H * 0.06);
    ctx.fillStyle = '#b8944e';
    for (let x = 0; x < W; x += 32) {
      ctx.fillRect(x, H * 0.72, 16, H * 0.06);
    }

    // Pixel fence
    ctx.fillStyle = '#8B5e3c';
    ctx.fillRect(0, H * 0.68, W, 6);
    ctx.fillRect(0, H * 0.68 + 16, W, 6);
    ctx.fillStyle = '#6b3e1c';
    for (let x = 0; x < W; x += 40) {
      ctx.fillRect(x, H * 0.65, 8, 36);
    }

    this.animFrame = requestAnimationFrame(() => this.animateBackground());
  },

  async loadLeaderboard() {
    const data = await API.get('/api/game/leaderboard');
    const container = document.getElementById('leaderboard-list');
    if (!data.length) {
      container.innerHTML = '<div class="leaderboard-row"><span class="lb-name" style="color:rgba(255,255,255,0.5)">Aún no hay puntuaciones</span></div>';
      return;
    }
    container.innerHTML = data.map((entry, i) => `
      <div class="leaderboard-row">
        <span class="lb-rank ${i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : ''}">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span>
        <span class="lb-name">${entry.username}</span>
        <span class="lb-score">⭐ ${entry.score}</span>
      </div>
    `).join('');
  }
};

// ===== TOAST NOTIFICATIONS =====
const Toast = {
  show(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'toastIn 0.3s ease reverse';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
};
