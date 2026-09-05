import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, FileSpreadsheet, FileText, Users } from 'lucide-react';
import { toast } from 'sonner';
import { teacherService } from '@/services';
import { downloadFile, errorMessage } from '@/services/api';
import { healthLabel, healthTone, marksTone } from '@/utils/format';
import { Badge, Button, Card, Progress, Skeleton } from '@/components/ui/primitives';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/states';
import { DataTable, type Column } from '@/components/DataTable';
import type { ClassPerformance, TeacherSubject } from '@/types';

type StudentRow = ClassPerformance['students'][number];

export function TeacherSubjectsPage() {
  const [openSubject, setOpenSubject] = useState<TeacherSubject | null>(null);

  const subjects = useQuery({ queryKey: ['teacher', 'subjects'], queryFn: teacherService.subjects });

  const performance = useQuery({
    queryKey: ['teacher', 'performance', openSubject?.id],
    queryFn: () => teacherService.classPerformance(openSubject!.id),
    enabled: !!openSubject,
  });

  const exportClassReport = async (subjectId: string, format: 'pdf' | 'excel') => {
    try {
      await downloadFile(
        '/reports/subject',
        { format, subjectId },
        `class-report.${format === 'pdf' ? 'pdf' : 'xlsx'}`,
      );
      toast.success('Report downloaded');
    } catch (error) {
      toast.error(errorMessage(error, 'Could not generate the report'));
    }
  };

  const columns: Column<StudentRow>[] = [
    {
      key: 'rollNumber',
      header: 'Roll No',
      sortValue: (r) => r.rollNumber,
      render: (r) => <span className="font-mono text-xs font-semibold">{r.rollNumber}</span>,
    },
    { key: 'name', header: 'Student', sortValue: (r) => r.name },
    {
      key: 'attendancePercentage',
      header: 'Attendance',
      sortValue: (r) => r.attendancePercentage,
      render: (r) => (
        <div className="flex items-center gap-2">
          <span className="w-12 tabular-nums font-medium">{r.attendancePercentage}%</span>
          <Badge tone={healthTone(r.attendanceStatus)}>{healthLabel(r.attendanceStatus)}</Badge>
        </div>
      ),
    },
    {
      key: 'testPercentage',
      header: 'Tests',
      sortValue: (r) => r.testPercentage,
      render: (r) => <Badge tone={marksTone(r.testPercentage)}>{r.testPercentage}%</Badge>,
    },
    {
      key: 'submissionRate',
      header: 'Submissions',
      sortValue: (r) => r.submissionRate,
      render: (r) => (
        <div className="min-w-[100px]">
          <p className="text-xs font-medium">{r.submissionRate}%</p>
          <Progress value={r.submissionRate} tone="assignment" className="mt-1" />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">My Subjects</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Class performance for everything you teach.
        </p>
      </header>

      {subjects.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="mt-3 h-4 w-32" />
              <Skeleton className="mt-6 h-9 w-full" />
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
            title="No subjects assigned"
            message="An administrator has not assigned any subjects to you yet."
            icon={<BookOpen className="h-5 w-5" />}
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {subjects.data!.map((subject) => (
            <Card key={subject.id} interactive className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold tracking-tight">{subject.name}</h2>
                  <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                    {subject.code} · {subject.credits} credits
                  </p>
                </div>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
                  <BookOpen className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
              </div>

              <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[
                  { label: 'Students', value: subject.studentCount },
                  { label: 'Tests', value: subject.testCount },
                  { label: 'Assignments', value: subject.assignmentCount },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-md bg-muted/60 py-2">
                    <dd className="text-lg font-bold tabular-nums">{stat.value}</dd>
                    <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {stat.label}
                    </dt>
                  </div>
                ))}
              </dl>

              <p className="mt-4 text-xs text-muted-foreground">
                {subject.semester} · Section {subject.section} · {subject.department}
              </p>

              <div className="mt-auto flex gap-2 pt-4">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => setOpenSubject(subject)}>
                  <Users />
                  Class performance
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!openSubject} onOpenChange={(open) => !open && setOpenSubject(null)}>
        {openSubject ? (
          <DialogContent
            wide
            title={`${openSubject.name} — Class Performance`}
            description={`${openSubject.semester} · Section ${openSubject.section} · ${openSubject.studentCount} students`}
          >
            {performance.isLoading ? (
              <TableSkeleton rows={6} columns={5} />
            ) : performance.isError || !performance.data ? (
              <ErrorState message={errorMessage(performance.error)} />
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    {
                      label: 'Class attendance',
                      value: `${performance.data.classAttendance}%`,
                      tone: healthTone(
                        performance.data.classAttendance >= 75
                          ? 'GOOD'
                          : performance.data.classAttendance >= 65
                            ? 'WARNING'
                            : 'CRITICAL',
                      ),
                    },
                    {
                      label: 'Test average',
                      value: `${performance.data.classTestAverage}%`,
                      tone: marksTone(performance.data.classTestAverage),
                    },
                    {
                      label: 'Submission rate',
                      value: `${performance.data.averageSubmissionRate}%`,
                      tone: 'assignment' as const,
                    },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-md border border-border p-3">
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                      <p className="mt-1 text-xl font-bold tabular-nums">{stat.value}</p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => exportClassReport(openSubject.id, 'pdf')}
                  >
                    <FileText />
                    Export PDF
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => exportClassReport(openSubject.id, 'excel')}
                  >
                    <FileSpreadsheet />
                    Export Excel
                  </Button>
                </div>

                <div className="-mx-5 border-t border-border">
                  <DataTable
                    columns={columns}
                    rows={performance.data.students}
                    rowKey={(r) => r.studentId}
                    pageSize={8}
                    searchable={(r) => `${r.rollNumber} ${r.name}`}
                    searchPlaceholder="Search students…"
                  />
                </div>
              </div>
            )}
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}
