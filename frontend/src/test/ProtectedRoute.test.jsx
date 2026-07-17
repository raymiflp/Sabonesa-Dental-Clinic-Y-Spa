import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';

// Mock the useAuth hook directly
vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
  default: null,
}));

import { useAuth } from '../context/AuthContext';

describe('ProtectedRoute', () => {
  it('should show loading spinner when loading is true', () => {
    useAuth.mockReturnValue({ user: null, loading: true });

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Secret Content</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByText('Cargando...')).toBeInTheDocument();
    expect(screen.queryByText('Secret Content')).not.toBeInTheDocument();
  });

  it('should redirect to /login when user is null', () => {
    useAuth.mockReturnValue({ user: null, loading: false });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div>Secret Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Secret Content')).not.toBeInTheDocument();
  });

  it('should show "Acceso denegado" when user lacks required role', () => {
    useAuth.mockReturnValue({
      user: { id: 2, email: 'asistente@test.com', rol: 'asistente' },
      loading: false,
    });

    render(
      <MemoryRouter>
        <ProtectedRoute requiredRoles={['admin', 'doctor']}>
          <div>Admin Content</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByText('Acceso denegado')).toBeInTheDocument();
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });

  it('should render children when user has the required role', () => {
    useAuth.mockReturnValue({
      user: { id: 1, email: 'admin@test.com', rol: 'admin' },
      loading: false,
    });

    render(
      <MemoryRouter>
        <ProtectedRoute requiredRoles={['admin', 'doctor']}>
          <div>Admin Content</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByText('Admin Content')).toBeInTheDocument();
  });

  it('should render children when no requiredRoles are specified', () => {
    useAuth.mockReturnValue({
      user: { id: 3, email: 'user@test.com', rol: 'asistente' },
      loading: false,
    });

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Any Authenticated User</div>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByText('Any Authenticated User')).toBeInTheDocument();
  });
});
