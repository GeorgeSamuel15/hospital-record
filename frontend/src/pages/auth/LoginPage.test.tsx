import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from './LoginPage';

const loginMock = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ login: loginMock, user: null, isLoading: false, logout: vi.fn(), refetchUser: vi.fn() }),
}));

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    loginMock.mockReset();
  });

  it('renders the sign-in form', () => {
    renderLoginPage();
    expect(screen.getByRole('heading', { name: /sign in to your account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
  });

  it('shows validation errors when submitting an empty form', async () => {
    renderLoginPage();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/enter a valid email address/i)).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('calls login with the entered credentials on valid submit', async () => {
    loginMock.mockResolvedValue(undefined);
    renderLoginPage();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/email address/i), 'doctor@hospital.demo');
    await user.type(screen.getByLabelText(/^password$/i), 'Demo@1234');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith('doctor@hospital.demo', 'Demo@1234');
    });
  });
});
