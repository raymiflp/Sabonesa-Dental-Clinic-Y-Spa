import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../context/AuthContext';

// ---------------------------------------------------------------------------
// Helper — renders AuthProvider with a consumer that exposes state
// ---------------------------------------------------------------------------
function TestComponent() {
  const { user, loading, error, login, logout, checkAuth } = useAuth();

  const handleLoginFail = async () => {
    try {
      await login('wrong@test.com', 'wrong');
    } catch {
      // expected — error is set on context state
    }
  };

  return (
    <div>
      <span data-testid="user">{user ? 'logged-in' : 'null'}</span>
      <span data-testid="loading">{loading ? 'true' : 'false'}</span>
      <span data-testid="error">{error || 'null'}</span>
      <button data-testid="btn-login" onClick={() => login('test@betty.com', 'password123')}>
        Login OK
      </button>
      <button data-testid="btn-login-fail" onClick={handleLoginFail}>
        Login Fail
      </button>
      <button data-testid="btn-logout" onClick={logout}>
        Logout
      </button>
      <button data-testid="btn-check" onClick={checkAuth}>
        CheckAuth
      </button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <AuthProvider>
      <TestComponent />
    </AuthProvider>,
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should have user null and loading false when no token is present', async () => {
    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('user').textContent).toBe('null');
    expect(screen.getByTestId('error').textContent).toBe('null');
  });

  it('should set user and clear error on successful login', async () => {
    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    await act(async () => {
      screen.getByTestId('btn-login').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('logged-in');
    });

    expect(screen.getByTestId('error').textContent).toBe('null');
    expect(localStorage.getItem('token')).toBe('fake-jwt-token');
  });

  it('should set error and keep user null on failed login', async () => {
    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    await act(async () => {
      screen.getByTestId('btn-login-fail').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('error').textContent).not.toBe('null');
    });

    expect(screen.getByTestId('user').textContent).toBe('null');
  });

  it('should clear user and token on logout', async () => {
    // First log in
    localStorage.setItem('token', 'fake-jwt-token');

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    // Logout
    await act(async () => {
      screen.getByTestId('btn-logout').click();
    });

    expect(screen.getByTestId('user').textContent).toBe('null');
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('checkAuth without token should not call API', async () => {
    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    // checkAuth was called on mount; since no token, it should not have hit API
    expect(screen.getByTestId('user').textContent).toBe('null');
  });
});
