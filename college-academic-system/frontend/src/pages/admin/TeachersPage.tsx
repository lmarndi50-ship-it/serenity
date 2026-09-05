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
import type { AdminTeacher } from '@/types';

const teacherSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter the full name.').max(120),
  email: z.string().trim().email('Enter a valid email address.'),
  password: z
    .string()
    .min(8, 'At least 8 characters.')
    .regex(/[A-Z]/, 'Include an uppercase letter.')
    .regex(/[a-z]/, 'Include a lowercase letter.')
    .regex(/[0-9]/, 'Include a number.'),
  phone: z.string().trim().max(20).optional().or(z.literal('')),
  employeeCode: z.string().trim().min(2, 'Enter an employee code.').max(20),
  designation: z.string().trim().max(80).optional(),
  qualification: z.string().trim().max(120).optional(),
  departmentId: z.string().uuid('Choose a department.'),
});

type TeacherValues = z.infer<typeof teacherSchema>;

export function AdminTeachersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminTeacher | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminTeacher | null>(null);

  const reference = useQuery({
    queryKey: ['reference'],
    queryFn: referenceService.get,
    staleTime: 10 * 60 * 1000,
  });

  const params = { page: 1, pageSize: 50, ...(search ? { search } : {}) };
  const teachers = useQuery({
    queryKey: ['admin', 'teachers', params],
    queryFn: () => adminService.teachers(params),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TeacherValues>({ resolver: zodResolver(teacherSchema) });

  const create = useMutation({
    mutationFn: (values: TeacherValues) =>
      adminService.createTeacher({ ...values, phone: values.phone || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      toast.success('Teacher added');
      setFormOpen(false);
      reset();
    },
    onError: (error) => toast.error(errorMessage(error, 'Could not add the teacher')),
  });

  const update = useMutation({
    mutationFn: (payload: { id: string; data: Record<string, unknown> }) =>
      adminService.updateTeacher(payload.id, payload.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      toast.success('Teacher updated');
      setEditing(null);
    },
    onError: (error) => toast.error(errorMessage(error, 'Could not update the teacher')),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminService.deleteTeacher(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      toast.success('Teacher removed');
      setPendingDelete(null);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const rows = teachers.data?.data ?? [];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Teachers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Faculty records and their subject allocations.
          </p>
        </div>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus />
          Add teacher
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
              placeholder="Search teachers…"
              aria-label="Search teachers"
              className="h-9 pl-9"
            />
          </div>
        </div>

        {teachers.isLoading ? (
          <TableSkeleton rows={5} columns={5} />
        ) : teachers.isError ? (
          <ErrorState message={errorMessage(teachers.error)} onRetry={() => void teachers.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState title="No teachers found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="px-5 py-2.5 text-left font-semibold">Code</th>
                  <th scope="col" className="px-4 py-2.5 text-left font-semibold">Name</th>
                  <th scope="col" className="px-4 py-2.5 text-left font-semibold">Designation</th>
                  <th scope="col" className="px-4 py-2.5 text-left font-semibold">Department</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-semibold">Subjects</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((teacher) => (
                  <tr key={teacher.id} className="border-b border-border/70 last:border-0 hover:bg-muted/30">
                    <td className="px-5 py-3 font-mono text-xs font-semibold">{teacher.employeeCode}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{teacher.name}</p>
                      <p className="text-xs text-muted-foreground">{teacher.email}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{teacher.designation}</td>
                    <td className="px-4 py-3 text-muted-foreground">{teacher.department}</td>
                    <td className="px-4 py-3 text-right">
                      <Badge tone={teacher.subjectCount > 0 ? 'primary' : 'neutral'}>
                        {teacher.subjectCount}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => setEditing(teacher)}
                          aria-label={`Edit ${teacher.name}`}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => setPendingDelete(teacher)}
                          aria-label={`Delete ${teacher.name}`}
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
        <DialogContent wide title="Add a teacher">
          <form
            onSubmit={handleSubmit((values) => create.mutate(values))}
            className="grid gap-4 sm:grid-cols-2"
            noValidate
          >
            <div className="space-y-1.5">
              <Label htmlFor="t-name">Full name</Label>
              <Input id="t-name" aria-invalid={!!errors.fullName} {...register('fullName')} />
              <FieldError>{errors.fullName?.message}</FieldError>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-email">Email</Label>
              <Input id="t-email" type="email" aria-invalid={!!errors.email} {...register('email')} />
              <FieldError>{errors.email?.message}</FieldError>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-password">Initial password</Label>
              <Input
                id="t-password"
                placeholder="Teacher@123"
                aria-invalid={!!errors.password}
                {...register('password')}
              />
              <FieldError>{errors.password?.message}</FieldError>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-code">Employee code</Label>
              <Input id="t-code" aria-invalid={!!errors.employeeCode} {...register('employeeCode')} />
              <FieldError>{errors.employeeCode?.message}</FieldError>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-designation">Designation</Label>
              <Input id="t-designation" placeholder="Assistant Professor" {...register('designation')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-qualification">Qualification</Label>
              <Input id="t-qualification" placeholder="Ph.D." {...register('qualification')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-phone">Phone (optional)</Label>
              <Input id="t-phone" {...register('phone')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-dept">Department</Label>
              <Select id="t-dept" aria-invalid={!!errors.departmentId} {...register('departmentId')}>
                <option value="">Choose…</option>
                {(reference.data?.departments ?? []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
              <FieldError>{errors.departmentId?.message}</FieldError>
            </div>

            <div className="flex justify-end gap-2 pt-1 sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? 'Adding…' : 'Add teacher'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        {editing ? (
          <DialogContent title={`Edit ${editing.name}`} description={editing.employeeCode}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                update.mutate({
                  id: editing.id,
                  data: {
                    fullName: String(form.get('fullName')),
                    email: String(form.get('email')),
                    designation: String(form.get('designation')),
                    departmentId: String(form.get('departmentId')),
                  },
                });
              }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="te-name">Full name</Label>
                <Input id="te-name" name="fullName" defaultValue={editing.name} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="te-email">Email</Label>
                <Input id="te-email" name="email" type="email" defaultValue={editing.email} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="te-designation">Designation</Label>
                <Input id="te-designation" name="designation" defaultValue={editing.designation} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="te-dept">Department</Label>
                <Select id="te-dept" name="departmentId" defaultValue={editing.departmentId}>
                  {(reference.data?.departments ?? []).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
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
        title="Remove this teacher?"
        message={`${pendingDelete?.name} will be deleted. Their subjects will be left unassigned.`}
        confirmLabel="Delete teacher"
        busy={remove.isPending}
        onConfirm={() => pendingDelete && remove.mutate(pendingDelete.id)}
      />
    </div>
  );
}
