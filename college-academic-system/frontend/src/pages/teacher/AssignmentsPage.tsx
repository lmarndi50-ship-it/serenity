import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Paperclip, Plus, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { teacherService } from '@/services';
import { errorMessage } from '@/services/api';
import { formatDate, formatDateTime, submissionLabel, submissionTone } from '@/utils/format';
import {
  Badge,
  Button,
  Card,
  FieldError,
  Input,
  Label,
  Progress,
  Select,
  Textarea,
} from '@/components/ui/primitives';
import { ConfirmDialog, Dialog, DialogContent } from '@/components/ui/dialog';
import { ErrorState, TableSkeleton } from '@/components/ui/states';
import { DataTable, type Column } from '@/components/DataTable';
import type { SubmissionRow, TeacherAssignment } from '@/types';

const assignmentSchema = z.object({
  subjectId: z.string().uuid('Choose a subject.'),
  title: z.string().trim().min(3, 'Enter a title.').max(140),
  description: z.string().trim().max(2000).optional(),
  dueDate: z.string().min(1, 'Choose a due date.'),
  maxMarks: z.coerce.number().int().min(1, 'Maximum marks must be at least 1.').max(200),
});

type AssignmentValues = z.infer<typeof assignmentSchema>;

export function TeacherAssignmentsPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const [creatorOpen, setCreatorOpen] = useState(searchParams.get('new') === '1');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [openAssignment, setOpenAssignment] = useState<TeacherAssignment | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TeacherAssignment | null>(null);
  const [grading, setGrading] = useState<SubmissionRow | null>(null);
  const [gradeMarks, setGradeMarks] = useState('');
  const [gradeFeedback, setGradeFeedback] = useState('');

  const subjects = useQuery({ queryKey: ['teacher', 'subjects'], queryFn: teacherService.subjects });
  const assignments = useQuery({
    queryKey: ['teacher', 'assignments'],
    queryFn: () => teacherService.assignments(),
  });

  const submissions = useQuery({
    queryKey: ['teacher', 'submissions', openAssignment?.id],
    queryFn: () => teacherService.submissions(openAssignment!.id),
    enabled: !!openAssignment,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AssignmentValues>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: { maxMarks: 20 },
  });

  const create = useMutation({
    mutationFn: (values: AssignmentValues) =>
      teacherService.createAssignment({
        ...values,
        dueDate: new Date(values.dueDate).toISOString(),
        attachment: attachment ?? undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher'] });
      toast.success('Assignment created and students notified');
      setCreatorOpen(false);
      setAttachment(null);
      reset({ maxMarks: 20, title: '', subjectId: '', dueDate: '' });
    },
    onError: (error) => toast.error(errorMessage(error, 'Could not create the assignment')),
  });

  const grade = useMutation({
    mutationFn: () => {
      const marks = Number(gradeMarks);
      const max = submissions.data!.assignment.maxMarks;
      if (Number.isNaN(marks) || marks < 0 || marks > max) {
        throw new Error(`Marks must be between 0 and ${max}.`);
      }
      return teacherService.gradeSubmission(grading!.id, marks, gradeFeedback.trim() || undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher'] });
      toast.success('Submission graded');
      setGrading(null);
      setGradeMarks('');
      setGradeFeedback('');
    },
    onError: (error) => toast.error(errorMessage(error, 'Could not save the grade')),
  });

  const remove = useMutation({
    mutationFn: (id: string) => teacherService.deleteAssignment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher'] });
      toast.success('Assignment deleted');
      setPendingDelete(null);
      setOpenAssignment(null);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const columns: Column<TeacherAssignment>[] = [
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
              Attachment
            </a>
          ) : null}
        </div>
      ),
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      sortValue: (r) => r.dueDate,
      render: (r) => formatDate(r.dueDate),
    },
    {
      key: 'submissionRate',
      header: 'Submitted',
      sortValue: (r) => r.submissionRate,
      render: (r) => (
        <div className="min-w-[120px]">
          <p className="text-xs font-medium">
            {r.submitted} / {r.totalStudents}{' '}
            <span className="text-muted-foreground">({r.submissionRate}%)</span>
          </p>
          <Progress value={r.submissionRate} tone="assignment" className="mt-1.5" />
        </div>
      ),
    },
    {
      key: 'graded',
      header: 'Graded',
      hideOnMobile: true,
      sortValue: (r) => r.graded,
      render: (r) => <span className="tabular-nums text-muted-foreground">{r.graded}</span>,
    },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="outline" onClick={() => setOpenAssignment(r)}>
            <Users />
            Submissions
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => setPendingDelete(r)}
            aria-label={`Delete ${r.title}`}
          >
            <Trash2 className="text-danger" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assignments</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Set work, track submissions and record marks with feedback.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreatorOpen(true)}>
          <Plus />
          Create assignment
        </Button>
      </header>

      <Card>
        {assignments.isError ? (
          <ErrorState
            message={errorMessage(assignments.error)}
            onRetry={() => void assignments.refetch()}
          />
        ) : (
          <DataTable
            columns={columns}
            rows={assignments.data ?? []}
            rowKey={(r) => r.id}
            isLoading={assignments.isLoading}
            pageSize={10}
            searchable={(r) => `${r.subject} ${r.title}`}
            searchPlaceholder="Search assignments…"
            emptyTitle="No assignments yet"
            emptyMessage="Create one to start collecting submissions."
          />
        )}
      </Card>

      {/* Submissions */}
      <Dialog open={!!openAssignment} onOpenChange={(open) => !open && setOpenAssignment(null)}>
        {openAssignment ? (
          <DialogContent
            wide
            title={openAssignment.title}
            description={`${openAssignment.subject} · due ${formatDateTime(openAssignment.dueDate)} · ${openAssignment.maxMarks} marks`}
          >
            {submissions.isLoading ? (
              <TableSkeleton rows={6} columns={4} />
            ) : submissions.isError || !submissions.data ? (
              <ErrorState message={errorMessage(submissions.error)} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                      <th scope="col" className="py-2 pr-3 text-left font-semibold">Roll No</th>
                      <th scope="col" className="py-2 pr-3 text-left font-semibold">Student</th>
                      <th scope="col" className="py-2 pr-3 text-left font-semibold">Status</th>
                      <th scope="col" className="py-2 pr-3 text-left font-semibold">Submitted</th>
                      <th scope="col" className="py-2 pr-3 text-right font-semibold">Marks</th>
                      <th scope="col" className="py-2 text-right font-semibold" />
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.data.submissions.map((row) => (
                      <tr key={row.id} className="border-b border-border/70 last:border-0">
                        <td className="py-2.5 pr-3 font-mono text-xs font-semibold">
                          {row.rollNumber}
                        </td>
                        <td className="py-2.5 pr-3 font-medium">{row.name}</td>
                        <td className="py-2.5 pr-3">
                          <Badge tone={submissionTone(row.status)}>
                            {submissionLabel(row.status)}
                          </Badge>
                        </td>
                        <td className="py-2.5 pr-3 text-xs text-muted-foreground">
                          {row.submittedAt ? formatDate(row.submittedAt) : '—'}
                        </td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">
                          {row.obtainedMarks !== null
                            ? `${row.obtainedMarks} / ${submissions.data!.assignment.maxMarks}`
                            : '—'}
                        </td>
                        <td className="py-2.5 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={!row.submittedAt}
                            onClick={() => {
                              setGrading(row);
                              setGradeMarks(row.obtainedMarks !== null ? String(row.obtainedMarks) : '');
                              setGradeFeedback(row.feedback ?? '');
                            }}
                          >
                            {row.status === 'GRADED' ? 'Edit grade' : 'Grade'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DialogContent>
        ) : null}
      </Dialog>

      {/* Grading */}
      <Dialog open={!!grading} onOpenChange={(open) => !open && setGrading(null)}>
        {grading && submissions.data ? (
          <DialogContent
            title={`Grade — ${grading.name}`}
            description={`${grading.rollNumber} · out of ${submissions.data.assignment.maxMarks} marks`}
          >
            <div className="space-y-4">
              {grading.contentText ? (
                <div>
                  <p className="mb-1 text-sm font-medium">Submitted answer</p>
                  <p className="max-h-40 overflow-y-auto whitespace-pre-line rounded-md bg-muted/50 p-3 text-sm leading-relaxed text-muted-foreground">
                    {grading.contentText}
                  </p>
                </div>
              ) : null}

              {grading.fileUrl ? (
                <a
                  href={grading.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  <Paperclip className="h-4 w-4" />
                  Open submitted file
                </a>
              ) : null}

              <div className="space-y-1.5">
                <Label htmlFor="grade-marks">
                  Marks (0–{submissions.data.assignment.maxMarks})
                </Label>
                <Input
                  id="grade-marks"
                  type="number"
                  min={0}
                  max={submissions.data.assignment.maxMarks}
                  step="0.5"
                  value={gradeMarks}
                  onChange={(e) => setGradeMarks(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="grade-feedback">Feedback (optional)</Label>
                <Textarea
                  id="grade-feedback"
                  rows={3}
                  value={gradeFeedback}
                  onChange={(e) => setGradeFeedback(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setGrading(null)}>
                  Cancel
                </Button>
                <Button onClick={() => grade.mutate()} disabled={grade.isPending || !gradeMarks}>
                  {grade.isPending ? 'Saving…' : 'Save grade'}
                </Button>
              </div>
            </div>
          </DialogContent>
        ) : null}
      </Dialog>

      {/* Create */}
      <Dialog open={creatorOpen} onOpenChange={setCreatorOpen}>
        <DialogContent
          title="Create an assignment"
          description="Every enrolled student gets a submission row and a notification."
        >
          <form
            onSubmit={handleSubmit((values) => create.mutate(values))}
            className="space-y-4"
            noValidate
          >
            <div className="space-y-1.5">
              <Label htmlFor="assignment-subject">Subject</Label>
              <Select
                id="assignment-subject"
                aria-invalid={!!errors.subjectId}
                {...register('subjectId')}
              >
                <option value="">Choose a subject</option>
                {(subjects.data ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.semester}, Section {s.section}
                  </option>
                ))}
              </Select>
              <FieldError>{errors.subjectId?.message}</FieldError>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="assignment-title">Title</Label>
              <Input id="assignment-title" aria-invalid={!!errors.title} {...register('title')} />
              <FieldError>{errors.title?.message}</FieldError>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="assignment-description">Description</Label>
              <Textarea id="assignment-description" rows={3} {...register('description')} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="assignment-due">Due date &amp; time</Label>
                <Input
                  id="assignment-due"
                  type="datetime-local"
                  aria-invalid={!!errors.dueDate}
                  {...register('dueDate')}
                />
                <FieldError>{errors.dueDate?.message}</FieldError>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="assignment-max">Maximum marks</Label>
                <Input
                  id="assignment-max"
                  type="number"
                  min={1}
                  max={200}
                  aria-invalid={!!errors.maxMarks}
                  {...register('maxMarks')}
                />
                <FieldError>{errors.maxMarks?.message}</FieldError>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="assignment-file">Attachment (optional)</Label>
              <input
                id="assignment-file"
                type="file"
                accept=".pdf,.doc,.docx,.zip,.txt,.png,.jpg,.jpeg"
                onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
                className="block w-full rounded-md border border-input bg-card text-sm file:mr-3 file:rounded-l-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setCreatorOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? 'Creating…' : 'Create assignment'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete this assignment?"
        message={`"${pendingDelete?.title}" and all submissions against it will be removed permanently.`}
        confirmLabel="Delete assignment"
        busy={remove.isPending}
        onConfirm={() => pendingDelete && remove.mutate(pendingDelete.id)}
      />
    </div>
  );
}
