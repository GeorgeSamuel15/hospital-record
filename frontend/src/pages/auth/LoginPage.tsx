import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Activity, Loader2, Lock, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { isAxiosError } from 'axios';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      await login(values.email, values.password);
      const redirectTo = (location.state as { from?: Location })?.from?.pathname ?? '/dashboard';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const message = isAxiosError(err) ? err.response?.data?.message : undefined;
      toast.error(message ?? 'Unable to sign in. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left: brand panel */}
      <div className="hidden w-1/2 flex-col justify-between bg-primary-800 p-12 text-white lg:flex">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white dark:bg-slate-900/10">
            <Activity className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold">Hospital RMS</span>
        </div>
        <div>
          <h1 className="text-3xl font-semibold leading-tight">
            Care coordination,
            <br />
            without the chaos.
          </h1>
          <p className="mt-4 max-w-md text-primary-100">
            Patient records, appointments, laboratory workflows, prescriptions, and admissions —
            unified in one secure platform.
          </p>
        </div>
        <p className="text-sm text-primary-200">© {new Date().getFullYear()} Hospital RMS. All rights reserved.</p>
      </div>

      {/* Right: login form */}
      <div className="flex w-full flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 px-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-2 text-primary-800">
              <Activity className="h-6 w-6" />
              <span className="text-lg font-semibold">Hospital RMS</span>
            </div>
          </div>

          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Sign in to your account</h2>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">Enter your credentials to access the platform.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="label">
                Email address
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className="input pl-9"
                  placeholder="you@hospital.demo"
                  {...register('email')}
                />
              </div>
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="label">
                  Password
                </label>
                <Link to="/forgot-password" className="text-sm font-medium text-primary-600 hover:text-primary-700">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  className="input pl-9"
                  placeholder="••••••••"
                  {...register('password')}
                />
              </div>
              {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign in
            </button>
          </form>

          <div className="mt-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-xs text-slate-500 dark:text-slate-400">
            <p className="font-medium text-slate-700 dark:text-slate-300">Demo accounts (development only)</p>
            <p className="mt-1">
              e.g. <span className="font-mono">admin@hospital.demo</span> / <span className="font-mono">doctor@hospital.demo</span>{' '}
              — password <span className="font-mono">Demo@1234</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
