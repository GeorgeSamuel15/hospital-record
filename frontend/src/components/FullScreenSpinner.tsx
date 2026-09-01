import { Loader2 } from 'lucide-react';

export function FullScreenSpinner() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950">
      <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
    </div>
  );
}
