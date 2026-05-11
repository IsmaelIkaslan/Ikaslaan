// ===== CORRAL MODULE =====
const Corral = {
  selectedPigId: null,

  render() {
    const pigs = Game.state?.pigs || [];
    const container = document.getElementById('pig-list');

    if (!pigs.length) {
      container.innerHTML = '<p style="color:white;text-align:center;padding:40px">No tienes cerdos aún</p>';
      return;
    }

    container.innerHTML = pigs.map(pig => this.renderPigCard(pig)).join('');

    // Bind feed buttons
    container.querySelectorAll('.pig-feed-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const pigId = parseInt(btn.dataset.pig);
        this.openFeedPanel(pigId);
      });
    });
  },

  renderPigCard(pig) {
    const stage = pig.weight >= 30 ? 'cerdo' : 'cochinillo';
    const emoji = stage === 'cerdo' ? '🐷' : '🐽';
    const qualityClass = `quality-${pig.quality === 'alta' ? 'alta' : pig.quality === 'media' ? 'media' : 'baja'}`;
    const qualityLabel = pig.quality === 'alta' ? '⭐ Alta calidad' : pig.quality === 'media' ? '✅ Media calidad' : '⚠️ Baja calidad';
    const speedStars = '⚡'.repeat(Math.min(5, Math.floor((pig.experience || 0) / 3) + 1));

    return `
      <div class="pig-card" id="pig-${pig.id}">
        <span class="pig-emoji">${emoji}</span>
        <h3>${pig.name}</h3>
        <span class="pig-stage stage-${stage}">${stage === 'cerdo' ? '🐷 Cerdo adulto' : '🐽 Cochinillo'}</span>
        <div class="pig-stats">
          <div class="pig-stat">
            <strong>${pig.weight}kg</strong>
            <span>Peso</span>
          </div>
          <div class="pig-stat">
            <strong>${pig.experience || 0}</strong>
            <span>Exp</span>
          </div>
          <div class="pig-stat">
            <strong>${speedStars}</strong>
            <span>Velocidad</span>
          </div>
        </div>
        <span class="quality-badge ${qualityClass}">${qualityLabel}</span>
        <button class="pig-feed-btn" data-pig="${pig.id}">🍽️ Dar de comer</button>
      </div>
    `;
  },

  openFeedPanel(pigId) {
    const pig = Game.state.pigs.find(p => p.id === pigId);
    if (!pig) return;

    this.selectedPigId = pigId;
    document.getElementById('feed-pig-name').textContent = pig.name;

    const panel = document.getElementById('feed-panel');
    panel.classList.remove('hidden');

    // Show seed counts on buttons
    const seeds = Game.state.seeds;
    document.querySelectorAll('.feed-btn').forEach(btn => {
      const food = btn.dataset.food;
      const count = seeds[food] || 0;
      const labels = { acorn: '🌰 Bellota', carrot: '🥕 Zanahoria', wheat: '🌾 Trigo' };
      const gains = { acorn: '+3kg | Alta calidad', carrot: '+2kg | Media calidad', wheat: '+1kg | Baja calidad' };
      btn.innerHTML = `${labels[food]}<br><small>${gains[food]}</small><br><small style="color:${count > 0 ? '#27ae60' : '#e74c3c'}">${count} disponibles</small>`;
      btn.disabled = count <= 0;
      btn.style.opacity = count > 0 ? '1' : '0.5';
    });
  },

  async feedPig(foodType) {
    if (!this.selectedPigId) return;

    const res = await API.post('/api/game/feed-pig', {
      pigId: this.selectedPigId,
      foodType
    });

    if (res.error) {
      Toast.show(res.error, 'error');
      return;
    }

    // Update local state
    const pigIndex = Game.state.pigs.findIndex(p => p.id === this.selectedPigId);
    if (pigIndex !== -1) Game.state.pigs[pigIndex] = res.pig;
    Game.state.seeds = res.seeds;

    const foodNames = { acorn: 'bellota', carrot: 'zanahoria', wheat: 'trigo' };
    Toast.show(`${res.pig.name} comió ${foodNames[foodType]}! Peso: ${res.pig.weight}kg`, 'success');

    // Re-render
    this.render();
    this.closeFeedPanel();
    Shop.updateInventory();
  },

  closeFeedPanel() {
    document.getElementById('feed-panel').classList.add('hidden');
    this.selectedPigId = null;
  },

  init() {
    // Feed buttons
    document.querySelectorAll('.feed-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.feedPig(btn.dataset.food);
      });
    });

    // Close panel
    document.getElementById('feed-close').addEventListener('click', () => {
      this.closeFeedPanel();
    });
  }
};
