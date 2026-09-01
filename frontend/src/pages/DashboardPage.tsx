import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Users, Calendar, BedDouble, FlaskConical, Pill, Stethoscope, Activity } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  getDashboardSummary,
  getPendingLabTests,
  getRecentActivity,
  getRegistrationTrend,
  getTodaysSchedule,
} from '@/services/admin.service';
import { EmptyState } from '@/components/EmptyState';
import { Badge } from '@/components/Badge';

interface ScheduleItem {
  id: string;
  scheduledAt: string;
  reason: string;
  patient: { firstName: string; lastName: string };
  doctor: { firstName: string; lastName: string };
}
interface LabItem {
  id: string;
  testName: string;
  priority: string;
  patient: { firstName: string; lastName: string };
}
interface ActivityItem {
  id: string;
  action: string;
  resource: string;
  createdAt: string;
  user: { firstName: string; lastName: string } | null;
}

export default function DashboardPage() {
  const { user } = useAuth();

  const summaryQuery = useQuery({ queryKey: ['dashboard-summary'], queryFn: getDashboardSummary });
  const trendQuery = useQuery({ queryKey: ['dashboard-trend'], queryFn: getRegistrationTrend });
  const scheduleQuery = useQuery({ queryKey: ['dashboard-schedule'], queryFn: getTodaysSchedule });
  const labQuery = useQuery({ queryKey: ['dashboard-lab'], queryFn: getPendingLabTests });
  const activityQuery = useQuery({
    queryKey: ['dashboard-activity'],
    queryFn: getRecentActivity,
    enabled: user?.role === 'ADMIN',
  });

  const s = summaryQuery.data;

  const cards = [
    { label: 'Total patients', value: s?.totalPatients, icon: Users, tone: 'blue' as const },
    { label: "Today's appointments", value: s?.todaysAppointments, icon: Calendar, tone: 'amber' as const },
    { label: 'Active admissions', value: s?.activeAdmissions, icon: BedDouble, tone: 'blue' as const },
    { label: 'Pending lab tests', value: s?.pendingLabTests, icon: FlaskConical, tone: 'amber' as const },
    { label: 'Pending prescriptions', value: s?.activePrescriptions, icon: Pill, tone: 'amber' as const },
    { label: 'Doctors on staff', value: s?.doctorCount, icon: Stethoscope, tone: 'green' as const },
  ];

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Welcome back, {user?.firstName}.</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Here's what's happening across the hospital today.</p>

      {/* Stat cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <StatCard key={c.label} {...c} isLoading={summaryQuery.isLoading} />
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Registration trend */}
        <div className="card p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Patient registrations (last 14 days)</h3>
          <div className="mt-4 h-64">
            {trendQuery.isLoading ? (
              <div className="h-full animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendQuery.data ?? []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={24} />
                  <Tooltip labelFormatter={(d) => new Date(d as string).toLocaleDateString()} />
                  <Line type="monotone" dataKey="count" stroke="#1d4ed8" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Today's schedule */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Today's schedule</h3>
          <div className="mt-3">
            {scheduleQuery.isLoading ? (
              <div className="h-40 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            ) : !scheduleQuery.data || (scheduleQuery.data as ScheduleItem[]).length === 0 ? (
              <EmptyState icon={Calendar} title="No appointments today" />
            ) : (
              <ul className="space-y-3">
                {(scheduleQuery.data as ScheduleItem[]).map((a) => (
                  <li key={a.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        {a.patient.firstName} {a.patient.lastName}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Dr. {a.doctor.firstName} {a.doctor.lastName}</p>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(a.scheduledAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className={`mt-6 grid grid-cols-1 gap-6 ${user?.role === 'ADMIN' ? 'lg:grid-cols-2' : ''}`}>
        {/* Pending lab tests */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Pending laboratory tests</h3>
          <div className="mt-3">
            {labQuery.isLoading ? (
              <div className="h-32 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            ) : !labQuery.data || (labQuery.data as LabItem[]).length === 0 ? (
              <EmptyState icon={FlaskConical} title="No pending tests" />
            ) : (
              <ul className="space-y-2">
                {(labQuery.data as LabItem[]).map((l) => (
                  <li key={l.id} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700 dark:text-slate-300">
                      {l.testName} — {l.patient.firstName} {l.patient.lastName}
                    </span>
                    {l.priority !== 'ROUTINE' && <Badge tone="amber">{l.priority}</Badge>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Recent activity — admin-only, since it surfaces the audit trail */}
        {user?.role === 'ADMIN' && (
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Recent activity</h3>
            <div className="mt-3">
              {activityQuery.isLoading ? (
                <div className="h-32 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
              ) : !activityQuery.data || (activityQuery.data as ActivityItem[]).length === 0 ? (
                <EmptyState icon={Activity} title="No recent activity" />
              ) : (
                <ul className="space-y-2">
                  {(activityQuery.data as ActivityItem[]).map((log) => (
                    <li key={log.id} className="flex items-center justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">
                        {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System'} —{' '}
                        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{log.action}</span>
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">{new Date(log.createdAt).toLocaleTimeString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  isLoading,
}: {
  label: string;
  value?: number;
  icon: typeof Users;
  tone: 'blue' | 'amber' | 'green';
  isLoading: boolean;
}) {
  const toneClasses = { blue: 'bg-primary-50 text-primary-700', amber: 'bg-amber-50 text-amber-700', green: 'bg-emerald-50 text-emerald-700' }[tone];
  return (
    <div className="card p-4">
      <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-lg ${toneClasses}`}>
        <Icon className="h-4 w-4" />
      </div>
      {isLoading ? (
        <div className="h-6 w-12 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
      ) : (
        <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">{value ?? 0}</p>
      )}
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}
