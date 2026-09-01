import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Activity, Loader2, Lock } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';
import { resetPasswordRequest } from '@/services/auth.service';

const schema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/[0-9]/, 'Must contain a number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });
type FormValues = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => resetPasswordRequest(token, values.newPassword),
    onSuccess: () => {
      toast.success('Password reset. You can now sign in.');
      navigate('/login');
    },
    onError: (err) => {
      const message = isAxiosError(err) ? err.response?.data?.message : undefined;
      toast.error(message ?? 'This reset link is invalid or has expired.');
    },
  });

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 px-6 text-center">
        <div>
          <p className="text-sm text-slate-700 dark:text-slate-300">This reset link is missing a token.</p>
          <Link to="/forgot-password" className="mt-2 inline-block text-sm font-medium text-primary-600 hover:text-primary-700">
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2 text-primary-800">
          <Activity className="h-6 w-6" />
          <span className="text-lg font-semibold">Hospital RMS</span>
        </div>

        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Set a new password</h2>

        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="mt-8 space-y-4" noValidate>
          <div>
            <label className="label">New password</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input type="password" className="input pl-9" {...register('newPassword')} />
            </div>
            {errors.newPassword && <p className="mt-1 text-sm text-red-600">{errors.newPassword.message}</p>}
          </div>
          <div>
            <label className="label">Confirm password</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input type="password" className="input pl-9" {...register('confirmPassword')} />
            </div>
            {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>}
          </div>
          <button type="submit" disabled={mutation.isPending} className="btn-primary w-full">
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Reset password
          </button>
        </form>
      </div>
    </div>
  );
}
