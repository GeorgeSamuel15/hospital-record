import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, UserCog, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';
import { createStaff, deactivateDemoAccounts, listStaff, resetStaffPassword, setStaffActive } from '@/services/admin.service';
import { Badge } from '@/components/Badge';
import { EmptyState } from '@/components/EmptyState';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { SkeletonTable } from '@/components/Skeletons';
import { ROLE_LABELS, Role } from '@/types/auth';
import { useAuth } from '@/hooks/useAuth';

export default function StaffPage() {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [tempPasswordFor, setTempPasswordFor] = useState<{ name: string; password: string; emailSent: boolean } | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ['staff'], queryFn: () => listStaff({ pageSize: 100 }) });

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => setStaffActive(id, active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Staff account updated.');
    },
    onError: () => toast.error('Could not update the staff account.'),
  });

  const resetPassword = useMutation({
    mutationFn: (id: string) => resetStaffPassword(id),
    onSuccess: ({ tempPassword, emailSent }, id) => {
      const person = data?.staff.find((s) => s.id === id);
      setTempPasswordFor({ name: person ? `${person.firstName} ${person.lastName}` : 'Staff member', password: tempPassword, emailSent });
    },
    onError: () => toast.error('Could not reset this password.'),
  });

  const deactivateDemos = useMutation({
    mutationFn: deactivateDemoAccounts,
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success(`${count} demo account${count === 1 ? '' : 's'} deactivated.`);
    },
    onError: (err) => {
      const message = isAxiosError(err) ? err.response?.data?.message : undefined;
      toast.error(message ?? 'Could not deactivate demo accounts.');
    },
  });

  const hasActiveDemoAccounts = data?.staff.some((staff) => staff.isDemo && staff.isActive) ?? false;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Staff</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage staff accounts, roles, and access.</p>
        </div>
        <div className="flex items-center gap-2">
          {hasActiveDemoAccounts && (
            <button
              type="button"
              className="btn-secondary"
              disabled={Boolean(user?.isDemo) || deactivateDemos.isPending}
              title={user?.isDemo ? 'Create and sign in with a non-demo administrator first.' : undefined}
              onClick={() => {
                if (window.confirm('Deactivate every demo account? Existing clinical records will be preserved.')) deactivateDemos.mutate();
              }}
            >
              Deactivate demos
            </button>
          )}
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" />
            Add staff
          </button>
        </div>
      </div>

      {showForm && (
        <NewStaffForm
          onClose={() => setShowForm(false)}
          onCreated={(name, password, emailSent) => setTempPasswordFor({ name, password, emailSent })}
        />
      )}

      {tempPasswordFor && (
        <div className="mt-6 card border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">
            Temporary password for {tempPasswordFor.name}: <span className="font-mono">{tempPasswordFor.password}</span>
          </p>
          <p className="mt-1 text-xs text-amber-700">
            {tempPasswordFor.emailSent
              ? 'It was emailed to the staff member. This copy will not be shown again after dismissal.'
              : 'Email delivery failed. Share this password securely; it will not be shown again after dismissal.'}
          </p>
          <button className="mt-2 text-xs font-medium text-amber-800 hover:underline" onClick={() => setTempPasswordFor(null)}>
            Dismiss
          </button>
        </div>
      )}

      <div className="mt-6">
        {isLoading ? (
          <div className="card overflow-hidden"><SkeletonTable /></div>
        ) : !data || data.staff.length === 0 ? (
          <EmptyState icon={UserCog} title="No staff accounts yet" />
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <th className="px-4 py-3">Staff</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.staff.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <InitialsAvatar firstName={s.firstName} lastName={s.lastName} size="sm" />
                        <div>
                          <p className="font-medium text-slate-900 dark:text-slate-100">
                            {s.firstName} {s.lastName}
                            {s.isDemo && <span className="ml-1.5 text-xs font-normal text-amber-600">(demo)</span>}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{ROLE_LABELS[s.role as Role] ?? s.role}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{s.department?.name ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge tone={s.isActive ? 'green' : 'red'}>{s.isActive ? 'Active' : 'Deactivated'}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <button
                          className="text-xs font-medium text-primary-600 hover:underline"
                          onClick={() => toggleActive.mutate({ id: s.id, active: !s.isActive })}
                        >
                          {s.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:underline" onClick={() => resetPassword.mutate(s.id)}>
                          Reset password
                        </button>
                      </div>
                    </td>
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

const ROLES: Role[] = ['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'LAB_TECHNICIAN', 'PHARMACIST'];

function NewStaffForm({ onClose, onCreated }: { onClose: () => void; onCreated: (name: string, password: string, emailSent: boolean) => void }) {
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role | ''>('');
  const [initialPassword, setInitialPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const mutation = useMutation({
    mutationFn: () => createStaff({ firstName, lastName, email, role, initialPassword: initialPassword || undefined }),
    onSuccess: ({ user, tempPassword, emailSent }) => {
      toast.success('Staff account created.');
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      onCreated(`${user.firstName} ${user.lastName}`, tempPassword, emailSent);
      onClose();
    },
    onError: (err) => {
      const message = isAxiosError(err) ? err.response?.data?.message : undefined;
      toast.error(message ?? 'Could not create staff account.');
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!firstName || !lastName || !email || !role) return toast.error('Fill in all fields.');
        if (initialPassword && initialPassword !== confirmPassword) return toast.error('The passwords do not match.');
        if (initialPassword && (initialPassword.length < 8 || !/[A-Z]/.test(initialPassword) || !/[0-9]/.test(initialPassword))) {
          return toast.error('The initial password needs 8 characters, an uppercase letter, and a number.');
        }
        mutation.mutate();
      }}
      className="card mt-6 space-y-4 p-5 animate-in"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Add staff member</h3>
        <button type="button" onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label">First name</label>
          <input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </div>
        <div>
          <label className="label">Last name</label>
          <input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
        <div>
          <label className="label">Email</label>
          <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label">Role</label>
          <select className="input" value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="" disabled>
              Select role
            </option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Initial password (optional)</label>
          <input
            type="password"
            autoComplete="new-password"
            className="input"
            value={initialPassword}
            onChange={(e) => setInitialPassword(e.target.value)}
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Leave blank to generate a secure temporary password.</p>
        </div>
        <div>
          <label className="label">Confirm initial password</label>
          <input
            type="password"
            autoComplete="new-password"
            className="input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={!initialPassword}
          />
        </div>
      </div>
      <div className="flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
        <button type="button" onClick={onClose} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={mutation.isPending} className="btn-primary">
          Create account
        </button>
      </div>
    </form>
  );
}
