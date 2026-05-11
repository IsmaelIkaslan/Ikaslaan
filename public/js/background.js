// ===== PIXEL ART ANIMATED BACKGROUND =====
const Background = {
  canvas: null,
  ctx: null,
  time: 0,
  clouds: [],
  birds: [],
  piglets: [],
  stars: [],

  init() {
    this.canvas = document.getElementById('bg-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.createElements();
    this.animate();
  },

  resize() {
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
    if (this.ctx) this.ctx.imageSmoothingEnabled = false;
  },

  createElements() {
    for (let i = 0; i < 5; i++) {
      this.clouds.push({
        x: Math.random() * window.innerWidth,
        y: 30 + Math.random() * 80,
        w: 60 + Math.random() * 80,
        speed: 0.3 + Math.random() * 0.4
      });
    }
    for (let i = 0; i < 3; i++) {
      this.birds.push({
        x: Math.random() * window.innerWidth,
        y: 40 + Math.random() * 60,
        speed: 0.8 + Math.random() * 0.6,
        frame: Math.floor(Math.random() * 4)
      });
    }
    for (let i = 0; i < 5; i++) {
      this.piglets.push({
        x: Math.random() * window.innerWidth,
        y: 0,
        speed: 0.6 + Math.random() * 0.8,
        dir: Math.random() > 0.5 ? 1 : -1,
        frame: 0
      });
    }
    for (let i = 0; i < 60; i++) {
      this.stars.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight * 0.5,
        blink: Math.random() * Math.PI * 2
      });
    }
  },

  // Draw a pixel rectangle (snapped to grid)
  px(x, y, w, h, color) {
    const S = 4; // pixel size
    this.ctx.fillStyle = color;
    this.ctx.fillRect(
      Math.floor(x / S) * S,
      Math.floor(y / S) * S,
      Math.ceil(w / S) * S,
      Math.ceil(h / S) * S
    );
  },

  drawSky() {
    const { ctx, canvas, time } = this;
    const t = (Math.sin(time * 0.0008) + 1) / 2; // 0=night, 1=day

    // Sky gradient (pixelated bands)
    const bands = 8;
    const bandH = canvas.height * 0.65 / bands;
    for (let i = 0; i < bands; i++) {
      const r = Math.floor(20  + t * (135 - 20)  + i * (t * 5));
      const g = Math.floor(10  + t * (206 - 10)  + i * (t * 3));
      const b = Math.floor(40  + t * (235 - 40)  - i * (t * 8));
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(0, i * bandH, canvas.width, bandH + 1);
    }
  },

  drawStars() {
    const { ctx, time } = this;
    const t = (Math.sin(time * 0.0008) + 1) / 2;
    if (t > 0.7) return; // hide in daytime
    this.stars.forEach(s => {
      const alpha = (Math.sin(time * 0.05 + s.blink) + 1) / 2 * (1 - t * 1.4);
      if (alpha <= 0) return;
      ctx.fillStyle = `rgba(255,255,220,${alpha})`;
      ctx.fillRect(Math.floor(s.x / 4) * 4, Math.floor(s.y / 4) * 4, 4, 4);
    });
  },

  drawMoon() {
    const { ctx, canvas, time } = this;
    const t = (Math.sin(time * 0.0008) + 1) / 2;
    if (t > 0.6) return;
    const mx = canvas.width * 0.82;
    const my = 70;
    // Pixel moon
    const moonPx = [
      [0,1,1,0],[1,1,1,1],[1,1,1,1],[0,1,1,0]
    ];
    const S = 10;
    moonPx.forEach((row, ry) => row.forEach((cell, rx) => {
      if (cell) {
        ctx.fillStyle = `rgba(255,255,200,${0.8 * (1 - t * 1.6)})`;
        ctx.fillRect(mx + rx * S - S * 2, my + ry * S - S * 2, S, S);
      }
    }));
  },

  drawSun() {
    const { ctx, canvas, time } = this;
    const t = (Math.sin(time * 0.0008) + 1) / 2;
    if (t < 0.3) return;
    const sx = canvas.width * 0.15;
    const sy = 60;
    const S = 8;
    // Sun body
    const sunPx = [
      [0,0,1,1,0,0],[0,1,1,1,1,0],[1,1,1,1,1,1],[1,1,1,1,1,1],[0,1,1,1,1,0],[0,0,1,1,0,0]
    ];
    sunPx.forEach((row, ry) => row.forEach((cell, rx) => {
      if (cell) {
        ctx.fillStyle = `rgba(255,220,50,${t})`;
        ctx.fillRect(sx + rx * S - S * 3, sy + ry * S - S * 3, S, S);
      }
    }));
    // Rays
    ctx.fillStyle = `rgba(255,200,30,${t * 0.5})`;
    [[-20,-20],[0,-24],[20,-20],[24,0],[20,20],[0,24],[-20,20],[-24,0]].forEach(([rx,ry]) => {
      ctx.fillRect(sx + rx - 2, sy + ry - 2, 4, 4);
    });
  },

  drawClouds() {
    const { ctx, canvas } = this;
    this.clouds.forEach(c => {
      c.x += c.speed;
      if (c.x > canvas.width + 200) c.x = -200;
      // Pixel cloud shape
      const S = 8;
      const blocks = [
        [1,0],[2,0],[3,0],
        [0,1],[1,1],[2,1],[3,1],[4,1],
        [0,2],[1,2],[2,2],[3,2],[4,2]
      ];
      blocks.forEach(([bx, by]) => {
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillRect(Math.floor(c.x / S) * S + bx * S, c.y + by * S, S, S);
      });
    });
  },

  drawBirds() {
    const { ctx, canvas, time } = this;
    this.birds.forEach(b => {
      b.x += b.speed;
      if (b.x > canvas.width + 40) b.x = -40;
      b.frame = Math.floor(time / 8) % 2;
      // Pixel bird (2 frames)
      ctx.fillStyle = '#333';
      if (b.frame === 0) {
        ctx.fillRect(b.x,     b.y,     4, 4);
        ctx.fillRect(b.x + 8, b.y,     4, 4);
        ctx.fillRect(b.x + 4, b.y + 4, 4, 4);
      } else {
        ctx.fillRect(b.x,     b.y + 4, 4, 4);
        ctx.fillRect(b.x + 8, b.y + 4, 4, 4);
        ctx.fillRect(b.x + 4, b.y,     4, 4);
      }
    });
  },

  drawGround() {
    const { ctx, canvas } = this;
    const W = canvas.width;
    const H = canvas.height;
    const groundY = H * 0.65;

    // Grass top strip (pixel)
    for (let x = 0; x < W; x += 8) {
      const h = 8 + (Math.sin(x * 0.05) > 0.5 ? 8 : 0);
      ctx.fillStyle = '#6ab04c';
      ctx.fillRect(x, groundY - h, 8, h);
    }

    // Main ground
    ctx.fillStyle = '#5a9e3a';
    ctx.fillRect(0, groundY, W, H * 0.12);
    ctx.fillStyle = '#4a8a2e';
    ctx.fillRect(0, groundY + H * 0.12, W, H * 0.23);

    // Dirt path
    ctx.fillStyle = '#c8a46e';
    ctx.fillRect(W * 0.3, groundY + 20, W * 0.4, H * 0.08);
    ctx.fillStyle = '#b8944e';
    for (let x = W * 0.3; x < W * 0.7; x += 24) {
      ctx.fillRect(x, groundY + 20, 12, H * 0.08);
    }

    // Grass tufts
    ctx.fillStyle = '#3a7a1e';
    for (let x = 20; x < W; x += 32) {
      ctx.fillRect(x,      groundY + 4, 4, 8);
      ctx.fillRect(x + 8,  groundY + 2, 4, 10);
      ctx.fillRect(x + 16, groundY + 5, 4, 7);
    }
  },

  drawFence() {
    const { ctx, canvas } = this;
    const W = canvas.width;
    const H = canvas.height;
    const fy = H * 0.72;

    // Horizontal rails
    ctx.fillStyle = '#8B5e3c';
    ctx.fillRect(0, fy,      W, 8);
    ctx.fillRect(0, fy + 20, W, 8);

    // Posts
    ctx.fillStyle = '#6b3e1c';
    for (let x = 0; x < W; x += 48) {
      ctx.fillRect(x, fy - 12, 10, 44);
      // Post top (pointed)
      ctx.fillRect(x + 2, fy - 20, 6, 10);
    }
  },

  drawBarn() {
    const { ctx, canvas } = this;
    const W = canvas.width;
    const H = canvas.height;
    const bx = W * 0.72;
    const by = H * 0.42;
    const S = 4;

    // Barn body (pixel blocks)
    const bodyColor = '#8B1A1A';
    const roofColor = '#5C0000';
    const doorColor = '#4a2800';
    const windowColor = '#ffd700';

    // Body
    ctx.fillStyle = bodyColor;
    ctx.fillRect(bx, by, 120, 100);

    // Roof (triangle via blocks)
    ctx.fillStyle = roofColor;
    for (let i = 0; i < 8; i++) {
      ctx.fillRect(bx - i * 4 + 4, by - i * 8, 120 + i * 8 - 8, 8);
    }

    // Door
    ctx.fillStyle = doorColor;
    ctx.fillRect(bx + 44, by + 52, 32, 48);
    // Door frame
    ctx.fillStyle = '#3a1800';
    ctx.fillRect(bx + 40, by + 48, 4, 52);
    ctx.fillRect(bx + 76, by + 48, 4, 52);
    ctx.fillRect(bx + 40, by + 48, 40, 4);

    // Windows
    ctx.fillStyle = windowColor;
    ctx.globalAlpha = 0.7 + Math.sin(this.time * 0.05) * 0.3;
    ctx.fillRect(bx + 12, by + 24, 24, 20);
    ctx.fillRect(bx + 84, by + 24, 24, 20);
    ctx.globalAlpha = 1;

    // Window cross
    ctx.fillStyle = doorColor;
    ctx.fillRect(bx + 23, by + 24, 2, 20);
    ctx.fillRect(bx + 12, by + 33, 24, 2);
    ctx.fillRect(bx + 95, by + 24, 2, 20);
    ctx.fillRect(bx + 84, by + 33, 24, 2);

    // Roof star/weather vane
    ctx.fillStyle = '#888';
    ctx.fillRect(bx + 58, by - 64, 4, 20);
    ctx.fillStyle = '#aaa';
    ctx.fillRect(bx + 50, by - 68, 20, 4);
  },

  drawTree(x, y, size) {
    const { ctx } = this;
    const S = 4;
    // Trunk
    ctx.fillStyle = '#6b3e1c';
    ctx.fillRect(x + size * 0.4, y + size * 0.6, size * 0.2, size * 0.4);
    // Canopy layers
    [[0, 0.6, 1], [-0.1, 0.3, 0.8], [-0.05, 0, 0.6]].forEach(([ox, oy, w]) => {
      ctx.fillStyle = '#2d7a1e';
      ctx.fillRect(x + size * (0.5 - w / 2) + ox * size, y + size * oy, size * w, size * 0.35);
      ctx.fillStyle = '#3a9a28';
      ctx.fillRect(x + size * (0.5 - w / 2 + 0.05) + ox * size, y + size * oy, size * (w - 0.1), size * 0.2);
    });
  },

  drawPiglets() {
    const { ctx, canvas, time } = this;
    const groundY = canvas.height * 0.68;

    this.piglets.forEach(p => {
      p.y = groundY - 20;
      p.x += p.dir * p.speed;
      if (p.x > canvas.width + 40) { p.x = -40; p.dir = 1; }
      if (p.x < -40) { p.x = canvas.width + 40; p.dir = -1; }
      p.frame = Math.floor(time / 10) % 4;

      ctx.save();
      ctx.translate(p.x, p.y);
      if (p.dir === -1) ctx.scale(-1, 1);

      // Pixel pig (simple blocks)
      const S = 4;
      // Body
      ctx.fillStyle = '#f4a0a0';
      ctx.fillRect(0, 4, 24, 16);
      // Head
      ctx.fillRect(20, 0, 16, 14);
      // Snout
      ctx.fillStyle = '#e08080';
      ctx.fillRect(32, 4, 8, 6);
      // Eye
      ctx.fillStyle = '#333';
      ctx.fillRect(26, 2, 4, 4);
      // Legs (animated)
      ctx.fillStyle = '#e08080';
      const legOff = p.frame < 2 ? 0 : 4;
      ctx.fillRect(4,  20, 4, 8 + legOff);
      ctx.fillRect(12, 20, 4, 8 - legOff);
      ctx.fillRect(18, 20, 4, 8 + legOff);
      // Ear
      ctx.fillStyle = '#e08080';
      ctx.fillRect(22, -4, 8, 6);
      // Tail
      ctx.fillStyle = '#e08080';
      ctx.fillRect(-4, 6, 4, 4);
      ctx.fillRect(-8, 2, 4, 4);

      ctx.restore();
    });
  },

  drawPlayer() {
    const { ctx, canvas, time } = this;
    const W = canvas.width;
    const H = canvas.height;
    const px = W * 0.45;
    const py = H * 0.62;
    const frame = Math.floor(time / 20) % 2;

    ctx.save();
    ctx.translate(px, py);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(-12, 52, 24, 8);

    // Boots
    ctx.fillStyle = '#4a2800';
    ctx.fillRect(-10, 44, 8, 10);
    ctx.fillRect(2,   44, 8, 10);

    // Legs (jeans)
    ctx.fillStyle = '#2c5f8a';
    ctx.fillRect(-8, 28, 7, 18);
    ctx.fillRect(1,  28, 7, 18);

    // Body (shirt)
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(-10, 12, 20, 18);

    // Arms
    ctx.fillStyle = '#c0392b';
    if (frame === 0) {
      ctx.fillRect(-18, 14, 8, 14);
      ctx.fillRect(10,  16, 8, 12);
    } else {
      ctx.fillRect(-18, 16, 8, 12);
      ctx.fillRect(10,  14, 8, 14);
    }

    // Hands
    ctx.fillStyle = '#f4c4a0';
    ctx.fillRect(-20, 28, 8, 6);
    ctx.fillRect(18,  26, 8, 6);

    // Neck + Head
    ctx.fillStyle = '#f4c4a0';
    ctx.fillRect(-4, 4, 8, 10);
    ctx.fillRect(-10, -12, 20, 18);

    // Hair
    ctx.fillStyle = '#4a2800';
    ctx.fillRect(-10, -12, 20, 6);

    // Eyes
    ctx.fillStyle = '#333';
    ctx.fillRect(-5, -6, 4, 4);
    ctx.fillRect(1,  -6, 4, 4);

    // Mouth (smile)
    ctx.fillStyle = '#c06040';
    ctx.fillRect(-3, 0, 6, 2);

    // Cowboy hat
    ctx.fillStyle = '#8B5e3c';
    ctx.fillRect(-14, -20, 28, 8);  // brim
    ctx.fillStyle = '#6b3e1c';
    ctx.fillRect(-8,  -36, 16, 18); // crown
    ctx.fillStyle = '#c8a46e';
    ctx.fillRect(-8,  -20, 16, 4);  // band

    ctx.restore();
  },

  animate() {
    const { ctx, canvas } = this;
    this.time++;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    this.drawSky();
    this.drawStars();
    this.drawMoon();
    this.drawSun();
    this.drawClouds();
    this.drawBirds();

    // Trees
    this.drawTree(canvas.width * 0.05, canvas.height * 0.48, 60);
    this.drawTree(canvas.width * 0.12, canvas.height * 0.50, 48);
    this.drawTree(canvas.width * 0.88, canvas.height * 0.46, 72);
    this.drawTree(canvas.width * 0.95, canvas.height * 0.50, 52);

    this.drawBarn();
    this.drawGround();
    this.drawFence();
    this.drawPiglets();
    this.drawPlayer();

    requestAnimationFrame(() => this.animate());
  }
};
