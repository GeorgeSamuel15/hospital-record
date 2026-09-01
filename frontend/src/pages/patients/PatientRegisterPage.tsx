import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';
import { createPatient } from '@/services/patient.service';

const schema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER'], { errorMap: () => ({ message: 'Select a gender' }) }),
  phone: z.string().optional(),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  address: z.string().optional(),
  bloodGroup: z.string().optional(),
  genotype: z.string().optional(),
  allergies: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  nextOfKinName: z.string().optional(),
  nextOfKinPhone: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export default function PatientRegisterPage() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => createPatient(values),
    onSuccess: (patient) => {
      toast.success(`${patient.firstName} ${patient.lastName} registered as ${patient.patientNumber}.`);
      navigate(`/patients/${patient.id}`);
    },
    onError: (err) => {
      const message = isAxiosError(err) ? err.response?.data?.message : undefined;
      toast.error(message ?? 'Could not register patient. Please try again.');
    },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/patients" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300">
        <ArrowLeft className="h-4 w-4" />
        Back to patients
      </Link>

      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Register new patient</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">A unique patient ID will be generated automatically.</p>

      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="mt-6 card space-y-6 p-6" noValidate>
        <Section title="Personal information">
          <Field label="First name" error={errors.firstName?.message} required>
            <input className="input" {...register('firstName')} />
          </Field>
          <Field label="Last name" error={errors.lastName?.message} required>
            <input className="input" {...register('lastName')} />
          </Field>
          <Field label="Date of birth" error={errors.dateOfBirth?.message} required>
            <input type="date" className="input" {...register('dateOfBirth')} />
          </Field>
          <Field label="Gender" error={errors.gender?.message} required>
            <select className="input" defaultValue="" {...register('gender')}>
              <option value="" disabled>
                Select gender
              </option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </Field>
        </Section>

        <Section title="Contact information">
          <Field label="Phone">
            <input className="input" placeholder="+234..." {...register('phone')} />
          </Field>
          <Field label="Email" error={errors.email?.message}>
            <input type="email" className="input" {...register('email')} />
          </Field>
          <Field label="Address" full>
            <input className="input" {...register('address')} />
          </Field>
        </Section>

        <Section title="Clinical information">
          <Field label="Blood group">
            <input className="input" placeholder="e.g. O+" {...register('bloodGroup')} />
          </Field>
          <Field label="Genotype">
            <input className="input" placeholder="e.g. AA" {...register('genotype')} />
          </Field>
          <Field label="Allergies" full>
            <input className="input" placeholder="e.g. Penicillin — leave blank if none known" {...register('allergies')} />
          </Field>
        </Section>

        <Section title="Emergency contact & next of kin">
          <Field label="Emergency contact name">
            <input className="input" {...register('emergencyContactName')} />
          </Field>
          <Field label="Emergency contact phone">
            <input className="input" {...register('emergencyContactPhone')} />
          </Field>
          <Field label="Next of kin name">
            <input className="input" {...register('nextOfKinName')} />
          </Field>
          <Field label="Next of kin phone">
            <input className="input" {...register('nextOfKinPhone')} />
          </Field>
        </Section>

        <div className="flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-6">
          <Link to="/patients" className="btn-secondary">
            Cancel
          </Link>
          <button type="submit" disabled={mutation.isPending} className="btn-primary">
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Register patient
          </button>
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function Field({
  label,
  error,
  required,
  full,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={full ? 'sm:col-span-2' : undefined}>
      <label className="label">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
