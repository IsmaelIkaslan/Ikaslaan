// ===== AUTH MODULE =====
const Auth = {
  currentUser: null,

  init() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`form-${tab}`).classList.add('active');
      });
    });

    // Login form
    document.getElementById('form-login').addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('login-username').value.trim();
      const password = document.getElementById('login-password').value;
      const errorEl = document.getElementById('login-error');
      errorEl.textContent = '';

      if (!username || !password) { errorEl.textContent = 'Rellena todos los campos'; return; }

      const btn = e.target.querySelector('button[type="submit"]');
      btn.textContent = '¡Entrar a la granja!';
      btn.disabled = true;
      btn.textContent = 'Entrando...';

      try {
        const res = await Promise.race([
          API.post('/api/auth/login', { username, password }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000))
        ]);
        if (res.error) {
          // Si el usuario no existe, sugerir registro
          if (res.error.includes('incorrectos') || res.error.includes('no encontrado')) {
            errorEl.textContent = '❌ ' + res.error + ' — ¿Ya tienes cuenta? Si no, regístrate primero.';
          } else {
            errorEl.textContent = res.error;
          }
        } else {
          Auth.currentUser = res.username;
          Game.start(res.username);
        }
      } catch (err) {
        errorEl.textContent = err.message === 'timeout'
          ? '⏱️ El servidor tardó demasiado. Inténtalo de nuevo.'
          : '❌ Error de conexión. Inténtalo de nuevo.';
      } finally {
        btn.textContent = '¡Entrar a la granja!';
        btn.disabled = false;
      }
    });

    // Register form
    document.getElementById('form-register').addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('reg-username').value.trim();
      const password = document.getElementById('reg-password').value;
      const errorEl = document.getElementById('reg-error');
      errorEl.textContent = '';

      if (!username || !password) { errorEl.textContent = 'Rellena todos los campos'; return; }

      const btn = e.target.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Creando granja...';

      try {
        const res = await Promise.race([
          API.post('/api/auth/register', { username, password }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000))
        ]);
        if (res.error) {
          errorEl.textContent = res.error;
        } else {
          Auth.currentUser = res.username;
          Game.start(res.username);
        }
      } catch (err) {
        errorEl.textContent = err.message === 'timeout'
          ? 'El servidor tardó demasiado. Inténtalo de nuevo.'
          : 'Error de conexión. Inténtalo de nuevo.';
      } finally {
        btn.textContent = '¡Crear mi granja!';
        btn.disabled = false;
      }
    });

    // Logout
    document.getElementById('btn-logout').addEventListener('click', async () => {
      await API.post('/api/auth/logout', {});
      Auth.currentUser = null;
      showScreen('auth');
      Toast.show('¡Hasta pronto, carnicero!', 'info');
    });
  },

  async checkSession() {
    const res = await API.get('/api/auth/me');
    if (res.loggedIn) {
      Auth.currentUser = res.username;
      Game.start(res.username);
      return true;
    }
    return false;
  }
};

function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
    s.style.display = 'none';
    s.style.opacity = '0';
  });
  const target = document.getElementById(`screen-${name}`);
  target.style.display = 'flex';
  requestAnimationFrame(() => {
    target.style.opacity = '1';
    target.classList.add('active');
  });
}
