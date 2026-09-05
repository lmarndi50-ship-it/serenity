import { useQuery } from '@tanstack/react-query';
import { BookOpen, Mail } from 'lucide-react';
import { studentService } from '@/services';
import { errorMessage } from '@/services/api';
import { healthLabel, healthTone } from '@/utils/format';
import { Badge, Card, Progress, Skeleton } from '@/components/ui/primitives';
import { EmptyState, ErrorState } from '@/components/ui/states';

export function StudentSubjectsPage() {
  const subjects = useQuery({
    queryKey: ['student', 'subjects'],
    queryFn: studentService.subjects,
  });

  // Attendance comes from the same source the dashboard uses, so the two agree.
  const attendance = useQuery({
    queryKey: ['student', 'attendance', {}],
    queryFn: () => studentService.attendance(),
    select: (data) => data.subjects,
  });

  const attendanceBySubject = new Map((attendance.data ?? []).map((a) => [a.subjectId, a]));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Subjects</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything you are enrolled in this semester.
        </p>
      </header>

      {subjects.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="mt-2 h-4 w-24" />
              <Skeleton className="mt-5 h-2 w-full" />
              <Skeleton className="mt-4 h-4 w-32" />
            </Card>
          ))}
        </div>
      ) : subjects.isError ? (
        <Card>
          <ErrorState message={errorMessage(subjects.error)} onRetry={() => void subjects.refetch()} />
        </Card>
      ) : (subjects.data ?? []).length === 0 ? (
        <Card>
          <EmptyState
            title="No subjects yet"
            message="You have not been enrolled in any subjects for this semester."
            icon={<BookOpen className="h-5 w-5" />}
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {subjects.data!.map((subject) => {
            const stats = attendanceBySubject.get(subject.id);
            return (
              <Card key={subject.id} interactive className="flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold tracking-tight">
                      {subject.name}
                    </h2>
                    <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                      {subject.code} · {subject.credits} credits
                    </p>
                  </div>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
                    <BookOpen className="h-[18px] w-[18px]" aria-hidden="true" />
                  </span>
                </div>

                <div className="mt-4 space-y-1 text-sm">
                  <p className="font-medium">{subject.faculty}</p>
                  {subject.facultyEmail ? (
                    <a
                      href={`mailto:${subject.facultyEmail}`}
                      className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                    >
                      <Mail className="h-3 w-3" aria-hidden="true" />
                      {subject.facultyEmail}
                    </a>
                  ) : null}
                </div>

                {stats ? (
                  <div className="mt-auto pt-5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Attendance</span>
                      <span className="flex items-center gap-2">
                        <strong className="tabular-nums">{stats.percentage}%</strong>
                        <Badge tone={healthTone(stats.status)}>{healthLabel(stats.status)}</Badge>
                      </span>
                    </div>
                    <Progress
                      value={stats.percentage}
                      tone={healthTone(stats.status)}
                      className="mt-2"
                      label={`${subject.name} attendance`}
                    />
                    <p className="mt-2 text-xs text-muted-foreground">
                      {stats.present} present of {stats.total} classes held ·{' '}
                      {subject.totalPlannedClasses} planned
                    </p>
                  </div>
                ) : (
                  <p className="mt-auto pt-5 text-xs text-muted-foreground">
                    No attendance recorded yet.
                  </p>
                )}

                <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
                  {subject.semester} · Section {subject.section}
                </p>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
