import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/Badge';
import { AppointmentItem, AppointmentStatus } from '@/types/clinical';

const STATUS_TONE: Record<AppointmentStatus, 'blue' | 'green' | 'amber' | 'red' | 'slate'> = {
  SCHEDULED: 'blue',
  CONFIRMED: 'amber',
  COMPLETED: 'green',
  CANCELLED: 'red',
  NO_SHOW: 'slate',
};

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function MonthCalendar({ appointments }: { appointments: AppointmentItem[] }) {
  const [cursor, setCursor] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Build a 6x7 grid including leading/trailing days from adjacent months.
  const gridStart = new Date(year, month, 1 - startWeekday);
  const days: Date[] = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });

  const appointmentsByDay = (day: Date) => appointments.filter((a) => isSameDay(new Date(a.scheduledAt), day));

  const today = new Date();
  const selected = selectedDay ? appointmentsByDay(selectedDay) : [];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="card p-4 lg:col-span-2">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </h3>
          <div className="flex items-center gap-1">
            <button
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
              onClick={() => setCursor(new Date(year, month - 1, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              className="rounded-lg px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
              onClick={() => setCursor(new Date())}
            >
              Today
            </button>
            <button
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
              onClick={() => setCursor(new Date(year, month + 1, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-slate-100 bg-slate-100 text-xs dark:border-slate-800 dark:bg-slate-800">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="bg-slate-50 px-2 py-1.5 text-center font-medium text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              {d}
            </div>
          ))}
          {days.map((day, i) => {
            const inMonth = day.getMonth() === month;
            const dayAppointments = appointmentsByDay(day);
            const isToday = isSameDay(day, today);
            const isSelected = selectedDay && isSameDay(day, selectedDay);

            return (
              <button
                key={i}
                onClick={() => setSelectedDay(day)}
                className={`min-h-[72px] bg-white p-1.5 text-left align-top transition-colors dark:bg-slate-900 ${
                  inMonth ? '' : 'opacity-40'
                } ${isSelected ? 'ring-2 ring-inset ring-primary-500' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                <span
                  className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                    isToday ? 'bg-primary-600 font-semibold text-white' : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {day.getDate()}
                </span>
                <div className="mt-1 space-y-0.5">
                  {dayAppointments.slice(0, 2).map((a) => (
                    <div key={a.id} className="truncate rounded bg-primary-50 px-1 py-0.5 text-[10px] text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                      {new Date(a.scheduledAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} {a.patient.lastName}
                    </div>
                  ))}
                  {dayAppointments.length > 2 && (
                    <div className="text-[10px] text-slate-400">+{dayAppointments.length - 2} more</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="card p-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {selectedDay ? selectedDay.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) : 'Select a day'}
        </h3>
        <div className="mt-3 space-y-2">
          {!selectedDay ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Click a date to see its appointments.</p>
          ) : selected.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No appointments on this day.</p>
          ) : (
            selected
              .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
              .map((a) => (
                <div key={a.id} className="rounded-lg border border-slate-100 p-2.5 text-sm dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {new Date(a.scheduledAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                    </span>
                    <Badge tone={STATUS_TONE[a.status]}>{a.status.toLowerCase().replace('_', ' ')}</Badge>
                  </div>
                  <p className="mt-1 text-slate-600 dark:text-slate-400">
                    {a.patient.firstName} {a.patient.lastName} · Dr. {a.doctor.firstName} {a.doctor.lastName}
                  </p>
                  <p className="text-xs text-slate-400">{a.reason}</p>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}
