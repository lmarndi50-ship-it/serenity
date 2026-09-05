import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, GraduationCap, Loader2, ShieldCheck, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { HOME_ROUTE, useAuth } from '@/context/AuthContext';
import { errorMessage } from '@/services/api';
import { greetingName } from '@/utils/format';
import { Button, FieldError, Input, Label } from '@/components/ui/primitives';
import { LogoMark } from '@/components/Logo';

const loginSchema = z.object({
  identifier: z.string().trim().min(3, 'Enter your email address or roll number.'),
  password: z.string().min(1, 'Enter your password.'),
  rememberMe: z.boolean().optional(),
});

type LoginValues = z.infer<typeof loginSchema>;

const DEMO_ACCOUNTS = [
  { role: 'Student', email: 'student@demo.com', password: 'Student@123' },
  { role: 'Teacher', email: 'teacher@demo.com', password: 'Teacher@123' },
  { role: 'Admin', email: 'admin@demo.com', password: 'Admin@123' },
];

export function LoginPage() {
  const { user, isLoading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '', rememberMe: true },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Loading" />
      </div>
    );
  }

  if (user) {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from ?? HOME_ROUTE[user.role]} replace />;
  }

  const onSubmit = async (values: LoginValues) => {
    try {
      const account = await login(values.identifier, values.password, values.rememberMe);
      toast.success(`Welcome back, ${greetingName(account.fullName)}!`);
      navigate(HOME_ROUTE[account.role], { replace: true });
    } catch (error) {
      toast.error(errorMessage(error, 'Sign in failed'));
    }
  };

  const fillDemo = (email: string, password: string) => {
    setValue('identifier', email, { shouldValidate: true });
    setValue('password', password, { shouldValidate: true });
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel — hidden on small screens where it would push the form down. */}
      <aside className="relative hidden overflow-hidden bg-sidebar p-10 lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-primary/25 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-blue-500/15 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative flex items-center gap-3">
          <LogoMark className="h-11 w-11" />
          <div>
            <p className="text-lg font-bold leading-tight text-white">CAMS</p>
            <p className="text-xs text-sidebar-muted">College Academic Management System</p>
          </div>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-3xl font-bold leading-tight text-white">
            Attendance, marks and assignments — in one place.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-sidebar-muted">
            Track subject-wise attendance, class test performance and assignment deadlines with
            figures calculated from live records, not estimates.
          </p>

          <ul className="mt-8 space-y-4">
            {[
              { icon: TrendingUp, text: 'Attendance, test and assignment scores in one weighted view' },
              { icon: ShieldCheck, text: 'Role-based access for students, faculty and administrators' },
              { icon: GraduationCap, text: 'Automatic alerts when attendance falls below the requirement' },
            ].map((item) => (
              <li key={item.text} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/10 text-white">
                  <item.icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="text-sm text-sidebar-foreground">{item.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-sidebar-muted">
          © {new Date().getFullYear()} CAMS. Demonstration deployment.
        </p>
      </aside>

      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <LogoMark />
            <div>
              <p className="text-base font-bold leading-tight">CAMS</p>
              <p className="text-xs text-muted-foreground">College Academic Management System</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold tracking-tight">Sign in</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Use your college email address or roll number.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-5" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="identifier">Email or roll number</Label>
              <Input
                id="identifier"
                autoComplete="username"
                placeholder="student@demo.com or 23CS042"
                aria-invalid={!!errors.identifier}
                {...register('identifier')}
              />
              <FieldError>{errors.identifier?.message}</FieldError>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="pr-11"
                  aria-invalid={!!errors.password}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <FieldError>{errors.password?.message}</FieldError>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input text-primary focus-visible:ring-2 focus-visible:ring-ring"
                  {...register('rememberMe')}
                />
                Remember me
              </label>
              <button
                type="button"
                onClick={() =>
                  toast.info('Password resets are handled by the college IT helpdesk.')
                }
                className="text-sm font-medium text-primary hover:underline"
              >
                Forgot password?
              </button>
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : null}
              {isSubmitting ? 'Signing in…' : 'Login'}
            </Button>
          </form>

          <div className="mt-8 rounded-lg border border-dashed border-border bg-muted/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Demo accounts (development only)
            </p>
            <div className="mt-3 space-y-1.5">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => fillDemo(account.email, account.password)}
                  className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-card"
                >
                  <span className="font-semibold text-foreground">{account.role}</span>
                  <span className="font-mono text-muted-foreground">
                    {account.email} · {account.password}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
