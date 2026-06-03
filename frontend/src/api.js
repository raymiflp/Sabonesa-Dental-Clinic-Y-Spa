import { cachePut, cacheGet, queueAdd } from './lib/db';

const DEV_API = 'http://localhost:3001';
const PROD_API = '/_/backend'; // Vercel Experimental Services route prefix

const API_BASE = import.meta.env.DEV ? DEV_API : PROD_API;
export { API_BASE };

const API = `${API_BASE}/api`;

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Offline-aware request function
async function request(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase();

  try {
    const res = await fetch(`${API}${url}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders(), ...options.headers },
      body: options.body,
    });

    if (res.status === 401) {
      localStorage.removeItem('token');
    }

    // Cache successful GET responses
    if (res.ok && method === 'GET') {
      try {
        const data = await res.clone().json();
        cachePut(method, url, data);
      } catch (_) { /* non-JSON responses not cached */ }
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Error ${res.status}`);
    }

    if (res.status === 204) return null;
    return res.json();

  } catch (err) {
    // Network error — try offline fallback
    const isNetworkError = err.message === 'Failed to fetch' ||
      err.name === 'TypeError' ||
      err.message.includes('network') ||
      err.message.includes('NetworkError') ||
      err.message.includes('ERR_CONNECTION_REFUSED') ||
      err.message.includes('ERR_CONNECTION_RESET');

    if (!isNetworkError) {
      throw err; // Real server error, not network
    }

    // Offline: GET → read from cache
    if (method === 'GET') {
      const cached = await cacheGet(method, url);
      if (cached !== null) {
        return cached;
      }
      throw new Error('Sin conexión y no hay datos en caché');
    }

    // Offline: POST/PUT/DELETE → queue for later sync
    await queueAdd(method, url, options.body || null);
    // Return a special marker so the UI knows it was queued
    return { __offline_queued: true, method, url };
  }
}

export const api = {
  // Auth
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request('/auth/me'),

  // Pacientes
  getPacientes: () => request('/pacientes'),
  getPaciente: (id) => request(`/pacientes/${id}`),
  createPaciente: (data) => request('/pacientes', { method: 'POST', body: JSON.stringify(data) }),
  updatePaciente: (id, data) => request(`/pacientes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePaciente: (id) => request(`/pacientes/${id}`, { method: 'DELETE' }),

  // Historial Clínico
  getHistorial: (pacienteId) => request(`/historial-clinico/paciente/${pacienteId}`),
  saveHistorial: (data) => request('/historial-clinico', { method: 'POST', body: JSON.stringify(data) }),
  updateHistorial: (id, data) => request(`/historial-clinico/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Agenda
  getCitas: (params) => request(`/agenda?${new URLSearchParams(params)}`),
  createCita: (data) => request('/agenda', { method: 'POST', body: JSON.stringify(data) }),
  updateCita: (id, data) => request(`/agenda/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCita: (id) => request(`/agenda/${id}`, { method: 'DELETE' }),

  // Crediticio
  getAllCrediticio: (params) => request(`/crediticio?${new URLSearchParams(params)}`),
  getCrediticio: (pacienteId) => request(`/crediticio/paciente/${pacienteId}`),
  createCrediticio: (data) => request('/crediticio', { method: 'POST', body: JSON.stringify(data) }),
  updateCrediticio: (id, data) => request(`/crediticio/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCrediticio: (id) => request(`/crediticio/${id}`, { method: 'DELETE' }),

  // Procedimientos
  getProcedimientos: () => request('/procedimientos'),
  getCategorias: () => request('/procedimientos/categorias'),
  createProcedimiento: (data) => request('/procedimientos', { method: 'POST', body: JSON.stringify(data) }),
  updateProcedimiento: (id, data) => request(`/procedimientos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProcedimiento: (id) => request(`/procedimientos/${id}`, { method: 'DELETE' }),
  createCategoria: (data) => request('/procedimientos/categorias', { method: 'POST', body: JSON.stringify(data) }),

  // Presupuestos
  getPresupuestos: (pacienteId) => request(`/presupuestos/paciente/${pacienteId}`),
  createPresupuesto: (data) => request('/presupuestos', { method: 'POST', body: JSON.stringify(data) }),
  updatePresupuesto: (id, data) => request(`/presupuestos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePresupuesto: (id) => request(`/presupuestos/${id}`, { method: 'DELETE' }),

  // Insumos
  getInsumos: () => request('/insumos'),
  getInsumo: (id) => request(`/insumos/${id}`),
  createInsumo: (data) => request('/insumos', { method: 'POST', body: JSON.stringify(data) }),
  updateInsumo: (id, data) => request(`/insumos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteInsumo: (id) => request(`/insumos/${id}`, { method: 'DELETE' }),

  // Upload
  uploadFoto: (dataUrl) => request('/upload', { method: 'POST', body: JSON.stringify({ dataUrl }) }),
  deleteFoto: (filename) => request(`/upload/${filename}`, { method: 'DELETE' }),

  // Configuración
  getConfiguracion: () => request('/configuracion'),
  updateConfiguracion: (data) => request('/configuracion', { method: 'PUT', body: JSON.stringify(data) }),
};
