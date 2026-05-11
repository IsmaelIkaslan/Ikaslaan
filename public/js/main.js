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

  // Check if already logged in (auto-login via cookie)
  const loggedIn = await Auth.checkSession();
  if (!loggedIn) {
    showScreen('auth');
  }
});
