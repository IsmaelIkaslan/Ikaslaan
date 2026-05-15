// ===== API HELPER =====
const API = {
  async request(url, options) {
    const res = await fetch(url, options);
    const text = await res.text();
    let json;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      throw new Error('Respuesta inválida del servidor');
    }
    if (!res.ok) {
      throw new Error(json.error || res.statusText || 'Error de servidor');
    }
    return json;
  },

  async post(url, data) {
    return this.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include'
    });
  },

  async get(url) {
    return this.request(url, { credentials: 'include' });
  }
};
