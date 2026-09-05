import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FilePlus2,
  FileSpreadsheet,
  PenLine,
  UserCheck,
  Users,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { teacherService } from '@/services';
import { errorMessage } from '@/services/api';
import { formatDate, surnameWithTitle } from '@/utils/format';
import { Badge, Button, Card } from '@/components/ui/primitives';
import { ErrorState, PageSkeleton } from '@/components/ui/states';
import { StatCard } from '@/components/StatCard';

const QUICK_ACTIONS = [
  { to: '/teacher/attendance', label: 'Mark Attendance', icon: UserCheck },
  { to: '/teacher/tests?new=1', label: 'Create Test', icon: FilePlus2 },
  { to: '/teacher/tests', label: 'Enter Marks', icon: PenLine },
  { to: '/teacher/assignments?new=1', label: 'Create Assignment', icon: FileSpreadsheet },
];

export function TeacherDashboardPage() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['teacher', 'dashboard'],
    queryFn: teacherService.dashboard,
  });

  if (query.isLoading) return <PageSkeleton />;
  if (query.isError || !query.data) {
    return (
      <Card>
        <ErrorState message={errorMessage(query.error)} onRetry={() => void query.refetch()} />
      </Card>
    );
  }

  const { kpis, subjects, recentTests, upcomingDeadlines } = query.data;
  const displayName = surnameWithTitle(user?.fullName) || 'there';

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-[1.75rem]">
          Welcome back, {displayName}! <span aria-hidden="true">👋</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your teaching load and what needs attention today.
        </p>
      </header>

      <section aria-label="Key figures" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Assigned Subjects"
          value={kpis.assignedSubjects}
          icon={BookOpen}
          tone="primary"
          subtitle="Across all semesters and sections"
        />
        <StatCard
          label="Total Students"
          value={kpis.totalStudents}
          icon={Users}
          tone="success"
          subtitle="Unique students you teach"
        />
        <StatCard
          label="Attendance Pending"
          value={kpis.attendancePending}
          icon={UserCheck}
          tone={kpis.attendancePending > 0 ? 'warning' : 'success'}
          subtitle={
            kpis.attendancePending > 0
              ? 'Subjects not yet marked today'
              : 'All subjects marked today'
          }
        />
        <StatCard
          label="Pending Grading"
          value={kpis.pendingGrading}
          icon={ClipboardList}
          tone={kpis.pendingGrading > 0 ? 'assignment' : 'success'}
          subtitle="Submissions awaiting marks"
        />
      </section>

      <section aria-label="Quick actions" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {QUICK_ACTIONS.map((action) => (
          <Button key={action.label} variant="outline" size="lg" className="justify-start" asChild>
            <Link to={action.to}>
              <action.icon />
              {action.label}
            </Link>
          </Button>
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between p-5 pb-3">
            <div>
              <h2 className="text-base font-semibold tracking-tight">Today's Classes</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Attendance status for each of your subjects.
              </p>
            </div>
          </div>
          <div className="divide-y divide-border border-t border-border">
            {subjects.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                No subjects assigned to you yet.
              </p>
            ) : (
              subjects.map((subject) => (
                <div key={subject.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{subject.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {subject.code} · {subject.semester} · Section {subject.section} ·{' '}
                      {subject.studentCount} students
                    </p>
                  </div>
                  {subject.attendanceMarkedToday ? (
                    <Badge tone="success">
                      <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                      Marked
                    </Badge>
                  ) : (
                    <Badge tone="warning">Pending</Badge>
                  )}
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/teacher/attendance?subjectId=${subject.id}`}>
                      {subject.attendanceMarkedToday ? 'Edit' : 'Mark'}
                    </Link>
                  </Button>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <div className="p-5 pb-3">
            <h2 className="text-base font-semibold tracking-tight">Upcoming Deadlines</h2>
          </div>
          <div className="divide-y divide-border border-t border-border">
            {upcomingDeadlines.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                No assignment deadlines ahead.
              </p>
            ) : (
              upcomingDeadlines.map((item) => (
                <div key={item.id} className="flex items-start gap-3 px-5 py-3.5">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-assignment-soft text-assignment">
                    <CalendarClock className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.subject} · due {formatDate(item.dueDate)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between p-5 pb-3">
          <h2 className="text-base font-semibold tracking-tight">Recent Tests</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/teacher/tests">All tests</Link>
          </Button>
        </div>
        <div className="overflow-x-auto border-t border-border">
          {recentTests.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">
              You have not created any tests yet.
            </p>
          ) : (
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="px-5 py-2.5 text-left font-semibold">Subject</th>
                  <th scope="col" className="px-4 py-2.5 text-left font-semibold">Test</th>
                  <th scope="col" className="px-4 py-2.5 text-left font-semibold">Date</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-semibold">Max</th>
                  <th scope="col" className="px-4 py-2.5 text-left font-semibold">Status</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {recentTests.map((test) => (
                  <tr key={test.id} className="border-b border-border/70 last:border-0 hover:bg-muted/30">
                    <td className="px-5 py-3 font-medium">{test.subject}</td>
                    <td className="px-4 py-3 text-muted-foreground">{test.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(test.testDate)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{test.maxMarks}</td>
                    <td className="px-4 py-3">
                      <Badge tone={test.isPublished ? 'success' : 'warning'}>
                        {test.isPublished ? 'Published' : `${test.marksEntered} entered`}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button size="sm" variant="ghost" asChild>
                        <Link to={`/teacher/tests?testId=${test.id}`}>Enter marks</Link>
                      </Button>
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
