import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { KeyRound, LogOut, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { authService } from '@/services';
import { errorMessage } from '@/services/api';
import { Button, Card, FieldError, Input, Label } from '@/components/ui/primitives';

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters.')
      .regex(/[A-Z]/, 'Include at least one uppercase letter.')
      .regex(/[a-z]/, 'Include at least one lowercase letter.')
      .regex(/[0-9]/, 'Include at least one number.'),
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'The two passwords do not match.',
  });

type PasswordValues = z.infer<typeof passwordSchema>;

export function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema) });

  const onSubmit = async (values: PasswordValues) => {
    try {
      await authService.changePassword(values.currentPassword, values.newPassword);
      toast.success('Password updated. Other devices have been signed out.');
      reset();
    } catch (error) {
      toast.error(errorMessage(error, 'Could not change your password'));
    }
  };

  const signOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account and security preferences.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-start gap-3 p-5 pb-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
              <KeyRound className="h-[18px] w-[18px]" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-semibold tracking-tight">Change password</h2>
              <p className="text-sm text-muted-foreground">
                At least 8 characters, with upper case, lower case and a number.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4 border-t border-border p-5"
            noValidate
          >
            <div className="space-y-1.5">
              <Label htmlFor="currentPassword">Current password</Label>
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                aria-invalid={!!errors.currentPassword}
                {...register('currentPassword')}
              />
              <FieldError>{errors.currentPassword?.message}</FieldError>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="newPassword">New password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={!!errors.newPassword}
                  {...register('newPassword')}
                />
                <FieldError>{errors.newPassword?.message}</FieldError>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm new password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={!!errors.confirmPassword}
                  {...register('confirmPassword')}
                />
                <FieldError>{errors.confirmPassword?.message}</FieldError>
              </div>
            </div>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Updating…' : 'Update password'}
            </Button>
          </form>
        </Card>

        <Card>
          <div className="flex items-start gap-3 p-5 pb-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-success-soft text-success">
              <ShieldCheck className="h-[18px] w-[18px]" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-semibold tracking-tight">Account</h2>
            </div>
          </div>
          <dl className="border-t border-border text-sm">
            {[
              { label: 'Name', value: user?.fullName ?? '—' },
              { label: 'Email', value: user?.email ?? '—' },
              { label: 'Role', value: user ? user.role.charAt(0) + user.role.slice(1).toLowerCase() : '—' },
              {
                label: 'Identifier',
                value: user?.student?.rollNumber ?? user?.teacher?.employeeCode ?? '—',
              },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-baseline justify-between gap-4 border-b border-border/60 px-5 py-3 last:border-0"
              >
                <dt className="text-muted-foreground">{row.label}</dt>
                <dd className="truncate text-right font-medium">{row.value}</dd>
              </div>
            ))}
          </dl>
          <div className="p-5 pt-3">
            <Button variant="outline" className="w-full" onClick={signOut}>
              <LogOut />
              Sign out
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
