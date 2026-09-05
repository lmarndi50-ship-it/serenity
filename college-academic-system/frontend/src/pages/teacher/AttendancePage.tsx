import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCheck, Save, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { teacherService } from '@/services';
import { errorMessage } from '@/services/api';
import { cn } from '@/lib/utils';
import type { AttendanceStatus } from '@/types';
import { Badge, Button, Card, Label, Select } from '@/components/ui/primitives';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/states';

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; activeClass: string }[] = [
  { value: 'PRESENT', label: 'Present', activeClass: 'bg-success text-white border-success' },
  { value: 'ABSENT', label: 'Absent', activeClass: 'bg-danger text-white border-danger' },
  { value: 'LEAVE', label: 'Leave', activeClass: 'bg-warning text-white border-warning' },
];

const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

export function TeacherAttendancePage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const today = new Date().toISOString().slice(0, 10);
  const [subjectId, setSubjectId] = useState(searchParams.get('subjectId') ?? '');
  const [date, setDate] = useState(today);
  const [period, setPeriod] = useState(1);
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>({});
  const [dirty, setDirty] = useState(false);

  const subjects = useQuery({ queryKey: ['teacher', 'subjects'], queryFn: teacherService.subjects });

  // Default to the first subject once the list arrives.
  useEffect(() => {
    if (!subjectId && subjects.data?.length) setSubjectId(subjects.data[0].id);
  }, [subjects.data, subjectId]);

  const sheet = useQuery({
    queryKey: ['teacher', 'attendance-sheet', subjectId, date, period],
    queryFn: () => teacherService.attendanceSheet(subjectId, date, period),
    enabled: !!subjectId && !!date,
  });

  // Reset the working copy whenever a different sheet loads.
  useEffect(() => {
    if (!sheet.data) return;
    const next: Record<string, AttendanceStatus> = {};
    for (const student of sheet.data.students) {
      if (student.status) next[student.studentId] = student.status;
    }
    setMarks(next);
    setDirty(false);
  }, [sheet.data]);

  const save = useMutation({
    mutationFn: () =>
      teacherService.markAttendance({
        subjectId,
        date,
        period,
        entries: Object.entries(marks).map(([studentId, status]) => ({ studentId, status })),
      }),
    onSuccess: (result) => {
      toast.success(`Attendance saved for ${result.saved} students`);
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ['teacher'] });
    },
    onError: (error) => toast.error(errorMessage(error, 'Could not save attendance')),
  });

  const students = sheet.data?.students ?? [];
  const marked = Object.keys(marks).length;

  const tally = useMemo(() => {
    const counts = { PRESENT: 0, ABSENT: 0, LEAVE: 0 };
    for (const status of Object.values(marks)) counts[status] += 1;
    return counts;
  }, [marks]);

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    setMarks((current) => ({ ...current, [studentId]: status }));
    setDirty(true);
  };

  const markAllPresent = () => {
    const next: Record<string, AttendanceStatus> = {};
    for (const student of students) next[student.studentId] = 'PRESENT';
    setMarks(next);
    setDirty(true);
  };

  const selectedSubject = subjects.data?.find((s) => s.id === subjectId);
  const isFuture = date > today;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Mark Attendance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a subject, date and period, then record each student.
        </p>
      </header>

      <Card className="p-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="att-subject">Subject</Label>
            <Select
              id="att-subject"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              disabled={subjects.isLoading}
            >
              {subjects.isLoading ? <option>Loading…</option> : null}
              {(subjects.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.semester}, Section {s.section}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="att-date">Date</Label>
            <input
              id="att-date"
              type="date"
              value={date}
              max={today}
              onChange={(e) => setDate(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="att-period">Period</Label>
            <Select
              id="att-period"
              value={period}
              onChange={(e) => setPeriod(Number(e.target.value))}
            >
              {PERIODS.map((p) => (
                <option key={p} value={p}>
                  Period {p}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {selectedSubject ? (
          <p className="mt-4 text-xs text-muted-foreground">
            {selectedSubject.department} · {selectedSubject.studentCount} enrolled students
            {sheet.data?.alreadyMarked ? ' · attendance already recorded for this slot — saving will update it' : ''}
          </p>
        ) : null}
      </Card>

      {isFuture ? (
        <Card>
          <EmptyState
            title="That date is in the future"
            message="Attendance can only be recorded for today or an earlier date."
            icon={<UserCheck className="h-5 w-5" />}
          />
        </Card>
      ) : (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 p-5 pb-3">
            <div>
              <h2 className="text-base font-semibold tracking-tight">Class Roster</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {marked} of {students.length} marked
                {marked > 0
                  ? ` · ${tally.PRESENT} present, ${tally.ABSENT} absent, ${tally.LEAVE} leave`
                  : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={markAllPresent}
                disabled={students.length === 0}
              >
                <CheckCheck />
                Mark All Present
              </Button>
              <Button
                size="sm"
                onClick={() => save.mutate()}
                disabled={marked === 0 || save.isPending || !dirty}
              >
                <Save />
                {save.isPending ? 'Saving…' : 'Save Attendance'}
              </Button>
            </div>
          </div>

          {sheet.isLoading ? (
            <TableSkeleton rows={8} columns={4} />
          ) : sheet.isError ? (
            <ErrorState message={errorMessage(sheet.error)} onRetry={() => void sheet.refetch()} />
          ) : students.length === 0 ? (
            <EmptyState
              title="No students enrolled"
              message="Nobody is enrolled in this subject yet."
              icon={<UserCheck className="h-5 w-5" />}
            />
          ) : (
            <div className="overflow-x-auto border-t border-border">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                    <th scope="col" className="px-5 py-2.5 text-left font-semibold">Roll No</th>
                    <th scope="col" className="px-4 py-2.5 text-left font-semibold">Student</th>
                    <th scope="col" className="px-4 py-2.5 text-center font-semibold">Attendance</th>
                    <th scope="col" className="px-5 py-2.5 text-right font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => {
                    const current = marks[student.studentId];
                    return (
                      <tr
                        key={student.studentId}
                        className={cn(
                          'border-b border-border/70 last:border-0 transition-colors',
                          !current && 'bg-warning-soft/30',
                        )}
                      >
                        <td className="px-5 py-3 font-mono text-xs font-semibold">
                          {student.rollNumber}
                        </td>
                        <td className="px-4 py-3 font-medium">{student.name}</td>
                        <td className="px-4 py-3">
                          <div
                            className="mx-auto flex w-fit rounded-md border border-border p-0.5"
                            role="radiogroup"
                            aria-label={`Attendance for ${student.name}`}
                          >
                            {STATUS_OPTIONS.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                role="radio"
                                aria-checked={current === option.value}
                                onClick={() => setStatus(student.studentId, option.value)}
                                className={cn(
                                  'rounded-sm border border-transparent px-3 py-1.5 text-xs font-semibold transition-colors',
                                  current === option.value
                                    ? option.activeClass
                                    : 'text-muted-foreground hover:bg-muted',
                                )}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right">
                          {current ? (
                            <Badge
                              tone={
                                current === 'PRESENT'
                                  ? 'success'
                                  : current === 'ABSENT'
                                    ? 'danger'
                                    : 'warning'
                              }
                            >
                              {current.charAt(0) + current.slice(1).toLowerCase()}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Not marked</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
