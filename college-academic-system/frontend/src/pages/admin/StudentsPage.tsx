import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { adminService, referenceService } from '@/services';
import { errorMessage } from '@/services/api';
import { Badge, Button, Card, FieldError, Input, Label, Select } from '@/components/ui/primitives';
import { ConfirmDialog, Dialog, DialogContent } from '@/components/ui/dialog';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/states';
import type { AdminStudent } from '@/types';

const createSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter the full name.').max(120),
  email: z.string().trim().email('Enter a valid email address.'),
  password: z
    .string()
    .min(8, 'At least 8 characters.')
    .regex(/[A-Z]/, 'Include an uppercase letter.')
    .regex(/[a-z]/, 'Include a lowercase letter.')
    .regex(/[0-9]/, 'Include a number.'),
  phone: z.string().trim().min(7).max(20).optional().or(z.literal('')),
  rollNumber: z.string().trim().min(3, 'Enter a roll number.').max(20),
  registrationNo: z.string().trim().min(3, 'Enter a registration number.').max(30),
  admissionYear: z.coerce.number().int().min(1990).max(2100),
  departmentId: z.string().uuid('Choose a department.'),
  courseId: z.string().uuid('Choose a course.'),
  semesterId: z.string().uuid('Choose a semester.'),
  sectionId: z.string().uuid('Choose a section.'),
});

type CreateValues = z.infer<typeof createSchema>;

const PAGE_SIZE = 10;

export function AdminStudentsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [semesterId, setSemesterId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminStudent | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminStudent | null>(null);

  const reference = useQuery({
    queryKey: ['reference'],
    queryFn: referenceService.get,
    staleTime: 10 * 60 * 1000,
  });

  const params = {
    page,
    pageSize: PAGE_SIZE,
    ...(search ? { search } : {}),
    ...(departmentId ? { departmentId } : {}),
    ...(semesterId ? { semesterId } : {}),
    ...(sectionId ? { sectionId } : {}),
  };

  const students = useQuery({
    queryKey: ['admin', 'students', params],
    queryFn: () => adminService.students(params),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { admissionYear: new Date().getFullYear() },
  });

  const create = useMutation({
    mutationFn: (values: CreateValues) =>
      adminService.createStudent({ ...values, phone: values.phone || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      toast.success('Student added and enrolled in their semester subjects');
      setFormOpen(false);
      reset({ admissionYear: new Date().getFullYear() });
    },
    onError: (error) => toast.error(errorMessage(error, 'Could not add the student')),
  });

  const update = useMutation({
    mutationFn: (payload: { id: string; data: Record<string, unknown> }) =>
      adminService.updateStudent(payload.id, payload.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      toast.success('Student updated');
      setEditing(null);
    },
    onError: (error) => toast.error(errorMessage(error, 'Could not update the student')),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminService.deleteStudent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      toast.success('Student removed');
      setPendingDelete(null);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const rows = students.data?.data ?? [];
  const meta = students.data?.meta;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Students</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {meta ? `${meta.total} student records` : 'Manage student records and enrolments.'}
          </p>
        </div>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus />
          Add student
        </Button>
      </header>

      <Card className="p-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name, roll number or email…"
              aria-label="Search students"
              className="pl-9"
            />
          </div>
          <Select
            value={departmentId}
            onChange={(e) => {
              setDepartmentId(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by department"
          >
            <option value="">All departments</option>
            {(reference.data?.departments ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
          <Select
            value={semesterId}
            onChange={(e) => {
              setSemesterId(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by semester"
          >
            <option value="">All semesters</option>
            {(reference.data?.semesters ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <Select
            value={sectionId}
            onChange={(e) => {
              setSectionId(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by section"
          >
            <option value="">All sections</option>
            {(reference.data?.sections ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                Section {s.name}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <Card>
        {students.isLoading ? (
          <TableSkeleton rows={8} columns={6} />
        ) : students.isError ? (
          <ErrorState message={errorMessage(students.error)} onRetry={() => void students.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState title="No students found" message="Adjust your filters or add a student." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                    <th scope="col" className="px-5 py-2.5 text-left font-semibold">Roll No</th>
                    <th scope="col" className="px-4 py-2.5 text-left font-semibold">Student</th>
                    <th scope="col" className="px-4 py-2.5 text-left font-semibold">Department</th>
                    <th scope="col" className="px-4 py-2.5 text-left font-semibold">Semester</th>
                    <th scope="col" className="px-4 py-2.5 text-left font-semibold">Status</th>
                    <th scope="col" className="px-5 py-2.5 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((student) => (
                    <tr key={student.id} className="border-b border-border/70 last:border-0 hover:bg-muted/30">
                      <td className="px-5 py-3 font-mono text-xs font-semibold">{student.rollNumber}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{student.name}</p>
                        <p className="text-xs text-muted-foreground">{student.email}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{student.department}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {student.semester} · {student.section}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={student.isActive ? 'success' : 'neutral'}>
                          {student.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            onClick={() => setEditing(student)}
                            aria-label={`Edit ${student.name}`}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            onClick={() => setPendingDelete(student)}
                            aria-label={`Delete ${student.name}`}
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

            {meta && meta.totalPages > 1 ? (
              <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
                <p className="text-xs text-muted-foreground">
                  Page {meta.page} of {meta.totalPages} · {meta.total} students
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    aria-label="Previous page"
                  >
                    <ChevronLeft />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                    disabled={page >= meta.totalPages}
                    aria-label="Next page"
                  >
                    <ChevronRight />
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </Card>

      {/* Create */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent
          wide
          title="Add a student"
          description="The student is enrolled automatically in every subject for their semester and section."
        >
          <form
            onSubmit={handleSubmit((values) => create.mutate(values))}
            className="grid gap-4 sm:grid-cols-2"
            noValidate
          >
            <div className="space-y-1.5">
              <Label htmlFor="s-name">Full name</Label>
              <Input id="s-name" aria-invalid={!!errors.fullName} {...register('fullName')} />
              <FieldError>{errors.fullName?.message}</FieldError>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-email">Email</Label>
              <Input id="s-email" type="email" aria-invalid={!!errors.email} {...register('email')} />
              <FieldError>{errors.email?.message}</FieldError>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-password">Initial password</Label>
              <Input
                id="s-password"
                type="text"
                placeholder="Student@123"
                aria-invalid={!!errors.password}
                {...register('password')}
              />
              <FieldError>{errors.password?.message}</FieldError>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-phone">Phone (optional)</Label>
              <Input id="s-phone" {...register('phone')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-roll">Roll number</Label>
              <Input id="s-roll" aria-invalid={!!errors.rollNumber} {...register('rollNumber')} />
              <FieldError>{errors.rollNumber?.message}</FieldError>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-reg">Registration number</Label>
              <Input id="s-reg" aria-invalid={!!errors.registrationNo} {...register('registrationNo')} />
              <FieldError>{errors.registrationNo?.message}</FieldError>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-year">Admission year</Label>
              <Input
                id="s-year"
                type="number"
                aria-invalid={!!errors.admissionYear}
                {...register('admissionYear')}
              />
              <FieldError>{errors.admissionYear?.message}</FieldError>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-dept">Department</Label>
              <Select id="s-dept" aria-invalid={!!errors.departmentId} {...register('departmentId')}>
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
              <Label htmlFor="s-course">Course</Label>
              <Select id="s-course" aria-invalid={!!errors.courseId} {...register('courseId')}>
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
              <Label htmlFor="s-sem">Semester</Label>
              <Select id="s-sem" aria-invalid={!!errors.semesterId} {...register('semesterId')}>
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
              <Label htmlFor="s-section">Section</Label>
              <Select id="s-section" aria-invalid={!!errors.sectionId} {...register('sectionId')}>
                <option value="">Choose…</option>
                {(reference.data?.sections ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    Section {s.name}
                  </option>
                ))}
              </Select>
              <FieldError>{errors.sectionId?.message}</FieldError>
            </div>

            <div className="flex justify-end gap-2 pt-1 sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? 'Adding…' : 'Add student'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        {editing ? (
          <DialogContent title={`Edit ${editing.name}`} description={editing.rollNumber}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                update.mutate({
                  id: editing.id,
                  data: {
                    fullName: String(form.get('fullName')),
                    email: String(form.get('email')),
                    rollNumber: String(form.get('rollNumber')),
                    semesterId: String(form.get('semesterId')),
                    sectionId: String(form.get('sectionId')),
                    isActive: form.get('isActive') === 'on',
                  },
                });
              }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="e-name">Full name</Label>
                <Input id="e-name" name="fullName" defaultValue={editing.name} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-email">Email</Label>
                <Input id="e-email" name="email" type="email" defaultValue={editing.email} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-roll">Roll number</Label>
                <Input id="e-roll" name="rollNumber" defaultValue={editing.rollNumber} required />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="e-sem">Semester</Label>
                  <Select id="e-sem" name="semesterId" defaultValue={editing.semesterId}>
                    {(reference.data?.semesters ?? []).map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="e-section">Section</Label>
                  <Select id="e-section" name="sectionId" defaultValue={editing.sectionId}>
                    {(reference.data?.sections ?? []).map((s) => (
                      <option key={s.id} value={s.id}>
                        Section {s.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="isActive"
                  defaultChecked={editing.isActive}
                  className="h-4 w-4 rounded border-input text-primary"
                />
                Account is active
              </label>
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
        title="Remove this student?"
        message={`${pendingDelete?.name} (${pendingDelete?.rollNumber}) and all their attendance, marks and submissions will be permanently deleted.`}
        confirmLabel="Delete student"
        busy={remove.isPending}
        onConfirm={() => pendingDelete && remove.mutate(pendingDelete.id)}
      />
    </div>
  );
}
