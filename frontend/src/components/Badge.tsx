import { ReactNode } from 'react';
import clsx from 'clsx';

type BadgeTone = 'slate' | 'blue' | 'green' | 'amber' | 'red';

const toneClasses: Record<BadgeTone, string> = {
  slate: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
  blue: 'bg-primary-50 text-primary-700',
  green: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-700',
};

export function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: BadgeTone }) {
  return (
    <span className={clsx('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', toneClasses[tone])}>
      {children}
    </span>
  );
}
