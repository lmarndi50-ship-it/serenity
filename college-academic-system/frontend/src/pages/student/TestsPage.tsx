import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarClock, ClipboardList, FileSpreadsheet, FileText, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { studentService } from '@/services';
import { downloadFile, errorMessage } from '@/services/api';
import { formatDate, marksTone, CHART_COLORS } from '@/utils/format';
import { Badge, Button, Card } from '@/components/ui/primitives';
import { ErrorState, PageSkeleton } from '@/components/ui/states';
import { DataTable, type Column } from '@/components/DataTable';
import { ChartCard, SimpleLineChart } from '@/components/charts';
import { StatCard } from '@/components/StatCard';
import type { TestMarkRow } from '@/types';

export function StudentTestsPage() {
  const [downloading, setDownloading] = useState(false);

  const query = useQuery({
    queryKey: ['student', 'tests'],
    queryFn: studentService.tests,
  });

  const exportReport = async (format: 'pdf' | 'excel') => {
    setDownloading(true);
    try {
      await downloadFile(
        '/reports/marks',
        { format },
        `class-test-marks.${format === 'pdf' ? 'pdf' : 'xlsx'}`,
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

  const { marks, average, upcoming } = query.data;

  const best = marks.reduce<TestMarkRow | null>(
    (top, row) => (!top || row.percentage > top.percentage ? row : top),
    null,
  );

  // Chronological, so the trend line reads left to right.
  const trend = [...marks]
    .sort((a, b) => a.testDate.localeCompare(b.testDate))
    .map((m) => ({ name: `${m.subjectCode} ${m.testName.replace('Class Test ', 'T')}`, value: m.percentage }));

  const columns: Column<TestMarkRow>[] = [
    {
      key: 'subject',
      header: 'Subject',
      sortValue: (r) => r.subject,
      render: (r) => (
        <div className="min-w-0">
          <p className="truncate font-semibold">{r.subject}</p>
          <p className="text-xs text-muted-foreground">{r.subjectCode}</p>
        </div>
      ),
    },
    { key: 'testName', header: 'Test', sortValue: (r) => r.testName },
    {
      key: 'testDate',
      header: 'Date',
      sortValue: (r) => r.testDate,
      render: (r) => formatDate(r.testDate),
    },
    {
      key: 'faculty',
      header: 'Faculty',
      hideOnMobile: true,
      render: (r) => <span className="text-muted-foreground">{r.faculty ?? '—'}</span>,
    },
    {
      key: 'obtainedMarks',
      header: 'Marks',
      sortValue: (r) => r.obtainedMarks,
      className: 'tabular-nums font-medium',
      render: (r) => (r.isAbsent ? <Badge tone="danger">Absent</Badge> : r.obtainedMarks),
    },
    {
      key: 'maxMarks',
      header: 'Out of',
      className: 'tabular-nums text-muted-foreground',
      render: (r) => r.maxMarks,
    },
    {
      key: 'percentage',
      header: 'Percentage',
      sortValue: (r) => r.percentage,
      render: (r) => <Badge tone={marksTone(r.percentage)}>{r.percentage}%</Badge>,
    },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Class Test Marks</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Published internal assessment results across all subjects.
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

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Test Average"
          value={`${average}%`}
          icon={TrendingUp}
          tone={marksTone(average)}
          progress={average}
          subtitle={`Across ${marks.length} published test${marks.length === 1 ? '' : 's'}`}
        />
        <StatCard
          label="Best Result"
          value={best ? `${best.percentage}%` : '—'}
          icon={ClipboardList}
          tone="success"
          subtitle={best ? `${best.subject} · ${best.testName}` : 'No results yet'}
        />
        <StatCard
          label="Upcoming Tests"
          value={upcoming.length}
          icon={CalendarClock}
          tone={upcoming.length > 0 ? 'warning' : 'neutral'}
          subtitle={
            upcoming[0]
              ? `Next: ${upcoming[0].subject} on ${formatDate(upcoming[0].testDate)}`
              : 'Nothing scheduled'
          }
        />
      </section>

      {trend.length > 1 && (
        <ChartCard title="Performance Trend" description="Percentage in each test, oldest first">
          <SimpleLineChart data={trend} height={240} color={CHART_COLORS.primary} />
        </ChartCard>
      )}

      <Card>
        <div className="p-5 pb-0">
          <h2 className="text-base font-semibold tracking-tight">Recent Class Test Marks</h2>
        </div>
        <DataTable
          columns={columns}
          rows={marks}
          rowKey={(r) => r.id}
          pageSize={10}
          searchable={(r) => `${r.subject} ${r.subjectCode} ${r.testName}`}
          searchPlaceholder="Search by subject or test…"
          emptyTitle="No marks published yet"
          emptyMessage="Your results will appear here once faculty publish them."
        />
      </Card>

      {upcoming.length > 0 && (
        <Card>
          <div className="p-5 pb-3">
            <h2 className="text-base font-semibold tracking-tight">Upcoming Tests</h2>
          </div>
          <ul className="divide-y divide-border border-t border-border">
            {upcoming.map((test) => (
              <li key={test.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {test.subject} — {test.name}
                  </p>
                  <p className="text-xs text-muted-foreground">Maximum marks: {test.maxMarks}</p>
                </div>
                <Badge tone="primary">{formatDate(test.testDate)}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
