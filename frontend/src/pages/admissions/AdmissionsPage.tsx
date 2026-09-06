import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BedDouble, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';
import { admitPatient, dischargePatient, listAdmissions } from '@/services/admission.service';
import { Badge } from '@/components/Badge';
import { EmptyState } from '@/components/EmptyState';
import { SkeletonListRows } from '@/components/Skeletons';
import { PatientPicker } from '@/components/PatientPicker';
import { StaffPicker } from '@/components/StaffPicker';
import { AdmissionStatus } from '@/types/clinical';
import { PatientListItem } from '@/types/patient';

const STATUS_TONE: Record<AdmissionStatus, 'blue' | 'green' | 'slate'> = {
  ADMITTED: 'blue',
  DISCHARGED: 'green',
  TRANSFERRED: 'slate',
};

export default function AdmissionsPage() {
  const [showForm, setShowForm] = useState(false);
  const [dischargeFormFor, setDischargeFormFor] = useState<string | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ['admissions'], queryFn: () => listAdmissions({ pageSize: 100 }) });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Admissions</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage inpatient admissions and discharges.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" />
          Admit patient
        </button>
      </div>

      {showForm && <NewAdmissionForm onClose={() => setShowForm(false)} />}

      <div className="mt-6">
        {isLoading ? (
          <div className="card overflow-hidden"><SkeletonListRows /></div>
        ) : !data || data.admissions.length === 0 ? (
          <EmptyState icon={BedDouble} title="No admissions recorded" />
        ) : (
          <div className="card divide-y divide-slate-100 overflow-hidden">
            {data.admissions.map((a) => (
              <div key={a.id} className="px-4 py-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {a.patient.firstName} {a.patient.lastName} <span className="font-normal text-slate-400 dark:text-slate-500">· {a.patient.patientNumber}</span>
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {a.ward} — Room {a.room}, Bed {a.bed} · Dr. {a.admittingDoctor.firstName} {a.admittingDoctor.lastName}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={STATUS_TONE[a.status]}>{a.status.toLowerCase()}</Badge>
                    {a.status === 'ADMITTED' && (
                      <button className="text-xs font-medium text-primary-600 hover:underline" onClick={() => setDischargeFormFor(a.id)}>
                        Discharge
                      </button>
                    )}
                  </div>
                </div>
                {dischargeFormFor === a.id && <DischargeForm admissionId={a.id} onClose={() => setDischargeFormFor(null)} />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NewAdmissionForm({ onClose }: { onClose: () => void }) {
  const [patient, setPatient] = useState<PatientListItem | null>(null);
  const queryClient = useQueryClient();
  const [doctorId, setDoctorId] = useState('');
  const [ward, setWard] = useState('');
  const [room, setRoom] = useState('');
  const [bed, setBed] = useState('');
  const [reason, setReason] = useState('');

  const mutation = useMutation({
    mutationFn: () => admitPatient({ patientId: patient!.id, doctorId, ward, room, bed, reason }),
    onSuccess: () => {
      toast.success('Patient admitted.');
      queryClient.invalidateQueries({ queryKey: ['admissions'] });
      onClose();
    },
    onError: (err) => {
      const message = isAxiosError(err) ? err.response?.data?.message : undefined;
      toast.error(message ?? 'Could not admit patient.');
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!patient || !doctorId || !ward || !room || !bed || !reason) return toast.error('Fill in all fields.');
        mutation.mutate();
      }}
      className="card mb-6 space-y-4 p-5 animate-in"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Admit patient</h3>
        <button type="button" onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div>
        <label className="label">Patient</label>
        <PatientPicker value={patient} onChange={setPatient} />
      </div>
      <div>
        <label className="label">Admitting doctor</label>
        <StaffPicker role="DOCTOR" value={doctorId} onChange={setDoctorId} placeholder="Select the responsible doctor" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="label">Ward</label>
          <input className="input" value={ward} onChange={(e) => setWard(e.target.value)} />
        </div>
        <div>
          <label className="label">Room</label>
          <input className="input" value={room} onChange={(e) => setRoom(e.target.value)} />
        </div>
        <div>
          <label className="label">Bed</label>
          <input className="input" value={bed} onChange={(e) => setBed(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label">Reason for admission</label>
        <textarea className="input" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      <div className="flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
        <button type="button" onClick={onClose} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={mutation.isPending} className="btn-primary">
          Admit
        </button>
      </div>
    </form>
  );
}

function DischargeForm({ admissionId, onClose }: { admissionId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [dischargeDiagnosis, setDischargeDiagnosis] = useState('');
  const [dischargeNotes, setDischargeNotes] = useState('');

  const mutation = useMutation({
    mutationFn: () => dischargePatient(admissionId, { dischargeDiagnosis, dischargeNotes }),
    onSuccess: () => {
      toast.success('Patient discharged.');
      queryClient.invalidateQueries({ queryKey: ['admissions'] });
      onClose();
    },
    onError: () => toast.error('Could not discharge patient.'),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
      className="mt-3 space-y-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 animate-in"
    >
      <div>
        <label className="label">Discharge diagnosis</label>
        <input className="input" value={dischargeDiagnosis} onChange={(e) => setDischargeDiagnosis(e.target.value)} />
      </div>
      <div>
        <label className="label">Discharge notes</label>
        <textarea className="input" rows={2} value={dischargeNotes} onChange={(e) => setDischargeNotes(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={mutation.isPending} className="btn-primary">
          Confirm discharge
        </button>
      </div>
    </form>
  );
}
