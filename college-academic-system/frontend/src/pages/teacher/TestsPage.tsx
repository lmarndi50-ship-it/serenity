import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { teacherService } from '@/services';
import { errorMessage } from '@/services/api';
import { formatDate, marksTone } from '@/utils/format';
import { cn } from '@/lib/utils';
import {
  Badge,
  Button,
  Card,
  FieldError,
  Input,
  Label,
  Select,
  Textarea,
} from '@/components/ui/primitives';
import { ConfirmDialog, Dialog, DialogContent } from '@/components/ui/dialog';
import { ErrorState, TableSkeleton } from '@/components/ui/states';
import { DataTable, type Column } from '@/components/DataTable';
import type { TeacherTest } from '@/types';

const testSchema = z.object({
  subjectId: z.string().uuid('Choose a subject.'),
  name: z.string().trim().min(2, 'Enter a test name.').max(80),
  description: z.string().trim().max(500).optional(),
  testDate: z.string().min(1, 'Choose a date.'),
  maxMarks: z.coerce.number().int().min(1, 'Maximum marks must be at least 1.').max(500),
});

type TestValues = z.infer<typeof testSchema>;

export function TeacherTestsPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [creatorOpen, setCreatorOpen] = useState(searchParams.get('new') === '1');
  const [markSheetId, setMarkSheetId] = useState<string | null>(searchParams.get('testId'));
  const [pendingDelete, setPendingDelete] = useState<TeacherTest | null>(null);
  const [entries, setEntries] = useState<Record<string, { marks: string; absent: boolean }>>({});

  const subjects = useQuery({ queryKey: ['teacher', 'subjects'], queryFn: teacherService.subjects });
  const tests = useQuery({ queryKey: ['teacher', 'tests'], queryFn: () => teacherService.tests() });

  const markSheet = useQuery({
    queryKey: ['teacher', 'test-marks', markSheetId],
    queryFn: () => teacherService.testMarkSheet(markSheetId!),
    enabled: !!markSheetId,
  });

  // Seed the mark inputs from whatever is already saved.
  useEffect(() => {
    if (!markSheet.data) return;
    const next: Record<string, { marks: string; absent: boolean }> = {};
    for (const student of markSheet.data.students) {
      next[student.studentId] = {
        marks: student.obtainedMarks !== null ? String(student.obtainedMarks) : '',
        absent: student.isAbsent,
      };
    }
    setEntries(next);
  }, [markSheet.data]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TestValues>({
    resolver: zodResolver(testSchema),
    defaultValues: { maxMarks: 50, testDate: new Date().toISOString().slice(0, 10) },
  });

  const createTest = useMutation({
    mutationFn: (values: TestValues) => teacherService.createTest(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher'] });
      toast.success('Test created and students notified');
      setCreatorOpen(false);
      reset({ maxMarks: 50, testDate: new Date().toISOString().slice(0, 10), name: '', subjectId: '' });
    },
    onError: (error) => toast.error(errorMessage(error, 'Could not create the test')),
  });

  const saveMarks = useMutation({
    mutationFn: (publish: boolean) => {
      const maxMarks = markSheet.data!.test.maxMarks;
      const payload = Object.entries(entries)
        .filter(([, value]) => value.absent || value.marks !== '')
        .map(([studentId, value]) => ({
          studentId,
          obtainedMarks: value.absent ? 0 : Number(value.marks),
          isAbsent: value.absent,
        }));

      const invalid = payload.find(
        (row) => !row.isAbsent && (row.obtainedMarks < 0 || row.obtainedMarks > maxMarks),
      );
      if (invalid) {
        throw new Error(`Marks must be between 0 and ${maxMarks}.`);
      }
      if (payload.length === 0) throw new Error('Enter marks for at least one student.');

      return teacherService.saveTestMarks(markSheetId!, payload, publish);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['teacher'] });
      toast.success(
        result.published
          ? `Marks saved and published for ${result.saved} students`
          : `Marks saved for ${result.saved} students`,
      );
    },
    onError: (error) => toast.error(errorMessage(error, 'Could not save the marks')),
  });

  const removeTest = useMutation({
    mutationFn: (id: string) => teacherService.deleteTest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher'] });
      toast.success('Test deleted');
      setPendingDelete(null);
      setMarkSheetId(null);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const openMarkSheet = (id: string) => {
    setMarkSheetId(id);
    setSearchParams({ testId: id });
  };

  const columns: Column<TeacherTest>[] = [
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
    { key: 'name', header: 'Test', sortValue: (r) => r.name },
    {
      key: 'testDate',
      header: 'Date',
      sortValue: (r) => r.testDate,
      render: (r) => formatDate(r.testDate),
    },
    {
      key: 'maxMarks',
      header: 'Max Marks',
      hideOnMobile: true,
      sortValue: (r) => r.maxMarks,
      className: 'tabular-nums',
    },
    {
      key: 'marksEntered',
      header: 'Marks Entered',
      sortValue: (r) => r.marksEntered,
      render: (r) => (
        <span className="tabular-nums text-muted-foreground">{r.marksEntered} students</span>
      ),
    },
    {
      key: 'isPublished',
      header: 'Status',
      sortValue: (r) => (r.isPublished ? 1 : 0),
      render: (r) => (
        <Badge tone={r.isPublished ? 'success' : 'warning'}>
          {r.isPublished ? 'Published' : 'Draft'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="outline" onClick={() => openMarkSheet(r.id)}>
            Enter marks
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => setPendingDelete(r)}
            aria-label={`Delete ${r.name}`}
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
          <h1 className="text-2xl font-bold tracking-tight">Class Tests</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create internal assessments and record student marks.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreatorOpen(true)}>
          <Plus />
          Create test
        </Button>
      </header>

      <Card>
        {tests.isError ? (
          <ErrorState message={errorMessage(tests.error)} onRetry={() => void tests.refetch()} />
        ) : (
          <DataTable
            columns={columns}
            rows={tests.data ?? []}
            rowKey={(r) => r.id}
            isLoading={tests.isLoading}
            pageSize={10}
            searchable={(r) => `${r.subject} ${r.name}`}
            searchPlaceholder="Search tests…"
            emptyTitle="No tests yet"
            emptyMessage="Create a test to start recording marks."
          />
        )}
      </Card>

      {/* Mark entry */}
      {markSheetId ? (
        <Card>
          {markSheet.isLoading ? (
            <TableSkeleton rows={8} columns={4} />
          ) : markSheet.isError || !markSheet.data ? (
            <ErrorState
              message={errorMessage(markSheet.error)}
              onRetry={() => void markSheet.refetch()}
            />
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 p-5 pb-3">
                <div>
                  <h2 className="text-base font-semibold tracking-tight">
                    {markSheet.data.test.subject} — {markSheet.data.test.name}
                  </h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {formatDate(markSheet.data.test.testDate)} · Maximum{' '}
                    {markSheet.data.test.maxMarks} marks ·{' '}
                    {markSheet.data.test.isPublished ? 'Published to students' : 'Not yet published'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => saveMarks.mutate(false)}
                    disabled={saveMarks.isPending}
                  >
                    <Save />
                    Save draft
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => saveMarks.mutate(true)}
                    disabled={saveMarks.isPending}
                  >
                    <CheckCircle2 />
                    {saveMarks.isPending ? 'Saving…' : 'Save & publish'}
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto border-t border-border">
                <table className="w-full min-w-[620px] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                      <th scope="col" className="px-5 py-2.5 text-left font-semibold">Roll No</th>
                      <th scope="col" className="px-4 py-2.5 text-left font-semibold">Student</th>
                      <th scope="col" className="px-4 py-2.5 text-left font-semibold">
                        Marks (out of {markSheet.data.test.maxMarks})
                      </th>
                      <th scope="col" className="px-4 py-2.5 text-center font-semibold">Absent</th>
                      <th scope="col" className="px-5 py-2.5 text-right font-semibold">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {markSheet.data.students.map((student) => {
                      const entry = entries[student.studentId] ?? { marks: '', absent: false };
                      const numeric = Number(entry.marks);
                      const valid =
                        entry.marks === '' ||
                        (!Number.isNaN(numeric) &&
                          numeric >= 0 &&
                          numeric <= markSheet.data!.test.maxMarks);
                      const pct =
                        entry.marks !== '' && valid && !entry.absent
                          ? Math.round((numeric / markSheet.data!.test.maxMarks) * 1000) / 10
                          : null;

                      return (
                        <tr key={student.studentId} className="border-b border-border/70 last:border-0">
                          <td className="px-5 py-2.5 font-mono text-xs font-semibold">
                            {student.rollNumber}
                          </td>
                          <td className="px-4 py-2.5 font-medium">{student.name}</td>
                          <td className="px-4 py-2.5">
                            <Input
                              type="number"
                              min={0}
                              max={markSheet.data!.test.maxMarks}
                              step="0.5"
                              value={entry.marks}
                              disabled={entry.absent}
                              aria-invalid={!valid}
                              aria-label={`Marks for ${student.name}`}
                              onChange={(e) =>
                                setEntries((prev) => ({
                                  ...prev,
                                  [student.studentId]: { ...entry, marks: e.target.value },
                                }))
                              }
                              className={cn('h-9 w-28', !valid && 'border-danger')}
                            />
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={entry.absent}
                              aria-label={`Mark ${student.name} absent`}
                              onChange={(e) =>
                                setEntries((prev) => ({
                                  ...prev,
                                  [student.studentId]: {
                                    marks: e.target.checked ? '' : entry.marks,
                                    absent: e.target.checked,
                                  },
                                }))
                              }
                              className="h-4 w-4 rounded border-input text-primary"
                            />
                          </td>
                          <td className="px-5 py-2.5 text-right">
                            {entry.absent ? (
                              <Badge tone="danger">AB</Badge>
                            ) : pct !== null ? (
                              <Badge tone={marksTone(pct)}>{pct}%</Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>
      ) : null}

      {/* Create test */}
      <Dialog open={creatorOpen} onOpenChange={setCreatorOpen}>
        <DialogContent
          title="Create a class test"
          description="Students in the subject are notified as soon as it is created."
        >
          <form
            onSubmit={handleSubmit((values) => createTest.mutate(values))}
            className="space-y-4"
            noValidate
          >
            <div className="space-y-1.5">
              <Label htmlFor="test-subject">Subject</Label>
              <Select id="test-subject" aria-invalid={!!errors.subjectId} {...register('subjectId')}>
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
              <Label htmlFor="test-name">Test name</Label>
              <Input
                id="test-name"
                placeholder="Class Test 1"
                aria-invalid={!!errors.name}
                {...register('name')}
              />
              <FieldError>{errors.name?.message}</FieldError>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="test-date">Test date</Label>
                <Input id="test-date" type="date" aria-invalid={!!errors.testDate} {...register('testDate')} />
                <FieldError>{errors.testDate?.message}</FieldError>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="test-max">Maximum marks</Label>
                <Input
                  id="test-max"
                  type="number"
                  min={1}
                  max={500}
                  aria-invalid={!!errors.maxMarks}
                  {...register('maxMarks')}
                />
                <FieldError>{errors.maxMarks?.message}</FieldError>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="test-description">Description (optional)</Label>
              <Textarea id="test-description" rows={3} {...register('description')} />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setCreatorOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createTest.isPending}>
                {createTest.isPending ? 'Creating…' : 'Create test'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete this test?"
        message={`"${pendingDelete?.name}" and every mark recorded against it will be removed permanently.`}
        confirmLabel="Delete test"
        busy={removeTest.isPending}
        onConfirm={() => pendingDelete && removeTest.mutate(pendingDelete.id)}
      />
    </div>
  );
}
