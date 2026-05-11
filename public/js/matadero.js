// ===== MATADERO MODULE =====
const Matadero = {
  currentClient: null,
  currentPig: null,

  CLIENTS: [
    { name: 'Don Ramón',     avatar: '👨‍🦳', request: 'Jamón ibérico',    piece: 'jamon',     minQuality: 'alta'  },
    { name: 'María José',    avatar: '👩‍🍳', request: 'Costillas',         piece: 'costillas', minQuality: 'media' },
    { name: 'El Chato',      avatar: '👨‍🌾', request: 'Lomo',              piece: 'lomo',      minQuality: 'media' },
    { name: 'Doña Paca',     avatar: '👵',  request: 'Cochinillo entero', piece: 'cochinillo',minQuality: 'baja'  },
    { name: 'Chef Marcos',   avatar: '👨‍🍳', request: 'Solomillo',         piece: 'solomillo', minQuality: 'alta'  },
    { name: 'Pepe el del bar',avatar: '🧔', request: 'Panceta',           piece: 'panceta',   minQuality: 'baja'  },
  ],

  PIECES: {
    jamon:      { reward: 80,  emoji: '🍖' },
    costillas:  { reward: 40,  emoji: '🥩' },
    lomo:       { reward: 50,  emoji: '🥩' },
    cochinillo: { reward: 60,  emoji: '🐷' },
    solomillo:  { reward: 70,  emoji: '🥩' },
    panceta:    { reward: 25,  emoji: '🥓' }
  },

  init() {
    document.getElementById('btn-call-client').addEventListener('click', () => {
      this.callClient();
    });
    document.getElementById('btn-start-slaughter').addEventListener('click', () => {
      this.startCapture();
    });
  },

  callClient() {
    const eligible = Game.state.pigs.filter(p => p.weight >= 10);
    if (!eligible.length) {
      Toast.show('Necesitas cerdos de al menos 10kg para atender clientes', 'error');
      return;
    }

    this.currentClient = this.CLIENTS[Math.floor(Math.random() * this.CLIENTS.length)];

    document.getElementById('no-client').classList.add('hidden');
    document.getElementById('client-order').classList.remove('hidden');
    document.getElementById('client-avatar').textContent = this.currentClient.avatar;
    document.getElementById('client-name').textContent = this.currentClient.name;

    const piece = this.PIECES[this.currentClient.piece];
    document.getElementById('client-request').textContent = `${piece.emoji} ${this.currentClient.request}`;

    const qualityLabels = { alta: '⭐ Alta', media: '✅ Media', baja: '⚠️ Cualquiera' };
    document.getElementById('client-quality').textContent = qualityLabels[this.currentClient.minQuality];
  },

  startCapture() {
    const qualityOrder = { alta: 3, media: 2, baja: 1 };
    const minQ = qualityOrder[this.currentClient.minQuality];

    const eligible = Game.state.pigs.filter(p => {
      const pigQ = qualityOrder[p.quality] || 1;
      if (this.currentClient.piece === 'cochinillo') return p.weight < 30;
      return p.weight >= 10 && pigQ >= minQ;
    });

    if (!eligible.length) {
      Toast.show(`No tienes cerdos con la calidad requerida (${this.currentClient.minQuality})`, 'error');
      return;
    }

    // Mejor cerdo disponible
    this.currentPig = eligible.sort((a, b) => b.weight - a.weight)[0];

    // Lanzar minijuego de captura
    CaptureGame.show(
      this.currentPig,
      (pig) => this.onCaptured(pig),
      ()    => this.onEscaped()
    );
  },

  onCaptured(pig) {
    Toast.show(`¡${pig.name} atrapado! Ahora al matadero...`, 'success');
    setTimeout(() => {
      SlaughterGame.show(
        pig,
        this.currentClient,
        (correct, quality) => this.onCutDone(correct, quality, pig)
      );
    }, 400);
  },

  onEscaped() {
    Toast.show('¡El cerdo se escapó! El cliente se fue enfadado. −10 puntos', 'error');
    API.post('/api/game/score', { points: -10 }).then(res => {
      Game.state.score = res.score;
      Game.updateHUD();
    });
    this.resetClient();
  },

  async onCutDone(correct, quality, pig) {
    const client = this.currentClient;
    const piece  = this.PIECES[client.piece];
    const qualityOrder = { alta: 3, media: 2, baja: 1 };

    if (correct) {
      const pigQ = qualityOrder[quality] || 1;
      const reqQ = qualityOrder[client.minQuality] || 1;

      if (pigQ >= reqQ) {
        // Venta perfecta
        const reward = piece.reward;
        const [moneyRes, scoreRes, pigRes] = await Promise.all([
          API.post('/api/game/update-money', { amount: reward }),
          API.post('/api/game/score', { points: 50 }),
          API.post('/api/game/remove-pig', { pigId: pig.id })
        ]);
        Game.state.money = moneyRes.money;
        Game.state.score = scoreRes.score;
        Game.state.pigs  = pigRes.pigs;
        Game.updateHUD();
        Corral.render();
        Toast.show(`¡Venta perfecta! +${reward}€ +50 puntos 🎉`, 'success');
      } else {
        // Pieza correcta pero calidad insuficiente
        const scoreRes = await API.post('/api/game/score', { points: -10 });
        Game.state.score = scoreRes.score;
        Game.updateHUD();
        Toast.show('Pieza correcta pero calidad insuficiente. −10 puntos', 'info');
      }
    } else {
      // Corte incorrecto
      const scoreRes = await API.post('/api/game/score', { points: -20 });
      Game.state.score = scoreRes.score;
      Game.updateHUD();
      Toast.show('¡Corte incorrecto! −20 puntos', 'error');
    }

    this.resetClient();
  },

  resetClient() {
    this.currentClient = null;
    this.currentPig    = null;
    document.getElementById('client-order').classList.add('hidden');
    document.getElementById('no-client').classList.remove('hidden');
  }
};
