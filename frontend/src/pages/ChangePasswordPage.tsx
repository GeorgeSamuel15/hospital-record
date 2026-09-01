import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';
import { changePasswordRequest } from '@/services/auth.service';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
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

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => changePasswordRequest(values.currentPassword, values.newPassword),
    onSuccess: () => {
      toast.success('Password changed successfully.');
      reset();
      navigate('/profile');
    },
    onError: (err) => {
      const message = isAxiosError(err) ? err.response?.data?.message : undefined;
      toast.error(message ?? 'Could not change password.');
    },
  });

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Change password</h1>

      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="card mt-6 space-y-4 p-6" noValidate>
        <div>
          <label className="label">Current password</label>
          <input type="password" className="input" {...register('currentPassword')} />
          {errors.currentPassword && <p className="mt-1 text-sm text-red-600">{errors.currentPassword.message}</p>}
        </div>
        <div>
          <label className="label">New password</label>
          <input type="password" className="input" {...register('newPassword')} />
          {errors.newPassword && <p className="mt-1 text-sm text-red-600">{errors.newPassword.message}</p>}
        </div>
        <div>
          <label className="label">Confirm new password</label>
          <input type="password" className="input" {...register('confirmPassword')} />
          {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>}
        </div>
        <button type="submit" disabled={mutation.isPending} className="btn-primary w-full">
          {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Update password
        </button>
      </form>
    </div>
  );
}
