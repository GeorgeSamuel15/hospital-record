import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Activity, ArrowLeft, Loader2, Mail } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { forgotPasswordRequest } from '@/services/auth.service';

const schema = z.object({ email: z.string().email('Enter a valid email address') });
type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => forgotPasswordRequest(values.email),
    onSuccess: () => setSubmitted(true),
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2 text-primary-800">
          <Activity className="h-6 w-6" />
          <span className="text-lg font-semibold">Hospital RMS</span>
        </div>

        {submitted ? (
          <div className="card p-6 text-center">
            <p className="text-sm text-slate-700 dark:text-slate-300">
              If an account with that email exists, a password reset link has been sent.
            </p>
            <Link to="/login" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700">
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Forgot your password?</h2>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">Enter your email and we'll send you a reset link.</p>

            <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="mt-8 space-y-4" noValidate>
              <div>
                <label htmlFor="email" className="label">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input id="email" type="email" className="input pl-9" {...register('email')} />
                </div>
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
              </div>

              <button type="submit" disabled={mutation.isPending} className="btn-primary w-full">
                {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Send reset link
              </button>

              <Link to="/login" className="flex items-center justify-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300">
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
