import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { HOME_ROUTE, useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/primitives';
import { LogoMark } from '@/components/Logo';

export function NotFoundPage() {
  const { user } = useAuth();
  const home = user ? HOME_ROUTE[user.role] : '/login';

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <LogoMark className="h-12 w-12" />
      <div className="space-y-2">
        <p className="text-5xl font-bold tracking-tight">404</p>
        <h1 className="text-xl font-semibold">This page does not exist</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          The link may be out of date, or the page may be restricted to a different role.
        </p>
      </div>
      <Button asChild>
        <Link to={home}>
          <Compass />
          Back to your dashboard
        </Link>
      </Button>
    </main>
  );
}
