// ===== MAIN ENTRY POINT =====
document.addEventListener('DOMContentLoaded', async () => {
  // Init background animation on login screen
  Background.init();

  // Init auth module
  Auth.init();

  // Init corral feed panel
  Corral.init();

  // Init matadero
  Matadero.init();

  // Always show login screen — no auto-login
  showScreen('auth');
});
