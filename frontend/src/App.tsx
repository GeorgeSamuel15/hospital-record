import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/hooks/useAuth';
import { ThemeProvider } from '@/hooks/useTheme';
import { ProtectedRoute, RoleRoute } from '@/components/ProtectedRoute';
import AppLayout from '@/layouts/AppLayout';

import LoginPage from '@/pages/auth/LoginPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';
import DashboardPage from '@/pages/DashboardPage';
import ProfilePage from '@/pages/ProfilePage';
import ChangePasswordPage from '@/pages/ChangePasswordPage';
import SettingsPage from '@/pages/SettingsPage';

import PatientsListPage from '@/pages/patients/PatientsListPage';
import PatientRegisterPage from '@/pages/patients/PatientRegisterPage';
import PatientProfilePage from '@/pages/patients/PatientProfilePage';

import AppointmentsPage from '@/pages/appointments/AppointmentsPage';
import LaboratoryPage from '@/pages/laboratory/LaboratoryPage';
import PrescriptionsPage from '@/pages/prescriptions/PrescriptionsPage';
import AdmissionsPage from '@/pages/admissions/AdmissionsPage';

import StaffPage from '@/pages/staff/StaffPage';
import DepartmentsPage from '@/pages/departments/DepartmentsPage';
import AuditLogsPage from '@/pages/audit/AuditLogsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
        <AuthProvider>
          <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Authenticated routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/change-password" element={<ChangePasswordPage />} />

                <Route path="/patients" element={<PatientsListPage />} />
                <Route path="/patients/new" element={<PatientRegisterPage />} />
                <Route path="/patients/:id" element={<PatientProfilePage />} />

                <Route path="/appointments" element={<AppointmentsPage />} />
                <Route path="/laboratory" element={<LaboratoryPage />} />
                <Route path="/prescriptions" element={<PrescriptionsPage />} />
                <Route path="/admissions" element={<AdmissionsPage />} />

                {/* Admin-only routes */}
                <Route element={<RoleRoute allow={['ADMIN']} />}>
                  <Route path="/staff" element={<StaffPage />} />
                  <Route path="/departments" element={<DepartmentsPage />} />
                  <Route path="/audit-logs" element={<AuditLogsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>
              </Route>
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
