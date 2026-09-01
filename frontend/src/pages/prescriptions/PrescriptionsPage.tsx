import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pill, Plus, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';
import { createPrescription, listPrescriptions, updatePrescriptionStatus, PrescriptionLineInput } from '@/services/prescription.service';
import { useAuth } from '@/hooks/useAuth';
import { SkeletonListRows } from '@/components/Skeletons';
import { PatientPicker } from '@/components/PatientPicker';
import { Badge } from '@/components/Badge';
import { EmptyState } from '@/components/EmptyState';
import { PrescriptionStatus } from '@/types/clinical';
import { PatientListItem } from '@/types/patient';

const STATUS_TONE: Record<PrescriptionStatus, 'blue' | 'green' | 'amber' | 'red'> = {
  PENDING: 'amber',
  DISPENSED: 'green',
  COMPLETED: 'blue',
  CANCELLED: 'red',
};

const emptyLine = (): PrescriptionLineInput => ({ medication: '', dosage: '', frequency: '', duration: '', quantity: 1, instructions: '' });

export default function PrescriptionsPage() {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ['prescriptions'], queryFn: () => listPrescriptions({ pageSize: 100 }) });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: PrescriptionStatus }) => updatePrescriptionStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      toast.success('Prescription updated.');
    },
    onError: () => toast.error('Could not update prescription.'),
  });

  const canPrescribe = user?.role === 'DOCTOR';
  const canDispense = user?.role === 'PHARMACIST' || user?.role === 'ADMIN';

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Prescriptions</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Write, track, and dispense patient prescriptions.</p>
        </div>
        {canPrescribe && (
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" />
            New prescription
          </button>
        )}
      </div>

      {showForm && <NewPrescriptionForm onClose={() => setShowForm(false)} />}

      <div className="mt-6">
        {isLoading ? (
          <div className="card overflow-hidden"><SkeletonListRows /></div>
        ) : !data || data.prescriptions.length === 0 ? (
          <EmptyState icon={Pill} title="No prescriptions yet" />
        ) : (
          <div className="card divide-y divide-slate-100 overflow-hidden">
            {data.prescriptions.map((p) => (
              <div key={p.id} className="px-4 py-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {p.patient.firstName} {p.patient.lastName}{' '}
                      <span className="font-normal text-slate-400 dark:text-slate-500">· {p.patient.patientNumber}</span>
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Dr. {p.doctor.firstName} {p.doctor.lastName} · {new Date(p.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={STATUS_TONE[p.status]}>{p.status.toLowerCase()}</Badge>
                    {canDispense && p.status === 'PENDING' && (
                      <>
                        <button
                          className="text-xs font-medium text-primary-600 hover:underline"
                          onClick={() => statusMutation.mutate({ id: p.id, status: 'DISPENSED' })}
                        >
                          Dispense
                        </button>
                        <button
                          className="text-xs font-medium text-red-600 hover:underline"
                          onClick={() => statusMutation.mutate({ id: p.id, status: 'CANCELLED' })}
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <ul className="mt-2 space-y-1">
                  {p.items.map((item) => (
                    <li key={item.id} className="text-sm text-slate-600 dark:text-slate-400">
                      {item.medication} — {item.dosage}, {item.frequency}, {item.duration} (qty {item.quantity})
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NewPrescriptionForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [patient, setPatient] = useState<PatientListItem | null>(null);
  const [items, setItems] = useState<PrescriptionLineInput[]>([emptyLine()]);

  const mutation = useMutation({
    mutationFn: () => createPrescription({ patientId: patient!.id, items }),
    onSuccess: () => {
      toast.success('Prescription created.');
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      onClose();
    },
    onError: (err) => {
      const message = isAxiosError(err) ? err.response?.data?.message : undefined;
      toast.error(message ?? 'Could not create prescription.');
    },
  });

  const updateItem = (i: number, patch: Partial<PrescriptionLineInput>) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!patient) return toast.error('Select a patient.');
        if (items.some((i) => !i.medication || !i.dosage || !i.frequency || !i.duration)) {
          return toast.error('Fill in every medication field.');
        }
        mutation.mutate();
      }}
      className="card mb-6 space-y-4 p-5 animate-in"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">New prescription</h3>
        <button type="button" onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div>
        <label className="label">Patient</label>
        <PatientPicker value={patient} onChange={setPatient} />
      </div>

      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <input className="input" placeholder="Medication" value={item.medication} onChange={(e) => updateItem(i, { medication: e.target.value })} />
              <input className="input" placeholder="Dosage" value={item.dosage} onChange={(e) => updateItem(i, { dosage: e.target.value })} />
              <input className="input" placeholder="Frequency" value={item.frequency} onChange={(e) => updateItem(i, { frequency: e.target.value })} />
              <input className="input" placeholder="Duration" value={item.duration} onChange={(e) => updateItem(i, { duration: e.target.value })} />
              <input
                type="number"
                min={1}
                className="input"
                placeholder="Qty"
                value={item.quantity}
                onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })}
              />
            </div>
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
                className="mt-2 flex items-center gap-1 text-xs text-red-600 hover:underline"
              >
                <Trash2 className="h-3 w-3" />
                Remove
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={() => setItems((prev) => [...prev, emptyLine()])} className="btn-secondary">
          <Plus className="h-4 w-4" />
          Add medication
        </button>
      </div>

      <div className="flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
        <button type="button" onClick={onClose} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={mutation.isPending} className="btn-primary">
          Create prescription
        </button>
      </div>
    </form>
  );
}
