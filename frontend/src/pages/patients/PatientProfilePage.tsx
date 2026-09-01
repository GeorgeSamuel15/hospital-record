import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Activity,
  ClipboardList,
  FlaskConical,
  Pill,
  Stethoscope,
  Calendar,
  BedDouble,
} from 'lucide-react';
import { getPatient, getPatientHistory, getPatientOverview } from '@/services/patient.service';
import { calculateAge, Patient } from '@/types/patient';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { Badge } from '@/components/Badge';
import { EmptyState } from '@/components/EmptyState';
import { FullScreenSpinner } from '@/components/FullScreenSpinner';

type TabKey = 'overview' | 'history' | 'diagnoses' | 'prescriptions' | 'laboratory' | 'appointments' | 'admissions';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'history', label: 'Visits' },
  { key: 'diagnoses', label: 'Diagnoses' },
  { key: 'prescriptions', label: 'Prescriptions' },
  { key: 'laboratory', label: 'Laboratory' },
  { key: 'appointments', label: 'Appointments' },
  { key: 'admissions', label: 'Admissions' },
];

export default function PatientProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<TabKey>('overview');

  const patientQuery = useQuery({
    queryKey: ['patient', id],
    queryFn: () => getPatient(id!),
    enabled: !!id,
  });

  const overviewQuery = useQuery({
    queryKey: ['patient-overview', id],
    queryFn: () => getPatientOverview(id!),
    enabled: !!id && tab === 'overview',
  });

  const historyQuery = useQuery({
    queryKey: ['patient-history', id],
    queryFn: () => getPatientHistory(id!),
    enabled: !!id && tab !== 'overview',
  });

  if (patientQuery.isLoading) return <FullScreenSpinner />;
  if (patientQuery.isError || !patientQuery.data) {
    return (
      <EmptyState icon={Stethoscope} title="Patient not found" description="This patient record may have been removed." />
    );
  }

  const patient = patientQuery.data;

  return (
    <div>
      <Link to="/patients" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300">
        <ArrowLeft className="h-4 w-4" />
        Back to patients
      </Link>

      {/* Header */}
      <div className="card p-6">
        <div className="flex flex-wrap items-center gap-4">
          <InitialsAvatar firstName={patient.firstName} lastName={patient.lastName} size="lg" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {patient.firstName} {patient.lastName}
              </h1>
              <Badge tone="blue">{patient.patientNumber}</Badge>
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {calculateAge(patient.dateOfBirth)} years old · {patient.gender.charAt(0) + patient.gender.slice(1).toLowerCase()}
              {patient.phone ? ` · ${patient.phone}` : ''}
            </p>
          </div>
          <div className="flex gap-2 text-sm">
            {patient.bloodGroup && <Badge tone="red">Blood: {patient.bloodGroup}</Badge>}
            {patient.genotype && <Badge tone="slate">Genotype: {patient.genotype}</Badge>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 border-b border-slate-200 dark:border-slate-800">
        <nav className="-mb-px flex gap-6 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-6">
        {tab === 'overview' && (
          <OverviewTab
            patient={patient}
            data={overviewQuery.data}
            isLoading={overviewQuery.isLoading}
          />
        )}
        {tab !== 'overview' && (
          <HistoryTabContent tab={tab} data={historyQuery.data} isLoading={historyQuery.isLoading} />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overview tab
// ---------------------------------------------------------------------------

interface OverviewData {
  latestVital?: Record<string, unknown> | null;
  recentDiagnoses?: Array<{ id: string; diagnosis: string; diagnosedAt: string; doctor: { firstName: string; lastName: string } }>;
  currentPrescriptions?: Array<{ id: string; status: string; items: Array<{ medication: string; dosage: string }> }>;
  recentLabResults?: Array<{ id: string; testName: string; result?: { resultData: string } | null }>;
}

function OverviewTab({
  patient,
  data,
  isLoading,
}: {
  patient: Patient;
  data?: OverviewData;
  isLoading: boolean;
}) {
  if (isLoading) return <SkeletonBlock />;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="card space-y-4 p-5 lg:col-span-1">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Patient details</h3>
        <DetailRow label="Allergies" value={patient.allergies || 'None recorded'} />
        <DetailRow label="Emergency contact" value={patient.emergencyContactName || '—'} sub={patient.emergencyContactPhone} />
        <DetailRow label="Next of kin" value={patient.nextOfKinName || '—'} sub={patient.nextOfKinPhone} />
        <DetailRow label="Address" value={patient.address || '—'} />
      </div>

      <div className="card space-y-3 p-5 lg:col-span-2">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Latest vitals</h3>
        {data?.latestVital ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <VitalStat label="Temp" value={data.latestVital.temperatureC as number | undefined} unit="°C" />
            <VitalStat
              label="BP"
              value={
                data.latestVital.bloodPressureSystolic && data.latestVital.bloodPressureDiastolic
                  ? `${data.latestVital.bloodPressureSystolic}/${data.latestVital.bloodPressureDiastolic}`
                  : undefined
              }
              unit="mmHg"
            />
            <VitalStat label="Pulse" value={data.latestVital.pulseRate as number | undefined} unit="bpm" />
            <VitalStat label="SpO₂" value={data.latestVital.oxygenSaturation as number | undefined} unit="%" />
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">No vitals recorded yet.</p>
        )}

        <h3 className="pt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">Recent diagnoses</h3>
        {data?.recentDiagnoses?.length ? (
          <ul className="space-y-2">
            {data.recentDiagnoses.map((d) => (
              <li key={d.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-700 dark:text-slate-300">{d.diagnosis}</span>
                <span className="text-slate-400 dark:text-slate-500">{new Date(d.diagnosedAt).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">No diagnoses recorded yet.</p>
        )}

        <h3 className="pt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">Current medications</h3>
        {data?.currentPrescriptions?.length ? (
          <ul className="space-y-1.5">
            {data.currentPrescriptions.flatMap((p) =>
              p.items.map((item, i) => (
                <li key={`${p.id}-${i}`} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700 dark:text-slate-300">
                    {item.medication} — {item.dosage}
                  </span>
                  <Badge tone={p.status === 'DISPENSED' ? 'green' : 'amber'}>{p.status.toLowerCase()}</Badge>
                </li>
              ))
            )}
          </ul>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">No active prescriptions.</p>
        )}
      </div>
    </div>
  );
}

function VitalStat({ label, value, unit }: { label: string; value?: number | string; unit: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        {value ?? '—'} <span className="text-xs font-normal text-slate-400 dark:text-slate-500">{value ? unit : ''}</span>
      </p>
    </div>
  );
}

function DetailRow({ label, value, sub }: { label: string; value: string; sub?: string | null }) {
  return (
    <div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-sm text-slate-800 dark:text-slate-200">{value}</p>
      {sub && <p className="text-xs text-slate-500 dark:text-slate-400">{sub}</p>}
    </div>
  );
}

function SkeletonBlock() {
  return <div className="h-48 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />;
}

// ---------------------------------------------------------------------------
// History-derived tabs (Visits, Diagnoses, Prescriptions, Laboratory,
// Appointments, Admissions) — all sourced from GET /patients/:id/history
// ---------------------------------------------------------------------------

function HistoryTabContent({
  tab,
  data,
  isLoading,
}: {
  tab: Exclude<TabKey, 'overview'>;
  data?: Record<string, unknown>;
  isLoading: boolean;
}) {
  if (isLoading) return <SkeletonBlock />;
  if (!data) return null;

  switch (tab) {
    case 'history': {
      const visits = (data.visits ?? []) as Array<{ id: string; visitDate: string; chiefComplaint: string; doctor: { firstName: string; lastName: string } }>;
      if (!visits.length) return <NoRecords icon={Stethoscope} label="visits" />;
      return (
        <ListCard>
          {visits.map((v) => (
            <ListRow
              key={v.id}
              title={v.chiefComplaint}
              subtitle={`Dr. ${v.doctor.firstName} ${v.doctor.lastName}`}
              date={v.visitDate}
            />
          ))}
        </ListCard>
      );
    }
    case 'diagnoses': {
      const diagnoses = (data.diagnoses ?? []) as Array<{ id: string; diagnosis: string; description?: string; diagnosedAt: string; doctor: { firstName: string; lastName: string } }>;
      if (!diagnoses.length) return <NoRecords icon={ClipboardList} label="diagnoses" />;
      return (
        <ListCard>
          {diagnoses.map((d) => (
            <ListRow key={d.id} title={d.diagnosis} subtitle={`Dr. ${d.doctor.firstName} ${d.doctor.lastName}`} date={d.diagnosedAt} />
          ))}
        </ListCard>
      );
    }
    case 'prescriptions': {
      const prescriptions = (data.prescriptions ?? []) as Array<{
        id: string;
        status: string;
        createdAt: string;
        doctor: { firstName: string; lastName: string };
        items: Array<{ medication: string; dosage: string }>;
      }>;
      if (!prescriptions.length) return <NoRecords icon={Pill} label="prescriptions" />;
      return (
        <ListCard>
          {prescriptions.map((p) => (
            <div key={p.id} className="px-4 py-3.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Dr. {p.doctor.firstName} {p.doctor.lastName}
                </span>
                <div className="flex items-center gap-2">
                  <Badge tone={p.status === 'DISPENSED' || p.status === 'COMPLETED' ? 'green' : p.status === 'CANCELLED' ? 'red' : 'amber'}>
                    {p.status.toLowerCase()}
                  </Badge>
                  <span className="text-xs text-slate-400 dark:text-slate-500">{new Date(p.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{p.items.map((i) => `${i.medication} (${i.dosage})`).join(', ')}</p>
            </div>
          ))}
        </ListCard>
      );
    }
    case 'laboratory': {
      const labRequests = (data.labRequests ?? []) as Array<{ id: string; testName: string; status: string; requestedAt: string; result?: { resultData: string } | null }>;
      if (!labRequests.length) return <NoRecords icon={FlaskConical} label="lab requests" />;
      return (
        <ListCard>
          {labRequests.map((l) => (
            <div key={l.id} className="px-4 py-3.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{l.testName}</span>
                <div className="flex items-center gap-2">
                  <Badge tone={l.status === 'COMPLETED' ? 'green' : l.status === 'CANCELLED' ? 'red' : 'amber'}>
                    {l.status.toLowerCase().replace('_', ' ')}
                  </Badge>
                  <span className="text-xs text-slate-400 dark:text-slate-500">{new Date(l.requestedAt).toLocaleDateString()}</span>
                </div>
              </div>
              {l.result && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{l.result.resultData}</p>}
            </div>
          ))}
        </ListCard>
      );
    }
    case 'appointments': {
      const appointments = (data.appointments ?? []) as Array<{ id: string; reason: string; status: string; scheduledAt: string; doctor: { firstName: string; lastName: string } }>;
      if (!appointments.length) return <NoRecords icon={Calendar} label="appointments" />;
      return (
        <ListCard>
          {appointments.map((a) => (
            <ListRow key={a.id} title={a.reason} subtitle={`Dr. ${a.doctor.firstName} ${a.doctor.lastName}`} date={a.scheduledAt} badge={a.status} />
          ))}
        </ListCard>
      );
    }
    case 'admissions': {
      const admissions = (data.admissions ?? []) as Array<{ id: string; ward: string; room: string; status: string; admissionDate: string; admittingDoctor: { firstName: string; lastName: string } }>;
      if (!admissions.length) return <NoRecords icon={BedDouble} label="admissions" />;
      return (
        <ListCard>
          {admissions.map((a) => (
            <ListRow key={a.id} title={`${a.ward} — Room ${a.room}`} subtitle={`Dr. ${a.admittingDoctor.firstName} ${a.admittingDoctor.lastName}`} date={a.admissionDate} badge={a.status} />
          ))}
        </ListCard>
      );
    }
    default:
      return null;
  }
}

function ListCard({ children }: { children: React.ReactNode }) {
  return <div className="card divide-y divide-slate-100 overflow-hidden">{children}</div>;
}

function ListRow({ title, subtitle, date, badge }: { title: string; subtitle: string; date: string; badge?: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <div>
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{title}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2">
        {badge && <Badge tone="slate">{badge.toLowerCase().replace('_', ' ')}</Badge>}
        <span className="text-xs text-slate-400 dark:text-slate-500">{new Date(date).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

function NoRecords({ icon, label }: { icon: typeof Activity; label: string }) {
  return <EmptyState icon={icon} title={`No ${label} yet`} description={`This patient has no recorded ${label}.`} />;
}
