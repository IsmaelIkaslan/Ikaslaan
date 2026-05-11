// ===== WORLD.JS - Top-Down Farm World =====
// Stardew Valley style game world for "Del Corral al Corte"
// Globals available: Game, API, Toast
// World.init(canvas, playerName), World.loop(), World.stop()

const World = {

  // ── Public state ──────────────────────────────────────────────────────────
  canvas: null,
  ctx: null,
  running: false,
  rafId: null,
  time: 0,
  playerName: '',

  player: {
    x: 320, y: 320,
    vx: 0, vy: 0,
    speed: 2.2,
    dir: 'down',   // up/down/left/right
    frame: 0,
    moving: false,
    name: ''
  },

  caughtPig: null,   // pig object currently being led
  pigs: [],
  npcs: [],
  foodItems: [],     // food on the ground near trough
  particles: [],     // visual effects

  feedingTrough: { x: 200, y: 280, w: 48, h: 24 },

  // Lasso state
  lasso: {
    active: false,
    throwing: false,
    throwProgress: 0,
    targetPig: null,
    ropeAngle: 0
  },

  // Camera / world offset
  cam: { x: 0, y: 0 },

  // World dimensions
  WORLD_W: 1600,
  WORLD_H: 1200,

  // Input
  keys: {},
  mouse: { x: 0, y: 0, clicked: false },

  // ── Constants ─────────────────────────────────────────────────────────────
  CORRAL_X: 80,
  CORRAL_Y: 160,
  CORRAL_W: 380,
  CORRAL_H: 280,

  VILLAGE_X: 1100,
  VILLAGE_Y: 80,
  SHOP_X: 1120,
  SHOP_Y: 190,
  SHOP_W: 180,
  SHOP_H: 120,
  SLAUGHTER_X: 1320,
  SLAUGHTER_Y: 190,
  SLAUGHTER_W: 180,
  SLAUGHTER_H: 120,

  NPC_NAMES: ['Mikel','Ane','Josu','Leire','Aitor','Amaia','Unai','Nerea'],
  NPC_WANTS: [
    { food: 'acorn',  label: 'Cerdo de bellota',   quality: 'alta',  price: 120 },
    { food: 'carrot', label: 'Cerdo de zanahoria',  quality: 'media', price: 70  },
    { food: 'wheat',  label: 'Cerdo de trigo',      quality: 'baja',  price: 40  }
  ],

  // ── Init ──────────────────────────────────────────────────────────────────
  init(canvas, playerName) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.playerName = playerName;
    this.player.name = playerName;
    this.player.x = 280;
    this.player.y = 400;

    this._buildPigs();
    this._buildNPCs();
    this._bindInput();
    this.running = true;
    this._tick();
  },

  stop() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this._unbindInput();
  },

  loop() { /* external hook – tick is self-scheduling */ },

  // ── Input ─────────────────────────────────────────────────────────────────
  _bindInput() {
    this._onKeyDown = (e) => {
      this.keys[e.code] = true;
      if (e.code === 'KeyE' || e.code === 'Space') {
        e.preventDefault();
        this._handleInteract();
      }
    };
    this._onKeyUp = (e) => { this.keys[e.code] = false; };
    this._onMouseMove = (e) => {
      const r = this.canvas.getBoundingClientRect();
      this.mouse.x = (e.clientX - r.left) * (this.canvas.width  / r.width);
      this.mouse.y = (e.clientY - r.top)  * (this.canvas.height / r.height);
    };
    this._onMouseDown = (e) => {
      this.mouse.clicked = true;
      this._handleInteract();
    };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup',   this._onKeyUp);
    this.canvas.addEventListener('mousemove', this._onMouseMove);
    this.canvas.addEventListener('mousedown', this._onMouseDown);
  },

  _unbindInput() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup',   this._onKeyUp);
    if (this.canvas) {
      this.canvas.removeEventListener('mousemove', this._onMouseMove);
      this.canvas.removeEventListener('mousedown', this._onMouseDown);
    }
  },

  // ── Interaction handler ───────────────────────────────────────────────────
  _handleInteract() {
    const p = this.player;

    // If lasso is ready (near pig, no caught pig) – throw it
    if (!this.caughtPig && this.lasso.active && !this.lasso.throwing) {
      const pig = this._nearestPig(p.x, p.y, 55);
      if (pig) {
        this.lasso.throwing = true;
        this.lasso.throwProgress = 0;
        this.lasso.targetPig = pig;
        return;
      }
    }

    // If holding pig near trough – feed
    if (this.caughtPig) {
      const t = this.feedingTrough;
      const dist = Math.hypot(p.x - (t.x + t.w/2), p.y - (t.y + t.h/2));
      if (dist < 80) {
        this._spawnFood();
        return;
      }
    }

    // Enter shop or matadero from the map
    if (this._pointInZone(p.x, p.y, this.SHOP_X, this.SHOP_Y, this.SHOP_W, this.SHOP_H)) {
      Toast.show('Entraste a la tienda. Compra semillas y vuelve al corral.', 'success');
      Game.showSection('tienda');
      return;
    }
    if (this._pointInZone(p.x, p.y, this.SLAUGHTER_X, this.SLAUGHTER_Y, this.SLAUGHTER_W, this.SLAUGHTER_H)) {
      Toast.show('Entraste al matadero. Atiende al cliente y corta la pieza.', 'success');
      Game.showSection('matadero');
      return;
    }

    // Talk to NPC
    const npc = this._nearestNPC(p.x, p.y, 70);
    if (npc) {
      npc.talking = !npc.talking;
      npc.talkTimer = 180;
    }
  },

  _pointInZone(x, y, zx, zy, zw, zh) {
    return x >= zx && x <= zx + zw && y >= zy && y <= zy + zh;
  },

  // ── Pig factory ───────────────────────────────────────────────────────────
  _buildPigs() {
    this.pigs = [];
    const serverPigs = (Game.state && Game.state.pigs) ? Game.state.pigs : [];
    const cx = this.CORRAL_X, cy = this.CORRAL_Y;
    const cw = this.CORRAL_W, ch = this.CORRAL_H;

    // Use server pigs if available, else create 3 default ones
    const pigData = serverPigs.length ? serverPigs : [
      { id: 1, name: 'Porky',   weight: 12, quality: 'media', experience: 0 },
      { id: 2, name: 'Babe',    weight: 8,  quality: 'baja',  experience: 0 },
      { id: 3, name: 'Hammy',   weight: 20, quality: 'alta',  experience: 2 }
    ];

    pigData.forEach((pd, i) => {
      this.pigs.push({
        id: pd.id,
        name: pd.name,
        weight: pd.weight || 10,
        quality: pd.quality || 'baja',
        experience: pd.experience || 0,
        x: cx + 60 + (i % 3) * 90 + Math.random() * 30,
        y: cy + 60 + Math.floor(i / 3) * 80 + Math.random() * 30,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        dir: 'right',
        frame: 0,
        frameTimer: 0,
        roamTimer: 60 + Math.random() * 120,
        caught: false,
        eating: false,
        eatTimer: 0,
        scale: 1
      });
    });
  },

  // ── NPC factory ───────────────────────────────────────────────────────────
  _buildNPCs() {
    this.npcs = [];
    for (let i = 0; i < 3; i++) {
      this._spawnNPC(i);
    }
  },

  _spawnNPC(index) {
    const want = this.NPC_WANTS[index % this.NPC_WANTS.length];
    const name = this.NPC_NAMES[Math.floor(Math.random() * this.NPC_NAMES.length)];
    const vx = this.VILLAGE_X;
    const vy = this.VILLAGE_Y;
    this.npcs[index] = {
      id: index,
      name,
      want,
      x: vx + 80 + index * 120,
      y: vy + 200 + index * 60,
      vx: 0, vy: 0,
      dir: 'left',
      frame: 0,
      frameTimer: 0,
      moving: false,
      talking: false,
      talkTimer: 0,
      satisfied: false,
      walkTarget: { x: vx + 80 + index * 120, y: vy + 200 + index * 60 },
      hat: index % 3,   // 0=cap, 1=hat, 2=hair
      skinTone: ['#f4c4a0','#d4a070','#c08050'][index % 3],
      shirtColor: ['#3498db','#e74c3c','#2ecc71'][index % 3]
    };
  },

  // ── Main tick ─────────────────────────────────────────────────────────────
  _tick() {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(() => this._tick());
    this.time++;

    this._updatePlayer();
    this._updatePigs();
    this._updateNPCs();
    this._updateLasso();
    this._updateParticles();
    this._updateFoodItems();
    this._updateCamera();
    this._draw();
  },

  // ── Camera ────────────────────────────────────────────────────────────────
  _updateCamera() {
    const W = this.canvas.width;
    const H = this.canvas.height;
    const p = this.player;
    const targetX = p.x - W / 2;
    const targetY = p.y - H / 2;
    this.cam.x += (targetX - this.cam.x) * 0.1;
    this.cam.y += (targetY - this.cam.y) * 0.1;
    this.cam.x = Math.max(0, Math.min(this.WORLD_W - W, this.cam.x));
    this.cam.y = Math.max(0, Math.min(this.WORLD_H - H, this.cam.y));
  },

  // ── Player update ─────────────────────────────────────────────────────────
  _updatePlayer() {
    const p = this.player;
    const k = this.keys;
    let dx = 0, dy = 0;

    if (k['ArrowLeft']  || k['KeyA']) { dx -= 1; p.dir = 'left';  }
    if (k['ArrowRight'] || k['KeyD']) { dx += 1; p.dir = 'right'; }
    if (k['ArrowUp']    || k['KeyW']) { dy -= 1; p.dir = 'up';    }
    if (k['ArrowDown']  || k['KeyS']) { dy += 1; p.dir = 'down';  }

    // Normalize diagonal
    if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }

    p.vx = dx * p.speed;
    p.vy = dy * p.speed;
    p.moving = (dx !== 0 || dy !== 0);

    p.x = Math.max(16, Math.min(this.WORLD_W - 16, p.x + p.vx));
    p.y = Math.max(16, Math.min(this.WORLD_H - 16, p.y + p.vy));

    if (p.moving) {
      p.frameTimer = (p.frameTimer || 0) + 1;
      if (p.frameTimer >= 8) { p.frame = (p.frame + 1) % 4; p.frameTimer = 0; }
    } else {
      p.frame = 0;
    }

    // Lasso proximity check
    if (!this.caughtPig) {
      const near = this._nearestPig(p.x, p.y, 55);
      this.lasso.active = !!near;
    }
  },

  // ── Pig update ────────────────────────────────────────────────────────────
  _updatePigs() {
    const cx = this.CORRAL_X, cy = this.CORRAL_Y;
    const cw = this.CORRAL_W, ch = this.CORRAL_H;

    this.pigs.forEach(pig => {
      if (pig.caught) {
        // Follow player
        const p = this.player;
        const angle = Math.atan2(p.y - pig.y, p.x - pig.x);
        const dist  = Math.hypot(p.x - pig.x, p.y - pig.y);
        const followDist = 36;
        if (dist > followDist + 4) {
          pig.vx = Math.cos(angle) * 2.0;
          pig.vy = Math.sin(angle) * 2.0;
          pig.dir = pig.vx > 0 ? 'right' : 'left';
          pig.moving = true;
        } else {
          pig.vx = 0; pig.vy = 0; pig.moving = false;
        }
        pig.x += pig.vx;
        pig.y += pig.vy;
        return;
      }

      if (pig.eating) {
        pig.eatTimer--;
        if (pig.eatTimer <= 0) pig.eating = false;
        return;
      }

      // Roam inside corral
      pig.roamTimer--;
      if (pig.roamTimer <= 0) {
        pig.vx = (Math.random() - 0.5) * 1.2;
        pig.vy = (Math.random() - 0.5) * 1.2;
        pig.roamTimer = 80 + Math.random() * 140;
      }

      pig.x += pig.vx;
      pig.y += pig.vy;

      // Bounce off corral walls
      const margin = 20;
      if (pig.x < cx + margin) { pig.x = cx + margin; pig.vx = Math.abs(pig.vx); }
      if (pig.x > cx + cw - margin) { pig.x = cx + cw - margin; pig.vx = -Math.abs(pig.vx); }
      if (pig.y < cy + margin) { pig.y = cy + margin; pig.vy = Math.abs(pig.vy); }
      if (pig.y > cy + ch - margin) { pig.y = cy + ch - margin; pig.vy = -Math.abs(pig.vy); }

      pig.dir = pig.vx >= 0 ? 'right' : 'left';

      // Animate legs
      pig.frameTimer++;
      if (pig.frameTimer >= 10) { pig.frame = (pig.frame + 1) % 4; pig.frameTimer = 0; }
    });
  },

  // ── NPC update ────────────────────────────────────────────────────────────
  _updateNPCs() {
    const p = this.player;
    this.npcs.forEach(npc => {
      if (npc.satisfied) return;

      // Talk timer
      if (npc.talkTimer > 0) {
        npc.talkTimer--;
        if (npc.talkTimer <= 0) npc.talking = false;
      }

      // Auto-show speech bubble when player is near
      const dist = Math.hypot(p.x - npc.x, p.y - npc.y);
      if (dist < 80 && !npc.talking) {
        npc.talking = true;
        npc.talkTimer = 240;
      }

      // Wander around village
      npc.frameTimer = (npc.frameTimer || 0) + 1;
      if (npc.frameTimer > 120 + Math.random() * 180) {
        npc.frameTimer = 0;
        const vx = this.VILLAGE_X;
        const vy = this.VILLAGE_Y;
        npc.walkTarget = {
          x: vx + 40 + Math.random() * 380,
          y: vy + 100 + Math.random() * 300
        };
      }

      const tx = npc.walkTarget.x, ty = npc.walkTarget.y;
      const dx = tx - npc.x, dy = ty - npc.y;
      const d  = Math.hypot(dx, dy);
      if (d > 4) {
        const spd = 0.6;
        npc.x += (dx / d) * spd;
        npc.y += (dy / d) * spd;
        npc.dir = dx > 0 ? 'right' : 'left';
        npc.moving = true;
        npc.frame = Math.floor(this.time / 12) % 4;
      } else {
        npc.moving = false;
      }
    });
  },

  // ── Lasso update ──────────────────────────────────────────────────────────
  _updateLasso() {
    const lasso = this.lasso;
    if (!lasso.throwing) return;

    lasso.throwProgress += 0.08;
    if (lasso.throwProgress >= 1) {
      lasso.throwProgress = 1;
      lasso.throwing = false;

      // Check catch
      const pig = lasso.targetPig;
      if (pig && !pig.caught) {
        const p = this.player;
        const dist = Math.hypot(p.x - pig.x, p.y - pig.y);
        if (dist < 60) {
          pig.caught = true;
          this.caughtPig = pig;
          lasso.active = false;
          Toast.show(pig.name + ' atrapado! Lleva al comedero.', 'success');
          this._spawnParticles(pig.x, pig.y, '#f4a0a0', 8);
        } else {
          Toast.show('Fallaste! Acercate mas.', 'info');
        }
      }
      lasso.targetPig = null;
    }
  },

  // ── Food items update ─────────────────────────────────────────────────────
  _updateFoodItems() {
    if (!this.caughtPig) return;
    const pig = this.caughtPig;

    this.foodItems = this.foodItems.filter(food => {
      if (food.eaten) return false;
      const dist = Math.hypot(pig.x - food.x, pig.y - food.y);
      if (dist < 28) {
        food.eaten = true;
        this._pigEat(pig, food.type);
        return false;
      }
      return true;
    });
  },

  // ── Pig eating ────────────────────────────────────────────────────────────
  async _pigEat(pig, foodType) {
    const seeds = (Game.state && Game.state.seeds) ? Game.state.seeds : {};
    if (!seeds[foodType] || seeds[foodType] <= 0) {
      Toast.show('No tienes ' + foodType + '!', 'error');
      return;
    }

    pig.eating = true;
    pig.eatTimer = 60;
    this._spawnParticles(pig.x, pig.y - 10, '#27ae60', 6);

    const foodEmoji = { acorn: '🌰', carrot: '🥕', wheat: '🌾' };
    Toast.show(pig.name + ' come ' + (foodEmoji[foodType] || foodType) + '!', 'success');

    // Grow pig visually
    const gain = { acorn: 3, carrot: 2, wheat: 1 };
    pig.weight = (pig.weight || 10) + (gain[foodType] || 1);
    pig.scale = Math.min(2.0, 0.7 + pig.weight / 30);

    // Call server
    try {
      const res = await API.post('/api/game/feed-pig', {
        pigId: pig.id,
        foodType
      });
      if (res && !res.error) {
        if (res.pig) {
          pig.weight  = res.pig.weight;
          pig.quality = res.pig.quality;
          pig.experience = res.pig.experience;
          pig.scale = Math.min(2.0, 0.7 + pig.weight / 30);
        }
        if (res.seeds && Game.state) {
          Game.state.seeds = res.seeds;
        }
        Game.updateHUD && Game.updateHUD();
        Corral.render && Corral.render();
      }
    } catch(e) { /* offline fallback */ }
  },

  // ── Spawn food on ground ──────────────────────────────────────────────────
  _spawnFood() {
    const seeds = (Game.state && Game.state.seeds) ? Game.state.seeds : {};
    const t = this.feedingTrough;
    let spawned = false;

    ['acorn','carrot','wheat'].forEach(type => {
      if (seeds[type] > 0) {
        // Check not already on ground
        const already = this.foodItems.some(f => f.type === type && !f.eaten);
        if (!already) {
          this.foodItems.push({
            type,
            x: t.x + t.w/2 + (Math.random() - 0.5) * 60,
            y: t.y + t.h + 20 + Math.random() * 30,
            eaten: false,
            bobOffset: Math.random() * Math.PI * 2
          });
          spawned = true;
        }
      }
    });

    if (!spawned) {
      Toast.show('No tienes semillas! Ve a la tienda.', 'error');
    } else {
      Toast.show('Comida en el suelo! Lleva el cerdo.', 'info');
    }
  },

  // ── Particles ─────────────────────────────────────────────────────────────
  _spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i + Math.random() * 0.5;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * (1 + Math.random() * 2),
        vy: Math.sin(angle) * (1 + Math.random() * 2) - 1,
        life: 40 + Math.random() * 20,
        maxLife: 60,
        color,
        size: 3 + Math.random() * 3
      });
    }
  },

  _updateParticles() {
    this.particles = this.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.08;
      p.life--;
      return p.life > 0;
    });
  },

  // ── Helpers ───────────────────────────────────────────────────────────────
  _nearestPig(x, y, maxDist) {
    let best = null, bestD = maxDist;
    this.pigs.forEach(pig => {
      if (pig.caught) return;
      const d = Math.hypot(x - pig.x, y - pig.y);
      if (d < bestD) { bestD = d; best = pig; }
    });
    return best;
  },

  _nearestNPC(x, y, maxDist) {
    let best = null, bestD = maxDist;
    this.npcs.forEach(npc => {
      const d = Math.hypot(x - npc.x, y - npc.y);
      if (d < bestD) { bestD = d; best = npc; }
    });
    return best;
  },

  // ── Main draw ─────────────────────────────────────────────────────────────
  _draw() {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, W, H);

    ctx.save();
    ctx.translate(-Math.floor(this.cam.x), -Math.floor(this.cam.y));

    this._drawWorld();
    this._drawFoodItems();
    this._drawPigs();
    this._drawNPCs();
    this._drawPlayer();
    this._drawLasso();
    this._drawParticles();
    this._drawInteractionHints();

    ctx.restore();

    // HUD overlays (screen-space)
    this._drawMinimap(W, H);
  },

  // ── World background ──────────────────────────────────────────────────────
  _drawWorld() {
    const ctx = this.ctx;
    const W = this.WORLD_W;
    const H = this.WORLD_H;

    // Sky / background
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, W, H);

    // Grass
    ctx.fillStyle = '#5a9e3a';
    ctx.fillRect(0, 0, W, H);

    // Dirt path from farm to village
    ctx.fillStyle = '#c8a46e';
    ctx.fillRect(460, 380, 660, 60);
    ctx.fillStyle = '#b8944e';
    for (let x = 460; x < 1120; x += 32) {
      ctx.fillRect(x, 380, 16, 60);
    }

    // Grass tufts
    ctx.fillStyle = '#3a7a1e';
    for (let x = 0; x < W; x += 40) {
      for (let y = 0; y < H; y += 40) {
        if ((x + y) % 80 === 0) {
          ctx.fillRect(x, y, 4, 8);
          ctx.fillRect(x + 12, y + 4, 4, 6);
        }
      }
    }

    // Corral fence
    this._drawCorral();

    // Feeding trough
    this._drawTrough();

    // Village
    this._drawVillage();

    // Trees scattered around
    this._drawTree(50,  50,  60);
    this._drawTree(900, 100, 72);
    this._drawTree(40,  700, 56);
    this._drawTree(1500, 600, 64);
    this._drawTree(700, 800, 52);
  },

  _drawCorral() {
    const ctx = this.ctx;
    const cx = this.CORRAL_X, cy = this.CORRAL_Y;
    const cw = this.CORRAL_W, ch = this.CORRAL_H;

    // Dirt floor inside corral
    ctx.fillStyle = '#c8a46e';
    ctx.fillRect(cx, cy, cw, ch);
    ctx.fillStyle = '#b8944e';
    for (let x = cx; x < cx + cw; x += 24) {
      ctx.fillRect(x, cy, 12, ch);
    }

    // Fence posts and rails
    const postColor = '#6b3e1c';
    const railColor = '#8B5e3c';

    // Top rail
    ctx.fillStyle = railColor;
    ctx.fillRect(cx, cy, cw, 6);
    ctx.fillRect(cx, cy + 14, cw, 6);
    // Bottom rail
    ctx.fillRect(cx, cy + ch - 20, cw, 6);
    ctx.fillRect(cx, cy + ch - 6, cw, 6);
    // Left rail
    ctx.fillRect(cx, cy, 6, ch);
    ctx.fillRect(cx + 14, cy, 6, ch);
    // Right rail
    ctx.fillRect(cx + cw - 20, cy, 6, ch);
    ctx.fillRect(cx + cw - 6, cy, 6, ch);

    // Posts
    ctx.fillStyle = postColor;
    for (let x = cx; x <= cx + cw; x += 48) {
      ctx.fillRect(x - 4, cy - 8, 10, ch + 16);
    }
    for (let y = cy; y <= cy + ch; y += 48) {
      ctx.fillRect(cx - 4, y - 4, 10, 10);
      ctx.fillRect(cx + cw - 6, y - 4, 10, 10);
    }

    // Gate opening (bottom center)
    ctx.fillStyle = '#c8a46e';
    ctx.fillRect(cx + cw/2 - 20, cy + ch - 22, 40, 22);
  },

  _drawTrough() {
    const ctx = this.ctx;
    const t = this.feedingTrough;

    // Trough body
    ctx.fillStyle = '#8B5e3c';
    ctx.fillRect(t.x - 4, t.y - 4, t.w + 8, t.h + 8);
    ctx.fillStyle = '#6b3e1c';
    ctx.fillRect(t.x, t.y, t.w, t.h);
    // Water/food inside
    ctx.fillStyle = '#4a8a2e';
    ctx.fillRect(t.x + 4, t.y + 4, t.w - 8, t.h - 8);

    // Label
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(t.x - 2, t.y - 18, 54, 14);
    ctx.fillStyle = '#fff';
    ctx.font = '9px monospace';
    ctx.fillText('COMEDERO', t.x, t.y - 7);
  },

  _drawVillage() {
    const ctx = this.ctx;
    const vx = this.VILLAGE_X;
    const vy = this.VILLAGE_Y;

    // Village ground
    ctx.fillStyle = '#c8a46e';
    ctx.fillRect(vx, vy, 520, 520);

    // Village sign
    ctx.fillStyle = '#6b3e1c';
    ctx.fillRect(vx + 200, vy + 10, 120, 40);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('PUEBLO', vx + 260, vy + 35);

    // Shop and matadero buildings
    this._drawBuilding(this.SHOP_X, this.SHOP_Y, '#f39c12', '#d35400', 'TIENDA');
    this._drawBuilding(this.SLAUGHTER_X, this.SLAUGHTER_Y, '#c0392b', '#922b21', 'MATADERO');

    // Houses
    this._drawHouse(vx + 20,  vy + 300, '#8B6914', '#5C4400');
    this._drawHouse(vx + 160, vy + 300, '#8B1A8B', '#5C005C');
    this._drawHouse(vx + 300, vy + 300, '#1A5C8B', '#003366');
    this._drawHouse(vx + 80,  vy + 180, '#8B1A1A', '#5C0000');
    this._drawHouse(vx + 240, vy + 180, '#2d7a1e', '#1a4a10');

    // Village fence
    ctx.fillStyle = '#8B5e3c';
    ctx.fillRect(vx - 10, vy, 540, 6);
    ctx.fillRect(vx - 10, vy + 520, 540, 6);
    ctx.fillRect(vx - 10, vy, 6, 526);
    ctx.fillRect(vx + 524, vy, 6, 526);
    ctx.fillStyle = '#6b3e1c';
    for (let x = vx - 10; x < vx + 520; x += 40) {
      ctx.fillRect(x - 3, vy - 8, 8, 20);
      ctx.fillRect(x - 3, vy + 518, 8, 20);
    }
  },

  _drawBuilding(x, y, wallColor, roofColor, label) {
    const ctx = this.ctx;
    // Body
    ctx.fillStyle = wallColor;
    ctx.fillRect(x, y + 30, 100, 80);
    // Roof
    ctx.fillStyle = roofColor;
    for (let i = 0; i < 6; i++) {
      ctx.fillRect(x - i * 3 + 3, y + 30 - i * 5, 100 + i * 6 - 6, 6);
    }
    // Door
    ctx.fillStyle = '#3a1800';
    ctx.fillRect(x + 38, y + 80, 24, 30);
    // Window
    ctx.fillStyle = 'rgba(255,220,100,0.8)';
    ctx.fillRect(x + 10, y + 45, 20, 18);
    ctx.fillRect(x + 70, y + 45, 20, 18);
    // Window cross
    ctx.fillStyle = roofColor;
    ctx.fillRect(x + 19, y + 45, 2, 18);
    ctx.fillRect(x + 10, y + 53, 20, 2);
    ctx.fillRect(x + 79, y + 45, 2, 18);
    ctx.fillRect(x + 70, y + 53, 20, 2);
  },

  _drawTree(x, y, size) {
    const ctx = this.ctx;
    // Trunk
    ctx.fillStyle = '#6b3e1c';
    ctx.fillRect(x + size * 0.4, y + size * 0.55, size * 0.2, size * 0.45);
    // Canopy layers
    [[0, 0.55, 1], [-0.05, 0.28, 0.85], [-0.02, 0.05, 0.65]].forEach(([ox, oy, w]) => {
      ctx.fillStyle = '#2d7a1e';
      ctx.fillRect(x + size * (0.5 - w/2) + ox * size, y + size * oy, size * w, size * 0.32);
      ctx.fillStyle = '#3a9a28';
      ctx.fillRect(x + size * (0.5 - w/2 + 0.06) + ox * size, y + size * oy, size * (w - 0.12), size * 0.18);
    });
  },


  _drawPigs() { this.pigs.forEach(pig => this._drawPig(pig)); },
  _drawPig(pig) {
    const ctx = this.ctx;
    const scale = pig.scale || 1;
    const flip = pig.dir === 'left' ? -1 : 1;
    ctx.save();
    ctx.translate(Math.floor(pig.x), Math.floor(pig.y));
    ctx.scale(flip * scale, scale);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.ellipse(0,14,18,6,0,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#e08080';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(-22,-2,5,0,Math.PI*1.5); ctx.stroke();
    ctx.fillStyle = pig.caught ? '#ffb3b3' : '#f4a0a0';
    ctx.beginPath(); ctx.ellipse(0,0,20,13,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath(); ctx.ellipse(-4,-5,10,5,-0.3,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#f4a0a0';
    ctx.beginPath(); ctx.ellipse(22,-3,12,10,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#e08080';
    ctx.beginPath(); ctx.ellipse(16,-12,5,7,-0.4,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(24,-12,4,6,0.3,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(32,-1,7,5,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#c06060';
    ctx.beginPath(); ctx.ellipse(30,-2,2,1.5,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(34,-2,2,1.5,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#333';
    ctx.beginPath(); ctx.ellipse(20,-7,3,3,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(21,-8,1.2,1.2,0,0,Math.PI*2); ctx.fill();
    const legOff = (pig.frame < 2) ? 2 : -2;
    ctx.fillStyle = '#e08080';
    ctx.beginPath(); ctx.ellipse(-10,12+legOff,4,6,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-2,12-legOff,4,6,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(8,12+legOff,4,6,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(16,12-legOff,4,6,0,0,Math.PI*2); ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    const qc = pig.quality === 'alta' ? '#27ae60' : pig.quality === 'media' ? '#f39c12' : '#e74c3c';
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(pig.x-22, pig.y-30, 44, 12);
    ctx.fillStyle = qc;
    ctx.fillText(pig.name, pig.x, pig.y-21);
    ctx.restore();
    if (pig.eating) {
      ctx.save();
      ctx.font = '14px serif';
      ctx.textAlign = 'center';
      ctx.fillText('*', pig.x, pig.y-35);
      ctx.restore();
    }
  },

  _drawNPCs() { this.npcs.forEach(npc => this._drawNPC(npc)); },
  _drawNPC(npc) {
    const ctx = this.ctx;
    const flip = npc.dir === 'left' ? -1 : 1;
    const wb = npc.moving ? Math.sin(this.time * 0.2) * 2 : 0;
    ctx.save();
    ctx.translate(Math.floor(npc.x), Math.floor(npc.y) + wb);
    ctx.scale(flip, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath(); ctx.ellipse(0,28,10,4,0,0,Math.PI*2); ctx.fill();
    const ls = npc.moving ? Math.sin(this.time * 0.25) * 5 : 0;
    ctx.fillStyle = '#4a3020';
    ctx.fillRect(-6,14,5,14+ls); ctx.fillRect(1,14,5,14-ls);
    ctx.fillStyle = '#2a1800';
    ctx.fillRect(-8,26+ls,7,4); ctx.fillRect(-1,26-ls,7,4);
    ctx.fillStyle = npc.shirtColor || '#3498db';
    ctx.fillRect(-8,-2,16,18);
    const as = npc.moving ? Math.sin(this.time * 0.25) * 6 : 0;
    ctx.fillStyle = npc.shirtColor || '#3498db';
    ctx.fillRect(-14,-2+as,6,12); ctx.fillRect(8,-2-as,6,12);
    ctx.fillStyle = npc.skinTone || '#f4c4a0';
    ctx.beginPath(); ctx.ellipse(-11,10+as,3,3,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(11,10-as,3,3,0,0,Math.PI*2); ctx.fill();
    ctx.fillRect(-3,-8,6,8);
    ctx.beginPath(); ctx.ellipse(0,-16,9,10,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#333';
    ctx.beginPath(); ctx.ellipse(-3,-17,2,2,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(3,-17,2,2,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(-2.5,-17.5,0.8,0.8,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(3.5,-17.5,0.8,0.8,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#c06040';
    ctx.fillRect(-2,-12,4,2);
    if (npc.hat === 0) {
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(-10,-26,20,6); ctx.fillRect(-8,-32,16,8); ctx.fillRect(-12,-22,6,4);
    } else if (npc.hat === 1) {
      ctx.fillStyle = '#8B5e3c';
      ctx.fillRect(-12,-26,24,5); ctx.fillRect(-7,-34,14,10);
      ctx.fillStyle = '#c8a46e';
      ctx.fillRect(-7,-26,14,3);
    } else {
      ctx.fillStyle = '#4a2800';
      ctx.fillRect(-9,-26,18,8); ctx.fillRect(-9,-20,4,4); ctx.fillRect(5,-20,4,4);
    }
    ctx.restore();
    ctx.save();
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(npc.x-20,npc.y-52,40,12);
    ctx.fillStyle = '#fff';
    ctx.fillText(npc.name,npc.x,npc.y-43);
    ctx.restore();
    if (npc.talking) this._drawSpeechBubble(npc.x, npc.y-60, npc.want.label);
  },
  _drawSpeechBubble(x, y, text) {
    const ctx = this.ctx;
    const pad = 6;
    ctx.font = '9px monospace';
    const tw = ctx.measureText(text).width;
    const bw = tw + pad * 2; const bh = 18;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x-bw/2,y-bh,bw,bh,4); else ctx.rect(x-bw/2,y-bh,bw,bh);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath(); ctx.moveTo(x-4,y); ctx.lineTo(x+4,y); ctx.lineTo(x,y+8); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#222';
    ctx.textAlign = 'center';
    ctx.fillText(text,x,y-5);
    ctx.restore();
  },

