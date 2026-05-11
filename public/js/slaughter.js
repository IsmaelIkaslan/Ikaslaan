// ===== MATADERO PRIMERA PERSONA — SISTEMA DE CORTE =====
const SlaughterGame = {
  canvas: null,
  ctx: null,
  animId: null,
  overlay: null,
  pig: null,
  client: null,
  time: 0,
  knife: { x: 300, y: 200, angle: 0, cutting: false },
  cuts: [],           // líneas de corte realizadas
  targetZone: null,   // zona que hay que cortar
  phase: 'intro',     // intro | cutting | result
  resultData: null,
  bloodParticles: [],
  introAlpha: 0,
  onDone: null,

  ZONES: {
    jamon:     { x: 480, y: 230, w: 90,  h: 70,  label: 'Jamón',     emoji: '🍖', color: '#c0392b' },
    costillas: { x: 280, y: 180, w: 100, h: 60,  label: 'Costillas', emoji: '🥩', color: '#e74c3c' },
    lomo:      { x: 280, y: 250, w: 100, h: 50,  label: 'Lomo',      emoji: '🥩', color: '#e67e22' },
    solomillo: { x: 310, y: 210, w: 70,  h: 45,  label: 'Solomillo', emoji: '🥩', color: '#d35400' },
    panceta:   { x: 260, y: 290, w: 120, h: 45,  label: 'Panceta',   emoji: '🥓', color: '#e74c3c' },
    cochinillo:{ x: 200, y: 160, w: 200, h: 160, label: 'Entero',    emoji: '🐷', color: '#c0392b' }
  },

  show(pig, client, onDone) {
    this.pig = pig;
    this.client = client;
    this.onDone = onDone;
    this.time = 0;
    this.cuts = [];
    this.bloodParticles = [];
    this.phase = 'intro';
    this.introAlpha = 0;
    this.targetZone = this.ZONES[client.piece];
    this.knife = { x: 300, y: -60, angle: 0, cutting: false };

    this.overlay = document.createElement('div');
    this.overlay.style.cssText = `
      position:fixed;inset:0;background:#000;z-index:700;
      display:flex;align-items:center;justify-content:center;
    `;

    this.overlay.innerHTML = `
      <div style="position:relative;width:100%;max-width:680px;">
        <canvas id="slaughter-canvas" width="680" height="480"
          style="display:block;border-radius:20px;cursor:none;width:100%;box-shadow:0 0 60px rgba(192,57,43,0.5);"></canvas>
        <div id="slaughter-ui" style="position:absolute;top:16px;left:0;right:0;display:flex;justify-content:space-between;padding:0 20px;pointer-events:none;">
          <div style="background:rgba(0,0,0,0.7);border-radius:12px;padding:10px 16px;color:white;font-family:'Fredoka One',cursive;font-size:16px;">
            🔪 Matadero
          </div>
          <div style="background:rgba(192,57,43,0.85);border-radius:12px;padding:10px 16px;color:white;font-family:'Fredoka One',cursive;font-size:16px;" id="order-badge">
            ${client.avatar} Quiere: ${this.targetZone.emoji} ${this.targetZone.label}
          </div>
        </div>
        <button id="btn-cancel-slaughter" style="
          position:absolute;bottom:20px;left:50%;transform:translateX(-50%);
          padding:10px 28px;background:rgba(0,0,0,0.7);color:white;border:2px solid rgba(255,255,255,0.3);
          border-radius:10px;font-family:'Nunito',sans-serif;font-weight:700;font-size:14px;cursor:pointer;">
          Cancelar
        </button>
      </div>
    `;

    document.body.appendChild(this.overlay);

    this.canvas = document.getElementById('slaughter-canvas');
    this.ctx = this.canvas.getContext('2d');

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      this.knife.x = (e.clientX - rect.left) * scaleX;
      this.knife.y = (e.clientY - rect.top) * scaleY;
    });

    this.canvas.addEventListener('mousedown', () => {
      if (this.phase === 'cutting') {
        this.knife.cutting = true;
        this.spawnBlood(this.knife.x, this.knife.y, 5);
      }
    });

    this.canvas.addEventListener('mouseup', () => {
      this.knife.cutting = false;
    });

    this.canvas.addEventListener('click', (e) => {
      if (this.phase === 'cutting') this.checkCut(e);
    });

    document.getElementById('btn-cancel-slaughter').addEventListener('click', () => {
      this.stop();
    });

    // Intro sequence: knife drops in
    setTimeout(() => { this.phase = 'cutting'; }, 2000);

    this.loop();
  },

  checkCut(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const cx = (e.clientX - rect.left) * scaleX;
    const cy = (e.clientY - rect.top) * scaleY;

    const zone = this.targetZone;
    const inZone = cx >= zone.x && cx <= zone.x + zone.w &&
                   cy >= zone.y && cy <= zone.y + zone.h;

    this.cuts.push({ x: cx, y: cy, correct: inZone, frame: 0 });
    this.spawnBlood(cx, cy, inZone ? 18 : 6);

    if (inZone) {
      this.phase = 'result';
      this.resultData = { correct: true, quality: this.pig.quality };
      setTimeout(() => {
        this.stop();
        if (this.onDone) this.onDone(true, this.pig.quality);
      }, 2000);
    } else {
      this.phase = 'result';
      this.resultData = { correct: false };
      setTimeout(() => {
        this.stop();
        if (this.onDone) this.onDone(false, null);
      }, 2000);
    }
  },

  spawnBlood(x, y, count) {
    for (let i = 0; i < count; i++) {
      this.bloodParticles.push({
        x, y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.8) * 7,
        life: 1,
        size: Math.random() * 5 + 2,
        dark: Math.random() > 0.5
      });
    }
  },

  loop() {
    if (!this.canvas) return;
    this.time++;
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;

    ctx.clearRect(0, 0, W, H);

    // ---- BACKGROUND: Matadero ----
    // Floor
    const floorGrad = ctx.createLinearGradient(0, H * 0.6, 0, H);
    floorGrad.addColorStop(0, '#c8b89a');
    floorGrad.addColorStop(1, '#a89070');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, H * 0.6, W, H * 0.4);

    // Wall
    const wallGrad = ctx.createLinearGradient(0, 0, 0, H * 0.6);
    wallGrad.addColorStop(0, '#e8e0d8');
    wallGrad.addColorStop(1, '#d0c8c0');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 0, W, H * 0.6);

    // Wall tiles
    ctx.strokeStyle = 'rgba(180,170,160,0.5)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 60) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H * 0.6); ctx.stroke();
    }
    for (let y = 0; y < H * 0.6; y += 60) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Cutting table
    const tableY = H * 0.45;
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(60, tableY, W - 120, 30);
    ctx.fillStyle = '#a07820';
    ctx.fillRect(60, tableY - 8, W - 120, 12);

    // Table surface (wood)
    const woodGrad = ctx.createLinearGradient(0, tableY - 8, 0, tableY + 22);
    woodGrad.addColorStop(0, '#d4a843');
    woodGrad.addColorStop(1, '#b8902e');
    ctx.fillStyle = woodGrad;
    ctx.fillRect(60, tableY - 8, W - 120, 12);

    // Wood grain lines
    ctx.strokeStyle = 'rgba(100,60,0,0.2)';
    ctx.lineWidth = 1;
    for (let x = 80; x < W - 120; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, tableY - 8);
      ctx.lineTo(x + 5, tableY + 4);
      ctx.stroke();
    }

    // ---- DRAW PIG ON TABLE (side view, realistic) ----
    this.drawPigOnTable(ctx, W, tableY);

    // ---- TARGET ZONE HIGHLIGHT ----
    if (this.phase === 'cutting') {
      const zone = this.targetZone;
      const pulse = (Math.sin(this.time * 0.1) + 1) / 2;

      // Pulsing highlight
      ctx.save();
      ctx.globalAlpha = 0.25 + pulse * 0.2;
      ctx.fillStyle = zone.color;
      ctx.beginPath();
      ctx.roundRect(zone.x, zone.y, zone.w, zone.h, 8);
      ctx.fill();
      ctx.globalAlpha = 0.6 + pulse * 0.4;
      ctx.strokeStyle = zone.color;
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      ctx.restore();

      // Zone label
      ctx.font = 'bold 13px Nunito, sans-serif';
      ctx.fillStyle = zone.color;
      ctx.textAlign = 'center';
      ctx.fillText(`✂ ${zone.label}`, zone.x + zone.w / 2, zone.y - 6);
    }

    // ---- BLOOD PARTICLES ----
    this.bloodParticles = this.bloodParticles.filter(p => p.life > 0);
    this.bloodParticles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.25;
      p.life -= 0.035;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fillStyle = p.dark ? '#8B0000' : '#cc0000';
      ctx.globalAlpha = p.life * 0.9;
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    // ---- CUT MARKS ----
    this.cuts.forEach(cut => {
      cut.frame++;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - cut.frame / 60);
      ctx.font = `${28 + cut.frame * 0.5}px serif`;
      ctx.textAlign = 'center';
      ctx.fillText(cut.correct ? '✅' : '❌', cut.x, cut.y - cut.frame * 0.5);
      ctx.restore();
    });

    // ---- KNIFE ----
    if (this.phase === 'intro') {
      // Knife drops from top
      this.knife.y = Math.min(H * 0.3, this.knife.y + 8);
      this.introAlpha = Math.min(1, this.introAlpha + 0.05);
    }
    this.drawKnife(ctx);

    // ---- INTRO TEXT ----
    if (this.phase === 'intro') {
      ctx.save();
      ctx.globalAlpha = this.introAlpha;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, H / 2 - 50, W, 100);
      ctx.font = 'bold 32px Fredoka One, cursive';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.fillText('🔪 Corta la pieza correcta', W / 2, H / 2 - 10);
      ctx.font = '18px Nunito, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillText(`Haz clic sobre: ${this.targetZone.emoji} ${this.targetZone.label}`, W / 2, H / 2 + 22);
      ctx.restore();
    }

    // ---- RESULT ----
    if (this.phase === 'result' && this.resultData) {
      ctx.save();
      ctx.fillStyle = this.resultData.correct ? 'rgba(39,174,96,0.85)' : 'rgba(192,57,43,0.85)';
      ctx.fillRect(0, H / 2 - 70, W, 140);
      ctx.font = 'bold 42px Fredoka One, cursive';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      if (this.resultData.correct) {
        const qualityEmoji = { alta: '⭐⭐⭐', media: '⭐⭐', baja: '⭐' }[this.resultData.quality] || '⭐';
        ctx.fillText('¡Corte perfecto! ✅', W / 2, H / 2 - 20);
        ctx.font = '20px Nunito, sans-serif';
        ctx.fillText(`Calidad: ${qualityEmoji} ${this.resultData.quality}`, W / 2, H / 2 + 20);
      } else {
        ctx.fillText('¡Corte incorrecto! ❌', W / 2, H / 2 - 20);
        ctx.font = '20px Nunito, sans-serif';
        ctx.fillText('−20 puntos', W / 2, H / 2 + 20);
      }
      ctx.restore();
    }

    this.animId = requestAnimationFrame(() => this.loop());
  },

  drawPigOnTable(ctx, W, tableY) {
    const px = W / 2;
    const py = tableY - 30;

    // Body (lying on side)
    ctx.save();
    ctx.translate(px, py);

    // Main body
    const bodyGrad = ctx.createRadialGradient(-20, -10, 10, 0, 0, 120);
    bodyGrad.addColorStop(0, '#f8c0b8');
    bodyGrad.addColorStop(0.6, '#f0a090');
    bodyGrad.addColorStop(1, '#d07060');
    ctx.beginPath();
    ctx.ellipse(0, 0, 160, 55, 0, 0, Math.PI * 2);
    ctx.fillStyle = bodyGrad;
    ctx.fill();
    ctx.strokeStyle = '#c06050';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Head
    ctx.beginPath();
    ctx.ellipse(155, -5, 45, 38, 0.15, 0, Math.PI * 2);
    ctx.fillStyle = '#f0a090';
    ctx.fill();
    ctx.strokeStyle = '#c06050';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Snout
    ctx.beginPath();
    ctx.ellipse(192, -2, 18, 14, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#e08070';
    ctx.fill();
    ctx.fillStyle = '#a04040';
    ctx.beginPath(); ctx.arc(188, -1, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(196, -1, 3.5, 0, Math.PI * 2); ctx.fill();

    // Eye
    ctx.beginPath();
    ctx.arc(162, -16, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#222';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(163, -17, 2, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();

    // Ear
    ctx.beginPath();
    ctx.ellipse(148, -38, 12, 18, -0.3, 0, Math.PI * 2);
    ctx.fillStyle = '#e08070';
    ctx.fill();
    ctx.strokeStyle = '#c06050';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Legs (4 legs visible)
    ctx.strokeStyle = '#d07060';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    [[-80, 50], [-30, 52], [30, 52], [80, 50]].forEach(([lx, ly]) => {
      ctx.beginPath();
      ctx.moveTo(lx, 40);
      ctx.lineTo(lx + 5, ly + 20);
      ctx.stroke();
      // Hoof
      ctx.beginPath();
      ctx.ellipse(lx + 5, ly + 28, 10, 6, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#8B4513';
      ctx.fill();
    });

    // Tail
    ctx.beginPath();
    ctx.arc(-155, -10, 15, 0, Math.PI * 1.2);
    ctx.strokeStyle = '#d07060';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Belly line / anatomy hint
    ctx.beginPath();
    ctx.moveTo(-140, 20);
    ctx.bezierCurveTo(-60, 35, 60, 35, 140, 20);
    ctx.strokeStyle = 'rgba(180,80,60,0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();

    // Zone labels on pig (subtle anatomy lines)
    if (this.phase === 'cutting') {
      ctx.save();
      ctx.globalAlpha = 0.15;
      ctx.strokeStyle = '#c0392b';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      // Vertical cut lines
      [px - 80, px - 20, px + 60, px + 120].forEach(x => {
        ctx.beginPath();
        ctx.moveTo(x, tableY - 80);
        ctx.lineTo(x, tableY - 5);
        ctx.stroke();
      });
      ctx.setLineDash([]);
      ctx.restore();
    }
  },

  drawKnife(ctx) {
    const { x, y, cutting } = this.knife;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4 + (cutting ? 0.2 : 0));

    // Handle
    ctx.fillStyle = '#4a2800';
    ctx.beginPath();
    ctx.roundRect(-6, 20, 12, 45, 4);
    ctx.fill();

    // Handle grip lines
    ctx.strokeStyle = '#3a1800';
    ctx.lineWidth = 1.5;
    [28, 36, 44, 52].forEach(y => {
      ctx.beginPath();
      ctx.moveTo(-5, y);
      ctx.lineTo(5, y);
      ctx.stroke();
    });

    // Guard
    ctx.fillStyle = '#888';
    ctx.fillRect(-10, 16, 20, 6);

    // Blade
    const bladeGrad = ctx.createLinearGradient(-4, -50, 4, 0);
    bladeGrad.addColorStop(0, '#f0f0f0');
    bladeGrad.addColorStop(0.4, '#d0d0d0');
    bladeGrad.addColorStop(1, '#a0a0a0');
    ctx.beginPath();
    ctx.moveTo(-4, 16);
    ctx.lineTo(4, 16);
    ctx.lineTo(2, -50);
    ctx.lineTo(-1, -50);
    ctx.closePath();
    ctx.fillStyle = bladeGrad;
    ctx.fill();
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Blade shine
    ctx.beginPath();
    ctx.moveTo(1, 14);
    ctx.lineTo(1.5, -48);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Blood on blade if cutting
    if (cutting) {
      ctx.fillStyle = 'rgba(180,0,0,0.6)';
      ctx.beginPath();
      ctx.ellipse(0, -10, 3, 15, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  },

  stop() {
    if (this.animId) cancelAnimationFrame(this.animId);
    this.animId = null;
    if (this.overlay && this.overlay.parentNode) this.overlay.remove();
    this.overlay = null;
    this.canvas = null;
    this.ctx = null;
  }
};
