import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Save, SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { adminService } from '@/services';
import { errorMessage } from '@/services/api';
import { formatDateTime } from '@/utils/format';
import { cn } from '@/lib/utils';
import { Button, Card, FieldError, Input, Label, Skeleton } from '@/components/ui/primitives';
import { ErrorState, TableSkeleton } from '@/components/ui/states';
import type { AppSettings } from '@/types';

export function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<AppSettings | null>(null);

  const settings = useQuery({ queryKey: ['admin', 'settings'], queryFn: adminService.settings });

  const auditLogs = useQuery({
    queryKey: ['admin', 'audit-logs'],
    queryFn: () => adminService.auditLogs({ page: 1, pageSize: 10 }),
  });

  useEffect(() => {
    if (settings.data) setDraft(settings.data);
  }, [settings.data]);

  const save = useMutation({
    mutationFn: (values: AppSettings) => adminService.saveSettings(values),
    onSuccess: () => {
      // Every dashboard percentage depends on these weights.
      queryClient.invalidateQueries();
      toast.success('Settings saved. Scores have been recalculated.');
    },
    onError: (error) => toast.error(errorMessage(error, 'Could not save the settings')),
  });

  if (settings.isLoading || !draft) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-56" />
        <Card className="p-5">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="mt-4 h-10 w-full" />
          <Skeleton className="mt-3 h-10 w-full" />
        </Card>
      </div>
    );
  }

  if (settings.isError) {
    return (
      <Card>
        <ErrorState message={errorMessage(settings.error)} onRetry={() => void settings.refetch()} />
      </Card>
    );
  }

  const weightTotal =
    Math.round((draft.weights.attendance + draft.weights.tests + draft.weights.assignments) * 100);
  const weightsValid = weightTotal === 100;
  const thresholdsValid = draft.thresholds.warning < draft.thresholds.good;

  const setWeight = (key: keyof AppSettings['weights'], percentValue: number) => {
    setDraft({ ...draft, weights: { ...draft.weights, [key]: percentValue / 100 } });
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Academic Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          These values drive every overall score and attendance badge in the system.
        </p>
      </header>

      <Card>
        <div className="flex items-start gap-3 p-5 pb-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
            <SlidersHorizontal className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-base font-semibold tracking-tight">Overall score weighting</h2>
            <p className="text-sm text-muted-foreground">
              Attendance, class tests and assignments must add up to 100%.
            </p>
          </div>
        </div>

        <div className="border-t border-border p-5">
          <div className="grid gap-4 sm:grid-cols-3">
            {(
              [
                { key: 'attendance', label: 'Attendance', accent: 'bg-primary' },
                { key: 'tests', label: 'Class tests', accent: 'bg-success' },
                { key: 'assignments', label: 'Assignments', accent: 'bg-assignment' },
              ] as const
            ).map((item) => (
              <div key={item.key} className="space-y-1.5">
                <Label htmlFor={`weight-${item.key}`} className="flex items-center gap-2">
                  <span className={cn('h-2.5 w-2.5 rounded-full', item.accent)} aria-hidden="true" />
                  {item.label}
                </Label>
                <div className="relative">
                  <Input
                    id={`weight-${item.key}`}
                    type="number"
                    min={0}
                    max={100}
                    step={5}
                    value={Math.round(draft.weights[item.key] * 100)}
                    onChange={(e) => setWeight(item.key, Number(e.target.value))}
                    className="pr-9"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    %
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div
            className={cn(
              'mt-4 flex items-center gap-2 rounded-md px-3 py-2 text-sm',
              weightsValid ? 'bg-success-soft text-success-foreground' : 'bg-danger-soft text-danger-foreground',
            )}
          >
            {weightsValid ? null : <AlertTriangle className="h-4 w-4" aria-hidden="true" />}
            Total: <strong>{weightTotal}%</strong>
            {weightsValid ? ' — valid' : ' — the three weights must add up to exactly 100%.'}
          </div>
        </div>
      </Card>

      <Card>
        <div className="p-5 pb-3">
          <h2 className="text-base font-semibold tracking-tight">Attendance thresholds</h2>
          <p className="text-sm text-muted-foreground">
            Below the warning threshold, students are automatically notified.
          </p>
        </div>
        <div className="border-t border-border p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="threshold-good">Good (green) at or above</Label>
              <Input
                id="threshold-good"
                type="number"
                min={1}
                max={100}
                value={draft.thresholds.good}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    thresholds: { ...draft.thresholds, good: Number(e.target.value) },
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="threshold-warning">Warning (orange) at or above</Label>
              <Input
                id="threshold-warning"
                type="number"
                min={1}
                max={100}
                value={draft.thresholds.warning}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    thresholds: { ...draft.thresholds, warning: Number(e.target.value) },
                  })
                }
              />
              <FieldError>
                {thresholdsValid ? null : 'The warning threshold must be lower than the good threshold.'}
              </FieldError>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-success-soft px-3 py-1 font-semibold text-success-foreground">
              Good: {draft.thresholds.good}% and above
            </span>
            <span className="rounded-full bg-warning-soft px-3 py-1 font-semibold text-warning-foreground">
              Warning: {draft.thresholds.warning}–{draft.thresholds.good - 1}%
            </span>
            <span className="rounded-full bg-danger-soft px-3 py-1 font-semibold text-danger-foreground">
              Critical: below {draft.thresholds.warning}%
            </span>
          </div>
        </div>
      </Card>

      <Card>
        <div className="p-5 pb-3">
          <h2 className="text-base font-semibold tracking-tight">Institution</h2>
        </div>
        <div className="border-t border-border p-5">
          <div className="max-w-lg space-y-1.5">
            <Label htmlFor="college-name">College name</Label>
            <Input
              id="college-name"
              value={draft.collegeName}
              onChange={(e) => setDraft({ ...draft, collegeName: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Shown in the top bar, the sidebar and on every exported report.
            </p>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={() => save.mutate(draft)}
          disabled={!weightsValid || !thresholdsValid || save.isPending}
        >
          <Save />
          {save.isPending ? 'Saving…' : 'Save settings'}
        </Button>
        <Button
          variant="outline"
          onClick={() => settings.data && setDraft(settings.data)}
          disabled={save.isPending}
        >
          Reset
        </Button>
      </div>

      <Card>
        <div className="p-5 pb-3">
          <h2 className="text-base font-semibold tracking-tight">Recent Activity</h2>
          <p className="text-sm text-muted-foreground">
            Audit trail of attendance saves, mark entries and role changes.
          </p>
        </div>
        {auditLogs.isLoading ? (
          <TableSkeleton rows={5} columns={4} />
        ) : auditLogs.isError ? (
          <ErrorState message={errorMessage(auditLogs.error)} />
        ) : (
          <div className="overflow-x-auto border-t border-border">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="px-5 py-2.5 text-left font-semibold">When</th>
                  <th scope="col" className="px-4 py-2.5 text-left font-semibold">User</th>
                  <th scope="col" className="px-4 py-2.5 text-left font-semibold">Action</th>
                  <th scope="col" className="px-5 py-2.5 text-left font-semibold">Entity</th>
                </tr>
              </thead>
              <tbody>
                {(auditLogs.data?.data ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">
                      No activity recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.data!.data.map((log) => (
                    <tr key={log.id} className="border-b border-border/70 last:border-0">
                      <td className="px-5 py-3 text-xs text-muted-foreground">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td className="px-4 py-3">{log.user?.fullName ?? 'System'}</td>
                      <td className="px-4 py-3 font-mono text-xs">{log.action}</td>
                      <td className="px-5 py-3 text-muted-foreground">{log.entity}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
