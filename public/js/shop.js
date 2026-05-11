// ===== SHOP MODULE =====
const Shop = {
  quantities: { acorn: 1, carrot: 1, wheat: 1 },

  init() {
    // Quantity controls
    document.querySelectorAll('.qty-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const seed = btn.dataset.seed;
        const action = btn.dataset.action;
        if (action === 'plus') this.quantities[seed] = Math.min(20, this.quantities[seed] + 1);
        if (action === 'minus') this.quantities[seed] = Math.max(1, this.quantities[seed] - 1);
        document.getElementById(`qty-${seed}`).textContent = this.quantities[seed];
      });
    });

    // Buy buttons
    document.querySelectorAll('.btn-buy').forEach(btn => {
      btn.addEventListener('click', async () => {
        const seed = btn.dataset.seed;
        const qty = this.quantities[seed];
        const prices = { acorn: 30, carrot: 15, wheat: 5 };
        const total = prices[seed] * qty;

        if (Game.state.money < total) {
          Toast.show(`No tienes suficiente dinero. Necesitas ${total}€`, 'error');
          return;
        }

        btn.textContent = 'Comprando...';
        btn.disabled = true;

        const res = await API.post('/api/game/buy-seeds', { seedType: seed, quantity: qty });

        btn.textContent = 'Comprar';
        btn.disabled = false;

        if (res.error) {
          Toast.show(res.error, 'error');
          return;
        }

        Game.state.money = res.money;
        Game.state.seeds = res.seeds;
        Game.updateHUD();
        this.updateInventory();

        const names = { acorn: 'bellotas', carrot: 'zanahorias', wheat: 'trigos' };
        Toast.show(`Compraste ${qty} ${names[seed]} por ${total}€`, 'success');
      });
    });

    this.updateInventory();
  },

  updateInventory() {
    const seeds = Game.state?.seeds || { acorn: 0, carrot: 0, wheat: 0 };
    const container = document.getElementById('inventory-display');
    container.innerHTML = `
      <div class="inv-item"><span>🌰</span> Bellotas: <strong>${seeds.acorn || 0}</strong></div>
      <div class="inv-item"><span>🥕</span> Zanahorias: <strong>${seeds.carrot || 0}</strong></div>
      <div class="inv-item"><span>🌾</span> Trigos: <strong>${seeds.wheat || 0}</strong></div>
    `;
  }
};
