import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-16 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-950">
        <Icon className="h-5 w-5 text-slate-400 dark:text-slate-500" />
      </div>
      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
