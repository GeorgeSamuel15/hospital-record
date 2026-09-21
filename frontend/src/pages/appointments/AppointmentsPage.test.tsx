import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AppointmentsPage from './AppointmentsPage';

const appointmentMocks = vi.hoisted(() => ({
  listAppointments: vi.fn(),
  createAppointment: vi.fn(),
  updateAppointment: vi.fn(),
}));

vi.mock('@/services/appointment.service', () => appointmentMocks);
vi.mock('@/components/PatientPicker', () => ({ PatientPicker: () => null }));
vi.mock('@/components/StaffPicker', () => ({ StaffPicker: () => null }));
vi.mock('./MonthCalendar', () => ({ MonthCalendar: () => null }));

const appointment = {
  id: 'appointment_1',
  patientId: 'patient_1',
  doctorId: 'doctor_1',
  scheduledAt: '2026-09-21T10:00:00.000Z',
  reason: 'Follow-up consultation',
  status: 'SCHEDULED' as const,
  notes: null,
  patient: { firstName: 'Ngozi', lastName: 'Eze', patientNumber: 'PAT-000001' },
  doctor: { firstName: 'Bola', lastName: 'Adeyemi' },
  department: null,
};

function renderPage(entry: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[entry]}>
        <AppointmentsPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('AppointmentsPage notification deep links', () => {
  beforeEach(() => {
    appointmentMocks.listAppointments.mockReset();
    appointmentMocks.listAppointments.mockResolvedValue({
      appointments: [appointment],
      pagination: { total: 1, page: 1, pageSize: 1, totalPages: 1 },
    });
  });

  it('requests and displays the exact appointment from the URL', async () => {
    renderPage('/appointments?appointmentId=appointment_1');

    await waitFor(() => {
      expect(appointmentMocks.listAppointments).toHaveBeenCalledWith({ appointmentId: 'appointment_1', pageSize: 1 });
    });
    expect(await screen.findByText(/Ngozi Eze/)).toBeInTheDocument();
    expect(screen.getByText(/opened from a notification/i)).toBeInTheDocument();
  });

  it('returns to the complete appointment list when the selection is cleared', async () => {
    renderPage('/appointments?appointmentId=appointment_1');
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: /show all appointments/i }));

    await waitFor(() => {
      expect(appointmentMocks.listAppointments).toHaveBeenCalledWith({ pageSize: 100 });
    });
  });
});
