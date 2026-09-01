import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Settings as SettingsIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';
import { getSettings, updateSettings } from '@/services/admin.service';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: getSettings });

  const [hospitalName, setHospitalName] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [appointmentSlotMinutes, setAppointmentSlotMinutes] = useState(30);
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState(15);

  // Populate the form once settings load, without clobbering in-progress edits.
  useEffect(() => {
    if (data) {
      setHospitalName(data.hospitalName);
      setSupportEmail(data.supportEmail ?? '');
      setAppointmentSlotMinutes(data.appointmentSlotMinutes);
      setSessionTimeoutMinutes(data.sessionTimeoutMinutes);
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: () => updateSettings({ hospitalName, supportEmail, appointmentSlotMinutes, sessionTimeoutMinutes }),
    onSuccess: (settings) => {
      toast.success('Settings saved.');
      queryClient.setQueryData(['settings'], settings);
    },
    onError: (err) => {
      const message = isAxiosError(err) ? err.response?.data?.message : undefined;
      toast.error(message ?? 'Could not save settings.');
    },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Settings</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">System-wide configuration for administrators.</p>

      {isLoading ? (
        <div className="card mt-6 space-y-4 p-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 w-24 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
              <div className="h-9 w-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            </div>
          ))}
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!hospitalName.trim()) return toast.error('Hospital name is required.');
            mutation.mutate();
          }}
          className="card mt-6 space-y-5 p-6"
        >
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4 text-sm font-medium text-slate-900 dark:border-slate-800 dark:text-slate-100">
            <SettingsIcon className="h-4 w-4 text-slate-400" />
            General
          </div>

          <div>
            <label className="label">Hospital name</label>
            <input className="input" value={hospitalName} onChange={(e) => setHospitalName(e.target.value)} />
            <p className="mt-1 text-xs text-slate-400">Shown across the application and on printed documents.</p>
          </div>

          <div>
            <label className="label">Support email</label>
            <input
              type="email"
              className="input"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              placeholder="support@yourhospital.example"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Default appointment length</label>
              <div className="relative">
                <input
                  type="number"
                  min={5}
                  max={240}
                  className="input pr-14"
                  value={appointmentSlotMinutes}
                  onChange={(e) => setAppointmentSlotMinutes(Number(e.target.value))}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">minutes</span>
              </div>
            </div>
            <div>
              <label className="label">Session timeout</label>
              <div className="relative">
                <input
                  type="number"
                  min={5}
                  max={480}
                  className="input pr-14"
                  value={sessionTimeoutMinutes}
                  onChange={(e) => setSessionTimeoutMinutes(Number(e.target.value))}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">minutes</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Informational only — the actual access token lifetime is set via the backend's
                <code className="mx-1 rounded bg-slate-100 px-1 dark:bg-slate-800">JWT_ACCESS_EXPIRES_IN</code>
                environment variable.
              </p>
            </div>
          </div>

          <div className="flex justify-end border-t border-slate-100 pt-5 dark:border-slate-800">
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save settings
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
