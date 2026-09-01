import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, User } from 'lucide-react';
import { listPatients } from '@/services/patient.service';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { PatientListItem } from '@/types/patient';

export function PatientPicker({
  value,
  onChange,
}: {
  value: PatientListItem | null;
  onChange: (patient: PatientListItem | null) => void;
}) {
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query, 300);

  const { data } = useQuery({
    queryKey: ['patient-picker', debounced],
    queryFn: () => listPatients({ search: debounced || undefined, pageSize: 8 }),
    enabled: debounced.length > 0,
  });

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-slate-300 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm">
        <span className="font-medium text-slate-900 dark:text-slate-100">
          {value.firstName} {value.lastName} <span className="text-slate-400 dark:text-slate-500">· {value.patientNumber}</span>
        </span>
        <button type="button" onClick={() => onChange(null)} className="text-xs text-primary-600 hover:underline">
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
      <input
        className="input pl-9"
        placeholder="Search patient by name, ID, or phone..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {debounced && data?.patients && data.patients.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-1 shadow-lg">
          {data.patients.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onChange(p);
                setQuery('');
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <User className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {p.firstName} {p.lastName}
              </span>
              <span className="text-slate-400 dark:text-slate-500">{p.patientNumber}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
