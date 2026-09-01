import { useAuth } from '@/hooks/useAuth';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { ROLE_LABELS } from '@/types/auth';
import { Link } from 'react-router-dom';

export default function ProfilePage() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Profile</h1>

      <div className="card mt-6 p-6">
        <div className="flex items-center gap-4">
          <InitialsAvatar firstName={user.firstName} lastName={user.lastName} size="lg" />
          <div>
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{ROLE_LABELS[user.role]}</p>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-1 gap-4 border-t border-slate-100 dark:border-slate-800 pt-6 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-500 dark:text-slate-400">Employee ID</dt>
            <dd className="text-sm text-slate-800 dark:text-slate-200">{user.employeeId}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500 dark:text-slate-400">Email</dt>
            <dd className="text-sm text-slate-800 dark:text-slate-200">{user.email}</dd>
          </div>
        </dl>

        <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-6">
          <Link to="/change-password" className="btn-secondary">
            Change password
          </Link>
        </div>
      </div>
    </div>
  );
}
