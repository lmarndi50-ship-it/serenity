import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileSpreadsheet, FileText, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { studentService } from '@/services';
import { downloadFile, errorMessage } from '@/services/api';
import { attendanceTone, formatDate, healthLabel, healthTone } from '@/utils/format';
import { cn } from '@/lib/utils';
import { Badge, Button, Card, Input, Label, Progress, Select } from '@/components/ui/primitives';
import { ErrorState, PageSkeleton } from '@/components/ui/states';
import { DataTable, type Column } from '@/components/DataTable';
import { AttendanceDonut, ChartCard } from '@/components/charts';
import { StatCard } from '@/components/StatCard';
import type { AttendanceRecord, SubjectAttendanceRow } from '@/types';

export function StudentAttendancePage() {
  const [subjectId, setSubjectId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [downloading, setDownloading] = useState(false);

  const filters = useMemo(
    () => ({
      ...(subjectId ? { subjectId } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    }),
    [subjectId, from, to],
  );

  const query = useQuery({
    queryKey: ['student', 'attendance', filters],
    queryFn: () => studentService.attendance(filters),
  });

  // The unfiltered call supplies the subject dropdown, so choosing a subject
  // never empties the list you are choosing from.
  const allSubjects = useQuery({
    queryKey: ['student', 'attendance', 'subjects'],
    queryFn: () => studentService.attendance(),
    select: (data) => data.subjects,
  });

  const exportReport = async (format: 'pdf' | 'excel') => {
    setDownloading(true);
    try {
      await downloadFile(
        '/reports/attendance',
        { format },
        `attendance-report.${format === 'pdf' ? 'pdf' : 'xlsx'}`,
      );
      toast.success('Report downloaded');
    } catch (error) {
      toast.error(errorMessage(error, 'Could not generate the report'));
    } finally {
      setDownloading(false);
    }
  };

  if (query.isLoading) return <PageSkeleton />;

  if (query.isError || !query.data) {
    return (
      <Card>
        <ErrorState message={errorMessage(query.error)} onRetry={() => void query.refetch()} />
      </Card>
    );
  }

  const { subjects, overall, records } = query.data;

  const subjectColumns: Column<SubjectAttendanceRow>[] = [
    {
      key: 'subject',
      header: 'Subject',
      sortValue: (r) => r.subjectName,
      render: (r) => (
        <div className="min-w-0">
          <p className="truncate font-semibold">{r.subjectName}</p>
          <p className="text-xs text-muted-foreground">{r.subjectCode}</p>
        </div>
      ),
    },
    {
      key: 'faculty',
      header: 'Faculty',
      hideOnMobile: true,
      sortValue: (r) => r.facultyName,
      render: (r) => <span className="text-muted-foreground">{r.facultyName}</span>,
    },
    {
      key: 'present',
      header: 'Present',
      sortValue: (r) => r.present,
      className: 'tabular-nums',
      render: (r) => r.present,
    },
    {
      key: 'total',
      header: 'Total',
      sortValue: (r) => r.total,
      className: 'tabular-nums',
      render: (r) => r.total,
    },
    {
      key: 'percentage',
      header: 'Attendance',
      sortValue: (r) => r.percentage,
      render: (r) => (
        <div className="min-w-[120px]">
          <div className="flex items-center justify-between gap-2">
            <span
              className={cn(
                'text-sm font-bold tabular-nums',
                r.status === 'GOOD'
                  ? 'text-success'
                  : r.status === 'WARNING'
                    ? 'text-warning'
                    : 'text-danger',
              )}
            >
              {r.percentage}%
            </span>
          </div>
          <Progress
            value={r.percentage}
            tone={healthTone(r.status)}
            className="mt-1.5"
            label={`${r.subjectName} attendance`}
          />
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (r) => r.percentage,
      render: (r) => <Badge tone={healthTone(r.status)}>{healthLabel(r.status)}</Badge>,
    },
  ];

  const recordColumns: Column<AttendanceRecord>[] = [
    { key: 'date', header: 'Date', sortValue: (r) => r.date, render: (r) => formatDate(r.date) },
    {
      key: 'subject',
      header: 'Subject',
      sortValue: (r) => r.subject,
      render: (r) => <span className="font-medium">{r.subject}</span>,
    },
    {
      key: 'period',
      header: 'Period',
      hideOnMobile: true,
      sortValue: (r) => r.period,
      render: (r) => `Period ${r.period}`,
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (r) => r.status,
      render: (r) => (
        <Badge
          tone={r.status === 'PRESENT' ? 'success' : r.status === 'ABSENT' ? 'danger' : 'warning'}
        >
          {r.status.charAt(0) + r.status.slice(1).toLowerCase()}
        </Badge>
      ),
    },
    {
      key: 'remarks',
      header: 'Remarks',
      hideOnMobile: true,
      render: (r) => <span className="text-muted-foreground">{r.remarks ?? '—'}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attendance</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Subject-wise attendance and the full class register.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => exportReport('pdf')} disabled={downloading}>
            <FileText />
            Export PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportReport('excel')} disabled={downloading}>
            <FileSpreadsheet />
            Export Excel
          </Button>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-2">
          <StatCard
            label="Overall Attendance"
            value={`${overall.percentage}%`}
            icon={UserCheck}
            tone={attendanceTone(overall.percentage)}
            progress={overall.percentage}
            subtitle={`${overall.present} present of ${overall.considered} counted classes`}
          />
          <StatCard
            label="Classes Missed"
            value={overall.absent}
            icon={Download}
            tone={overall.absent > 0 ? 'danger' : 'success'}
            subtitle={`${overall.leave} approved leave${overall.leave === 1 ? '' : 's'} (not counted)`}
          />
          <Card className="p-5 sm:col-span-2">
            <h2 className="text-sm font-semibold">Filters</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="filter-subject">Subject</Label>
                <Select
                  id="filter-subject"
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                >
                  <option value="">All subjects</option>
                  {(allSubjects.data ?? subjects).map((s) => (
                    <option key={s.subjectId} value={s.subjectId}>
                      {s.subjectName}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="filter-from">From</Label>
                <Input
                  id="filter-from"
                  type="date"
                  value={from}
                  max={to || undefined}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="filter-to">To</Label>
                <Input
                  id="filter-to"
                  type="date"
                  value={to}
                  min={from || undefined}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>
            </div>
            {(subjectId || from || to) && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-3"
                onClick={() => {
                  setSubjectId('');
                  setFrom('');
                  setTo('');
                }}
              >
                Clear filters
              </Button>
            )}
          </Card>
        </div>

        <ChartCard title="Attendance Split" description="Present, absent and leave">
          <AttendanceDonut
            present={overall.present}
            absent={overall.absent}
            leave={overall.leave}
            percentage={overall.percentage}
          />
        </ChartCard>
      </section>

      <Card>
        <div className="p-5 pb-0">
          <h2 className="text-base font-semibold tracking-tight">Subject-wise Attendance</h2>
        </div>
        <DataTable
          columns={subjectColumns}
          rows={subjects}
          rowKey={(r) => r.subjectId}
          pageSize={10}
          emptyTitle="No subjects match these filters"
        />
      </Card>

      <Card>
        <div className="p-5 pb-0">
          <h2 className="text-base font-semibold tracking-tight">Class Register</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Every recorded class, most recent first.
          </p>
        </div>
        <DataTable
          columns={recordColumns}
          rows={records}
          rowKey={(r) => r.id}
          pageSize={12}
          searchable={(r) => `${r.subject} ${r.status} ${r.date}`}
          searchPlaceholder="Search by subject or date…"
          emptyTitle="No attendance records"
          emptyMessage="Nothing has been recorded for the selected filters."
        />
      </Card>
    </div>
  );
}
