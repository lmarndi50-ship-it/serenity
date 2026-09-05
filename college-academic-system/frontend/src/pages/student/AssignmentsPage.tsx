import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  FileText,
  Paperclip,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { studentService } from '@/services';
import { downloadFile, errorMessage } from '@/services/api';
import { formatDate, formatDateTime, submissionLabel, submissionTone } from '@/utils/format';
import { Badge, Button, Card, FieldError, Label, Textarea } from '@/components/ui/primitives';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ErrorState, PageSkeleton } from '@/components/ui/states';
import { DataTable, type Column } from '@/components/DataTable';
import { StatCard } from '@/components/StatCard';
import type { AssignmentRow } from '@/types';

const MAX_UPLOAD_MB = 5;

export function StudentAssignmentsPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<AssignmentRow | null>(null);
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const query = useQuery({
    queryKey: ['student', 'assignments'],
    queryFn: studentService.assignments,
  });

  const submit = useMutation({
    mutationFn: (payload: { assignmentId: string; contentText?: string; file?: File }) =>
      studentService.submitAssignment(payload.assignmentId, {
        contentText: payload.contentText,
        file: payload.file,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student'] });
      toast.success('Assignment submitted');
      setSelected(null);
      setText('');
      setFile(null);
    },
    onError: (error) => toast.error(errorMessage(error, 'Could not submit the assignment')),
  });

  const exportReport = async (format: 'pdf' | 'excel') => {
    setDownloading(true);
    try {
      await downloadFile(
        '/reports/assignments',
        { format },
        `assignments.${format === 'pdf' ? 'pdf' : 'xlsx'}`,
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

  const assignments = query.data.assignments;
  const submitted = assignments.filter(
    (a) => a.status === 'SUBMITTED' || a.status === 'LATE' || a.status === 'GRADED',
  ).length;
  const pending = assignments.filter((a) => a.status === 'PENDING').length;
  const graded = assignments.filter((a) => a.obtainedMarks !== null);
  const gradedTotals = graded.reduce(
    (acc, a) => ({ obtained: acc.obtained + (a.obtainedMarks ?? 0), max: acc.max + a.maxMarks }),
    { obtained: 0, max: 0 },
  );
  const gradedPercentage =
    gradedTotals.max > 0 ? Math.round((gradedTotals.obtained / gradedTotals.max) * 1000) / 10 : 0;

  const openSubmit = (row: AssignmentRow) => {
    setSelected(row);
    setText(row.contentText ?? '');
    setFile(null);
    setFileError(null);
  };

  const onFileChange = (chosen: File | null) => {
    if (chosen && chosen.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setFileError(`Files must be ${MAX_UPLOAD_MB} MB or smaller.`);
      setFile(null);
      return;
    }
    setFileError(null);
    setFile(chosen);
  };

  const columns: Column<AssignmentRow>[] = [
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
    {
      key: 'title',
      header: 'Assignment',
      sortValue: (r) => r.title,
      render: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{r.title}</p>
          {r.attachmentUrl ? (
            <a
              href={r.attachmentUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <Paperclip className="h-3 w-3" />
              Brief
            </a>
          ) : null}
        </div>
      ),
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      sortValue: (r) => r.dueDate,
      render: (r) => (
        <div>
          <p>{formatDate(r.dueDate)}</p>
          {r.submittedAt ? (
            <p className="text-xs text-muted-foreground">
              Sent {formatDate(r.submittedAt, 'd MMM')}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (r) => r.status,
      render: (r) => <Badge tone={submissionTone(r.status)}>{submissionLabel(r.status)}</Badge>,
    },
    {
      key: 'obtainedMarks',
      header: 'Marks',
      sortValue: (r) => r.obtainedMarks ?? -1,
      className: 'tabular-nums',
      render: (r) => (r.obtainedMarks !== null ? r.obtainedMarks : '—'),
    },
    {
      key: 'maxMarks',
      header: 'Out Of',
      className: 'tabular-nums text-muted-foreground',
      render: (r) => r.maxMarks,
    },
    {
      key: 'actions',
      header: '',
      render: (r) =>
        r.status === 'GRADED' ? (
          <span className="text-xs text-muted-foreground">Graded</span>
        ) : (
          <Button size="sm" variant="outline" onClick={() => openSubmit(r)}>
            <Upload />
            {r.submittedAt ? 'Resubmit' : 'Submit'}
          </Button>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assignments</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Submission status, deadlines and marks with faculty feedback.
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
          label="Submitted"
          value={`${submitted} / ${assignments.length}`}
          icon={CheckCircle2}
          tone="assignment"
          progress={assignments.length ? (submitted / assignments.length) * 100 : 0}
          subtitle={`${assignments.length ? Math.round((submitted / assignments.length) * 1000) / 10 : 0}% submission rate`}
        />
        <StatCard
          label="Pending"
          value={pending}
          icon={Clock}
          tone={pending > 0 ? 'warning' : 'success'}
          subtitle={pending > 0 ? 'Awaiting your submission' : 'Nothing outstanding'}
        />
        <StatCard
          label="Assignment Marks"
          value={graded.length ? `${gradedPercentage}%` : '—'}
          icon={FileSpreadsheet}
          tone="success"
          progress={graded.length ? gradedPercentage : undefined}
          subtitle={
            graded.length
              ? `${gradedTotals.obtained} of ${gradedTotals.max} across ${graded.length} graded`
              : 'Nothing graded yet'
          }
        />
      </section>

      <Card>
        <DataTable
          columns={columns}
          rows={assignments}
          rowKey={(r) => r.id}
          pageSize={10}
          searchable={(r) => `${r.subject} ${r.title} ${r.status}`}
          searchPlaceholder="Search assignments…"
          emptyTitle="No assignments yet"
          emptyMessage="Assignments set by your faculty will appear here."
        />
      </Card>

      {graded.some((a) => a.feedback) && (
        <Card>
          <div className="p-5 pb-3">
            <h2 className="text-base font-semibold tracking-tight">Faculty Feedback</h2>
          </div>
          <ul className="divide-y divide-border border-t border-border">
            {graded
              .filter((a) => a.feedback)
              .map((a) => (
                <li key={a.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">
                      {a.subject} — {a.title}
                    </p>
                    <Badge tone="success">
                      {a.obtainedMarks} / {a.maxMarks}
                    </Badge>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{a.feedback}</p>
                </li>
              ))}
          </ul>
        </Card>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        {selected ? (
          <DialogContent
            title={selected.title}
            description={`${selected.subject} · Due ${formatDateTime(selected.dueDate)} · ${selected.maxMarks} marks`}
          >
            <div className="space-y-4">
              {selected.description ? (
                <p className="rounded-md bg-muted/50 p-3 text-sm leading-relaxed text-muted-foreground">
                  {selected.description}
                </p>
              ) : null}

              {new Date(selected.dueDate) < new Date() ? (
                <p className="rounded-md bg-danger-soft p-3 text-sm font-medium text-danger-foreground">
                  The deadline has passed. This submission will be recorded as late.
                </p>
              ) : null}

              <div className="space-y-1.5">
                <Label htmlFor="submission-text">Your answer or notes</Label>
                <Textarea
                  id="submission-text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type your answer, or attach a file below."
                  maxLength={5000}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="submission-file">Attachment (optional)</Label>
                <input
                  id="submission-file"
                  type="file"
                  accept=".pdf,.doc,.docx,.zip,.txt,.png,.jpg,.jpeg"
                  onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
                  className="block w-full rounded-md border border-input bg-card text-sm file:mr-3 file:rounded-l-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium"
                />
                <p className="text-xs text-muted-foreground">
                  PDF, Word, ZIP, text or image · up to {MAX_UPLOAD_MB} MB
                </p>
                <FieldError>{fileError}</FieldError>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => setSelected(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={() =>
                    submit.mutate({
                      assignmentId: selected.assignmentId ?? selected.id,
                      contentText: text.trim() || undefined,
                      file: file ?? undefined,
                    })
                  }
                  disabled={submit.isPending || (!text.trim() && !file)}
                >
                  {submit.isPending ? 'Submitting…' : 'Submit assignment'}
                </Button>
              </div>
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}
