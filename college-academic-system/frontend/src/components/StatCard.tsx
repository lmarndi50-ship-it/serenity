import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Tone } from '@/utils/format';
import { Card, Progress } from './ui/primitives';

const ICON_TONES: Record<Tone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  primary: 'bg-primary-soft text-primary',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  assignment: 'bg-assignment-soft text-assignment',
};

export function StatCard({
  label,
  value,
  subtitle,
  icon: Icon,
  tone = 'primary',
  progress,
  footer,
  className,
}: {
  label: string;
  value: ReactNode;
  subtitle?: ReactNode;
  icon?: LucideIcon;
  tone?: Tone;
  /** Renders a progress bar in the same tone when provided. */
  progress?: number;
  footer?: ReactNode;
  className?: string;
}) {
  const progressTone = tone === 'neutral' ? 'primary' : tone;

  return (
    <Card interactive className={cn('flex flex-col p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {Icon ? (
          <span
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-md',
              ICON_TONES[tone],
            )}
          >
            <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
        ) : null}
      </div>

      <p className="mt-3 text-3xl font-bold tracking-tight text-foreground">{value}</p>

      {progress !== undefined ? (
        <Progress
          value={progress}
          tone={progressTone}
          className="mt-4"
          label={`${label}: ${Math.round(progress)}%`}
        />
      ) : null}

      {subtitle ? <p className="mt-3 text-xs text-muted-foreground">{subtitle}</p> : null}
      {footer}
    </Card>
  );
}
