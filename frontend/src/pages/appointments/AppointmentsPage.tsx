import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, CalendarDays, List, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';
import { createAppointment, listAppointments, updateAppointment } from '@/services/appointment.service';
import { PatientPicker } from '@/components/PatientPicker';
import { StaffPicker } from '@/components/StaffPicker';
import { Badge } from '@/components/Badge';
import { EmptyState } from '@/components/EmptyState';
import { AppointmentStatus } from '@/types/clinical';
import { PatientListItem } from '@/types/patient';
import { SkeletonListRows } from '@/components/Skeletons';
import { MonthCalendar } from './MonthCalendar';

const STATUS_TONE: Record<AppointmentStatus, 'blue' | 'green' | 'amber' | 'red' | 'slate'> = {
  SCHEDULED: 'blue',
  CONFIRMED: 'amber',
  COMPLETED: 'green',
  CANCELLED: 'red',
  NO_SHOW: 'slate',
};

export default function AppointmentsPage() {
  const [showForm, setShowForm] = useState(false);
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => listAppointments({ pageSize: 100 }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppointmentStatus }) => updateAppointment(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Appointment updated.');
    },
    onError: () => toast.error('Could not update appointment.'),
  });

 const grouped = (data?.appointments ?? []).reduce((acc, appt) => {
  const day = new Date(appt.scheduledAt).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

      (acc[day] ??= []).push(appt);
       return acc;
  }, {} as Record<string, NonNullable<typeof data>['appointments']>);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Appointments</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Schedule, confirm, and manage patient appointments.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
            <button
              onClick={() => setView('calendar')}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                view === 'calendar' ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Calendar
            </button>
            <button
              onClick={() => setView('list')}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                view === 'list' ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              List
            </button>
          </div>
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" />
            New appointment
          </button>
        </div>
      </div>

      {showForm && <NewAppointmentForm onClose={() => setShowForm(false)} />}

      {view === 'calendar' && data && data.appointments.length > 0 && (
        <div className="mt-6">
          <MonthCalendar appointments={data.appointments} />
        </div>
      )}

      {(view === 'list' || !data || data.appointments.length === 0) && (
      <div className="mt-6 space-y-6">
        {isLoading ? (
          <div className="card overflow-hidden"><SkeletonListRows /></div>
        ) : !data || data.appointments.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No appointments scheduled"
            description="Get started by scheduling a new appointment."
            action={
              <button className="btn-primary" onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4" />
                Schedule appointment
              </button>
            }
          />
        ) : (
          Object.entries(grouped).map(([day, appts]) => (
            <div key={day}>
              <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">{day}</h3>
              <div className="card divide-y divide-slate-100 overflow-hidden">
                {appts.map((a) => (
                  <div key={a.id} className="flex items-center justify-between px-4 py-3.5">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {new Date(a.scheduledAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} —{' '}
                        {a.patient.firstName} {a.patient.lastName}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Dr. {a.doctor.firstName} {a.doctor.lastName} · {a.reason}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={STATUS_TONE[a.status]}>{a.status.toLowerCase().replace('_', ' ')}</Badge>
                      {a.status === 'SCHEDULED' && (
                        <button
                          className="text-xs font-medium text-primary-600 hover:underline"
                          onClick={() => statusMutation.mutate({ id: a.id, status: 'CONFIRMED' })}
                        >
                          Confirm
                        </button>
                      )}
                      {(a.status === 'SCHEDULED' || a.status === 'CONFIRMED') && (
                        <button
                          className="text-xs font-medium text-red-600 hover:underline"
                          onClick={() => statusMutation.mutate({ id: a.id, status: 'CANCELLED' })}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
      )}
    </div>
  );
}

function NewAppointmentForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [patient, setPatient] = useState<PatientListItem | null>(null);
  const [doctorId, setDoctorId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [reason, setReason] = useState('');

  const mutation = useMutation({
    mutationFn: () => createAppointment({ patientId: patient!.id, doctorId, scheduledAt, reason }),
    onSuccess: () => {
      toast.success('Appointment scheduled.');
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      onClose();
    },
    onError: (err) => {
      const message = isAxiosError(err) ? err.response?.data?.message : undefined;
      toast.error(message ?? 'Could not schedule appointment.');
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!patient || !doctorId || !scheduledAt || !reason) return toast.error('Fill in all fields.');
        mutation.mutate();
      }}
      className="card mt-6 space-y-4 p-5 animate-in"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">New appointment</h3>
        <button type="button" onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div>
        <label className="label">Patient</label>
        <PatientPicker value={patient} onChange={setPatient} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Doctor</label>
          <StaffPicker role="DOCTOR" value={doctorId} onChange={setDoctorId} placeholder="Select doctor" />
        </div>
        <div>
          <label className="label">Date & time</label>
          <input type="datetime-local" className="input" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label">Reason</label>
        <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Follow-up consultation" />
      </div>

      <div className="flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
        <button type="button" onClick={onClose} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={mutation.isPending} className="btn-primary">
          Schedule
        </button>
      </div>
    </form>
  );
}
