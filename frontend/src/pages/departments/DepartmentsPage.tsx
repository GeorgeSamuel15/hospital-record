import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';
import { SkeletonCards } from '@/components/Skeletons';
import { createDepartment, listDepartments } from '@/services/admin.service';
import { EmptyState } from '@/components/EmptyState';

export default function DepartmentsPage() {
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ['departments'], queryFn: listDepartments });

  const mutation = useMutation({
    mutationFn: (input: { name: string; description?: string }) => createDepartment(input),
    onSuccess: () => {
      toast.success('Department created.');
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setShowForm(false);
    },
    onError: (err) => {
      const message = isAxiosError(err) ? err.response?.data?.message : undefined;
      toast.error(message ?? 'Could not create department.');
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Departments</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage hospital departments.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" />
          New department
        </button>
      </div>

      {showForm && (
        <NewDepartmentForm
          onClose={() => setShowForm(false)}
          onSubmit={(name, description) => mutation.mutate({ name, description })}
          isSubmitting={mutation.isPending}
        />
      )}

      <div className="mt-6">
        {isLoading ? (
          <SkeletonCards count={3} />
        ) : !data || data.length === 0 ? (
          <EmptyState icon={Building2} title="No departments yet" />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((d) => (
              <div key={d.id} className="card p-4">
                <p className="font-medium text-slate-900 dark:text-slate-100">{d.name}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{d.description || 'No description'}</p>
                <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">{d._count?.users ?? 0} staff assigned</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NewDepartmentForm({
  onClose,
  onSubmit,
  isSubmitting,
}: {
  onClose: () => void;
  onSubmit: (name: string, description?: string) => void;
  isSubmitting: boolean;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name) return toast.error('Enter a department name.');
        onSubmit(name, description);
      }}
      className="card mt-6 space-y-4 p-5 animate-in"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">New department</h3>
        <button type="button" onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div>
        <label className="label">Name</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="label">Description</label>
        <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
        <button type="button" onClick={onClose} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting} className="btn-primary">
          Create
        </button>
      </div>
    </form>
  );
}
