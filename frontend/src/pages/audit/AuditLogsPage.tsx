import { useQuery } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { listAuditLogs } from '@/services/admin.service';
import { SkeletonTable } from '@/components/Skeletons';
import { EmptyState } from '@/components/EmptyState';

interface AuditLogEntry {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  ipAddress: string | null;
  createdAt: string;
  user: { firstName: string; lastName: string; email: string; role: string } | null;
}

export default function AuditLogsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => listAuditLogs({ pageSize: 100 }),
  });

  const logs = (data?.logs ?? []) as AuditLogEntry[];

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Audit logs</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">A record of sensitive actions taken across the system.</p>

      <div className="mt-6">
        {isLoading ? (
          <div className="card overflow-hidden"><SkeletonTable /></div>
        ) : logs.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="No audit entries yet" />
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Resource</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">IP address</th>
                  <th className="px-4 py-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-300">{log.action}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {log.resource}
                      {log.resourceId ? <span className="text-slate-400 dark:text-slate-500"> · {log.resourceId.slice(0, 8)}</span> : ''}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System / unauthenticated'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{log.ipAddress ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{new Date(log.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
