import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  FileSpreadsheet,
  Target,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { studentService } from '@/services';
import { errorMessage } from '@/services/api';
import {
  attendanceTone,
  eventTone,
  formatDate,
  healthLabel,
  greetingName,
  healthTone,
  marksTone,
  splitDateBadge,
  submissionLabel,
  submissionTone,
} from '@/utils/format';
import { cn } from '@/lib/utils';
import { Badge, Button, Card, Progress, Select } from '@/components/ui/primitives';
import { ErrorState, PageSkeleton } from '@/components/ui/states';
import { StatCard } from '@/components/StatCard';
import { AttendanceDonut, AttendanceTrendChart, ChartCard, PerformanceDonut } from '@/components/charts';

const RANGE_LABELS: Record<string, string> = {
  '4w': 'Past 4 Weeks',
  '8w': 'Past 8 Weeks',
  semester: 'Current Semester',
};

export function StudentDashboardPage() {
  const { user } = useAuth();
  const [range, setRange] = useState<'4w' | '8w' | 'semester'>('8w');

  const dashboard = useQuery({
    queryKey: ['student', 'dashboard'],
    queryFn: studentService.dashboard,
  });

  // The dashboard ships an 8-week trend; other ranges are fetched on demand.
  const trend = useQuery({
    queryKey: ['student', 'trend', range],
    queryFn: () => studentService.attendanceTrend(range),
    enabled: range !== '8w',
  });

  if (dashboard.isLoading) return <PageSkeleton />;

  if (dashboard.isError || !dashboard.data) {
    return (
      <Card>
        <ErrorState
          message={errorMessage(dashboard.error)}
          onRetry={() => void dashboard.refetch()}
        />
      </Card>
    );
  }

  const { summary, subjectAttendance, upcoming, recentTests, recentAssignments } = dashboard.data;
  const trendData = range === '8w' ? dashboard.data.attendanceTrend : (trend.data ?? []);
  const thresholds = summary.thresholds;

  const assignmentScore =
    summary.assignments.graded > 0
      ? summary.assignments.marksPercentage
      : summary.assignments.submissionRate;

  const firstName = greetingName(user?.fullName);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-[1.75rem]">
            Welcome back, {firstName}! <span aria-hidden="true">👋</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Here's your academic overview.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/calendar">
              <CalendarDays />
              View Calendar
            </Link>
          </Button>
        </div>
      </header>

      {/* KPI cards */}
      <section aria-label="Key figures" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Overall Attendance"
          value={`${summary.attendance.percentage}%`}
          icon={UserCheck}
          tone={attendanceTone(summary.attendance.percentage, thresholds)}
          progress={summary.attendance.percentage}
          subtitle={
            <>
              Present: <strong className="text-foreground">{summary.attendance.present}</strong> /{' '}
              {summary.attendance.considered} Classes
              {summary.attendance.leave > 0 ? ` · ${summary.attendance.leave} on leave` : ''}
            </>
          }
        />
        <StatCard
          label="Class Test Average"
          value={`${summary.tests.percentage}%`}
          icon={ClipboardList}
          tone={marksTone(summary.tests.percentage)}
          progress={summary.tests.percentage}
          subtitle={
            summary.tests.count > 0
              ? `Average of ${summary.tests.count} test${summary.tests.count === 1 ? '' : 's'} (${summary.tests.obtained}/${summary.tests.max})`
              : 'No published tests yet'
          }
        />
        <StatCard
          label="Assignments"
          value={`${summary.assignments.submitted} / ${summary.assignments.total}`}
          icon={FileSpreadsheet}
          tone="assignment"
          progress={summary.assignments.submissionRate}
          subtitle={
            <>
              {summary.assignments.submissionRate}% Submitted
              {summary.assignments.pending > 0 ? ` · ${summary.assignments.pending} pending` : ''}
            </>
          }
        />
        <StatCard
          label="Overall Score"
          value={`${summary.overall}%`}
          icon={Target}
          tone={marksTone(summary.overall)}
          progress={summary.overall}
          subtitle={`Attendance ${Math.round(summary.weights.attendance * 100)}% + Tests ${Math.round(
            summary.weights.tests * 100,
          )}% + Assignments ${Math.round(summary.weights.assignments * 100)}%`}
        />
      </section>

      {/* Attendance overview */}
      <section aria-label="Attendance overview" className="grid gap-4 lg:grid-cols-5">
        <ChartCard
          title="Attendance Overview"
          description="Across all enrolled subjects"
          className="lg:col-span-2"
        >
          <AttendanceDonut
            present={summary.attendance.present}
            absent={summary.attendance.absent}
            leave={summary.attendance.leave}
            percentage={summary.attendance.percentage}
          />
        </ChartCard>

        <ChartCard
          title="Attendance Trend"
          description="Weekly attendance percentage"
          className="lg:col-span-3"
          action={
            <Select
              value={range}
              onChange={(e) => setRange(e.target.value as typeof range)}
              aria-label="Trend range"
              className="h-9 w-[168px] text-xs"
            >
              {Object.entries(RANGE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          }
        >
          {trend.isLoading && range !== '8w' ? (
            <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
              Loading trend…
            </div>
          ) : (
            <AttendanceTrendChart data={trendData} threshold={thresholds.good} />
          )}
        </ChartCard>
      </section>

      {/* Subject attendance + upcoming */}
      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between gap-3 p-5 pb-3">
            <div>
              <h2 className="text-base font-semibold tracking-tight">Subject-wise Attendance</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Minimum required: {thresholds.good}%
              </p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/attendance">
                Details
                <ArrowRight />
              </Link>
            </Button>
          </div>
          <div className="divide-y divide-border border-t border-border">
            {subjectAttendance.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                No subjects enrolled yet.
              </p>
            ) : (
              subjectAttendance.map((subject) => (
                <div key={subject.subjectId} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold">{subject.subjectName}</p>
                      <Badge tone={healthTone(subject.status)}>{healthLabel(subject.status)}</Badge>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {subject.facultyName} · {subject.present}/{subject.total} classes
                    </p>
                    <Progress
                      value={subject.percentage}
                      tone={healthTone(subject.status)}
                      className="mt-2"
                      label={`${subject.subjectName} attendance`}
                    />
                  </div>
                  <p
                    className={cn(
                      'w-16 shrink-0 text-right text-lg font-bold tabular-nums',
                      subject.status === 'GOOD'
                        ? 'text-success'
                        : subject.status === 'WARNING'
                          ? 'text-warning'
                          : 'text-danger',
                    )}
                  >
                    {subject.percentage}%
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between p-5 pb-3">
            <h2 className="text-base font-semibold tracking-tight">Upcoming</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/calendar">View Calendar</Link>
            </Button>
          </div>
          <div className="divide-y divide-border border-t border-border">
            {upcoming.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                Nothing scheduled in the coming weeks.
              </p>
            ) : (
              upcoming.map((item) => {
                const badge = splitDateBadge(item.date);
                return (
                  <div key={item.id} className="flex items-start gap-3 px-5 py-3.5">
                    <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-md bg-muted">
                      <span className="text-base font-bold leading-none">{badge.day}</span>
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {badge.month}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{item.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge tone={eventTone(item.type)}>
                          {item.type.charAt(0) + item.type.slice(1).toLowerCase()}
                        </Badge>
                        {item.subject ? (
                          <span className="truncate text-xs text-muted-foreground">
                            {item.subject}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </section>

      {/* Recent marks, assignments, overall performance */}
      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between p-5 pb-3">
            <h2 className="text-base font-semibold tracking-tight">Recent Class Test Marks</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/tests">
                All tests
                <ArrowRight />
              </Link>
            </Button>
          </div>
          <div className="overflow-x-auto border-t border-border">
            {recentTests.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                No test marks have been published yet.
              </p>
            ) : (
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                    <th scope="col" className="px-5 py-2.5 text-left font-semibold">Subject</th>
                    <th scope="col" className="px-4 py-2.5 text-left font-semibold">Test</th>
                    <th scope="col" className="px-4 py-2.5 text-left font-semibold">Date</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-semibold">Marks</th>
                    <th scope="col" className="px-5 py-2.5 text-right font-semibold">%</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTests.map((row) => (
                    <tr key={row.id} className="border-b border-border/70 last:border-0 hover:bg-muted/30">
                      <td className="px-5 py-3 font-medium">{row.subject}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.testName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(row.testDate)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {row.isAbsent ? 'AB' : `${row.obtainedMarks} / ${row.maxMarks}`}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Badge tone={marksTone(row.percentage)}>{row.percentage}%</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        <ChartCard title="Overall Summary" description="Weighted academic standing">
          <PerformanceDonut
            attendance={summary.attendance.percentage}
            tests={summary.tests.percentage}
            assignments={assignmentScore}
            overall={summary.overall}
            weights={summary.weights}
          />
          <dl className="mt-2 space-y-2 px-3">
            {[
              {
                label: 'Attendance',
                value: summary.attendance.percentage,
                weight: summary.weights.attendance,
                color: 'bg-primary',
              },
              {
                label: 'Class Tests',
                value: summary.tests.percentage,
                weight: summary.weights.tests,
                color: 'bg-success',
              },
              {
                label: 'Assignments',
                value: assignmentScore,
                weight: summary.weights.assignments,
                color: 'bg-assignment',
              },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-3 text-sm">
                <dt className="flex items-center gap-2 text-muted-foreground">
                  <span className={cn('h-2.5 w-2.5 rounded-full', row.color)} aria-hidden="true" />
                  {row.label}
                  <span className="text-xs">({Math.round(row.weight * 100)}%)</span>
                </dt>
                <dd className="font-semibold tabular-nums">{row.value}%</dd>
              </div>
            ))}
          </dl>
        </ChartCard>
      </section>

      <Card>
        <div className="flex items-center justify-between p-5 pb-3">
          <h2 className="text-base font-semibold tracking-tight">Recent Assignments</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/assignments">
              All assignments
              <ArrowRight />
            </Link>
          </Button>
        </div>
        <div className="overflow-x-auto border-t border-border">
          {recentAssignments.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">
              No assignments have been set yet.
            </p>
          ) : (
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="px-5 py-2.5 text-left font-semibold">Subject</th>
                  <th scope="col" className="px-4 py-2.5 text-left font-semibold">Assignment</th>
                  <th scope="col" className="px-4 py-2.5 text-left font-semibold">Due date</th>
                  <th scope="col" className="px-4 py-2.5 text-left font-semibold">Status</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-semibold">Marks</th>
                </tr>
              </thead>
              <tbody>
                {recentAssignments.map((row) => (
                  <tr key={row.id} className="border-b border-border/70 last:border-0 hover:bg-muted/30">
                    <td className="px-5 py-3 font-medium">{row.subject}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(row.dueDate)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={submissionTone(row.status)}>{submissionLabel(row.status)}</Badge>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      {row.obtainedMarks !== null ? `${row.obtainedMarks} / ${row.maxMarks}` : `— / ${row.maxMarks}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
