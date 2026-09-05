import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  Building2,
  FileSpreadsheet,
  GraduationCap,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import { adminService } from '@/services';
import { errorMessage } from '@/services/api';
import { attendanceTone, marksTone, CHART_COLORS } from '@/utils/format';
import { Card } from '@/components/ui/primitives';
import { ErrorState, PageSkeleton } from '@/components/ui/states';
import { StatCard } from '@/components/StatCard';
import {
  ChartCard,
  DistributionChart,
  GroupedBarChart,
  HorizontalBarChart,
  TrendAreaChart,
} from '@/components/charts';
import { submissionLabel } from '@/utils/format';
import type { SubmissionStatus } from '@/types';

export function AdminDashboardPage() {
  const query = useQuery({ queryKey: ['admin', 'analytics'], queryFn: adminService.analytics });

  if (query.isLoading) return <PageSkeleton />;
  if (query.isError || !query.data) {
    return (
      <Card>
        <ErrorState message={errorMessage(query.error)} onRetry={() => void query.refetch()} />
      </Card>
    );
  }

  const {
    kpis,
    departmentAttendance,
    semesterPerformance,
    monthlyAttendance,
    assignmentSubmission,
    testDistribution,
  } = query.data;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-[1.75rem]">Institute Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every figure below is computed from live attendance, marks and submission records.
        </p>
      </header>

      <section aria-label="Key figures" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Total Students"
          value={kpis.totalStudents}
          icon={Users}
          tone="primary"
          subtitle={`Across ${kpis.totalDepartments} departments`}
        />
        <StatCard
          label="Total Teachers"
          value={kpis.totalTeachers}
          icon={GraduationCap}
          tone="success"
          subtitle="Active faculty members"
        />
        <StatCard
          label="Total Subjects"
          value={kpis.totalSubjects}
          icon={BookOpen}
          tone="assignment"
          subtitle="Running this academic session"
        />
        <StatCard
          label="Average Attendance"
          value={`${kpis.averageAttendance}%`}
          icon={UserCheck}
          tone={attendanceTone(kpis.averageAttendance)}
          progress={kpis.averageAttendance}
          subtitle="Institute-wide, leave excluded"
        />
        <StatCard
          label="Average Test Score"
          value={`${kpis.averageTestScore}%`}
          icon={TrendingUp}
          tone={marksTone(kpis.averageTestScore)}
          progress={kpis.averageTestScore}
          subtitle="Across every recorded class test"
        />
        <StatCard
          label="Assignment Submission"
          value={`${kpis.assignmentSubmissionRate}%`}
          icon={FileSpreadsheet}
          tone="assignment"
          progress={kpis.assignmentSubmissionRate}
          subtitle="Submitted, late or graded"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Department-wise Attendance"
          description="Average attendance percentage by department"
        >
          <HorizontalBarChart
            data={departmentAttendance.map((d) => ({ name: d.department, value: d.percentage }))}
          />
        </ChartCard>

        <ChartCard
          title="Semester-wise Performance"
          description="Attendance against class test average"
        >
          <GroupedBarChart
            data={semesterPerformance.map((s) => ({
              name: s.semester,
              attendance: s.attendance,
              tests: s.tests,
            }))}
            series={[
              { key: 'attendance', label: 'Attendance', color: CHART_COLORS.primary },
              { key: 'tests', label: 'Class tests', color: CHART_COLORS.success },
            ]}
          />
        </ChartCard>

        <ChartCard title="Monthly Attendance Trend" description="Institute-wide, month by month">
          <TrendAreaChart
            data={monthlyAttendance.map((m) => ({ name: m.month, value: m.percentage }))}
          />
        </ChartCard>

        <ChartCard
          title="Test Performance Distribution"
          description="How many results fall in each band"
        >
          <DistributionChart
            data={testDistribution.map((b) => ({ name: b.band, value: b.count }))}
          />
        </ChartCard>
      </section>

      <Card>
        <div className="p-5 pb-3">
          <h2 className="text-base font-semibold tracking-tight">Assignment Submission Breakdown</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Every submission row across the institute.
          </p>
        </div>
        <div className="grid gap-3 border-t border-border p-5 sm:grid-cols-3 xl:grid-cols-5">
          {assignmentSubmission.map((row) => {
            const total = assignmentSubmission.reduce((a, r) => a + r.count, 0);
            const share = total ? Math.round((row.count / total) * 1000) / 10 : 0;
            return (
              <div key={row.status} className="rounded-md border border-border p-4">
                <p className="text-xs font-medium text-muted-foreground">
                  {submissionLabel(row.status as SubmissionStatus)}
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums">{row.count}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{share}% of all submissions</p>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
            <Building2 className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-base font-semibold tracking-tight">Departments at a glance</h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {departmentAttendance.map((d) => (
                <li
                  key={d.department}
                  className="flex items-center justify-between gap-3 rounded-md bg-muted/50 px-3 py-2 text-sm"
                >
                  <span className="min-w-0 truncate font-medium">{d.department}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {d.students} students · <strong className="text-foreground">{d.percentage}%</strong>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
