// ===== MINIJUEGO DE CAPTURA CON CUERDA (Canvas animado) =====
const CaptureGame = {
  canvas: null,
  ctx: null,
  animId: null,
  pig: null,
  rope: { x: 0, y: 0 },
  pigPos: { x: 100, y: 0 },
  pigDir: 1,
  pigSpeed: 3,
  attempts: 3,
  caught: false,
  onSuccess: null,
  onFail: null,
  overlay: null,
  time: 0,
  catchEffect: null,
  mudParticles: [],
  pigAngle: 0,
  escapeJump: 0,
  lastMissX: null,

  show(pig, onSuccess, onFail) {
    this.pig = pig;
    this.onSuccess = onSuccess;
    this.onFail = onFail;
    this.attempts = 3;
    this.caught = false;
    this.time = 0;
    this.catchEffect = null;
    this.mudParticles = [];
    this.escapeJump = 0;
    this.lastMissX = null;

    // Speed based on experience
    this.pigSpeed = 2.5 + Math.min(5, (pig.experience || 0) * 0.4);

    this.overlay = document.createElement('div');
    this.overlay.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.88);
      z-index:600;display:flex;align-items:center;justify-content:center;
    `;

    this.overlay.innerHTML = `
      <div style="background:#fff;border-radius:24px;padding:32px;max-width:620px;width:95%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
        <h2 style="font-family:'Fredoka One',cursive;font-size:26px;color:#c0392b;margin-bottom:6px">
          🪢 ¡A atrapar a ${pig.name}!
        </h2>
        <p style="color:#7f4f3a;font-size:14px;margin-bottom:16px">
          Mueve el ratón y haz clic cuando el lazo esté sobre el cerdo
          ${pig.experience > 8 ? '<br><strong style="color:#c0392b">⚡ ¡Este cerdo es muy rápido!</strong>' : ''}
        </p>
        <canvas id="capture-canvas" width="560" height="220"
          style="border-radius:16px;cursor:crosshair;border:3px solid #e8d5cc;display:block;margin:0 auto 16px;"></canvas>
        <div style="display:flex;justify-content:center;gap:8px;margin-bottom:16px;" id="attempt-hearts"></div>
        <p id="capture-msg" style="font-size:15px;font-weight:700;min-height:22px;color:#c0392b;margin-bottom:12px"></p>
        <button id="btn-cancel-cap" style="padding:10px 24px;background:#b2bec3;border:none;border-radius:8px;
          font-family:'Nunito',sans-serif;font-weight:700;font-size:14px;cursor:pointer;">Cancelar</button>
      </div>
    `;

    document.body.appendChild(this.overlay);

    this.canvas = document.getElementById('capture-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.pigPos = { x: 80, y: 110 };
    this.rope = { x: 280, y: 110 };

    this.updateHearts();

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      this.rope.x = (e.clientX - rect.left) * scaleX;
      this.rope.y = (e.clientY - rect.top) * scaleY;
    });

    this.canvas.addEventListener('click', () => this.tryCapture());

    document.getElementById('btn-cancel-cap').addEventListener('click', () => {
      this.stop();
    });

    this.loop();
  },

  updateHearts() {
    const el = document.getElementById('attempt-hearts');
    if (!el) return;
    el.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const heart = document.createElement('span');
      heart.style.cssText = 'font-size:28px;transition:all 0.3s;';
      heart.textContent = i < this.attempts ? '❤️' : '🖤';
      el.appendChild(heart);
    }
  },

  tryCapture() {
    if (this.caught) return;
    const dx = this.rope.x - this.pigPos.x;
    const dy = this.rope.y - this.pigPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 38) {
      this.caught = true;
      this.catchEffect = { x: this.pigPos.x, y: this.pigPos.y, frame: 0 };
      this.spawnMud(this.pigPos.x, this.pigPos.y, 20);
      document.getElementById('capture-msg').textContent = '¡Atrapado! 🎉';
      document.getElementById('capture-msg').style.color = '#27ae60';
      setTimeout(() => {
        this.stop();
        if (this.onSuccess) this.onSuccess(this.pig);
      }, 1200);
    } else {
      this.attempts--;
      this.lastMissX = this.rope.x;
      this.escapeJump = 1;
      this.spawnMud(this.pigPos.x, this.pigPos.y, 8);
      this.updateHearts();

      if (this.attempts <= 0) {
        document.getElementById('capture-msg').textContent = '¡Se escapó! 🐷💨';
        document.getElementById('capture-msg').style.color = '#c0392b';
        setTimeout(() => {
          this.stop();
          if (this.onFail) this.onFail();
        }, 1200);
      } else {
        document.getElementById('capture-msg').textContent = '¡Fallaste! Inténtalo de nuevo';
        setTimeout(() => {
          const el = document.getElementById('capture-msg');
          if (el) el.textContent = '';
        }, 800);
      }
    }
  },

  spawnMud(x, y, count) {
    for (let i = 0; i < count; i++) {
      this.mudParticles.push({
        x, y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.8) * 5,
        life: 1,
        size: Math.random() * 6 + 3,
        color: `hsl(${25 + Math.random() * 20},${50 + Math.random() * 20}%,${35 + Math.random() * 20}%)`
      });
    }
  },

  loop() {
    if (!this.canvas) return;
    this.time++;
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;

    // Move pig
    if (!this.caught) {
      this.pigPos.x += this.pigDir * this.pigSpeed;
      if (this.pigPos.x > W - 50) { this.pigDir = -1; this.pigAngle = Math.PI; }
      if (this.pigPos.x < 50)     { this.pigDir = 1;  this.pigAngle = 0; }

      // Escape jump after miss
      if (this.escapeJump > 0) {
        this.pigPos.y = 110 - Math.sin(this.escapeJump * Math.PI) * 30;
        this.escapeJump = Math.max(0, this.escapeJump - 0.08);
      } else {
        this.pigPos.y = 110 + Math.sin(this.time * 0.12) * 5;
      }
    }

    // Update mud particles
    this.mudParticles = this.mudParticles.filter(p => p.life > 0);
    this.mudParticles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.3;
      p.life -= 0.04;
    });

    // ---- DRAW ----
    ctx.clearRect(0, 0, W, H);

    // Sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.55);
    skyGrad.addColorStop(0, '#87CEEB');
    skyGrad.addColorStop(1, '#b8e4f7');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H * 0.55);

    // Ground
    const groundGrad = ctx.createLinearGradient(0, H * 0.55, 0, H);
    groundGrad.addColorStop(0, '#8B6914');
    groundGrad.addColorStop(0.3, '#7a5c10');
    groundGrad.addColorStop(1, '#5c4209');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, H * 0.55, W, H * 0.45);

    // Mud puddles
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.ellipse(80 + i * 130, H * 0.62, 30 + i * 5, 8, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(80,50,10,0.4)';
      ctx.fill();
    }

    // Fence posts
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 5;
    for (let x = 20; x < W; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, H * 0.45);
      ctx.lineTo(x, H * 0.68);
      ctx.stroke();
    }
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, H * 0.5);  ctx.lineTo(W, H * 0.5);  ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, H * 0.58); ctx.lineTo(W, H * 0.58); ctx.stroke();

    // Mud particles
    this.mudParticles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life;
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    // Shadow under pig
    ctx.beginPath();
    ctx.ellipse(this.pigPos.x, H * 0.62, 28, 7, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fill();

    // Draw pig
    ctx.save();
    ctx.translate(this.pigPos.x, this.pigPos.y);
    if (this.pigDir === -1) ctx.scale(-1, 1);

    // Body
    ctx.beginPath();
    ctx.ellipse(0, 0, 32, 22, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#f4a0a0';
    ctx.fill();
    ctx.strokeStyle = '#d4706a';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Head
    ctx.beginPath();
    ctx.ellipse(28, -4, 18, 16, 0.2, 0, Math.PI * 2);
    ctx.fillStyle = '#f4a0a0';
    ctx.fill();
    ctx.strokeStyle = '#d4706a';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Snout
    ctx.beginPath();
    ctx.ellipse(40, -2, 9, 7, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#e88080';
    ctx.fill();
    ctx.fillStyle = '#c05050';
    ctx.beginPath(); ctx.arc(38, -1, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(43, -1, 2, 0, Math.PI * 2); ctx.fill();

    // Eye
    ctx.beginPath();
    ctx.arc(32, -10, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#333';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(33, -11, 1, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();

    // Ear
    ctx.beginPath();
    ctx.ellipse(22, -18, 7, 10, -0.3, 0, Math.PI * 2);
    ctx.fillStyle = '#e88080';
    ctx.fill();

    // Legs (animated)
    const legSwing = Math.sin(this.time * 0.25) * 10;
    ctx.strokeStyle = '#d4706a';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    [[-18, legSwing], [-6, -legSwing], [6, legSwing], [18, -legSwing]].forEach(([lx, swing]) => {
      ctx.beginPath();
      ctx.moveTo(lx, 18);
      ctx.lineTo(lx + swing * 0.3, 36);
      ctx.stroke();
    });

    // Tail (curly)
    ctx.beginPath();
    ctx.arc(-30, -5, 8, 0, Math.PI * 1.5);
    ctx.strokeStyle = '#d4706a';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.restore();

    // Catch effect (stars burst)
    if (this.catchEffect) {
      const ef = this.catchEffect;
      ef.frame++;
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + ef.frame * 0.1;
        const r = ef.frame * 3;
        ctx.beginPath();
        ctx.arc(ef.x + Math.cos(angle) * r, ef.y + Math.sin(angle) * r, 5, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${i * 45},90%,60%)`;
        ctx.globalAlpha = Math.max(0, 1 - ef.frame / 20);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.font = 'bold 28px serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#27ae60';
      ctx.globalAlpha = Math.min(1, ef.frame / 5);
      ctx.fillText('¡Atrapado! 🎉', ef.x, ef.y - 40 - ef.frame);
      ctx.globalAlpha = 1;
    }

    // Draw rope/lasso
    if (!this.caught) {
      // Rope line from bottom-left corner
      ctx.beginPath();
      ctx.moveTo(30, H - 10);
      ctx.quadraticCurveTo(
        this.rope.x - 40, this.rope.y + 30,
        this.rope.x, this.rope.y
      );
      ctx.strokeStyle = '#8B4513';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Lasso circle
      const ropeRadius = 22 + Math.sin(this.time * 0.15) * 4;
      ctx.beginPath();
      ctx.arc(this.rope.x, this.rope.y, ropeRadius, 0, Math.PI * 2);
      ctx.strokeStyle = '#8B4513';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Proximity highlight
      const dx = this.rope.x - this.pigPos.x;
      const dy = this.rope.y - this.pigPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 60) {
        ctx.beginPath();
        ctx.arc(this.rope.x, this.rope.y, ropeRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(39,174,96,${1 - dist / 60})`;
        ctx.lineWidth = 4;
        ctx.stroke();
      }
    }

    this.animId = requestAnimationFrame(() => this.loop());
  },

  stop() {
    if (this.animId) cancelAnimationFrame(this.animId);
    this.animId = null;
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.remove();
    }
    this.overlay = null;
    this.canvas = null;
    this.ctx = null;
  }
};
