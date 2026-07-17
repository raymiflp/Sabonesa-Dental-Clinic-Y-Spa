import { http, HttpResponse } from 'msw';

const API_BASE = 'http://localhost:3001/api';

export const handlers = [
  // POST /api/auth/login — success for valid credentials, 401 otherwise
  http.post(`${API_BASE}/auth/login`, async ({ request }) => {
    const body = await request.json();

    if (body.email === 'test@betty.com' && body.password === 'password123') {
      return HttpResponse.json({
        token: 'fake-jwt-token',
        user: {
          id: 1,
          nombre: 'Test User',
          email: 'test@betty.com',
          rol: 'admin',
          passwordChanged: true,
        },
      });
    }

    return HttpResponse.json(
      { error: 'Credenciales inválidas' },
      { status: 401 },
    );
  }),

  // GET /api/auth/me — returns user if Authorization header present
  http.get(`${API_BASE}/auth/me`, ({ request }) => {
    const auth = request.headers.get('Authorization');

    if (auth && auth.startsWith('Bearer ')) {
      return HttpResponse.json({
        id: 1,
        nombre: 'Test User',
        email: 'test@betty.com',
        rol: 'admin',
        activo: true,
        passwordChanged: true,
      });
    }

    return HttpResponse.json(
      { error: 'No autenticado' },
      { status: 401 },
    );
  }),
];
