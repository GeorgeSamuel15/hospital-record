import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, Search, Users } from 'lucide-react';
import { listPatients } from '@/services/patient.service';
import { calculateAge } from '@/types/patient';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { EmptyState } from '@/components/EmptyState';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

const PAGE_SIZE = 20;

export default function PatientsListPage() {
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const search = useDebouncedValue(searchInput, 350);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['patients', { search, page }],
    queryFn: () => listPatients({ search: search || undefined, page, pageSize: PAGE_SIZE }),
    placeholderData: (prev) => prev,
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Patients</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Search, register, and manage patient records.</p>
        </div>
        <Link to="/patients/new" className="btn-primary">
          <Plus className="h-4 w-4" />
          Register patient
        </Link>
      </div>

      <div className="mt-6 card overflow-hidden">
        <div className="border-b border-slate-100 dark:border-slate-800 p-4">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              className="input pl-9"
              placeholder="Search by name, patient ID, or phone..."
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        {isLoading ? (
          <PatientTableSkeleton />
        ) : isError ? (
          <div className="p-10 text-center text-sm text-red-600">
            Couldn't load patients. Please try again.
          </div>
        ) : !data || data.patients.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={Users}
              title={search ? 'No patients match your search' : 'No patients registered yet'}
              description={search ? 'Try a different name, patient ID, or phone number.' : 'Get started by registering your first patient.'}
              action={
                !search ? (
                  <Link to="/patients/new" className="btn-primary">
                    <Plus className="h-4 w-4" />
                    Register patient
                  </Link>
                ) : undefined
              }
            />
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Patient ID</th>
                  <th className="px-4 py-3">Age / Gender</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.patients.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                    <td className="px-4 py-3">
                      <Link to={`/patients/${p.id}`} className="flex items-center gap-3">
                        <InitialsAvatar firstName={p.firstName} lastName={p.lastName} size="sm" />
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {p.firstName} {p.lastName}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">{p.patientNumber}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {calculateAge(p.dateOfBirth)} yrs · {p.gender.charAt(0) + p.gender.slice(1).toLowerCase()}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{p.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{new Date(p.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
              <span>
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, data.pagination.total)} of{' '}
                {data.pagination.total}
              </span>
              <div className="flex items-center gap-2">
                <button
                  className="btn-secondary px-2.5 py-1.5"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span>
                  Page {page} of {data.pagination.totalPages}
                </span>
                <button
                  className="btn-secondary px-2.5 py-1.5"
                  disabled={page >= data.pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PatientTableSkeleton() {
  return (
    <div className="divide-y divide-slate-100">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3.5">
          <div className="h-8 w-8 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
          <div className="h-3.5 w-40 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          <div className="ml-auto h-3.5 w-24 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
        </div>
      ))}
    </div>
  );
}
