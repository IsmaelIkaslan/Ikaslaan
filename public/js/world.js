// ===== WORLD TOP-DOWN =====
const World = {
  canvas: null, ctx: null, animId: null, time: 0,
  player: { x: 400, y: 380, vx: 0, vy: 0, speed: 2.5, dir: 'down', frame: 0, frameTimer: 0, moving: false, name: '' },
  cam: { x: 0, y: 0 },
  MAP_W: 1400, MAP_H: 1000,
  keys: {},
  caughtPig: null,
  notification: null, notifTimer: 0,
  trees: [], flowers: [], pigs: [], npcs: [],
  trough: { x: 260, y: 270, w: 44, h: 24 },
  zones: [
    { id: 'corral',   x: 80,  y: 80,  w: 320, h: 260, label: 'Corral',   color: '#8B5e3c', floor: '#c8a46e' },
    { id: 'tienda',   x: 750, y: 60,  w: 220, h: 200, label: 'Tienda',   color: '#2d7a1e', floor: '#a8d878' },
    { id: 'matadero', x: 750, y: 580, w: 240, h: 220, label: 'Matadero', color: '#8B1A1A', floor: '#c8a0a0' },
    { id: 'ranking',  x: 80,  y: 660, w: 200, h: 180, label: 'Ranking',  color: '#b8860b', floor: '#ffd700' }
  ],

  init(canvasEl, playerName) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.player.name = playerName;
    this.player.x = 400; this.player.y = 380;
    this.caughtPig = null;
    this.trees = []; this.flowers = []; this.pigs = []; this.npcs = [];
    console.log('World init - canvas size:', canvasEl.width, 'x', canvasEl.height);
    this.generateWorld();
    this.bindKeys();
    this.bindClick();
    this.loop();
  },

  generateWorld() {
    // Trees
    [[50,50],[50,250],[50,500],[50,750],[200,820],[400,820],[600,820],[900,820],[1100,820],
     [1100,600],[1100,400],[1100,200],[1100,50],[900,50],[700,50],[500,50],[300,50],
     [480,200],[560,300],[360,500],[860,300],[960,500]
    ].forEach(([x,y]) => this.trees.push({ x, y, size: 28 + Math.random()*16, sway: Math.random()*Math.PI*2 }));

    // Flowers
    for (let i = 0; i < 50; i++) {
      this.flowers.push({
        x: 80 + Math.random()*1240, y: 80 + Math.random()*740,
        color: ['#ff6b9d','#ffd700','#a29bfe','#fd79a8','#fdcb6e'][Math.floor(Math.random()*5)],
        size: 4 + Math.random()*4
      });
    }

    // Pigs in corral
    const pigNames = ['Porky','Peppa','Bacon','Chuleta','Jamón'];
    const state = (typeof Game !== 'undefined' && Game.state) ? Game.state.pigs : [];
    const pigData = state.length ? state : [
      {id:1,name:'Porky',weight:5,quality:'media',experience:0,stage:'cochinillo'},
      {id:2,name:'Peppa',weight:4,quality:'media',experience:0,stage:'cochinillo'}
    ];
    pigData.forEach((p, i) => {
      this.pigs.push({
        id: p.id, name: p.name, weight: p.weight, quality: p.quality,
        experience: p.experience || 0, stage: p.stage || 'cochinillo',
        x: 140 + (i % 3) * 80, y: 160 + Math.floor(i/3) * 70,
        dir: 1, speed: 0.4 + Math.random()*0.3,
        frame: 0, timer: 0, idle: 60 + Math.floor(Math.random()*120),
        caught: false
      });
    });

    // NPCs from village
    [
      {name:'Don Ramón',  skin:'#f4c4a0',shirt:'#3498db',hat:true, hatColor:'#8B5e3c'},
      {name:'María José', skin:'#f4b090',shirt:'#e91e8c',hat:false,hair:'#4a2800'},
      {name:'El Chato',   skin:'#d4a070',shirt:'#27ae60',hat:true, hatColor:'#2c3e50'},
      {name:'Doña Paca',  skin:'#f0c8a0',shirt:'#9b59b6',hat:false,hair:'#888'},
      {name:'Chef Marcos',skin:'#e8b080',shirt:'#ecf0f1',hat:true, hatColor:'#ecf0f1'},
      {name:'Pepe el bar',skin:'#c8905a',shirt:'#e67e22',hat:false,hair:'#2c1810'},
      {name:'La Conchi',  skin:'#f8d0b0',shirt:'#e74c3c',hat:false,hair:'#c0392b'},
      {name:'Manolo',     skin:'#d4a878',shirt:'#2980b9',hat:true, hatColor:'#6b3e1c'},
    ].forEach((n, i) => {
      this.npcs.push({
        ...n,
        x: 1050 + Math.random()*80, y: 120 + i*90,
        targetX: 620 + Math.random()*160, targetY: 180 + Math.random()*500,
        arrived: false, speed: 0.35 + Math.random()*0.25,
        phase: Math.random()*Math.PI*2, walkFrame: 0, walkTimer: 0, dir: 'left'
      });
    });
  },

  bindKeys() {
    window.addEventListener('keydown', e => {
      this.keys[e.key] = true;
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
      if (e.key === 'e' || e.key === 'E' || e.key === ' ') this.tryInteract();
    });
    window.addEventListener('keyup', e => { this.keys[e.key] = false; });
  },

  bindClick() {
    if (!this.canvas) return;
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const wx = (e.clientX - rect.left) * scaleX + this.cam.x;
      const wy = (e.clientY - rect.top)  * scaleY + this.cam.y;
      this.tryInteractAt(wx, wy);
    });
  },


  tryInteract() {
    this.tryInteractAt(this.player.x, this.player.y);
  },

  tryInteractAt(wx, wy) {
    const p = this.player;
    // Try catch pig
    if (!this.caughtPig) {
      for (const pig of this.pigs) {
        const dx = wx - pig.x, dy = wy - pig.y;
        if (Math.sqrt(dx*dx+dy*dy) < 50) {
          this.caughtPig = pig;
          pig.caught = true;
          this.showNotif('¡Atrapaste a ' + pig.name + '! Llévalo al comedero 🪣');
          return;
        }
      }
    } else {
      // Release pig at trough to feed
      const t = this.trough;
      const dx = p.x - (t.x + t.w/2), dy = p.y - (t.y + t.h/2);
      if (Math.sqrt(dx*dx+dy*dy) < 60) {
        this.feedPig(this.caughtPig);
        return;
      }
      // Release pig anywhere else
      this.caughtPig.caught = false;
      this.caughtPig = null;
      this.showNotif('Cerdo suelto');
    }
  },

  async feedPig(pig) {
    const seeds = (typeof Game !== 'undefined' && Game.state) ? Game.state.seeds : {acorn:0,carrot:0,wheat:0};
    let foodType = null;
    if (seeds.acorn  > 0) foodType = 'acorn';
    else if (seeds.carrot > 0) foodType = 'carrot';
    else if (seeds.wheat  > 0) foodType = 'wheat';

    if (!foodType) {
      this.showNotif('No tienes comida. Compra semillas en la Tienda 🌱');
      pig.caught = false;
      this.caughtPig = null;
      return;
    }

    const names = {acorn:'bellota 🌰', carrot:'zanahoria 🥕', wheat:'trigo 🌾'};
    const res = await API.post('/api/game/feed-pig', { pigId: pig.id, foodType });
    if (res.error) {
      this.showNotif(res.error);
    } else {
      pig.weight   = res.pig.weight;
      pig.quality  = res.pig.quality;
      pig.experience = res.pig.experience;
      pig.stage    = res.pig.stage;
      if (typeof Game !== 'undefined') {
        Game.state.seeds = res.seeds;
        Game.updateHUD();
      }
      this.showNotif(pig.name + ' comió ' + names[foodType] + '! Peso: ' + pig.weight + 'kg');
    }
    pig.caught = false;
    this.caughtPig = null;
  },

  showNotif(msg) {
    this.notification = msg;
    this.notifTimer = 180;
  },

  update() {
    const p = this.player;
    p.vx = 0; p.vy = 0; p.moving = false;
    if (this.keys['ArrowUp']    || this.keys['w'] || this.keys['W']) { p.vy = -p.speed; p.dir = 'up';    p.moving = true; }
    if (this.keys['ArrowDown']  || this.keys['s'] || this.keys['S']) { p.vy =  p.speed; p.dir = 'down';  p.moving = true; }
    if (this.keys['ArrowLeft']  || this.keys['a'] || this.keys['A']) { p.vx = -p.speed; p.dir = 'left';  p.moving = true; }
    if (this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']) { p.vx =  p.speed; p.dir = 'right'; p.moving = true; }
    if (p.vx !== 0 && p.vy !== 0) { p.vx *= 0.707; p.vy *= 0.707; }

    const nx = p.x + p.vx, ny = p.y + p.vy;
    if (nx > 20 && nx < this.MAP_W - 20) p.x = nx;
    if (ny > 20 && ny < this.MAP_H - 20) p.y = ny;

    if (p.moving) { p.frameTimer++; if (p.frameTimer >= 10) { p.frame = (p.frame+1)%4; p.frameTimer = 0; } }
    else p.frame = 0;

    this.cam.x = Math.max(0, Math.min(this.MAP_W - this.canvas.width,  p.x - this.canvas.width/2));
    this.cam.y = Math.max(0, Math.min(this.MAP_H - this.canvas.height, p.y - this.canvas.height/2));

    // Pig caught follows player
    if (this.caughtPig) {
      this.caughtPig.x += (p.x - 30 - this.caughtPig.x) * 0.15;
      this.caughtPig.y += (p.y + 20 - this.caughtPig.y) * 0.15;
    }

    // Free pigs wander
    this.pigs.forEach(pig => {
      if (pig.caught) return;
      pig.timer++;
      if (pig.timer > pig.idle) {
        pig.x += pig.dir * pig.speed;
        pig.timer = 0;
        pig.idle = 40 + Math.floor(Math.random()*100);
        if (pig.x > 360 || pig.x < 110) pig.dir *= -1;
      }
      pig.frame = Math.floor(this.time/12)%2;
    });

    // NPCs walk from village
    this.npcs.forEach(npc => {
      if (!npc.arrived) {
        const dx = npc.targetX - npc.x, dy = npc.targetY - npc.y;
        const dist = Math.sqrt(dx*dx+dy*dy);
        if (dist > 4) {
          npc.x += (dx/dist)*npc.speed; npc.y += (dy/dist)*npc.speed;
          npc.dir = Math.abs(dx)>Math.abs(dy) ? (dx>0?'right':'left') : (dy>0?'down':'up');
          npc.walkTimer++; if (npc.walkTimer>10){npc.walkFrame=(npc.walkFrame+1)%4;npc.walkTimer=0;}
        } else { npc.arrived = true; }
      } else {
        npc.phase += 0.007;
        npc.x = npc.targetX + Math.sin(npc.phase)*22;
        npc.y = npc.targetY + Math.cos(npc.phase*0.7)*18;
        npc.walkTimer++; if(npc.walkTimer>14){npc.walkFrame=(npc.walkFrame+1)%4;npc.walkTimer=0;}
      }
    });

    if (this.notifTimer > 0) this.notifTimer--;
    else this.notification = null;
  },


  draw() {
    const ctx = this.ctx, W = this.canvas.width, H = this.canvas.height;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0,0,W,H);
    ctx.save();
    ctx.translate(-this.cam.x, -this.cam.y);
    this.drawGround();
    this.drawZones();
    this.drawDecorations();
    this.drawTrough();
    this.drawPigs();
    this.drawNPCs();
    this.drawPlayer();
    this.drawInteractHints();
    ctx.restore();
    this.drawMinimap();
    this.drawNotification();
  },

  drawGround() {
    const ctx = this.ctx, W = this.MAP_W, H = this.MAP_H;
    ctx.fillStyle = '#5a9e3a'; ctx.fillRect(0,0,W,H);
    const S = 16;
    for (let x=0;x<W;x+=S) for (let y=0;y<H;y+=S) {
      const h = (x*7+y*13)%5;
      if (h===0){ctx.fillStyle='#4a8a2e';ctx.fillRect(x,y,S,S);}
      if (h===1){ctx.fillStyle='#6ab04c';ctx.fillRect(x,y,S,S);}
    }
    // Paths
    ctx.fillStyle='#c8a46e'; ctx.fillRect(0,360,W,32); ctx.fillRect(560,0,32,H);
    ctx.fillStyle='#b8944e';
    for(let x=0;x<W;x+=48) ctx.fillRect(x,360,24,32);
    for(let y=0;y<H;y+=48) ctx.fillRect(560,y,32,24);
    // Pond
    ctx.fillStyle='#4a90d9'; ctx.fillRect(460,460,80,60);
    ctx.fillStyle='#5aa0e9'; ctx.fillRect(464,464,40,20);
    ctx.strokeStyle='#3a7ab9'; ctx.lineWidth=3; ctx.strokeRect(460,460,80,60);
    // Village ground
    ctx.fillStyle='#c8b090'; ctx.fillRect(820,80,340,740);
    ctx.fillStyle='#b8a070'; ctx.fillRect(820,360,340,32);
    // Village fence
    ctx.fillStyle='#8B5e3c'; ctx.fillRect(820,80,8,740);
    ctx.fillStyle='#6b3e1c';
    for(let y=80;y<820;y+=28) ctx.fillRect(816,y,8,14);
    // Village houses
    [{x:840,y:100,w:70,h:60,roof:'#8B1A1A',wall:'#f0e0c0'},
     {x:940,y:100,w:70,h:60,roof:'#1a5c8B',wall:'#e0f0c0'},
     {x:1060,y:100,w:70,h:60,roof:'#2d7a1e',wall:'#f0f0c0'},
     {x:840,y:600,w:70,h:60,roof:'#8B5e3c',wall:'#f0e8d0'},
     {x:960,y:600,w:80,h:70,roof:'#5c1a8B',wall:'#f0d0f0'},
     {x:1070,y:600,w:70,h:60,roof:'#8B1A1A',wall:'#f0e0c0'}
    ].forEach(h => {
      ctx.fillStyle=h.wall; ctx.fillRect(h.x,h.y,h.w,h.h);
      ctx.fillStyle=h.roof;
      ctx.beginPath(); ctx.moveTo(h.x-6,h.y); ctx.lineTo(h.x+h.w/2,h.y-28); ctx.lineTo(h.x+h.w+6,h.y); ctx.closePath(); ctx.fill();
      ctx.fillStyle='#6b3e1c'; ctx.fillRect(h.x+h.w/2-8,h.y+h.h-22,16,22);
      ctx.fillStyle='rgba(255,220,100,0.8)'; ctx.fillRect(h.x+8,h.y+12,14,12); ctx.fillRect(h.x+h.w-22,h.y+12,14,12);
    });
    ctx.fillStyle='#8B5e3c'; ctx.fillRect(820,340,80,24);
    ctx.fillStyle='#ffd700'; ctx.font='bold 8px "Press Start 2P",monospace'; ctx.textAlign='center';
    ctx.fillText('POBLADO',860,356);
  },

  drawZones() {
    const ctx = this.ctx;
    this.zones.forEach(z => {
      ctx.fillStyle=z.floor; ctx.fillRect(z.x,z.y,z.w,z.h);
      ctx.fillStyle='rgba(0,0,0,0.05)';
      for(let x=z.x;x<z.x+z.w;x+=24) ctx.fillRect(x,z.y,1,z.h);
      for(let y=z.y;y<z.y+z.h;y+=24) ctx.fillRect(z.x,y,z.w,1);
      ctx.fillStyle=z.color;
      ctx.fillRect(z.x,z.y,z.w,14); ctx.fillRect(z.x,z.y,10,z.h); ctx.fillRect(z.x+z.w-10,z.y,10,z.h);
      const dx=z.x+z.w/2-20, dy=z.y+z.h-4;
      ctx.fillStyle='#4a2800'; ctx.fillRect(dx,dy-28,40,32);
      ctx.fillStyle='#6b3e1c'; ctx.fillRect(dx+2,dy-26,36,28);
      ctx.fillStyle='#ffd700'; ctx.fillRect(dx+28,dy-14,4,4);
      ctx.fillStyle='rgba(255,220,100,0.7)';
      ctx.fillRect(z.x+18,z.y+22,26,18); ctx.fillRect(z.x+z.w-44,z.y+22,26,18);
      ctx.fillStyle=z.color;
      ctx.fillRect(z.x+30,z.y+22,2,18); ctx.fillRect(z.x+18,z.y+30,26,2);
      ctx.fillRect(z.x+z.w-32,z.y+22,2,18); ctx.fillRect(z.x+z.w-44,z.y+30,26,2);
      ctx.fillStyle='#8B5e3c'; ctx.fillRect(dx-8,dy-50,56,18);
      ctx.fillStyle='#ffd700'; ctx.font='7px "Press Start 2P",monospace'; ctx.textAlign='center';
      ctx.fillText(z.label, z.x+z.w/2, dy-37);
    });
    // Corral fence
    const cz=this.zones[0];
    ctx.fillStyle='#8B5e3c';
    ctx.fillRect(cz.x-8,cz.y-8,cz.w+16,8); ctx.fillRect(cz.x-8,cz.y+cz.h,cz.w+16,8);
    ctx.fillRect(cz.x-8,cz.y-8,8,cz.h+16); ctx.fillRect(cz.x+cz.w,cz.y-8,8,cz.h+16);
    ctx.fillStyle='#6b3e1c';
    for(let x=cz.x-8;x<cz.x+cz.w+8;x+=32) ctx.fillRect(x,cz.y-12,8,cz.h+24);
  },

  drawTrough() {
    const ctx=this.ctx, t=this.trough;
    ctx.fillStyle='#8B5e3c'; ctx.fillRect(t.x-2,t.y-2,t.w+4,t.h+4);
    ctx.fillStyle='#c8a46e'; ctx.fillRect(t.x,t.y,t.w,t.h);
    ctx.fillStyle='#4a90d9'; ctx.fillRect(t.x+4,t.y+4,t.w-8,t.h-8);
    ctx.fillStyle='white'; ctx.font='10px serif'; ctx.textAlign='center';
    ctx.fillText('🪣',t.x+t.w/2,t.y+t.h/2+4);
    // Label
    const p=this.player, dx=p.x-(t.x+t.w/2), dy=p.y-(t.y+t.h/2);
    if (Math.sqrt(dx*dx+dy*dy)<80) {
      ctx.fillStyle='rgba(0,0,0,0.75)'; ctx.fillRect(t.x-10,t.y-22,t.w+20,14);
      ctx.fillStyle='#ffd700'; ctx.font='6px "Press Start 2P",monospace';
      ctx.fillText(this.caughtPig?'[E] Dar de comer':'Comedero',t.x+t.w/2,t.y-11);
    }
  },

  drawDecorations() {
    const ctx=this.ctx;
    this.flowers.forEach(f => {
      const inB=this.zones.some(z=>f.x>z.x&&f.x<z.x+z.w&&f.y>z.y&&f.y<z.y+z.h);
      if(inB)return;
      ctx.fillStyle='#3a7a1e'; ctx.fillRect(f.x,f.y+f.size,2,f.size);
      ctx.fillStyle=f.color; ctx.fillRect(f.x-f.size/2,f.y,f.size,f.size);
    });
    this.trees.forEach(t => {
      const sway=Math.sin(this.time*0.02+t.sway)*1.5, S=t.size;
      ctx.fillStyle='rgba(0,0,0,0.12)'; ctx.fillRect(t.x-S*0.4+sway,t.y+S*0.7,S*0.8,S*0.2);
      ctx.fillStyle='#6b3e1c'; ctx.fillRect(t.x-4+sway,t.y+S*0.5,8,S*0.5);
      [[0,0,1],[-2,-S*0.3,0.85],[-1,-S*0.6,0.65]].forEach(([ox,oy,sc])=>{
        ctx.fillStyle='#2d7a1e'; ctx.fillRect(t.x-S*sc/2+ox+sway,t.y+oy,S*sc,S*0.35);
        ctx.fillStyle='#3a9a28'; ctx.fillRect(t.x-S*sc/2+4+ox+sway,t.y+oy,S*sc-8,S*0.2);
      });
    });
  },


  drawPigs() {
    const ctx=this.ctx;
    this.pigs.forEach(pig => {
      ctx.save(); ctx.translate(pig.x,pig.y);
      if(pig.dir===-1) ctx.scale(-1,1);
      const lf=pig.frame===0?0:3;
      // Shadow
      ctx.fillStyle='rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(0,18,14,5,0,0,Math.PI*2); ctx.fill();
      // Back legs
      ctx.fillStyle='#c87878'; ctx.fillRect(-9,12,5,7-lf); ctx.fillRect(4,12,5,7+lf);
      ctx.fillStyle='#7a4a2a'; ctx.fillRect(-9,18-lf,5,3); ctx.fillRect(4,18+lf,5,3);
      // Body
      ctx.fillStyle='#f0a0a0'; ctx.beginPath(); ctx.ellipse(0,2,13,10,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#f8c8c8'; ctx.beginPath(); ctx.ellipse(-3,-2,7,5,-0.3,0,Math.PI*2); ctx.fill();
      // Front legs
      ctx.fillStyle='#d08888'; ctx.fillRect(-8,8,5,7+lf); ctx.fillRect(3,8,5,7-lf);
      ctx.fillStyle='#7a4a2a'; ctx.fillRect(-8,14+lf,5,3); ctx.fillRect(3,14-lf,5,3);
      // Neck + head
      ctx.fillStyle='#e89090'; ctx.fillRect(7,-4,7,8);
      ctx.fillStyle='#f0a0a0'; ctx.beginPath(); ctx.ellipse(17,-2,10,9,0.1,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#f8c8c8'; ctx.beginPath(); ctx.ellipse(14,-5,5,4,-0.2,0,Math.PI*2); ctx.fill();
      // Snout
      ctx.fillStyle='#d87878'; ctx.beginPath(); ctx.ellipse(25,0,6,5,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#a04040';
      ctx.beginPath(); ctx.arc(23,-1,1.5,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(27,-1,1.5,0,Math.PI*2); ctx.fill();
      // Eye
      ctx.fillStyle='#1a1a1a'; ctx.beginPath(); ctx.arc(20,-5,2.5,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='white'; ctx.beginPath(); ctx.arc(21,-6,1,0,Math.PI*2); ctx.fill();
      // Ear
      ctx.fillStyle='#e08080'; ctx.beginPath(); ctx.ellipse(14,-10,4,6,-0.4,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#c06060'; ctx.beginPath(); ctx.ellipse(14,-10,2,4,-0.4,0,Math.PI*2); ctx.fill();
      // Tail
      ctx.strokeStyle='#d08080'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(-12,0,5,0,Math.PI*1.5); ctx.stroke();
      // Caught rope
      if(pig.caught) {
        ctx.strokeStyle='#8B4513'; ctx.lineWidth=2; ctx.setLineDash([4,3]);
        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-30,-20); ctx.stroke();
        ctx.setLineDash([]);
      }
      // Name + weight
      ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.fillRect(-18,-28,36,12);
      ctx.fillStyle='white'; ctx.font='6px "Press Start 2P",monospace'; ctx.textAlign='center';
      ctx.fillText(pig.name,0,-19);
      ctx.restore();
      // Weight badge
      ctx.save(); ctx.translate(pig.x,pig.y);
      const stageColor = pig.stage==='cerdo'?'#636e72':'#fdcb6e';
      ctx.fillStyle=stageColor; ctx.fillRect(-14,22,28,10);
      ctx.fillStyle='#2d3436'; ctx.font='6px "Press Start 2P",monospace'; ctx.textAlign='center';
      ctx.fillText(pig.weight+'kg',0,30);
      ctx.restore();
    });
  },

  drawNPCs() {
    const ctx=this.ctx;
    this.npcs.forEach(npc => {
      ctx.save(); ctx.translate(npc.x,npc.y);
      const bob=Math.sin(this.time*0.15+npc.phase)*1.5;
      const ls=Math.sin(this.time*0.2+npc.phase)*4;
      // Shadow
      ctx.fillStyle='rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(0,30,8,3,0,0,Math.PI*2); ctx.fill();
      // Boots
      ctx.fillStyle='#4a2800'; ctx.fillRect(-6,22+bob,5,7); ctx.fillRect(1,22+bob,5,7);
      // Legs
      ctx.fillStyle='#5a4a3a'; ctx.fillRect(-5,12+bob,4,12+ls); ctx.fillRect(1,12+bob,4,12-ls);
      // Body
      ctx.fillStyle=npc.shirt; ctx.fillRect(-7,2+bob,14,12);
      // Arms
      ctx.fillStyle=npc.shirt; ctx.fillRect(-11,4+bob+ls*0.5,5,9); ctx.fillRect(6,4+bob-ls*0.5,5,9);
      // Hands
      ctx.fillStyle=npc.skin; ctx.fillRect(-12,12+bob+ls*0.5,5,4); ctx.fillRect(7,12+bob-ls*0.5,5,4);
      // Neck + head
      ctx.fillStyle=npc.skin; ctx.fillRect(-3,-2+bob,6,6);
      ctx.beginPath(); ctx.ellipse(0,-10+bob,8,9,0,0,Math.PI*2); ctx.fill();
      // Hair or hat
      if(npc.hat){
        ctx.fillStyle=npc.hatColor; ctx.fillRect(-10,-16+bob,20,5); ctx.fillRect(-6,-28+bob,12,14);
        ctx.fillStyle='rgba(0,0,0,0.3)'; ctx.fillRect(-6,-16+bob,12,3);
      } else {
        ctx.fillStyle=npc.hair||'#4a2800';
        ctx.beginPath(); ctx.ellipse(0,-17+bob,8,5,0,0,Math.PI*2); ctx.fill();
        ctx.fillRect(-8,-17+bob,16,8);
      }
      // Eyes
      ctx.fillStyle='#1a1a1a';
      ctx.beginPath(); ctx.arc(-3,-10+bob,1.5,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(3,-10+bob,1.5,0,Math.PI*2); ctx.fill();
      // Name tag
      ctx.fillStyle='rgba(0,0,0,0.75)';
      const tw=npc.name.length*4.5+8; ctx.fillRect(-tw/2,-38+bob,tw,11);
      ctx.fillStyle='#ffd700'; ctx.font='6px "Press Start 2P",monospace'; ctx.textAlign='center';
      ctx.fillText(npc.name,0,-30+bob);
      // Speech bubble near player
      const pdx=this.player.x-npc.x, pdy=this.player.y-npc.y;
      if(Math.sqrt(pdx*pdx+pdy*pdy)<70){
        ctx.fillStyle='white'; ctx.fillRect(-22,-58+bob,44,16);
        ctx.fillStyle='#c0392b'; ctx.font='6px "Press Start 2P",monospace';
        ctx.fillText('¡Hola!',0,-46+bob);
        ctx.fillStyle='white'; ctx.fillRect(-3,-42+bob,6,5);
      }
      ctx.restore();
    });
  },


  drawPlayer() {
    const ctx=this.ctx, p=this.player;
    ctx.save(); ctx.translate(p.x,p.y);
    const bob=p.moving?Math.sin(this.time*0.3)*2:0;
    const ls=p.moving?Math.sin(this.time*0.3)*4:0;
    // Shadow
    ctx.fillStyle='rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(0,30,10,4,0,0,Math.PI*2); ctx.fill();
    // Boots
    ctx.fillStyle='#4a2800'; ctx.fillRect(-8,28+bob,6,8); ctx.fillRect(2,28+bob,6,8);
    // Legs
    ctx.fillStyle='#2c5f8a'; ctx.fillRect(-7,16+bob,5,14+ls); ctx.fillRect(2,16+bob,5,14-ls);
    // Body
    ctx.fillStyle='#c0392b'; ctx.fillRect(-8,4+bob,16,14);
    // Arms
    ctx.fillStyle='#c0392b';
    ctx.fillRect(-14,6+bob+ls*0.5,6,10); ctx.fillRect(8,6+bob-ls*0.5,6,10);
    // Hands
    ctx.fillStyle='#f4c4a0'; ctx.fillRect(-16,15+bob+ls*0.5,6,5); ctx.fillRect(10,15+bob-ls*0.5,6,5);
    // Neck + head
    ctx.fillStyle='#f4c4a0'; ctx.fillRect(-4,-2+bob,8,8);
    ctx.beginPath(); ctx.ellipse(0,-10+bob,9,10,0,0,Math.PI*2); ctx.fill();
    // Hair
    ctx.fillStyle='#4a2800'; ctx.fillRect(-9,-14+bob,18,6);
    // Eyes
    ctx.fillStyle='#333';
    if(p.dir!=='up'){
      if(p.dir==='left'){ctx.fillRect(-5,-8+bob,3,3);}
      else if(p.dir==='right'){ctx.fillRect(2,-8+bob,3,3);}
      else{ctx.fillRect(-4,-8+bob,3,3);ctx.fillRect(1,-8+bob,3,3);}
    }
    // Hat
    ctx.fillStyle='#8B5e3c'; ctx.fillRect(-11,-16+bob,22,5);
    ctx.fillStyle='#6b3e1c'; ctx.fillRect(-6,-28+bob,12,14);
    ctx.fillStyle='#c8a46e'; ctx.fillRect(-6,-16+bob,12,3);
    // Name
    ctx.fillStyle='rgba(0,0,0,0.7)';
    const nw=p.name.length*5+12; ctx.fillRect(-nw/2,-42+bob,nw,12);
    ctx.fillStyle='#ffd700'; ctx.font='7px "Press Start 2P",monospace'; ctx.textAlign='center';
    ctx.fillText(p.name,0,-33+bob);
    // Rope if has caught pig
    if(this.caughtPig){
      ctx.strokeStyle='#8B4513'; ctx.lineWidth=2.5; ctx.setLineDash([5,3]);
      ctx.beginPath(); ctx.moveTo(0,10); ctx.lineTo(this.caughtPig.x-p.x,this.caughtPig.y-p.y); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  },

  drawInteractHints() {
    const ctx=this.ctx, p=this.player;
    // Pig hints
    if(!this.caughtPig) {
      this.pigs.forEach(pig => {
        const dx=p.x-pig.x, dy=p.y-pig.y;
        if(Math.sqrt(dx*dx+dy*dy)<55){
          ctx.fillStyle='rgba(0,0,0,0.8)'; ctx.fillRect(pig.x-28,pig.y-46,56,14);
          ctx.fillStyle='#ffd700'; ctx.font='6px "Press Start 2P",monospace'; ctx.textAlign='center';
          ctx.fillText('[E] Atrapar',pig.x,pig.y-35);
        }
      });
    }
    // Zone door hints
    this.zones.forEach(z => {
      const doorX=z.x+z.w/2, doorY=z.y+z.h+10;
      const dx=p.x-doorX, dy=p.y-doorY;
      if(Math.sqrt(dx*dx+dy*dy)<70){
        ctx.fillStyle='rgba(0,0,0,0.8)'; ctx.fillRect(doorX-36,doorY-28,72,14);
        ctx.fillStyle='#ffd700'; ctx.font='6px "Press Start 2P",monospace'; ctx.textAlign='center';
        ctx.fillText('[E] Entrar',doorX,doorY-17);
        if(this.keys['e']||this.keys['E']) this.enterZone(z.id);
      }
    });
  },

  enterZone(id) {
    document.querySelectorAll('.nav-btn[data-section]').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.game-section').forEach(s=>s.classList.remove('active'));
    const btn=document.querySelector('.nav-btn[data-section="'+id+'"]');
    const sec=document.getElementById('section-'+id);
    if(btn) btn.classList.add('active');
    if(sec) sec.classList.add('active');
    document.getElementById('world-overlay').classList.add('hidden');
    document.getElementById('sections-container').classList.remove('hidden');
    if(id==='ranking'&&typeof Game!=='undefined') Game.loadLeaderboard();
    if(id==='tienda'&&typeof Shop!=='undefined') Shop.updateInventory();
    if(id==='corral'&&typeof Corral!=='undefined') Corral.render();
  },

  drawMinimap() {
    const ctx=this.ctx, W=this.canvas.width, H=this.canvas.height;
    const mm={x:W-128,y:H-98,w:118,h:88,sx:118/this.MAP_W,sy:88/this.MAP_H};
    ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.fillRect(mm.x,mm.y,mm.w,mm.h);
    ctx.strokeStyle='#ffd700'; ctx.lineWidth=2; ctx.strokeRect(mm.x,mm.y,mm.w,mm.h);
    this.zones.forEach(z=>{
      ctx.fillStyle=z.color;
      ctx.fillRect(mm.x+z.x*mm.sx,mm.y+z.y*mm.sy,z.w*mm.sx,z.h*mm.sy);
    });
    ctx.fillStyle='#f39c12';
    this.npcs.forEach(n=>ctx.fillRect(mm.x+n.x*mm.sx-1,mm.y+n.y*mm.sy-1,3,3));
    ctx.fillStyle='#e74c3c';
    this.pigs.forEach(pig=>ctx.fillRect(mm.x+pig.x*mm.sx-1,mm.y+pig.y*mm.sy-1,3,3));
    ctx.fillStyle='#ffd700';
    ctx.fillRect(mm.x+this.player.x*mm.sx-2,mm.y+this.player.y*mm.sy-2,5,5);
  },

  drawNotification() {
    if(!this.notification||this.notifTimer<=0) return;
    const ctx=this.ctx, W=this.canvas.width;
    const alpha=Math.min(1,this.notifTimer/20);
    ctx.globalAlpha=alpha;
    ctx.fillStyle='rgba(0,0,0,0.85)';
    ctx.fillRect(W/2-180,16,360,28);
    ctx.fillStyle='#ffd700'; ctx.font='8px "Press Start 2P",monospace'; ctx.textAlign='center';
    ctx.fillText(this.notification,W/2,35);
    ctx.globalAlpha=1;
  },

  loop() {
    this.time++;
    this.update();
    this.draw();
    this.animId=requestAnimationFrame(()=>this.loop());
  },

  stop() {
    if(this.animId) cancelAnimationFrame(this.animId);
    this.animId=null;
  }
};
