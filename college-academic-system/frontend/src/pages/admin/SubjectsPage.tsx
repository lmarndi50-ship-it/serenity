import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { adminService, referenceService } from '@/services';
import { errorMessage } from '@/services/api';
import { Badge, Button, Card, FieldError, Input, Label, Select } from '@/components/ui/primitives';
import { ConfirmDialog, Dialog, DialogContent } from '@/components/ui/dialog';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/states';
import type { AdminSubject } from '@/types';

const subjectSchema = z.object({
  name: z.string().trim().min(2, 'Enter a subject name.').max(120),
  code: z.string().trim().min(2, 'Enter a subject code.').max(20),
  credits: z.coerce.number().int().min(1).max(10),
  totalPlannedClasses: z.coerce.number().int().min(1).max(200),
  departmentId: z.string().uuid('Choose a department.'),
  courseId: z.string().uuid('Choose a course.'),
  semesterId: z.string().uuid('Choose a semester.'),
  sectionId: z.string().uuid('Choose a section.'),
  teacherId: z.string().optional(),
});

type SubjectValues = z.infer<typeof subjectSchema>;

export function AdminSubjectsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminSubject | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminSubject | null>(null);

  const reference = useQuery({
    queryKey: ['reference'],
    queryFn: referenceService.get,
    staleTime: 10 * 60 * 1000,
  });

  const teachers = useQuery({
    queryKey: ['admin', 'teachers', 'all'],
    queryFn: () => adminService.teachers({ page: 1, pageSize: 100 }),
  });

  const params = { page: 1, pageSize: 100, ...(search ? { search } : {}) };
  const subjects = useQuery({
    queryKey: ['admin', 'subjects', params],
    queryFn: () => adminService.subjects(params),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SubjectValues>({
    resolver: zodResolver(subjectSchema),
    defaultValues: { credits: 4, totalPlannedClasses: 45 },
  });

  const create = useMutation({
    mutationFn: (values: SubjectValues) =>
      adminService.createSubject({ ...values, teacherId: values.teacherId || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      toast.success('Subject created and the matching cohort enrolled');
      setFormOpen(false);
      reset({ credits: 4, totalPlannedClasses: 45 });
    },
    onError: (error) => toast.error(errorMessage(error, 'Could not create the subject')),
  });

  const update = useMutation({
    mutationFn: (payload: { id: string; data: Record<string, unknown> }) =>
      adminService.updateSubject(payload.id, payload.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      queryClient.invalidateQueries({ queryKey: ['teacher'] });
      toast.success('Subject updated');
      setEditing(null);
    },
    onError: (error) => toast.error(errorMessage(error, 'Could not update the subject')),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminService.deleteSubject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      toast.success('Subject removed');
      setPendingDelete(null);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const rows = subjects.data?.data ?? [];
  const teacherOptions = teachers.data?.data ?? [];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Subjects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Curriculum, faculty allocation and cohort enrolment.
          </p>
        </div>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus />
          Add subject
        </Button>
      </header>

      <Card>
        <div className="border-b border-border p-4">
          <div className="relative max-w-sm">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search subjects…"
              aria-label="Search subjects"
              className="h-9 pl-9"
            />
          </div>
        </div>

        {subjects.isLoading ? (
          <TableSkeleton rows={6} columns={6} />
        ) : subjects.isError ? (
          <ErrorState message={errorMessage(subjects.error)} onRetry={() => void subjects.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState title="No subjects found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="px-5 py-2.5 text-left font-semibold">Code</th>
                  <th scope="col" className="px-4 py-2.5 text-left font-semibold">Subject</th>
                  <th scope="col" className="px-4 py-2.5 text-left font-semibold">Faculty</th>
                  <th scope="col" className="px-4 py-2.5 text-left font-semibold">Semester</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-semibold">Students</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((subject) => (
                  <tr key={subject.id} className="border-b border-border/70 last:border-0 hover:bg-muted/30">
                    <td className="px-5 py-3 font-mono text-xs font-semibold">{subject.code}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{subject.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {subject.credits} credits · {subject.department}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {subject.faculty ? (
                        <span className="text-muted-foreground">{subject.faculty}</span>
                      ) : (
                        <Badge tone="warning">Unassigned</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {subject.semester} · {subject.section}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{subject.studentCount}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => setEditing(subject)}
                          aria-label={`Edit ${subject.name}`}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => setPendingDelete(subject)}
                          aria-label={`Delete ${subject.name}`}
                        >
                          <Trash2 className="text-danger" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent
          wide
          title="Add a subject"
          description="Students already in the chosen semester and section are enrolled automatically."
        >
          <form
            onSubmit={handleSubmit((values) => create.mutate(values))}
            className="grid gap-4 sm:grid-cols-2"
            noValidate
          >
            <div className="space-y-1.5">
              <Label htmlFor="sub-name">Subject name</Label>
              <Input id="sub-name" aria-invalid={!!errors.name} {...register('name')} />
              <FieldError>{errors.name?.message}</FieldError>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sub-code">Subject code</Label>
              <Input id="sub-code" placeholder="CS201" aria-invalid={!!errors.code} {...register('code')} />
              <FieldError>{errors.code?.message}</FieldError>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sub-credits">Credits</Label>
              <Input id="sub-credits" type="number" min={1} max={10} {...register('credits')} />
              <FieldError>{errors.credits?.message}</FieldError>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sub-planned">Planned classes</Label>
              <Input
                id="sub-planned"
                type="number"
                min={1}
                max={200}
                {...register('totalPlannedClasses')}
              />
              <FieldError>{errors.totalPlannedClasses?.message}</FieldError>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sub-dept">Department</Label>
              <Select id="sub-dept" aria-invalid={!!errors.departmentId} {...register('departmentId')}>
                <option value="">Choose…</option>
                {(reference.data?.departments ?? []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
              <FieldError>{errors.departmentId?.message}</FieldError>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sub-course">Course</Label>
              <Select id="sub-course" aria-invalid={!!errors.courseId} {...register('courseId')}>
                <option value="">Choose…</option>
                {(reference.data?.courses ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
              <FieldError>{errors.courseId?.message}</FieldError>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sub-sem">Semester</Label>
              <Select id="sub-sem" aria-invalid={!!errors.semesterId} {...register('semesterId')}>
                <option value="">Choose…</option>
                {(reference.data?.semesters ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
              <FieldError>{errors.semesterId?.message}</FieldError>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sub-section">Section</Label>
              <Select id="sub-section" aria-invalid={!!errors.sectionId} {...register('sectionId')}>
                <option value="">Choose…</option>
                {(reference.data?.sections ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    Section {s.name}
                  </option>
                ))}
              </Select>
              <FieldError>{errors.sectionId?.message}</FieldError>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="sub-teacher">Faculty (optional)</Label>
              <Select id="sub-teacher" {...register('teacherId')}>
                <option value="">Leave unassigned</option>
                {teacherOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} — {t.department}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-1 sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? 'Creating…' : 'Create subject'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        {editing ? (
          <DialogContent title={`Edit ${editing.name}`} description={editing.code}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                const teacherId = String(form.get('teacherId'));
                update.mutate({
                  id: editing.id,
                  data: {
                    name: String(form.get('name')),
                    credits: Number(form.get('credits')),
                    totalPlannedClasses: Number(form.get('totalPlannedClasses')),
                    teacherId: teacherId || null,
                  },
                });
              }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="se-name">Subject name</Label>
                <Input id="se-name" name="name" defaultValue={editing.name} required />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="se-credits">Credits</Label>
                  <Input
                    id="se-credits"
                    name="credits"
                    type="number"
                    min={1}
                    max={10}
                    defaultValue={editing.credits}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="se-planned">Planned classes</Label>
                  <Input
                    id="se-planned"
                    name="totalPlannedClasses"
                    type="number"
                    min={1}
                    max={200}
                    defaultValue={editing.totalPlannedClasses}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="se-teacher">Faculty</Label>
                <Select id="se-teacher" name="teacherId" defaultValue={editing.teacherId ?? ''}>
                  <option value="">Leave unassigned</option>
                  {teacherOptions.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} — {t.department}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={update.isPending}>
                  {update.isPending ? 'Saving…' : 'Save changes'}
                </Button>
              </div>
            </form>
          </DialogContent>
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Remove this subject?"
        message={`${pendingDelete?.name} and all its attendance, tests and assignments will be permanently deleted.`}
        confirmLabel="Delete subject"
        busy={remove.isPending}
        onConfirm={() => pendingDelete && remove.mutate(pendingDelete.id)}
      />
    </div>
  );
}
