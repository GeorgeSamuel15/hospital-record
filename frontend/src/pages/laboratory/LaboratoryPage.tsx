import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FlaskConical, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';
import { createLabRequest, createLabResult, listLabRequests, updateLabRequestStatus } from '@/services/lab.service';
import { SkeletonListRows } from '@/components/Skeletons';
import { useAuth } from '@/hooks/useAuth';
import { PatientPicker } from '@/components/PatientPicker';
import { Badge } from '@/components/Badge';
import { EmptyState } from '@/components/EmptyState';
import { LabRequestStatus } from '@/types/clinical';
import { PatientListItem } from '@/types/patient';

const STATUS_TONE: Record<LabRequestStatus, 'blue' | 'green' | 'amber' | 'red'> = {
  PENDING: 'amber',
  IN_PROGRESS: 'blue',
  COMPLETED: 'green',
  CANCELLED: 'red',
};

export default function LaboratoryPage() {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [resultFormFor, setResultFormFor] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['lab-requests'],
    queryFn: () => listLabRequests({ pageSize: 100 }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: LabRequestStatus }) => updateLabRequestStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-requests'] });
      toast.success('Status updated.');
    },
    onError: () => toast.error('Could not update status.'),
  });

  const canRequest = user?.role === 'DOCTOR';
  const canProcess = user?.role === 'LAB_TECHNICIAN' || user?.role === 'ADMIN';

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Laboratory</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Track lab requests from order through result.</p>
        </div>
        {canRequest && (
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" />
            Request test
          </button>
        )}
      </div>

      {showForm && <NewLabRequestForm onClose={() => setShowForm(false)} />}

      <div className="mt-6">
        {isLoading ? (
          <div className="card overflow-hidden"><SkeletonListRows /></div>
        ) : !data || data.requests.length === 0 ? (
          <EmptyState icon={FlaskConical} title="No lab requests" description="Requested tests will appear here." />
        ) : (
          <div className="card divide-y divide-slate-100 overflow-hidden">
            {data.requests.map((r) => (
              <div key={r.id} className="px-4 py-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {r.testName} — {r.patient.firstName} {r.patient.lastName}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {r.patient.patientNumber} · Requested {new Date(r.requestedAt).toLocaleDateString()}
                      {r.priority !== 'ROUTINE' && ` · ${r.priority}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={STATUS_TONE[r.status]}>{r.status.toLowerCase().replace('_', ' ')}</Badge>
                    {canProcess && r.status === 'PENDING' && (
                      <button
                        className="text-xs font-medium text-primary-600 hover:underline"
                        onClick={() => statusMutation.mutate({ id: r.id, status: 'IN_PROGRESS' })}
                      >
                        Start
                      </button>
                    )}
                    {canProcess && r.status === 'IN_PROGRESS' && (
                      <button className="text-xs font-medium text-primary-600 hover:underline" onClick={() => setResultFormFor(r.id)}>
                        Enter result
                      </button>
                    )}
                  </div>
                </div>
                {r.result && <p className="mt-2 rounded-lg bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-700 dark:text-slate-300">{r.result.resultData}</p>}
                {resultFormFor === r.id && <LabResultForm labRequestId={r.id} onClose={() => setResultFormFor(null)} />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NewLabRequestForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [patient, setPatient] = useState<PatientListItem | null>(null);
  const [testName, setTestName] = useState('');
  const [priority, setPriority] = useState('ROUTINE');
  const [clinicalNotes, setClinicalNotes] = useState('');

  const mutation = useMutation({
    mutationFn: () => createLabRequest({ patientId: patient!.id, testName, priority, clinicalNotes }),
    onSuccess: () => {
      toast.success('Lab test requested.');
      queryClient.invalidateQueries({ queryKey: ['lab-requests'] });
      onClose();
    },
    onError: (err) => {
      const message = isAxiosError(err) ? err.response?.data?.message : undefined;
      toast.error(message ?? 'Could not create lab request.');
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!patient || !testName) return toast.error('Select a patient and test name.');
        mutation.mutate();
      }}
      className="card mb-6 space-y-4 p-5 animate-in"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Request laboratory test</h3>
        <button type="button" onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div>
        <label className="label">Patient</label>
        <PatientPicker value={patient} onChange={setPatient} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Test name</label>
          <input className="input" value={testName} onChange={(e) => setTestName(e.target.value)} placeholder="e.g. Full Blood Count" />
        </div>
        <div>
          <label className="label">Priority</label>
          <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="ROUTINE">Routine</option>
            <option value="URGENT">Urgent</option>
            <option value="STAT">STAT</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label">Clinical notes</label>
        <textarea className="input" rows={2} value={clinicalNotes} onChange={(e) => setClinicalNotes(e.target.value)} />
      </div>
      <div className="flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
        <button type="button" onClick={onClose} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={mutation.isPending} className="btn-primary">
          Submit request
        </button>
      </div>
    </form>
  );
}

function LabResultForm({ labRequestId, onClose }: { labRequestId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [resultData, setResultData] = useState('');
  const [remarks, setRemarks] = useState('');

  const mutation = useMutation({
    mutationFn: () => createLabResult({ labRequestId, resultData, remarks }),
    onSuccess: () => {
      toast.success('Result recorded.');
      queryClient.invalidateQueries({ queryKey: ['lab-requests'] });
      onClose();
    },
    onError: () => toast.error('Could not save result.'),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!resultData) return toast.error('Enter the result.');
        mutation.mutate();
      }}
      className="mt-3 space-y-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 animate-in"
    >
      <div>
        <label className="label">Result</label>
        <textarea className="input" rows={2} value={resultData} onChange={(e) => setResultData(e.target.value)} />
      </div>
      <div>
        <label className="label">Remarks (optional)</label>
        <input className="input" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={mutation.isPending} className="btn-primary">
          Save & complete
        </button>
      </div>
    </form>
  );
}
