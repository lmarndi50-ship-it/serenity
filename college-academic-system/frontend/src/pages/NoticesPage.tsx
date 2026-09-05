import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Megaphone, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { noticeService, referenceService } from '@/services';
import { errorMessage } from '@/services/api';
import { formatDate, formatRelative } from '@/utils/format';
import {
  Badge,
  Button,
  Card,
  FieldError,
  Input,
  Label,
  Select,
  Skeleton,
  Textarea,
} from '@/components/ui/primitives';
import { ConfirmDialog, Dialog, DialogContent } from '@/components/ui/dialog';
import { EmptyState, ErrorState } from '@/components/ui/states';

const noticeSchema = z.object({
  title: z.string().trim().min(3, 'Enter a title.').max(140),
  body: z.string().trim().min(3, 'Enter the notice text.').max(4000),
  audience: z.enum(['ALL', 'STUDENTS', 'TEACHERS', 'DEPARTMENT']),
  departmentId: z.string().optional(),
});

type NoticeValues = z.infer<typeof noticeSchema>;

export function NoticesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [composerOpen, setComposerOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const isAdmin = user?.role === 'ADMIN';

  const notices = useQuery({ queryKey: ['notices'], queryFn: noticeService.list });
  const reference = useQuery({
    queryKey: ['reference'],
    queryFn: referenceService.get,
    staleTime: 10 * 60 * 1000,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<NoticeValues>({
    resolver: zodResolver(noticeSchema),
    defaultValues: { audience: 'ALL' },
  });

  const audience = watch('audience');

  const create = useMutation({
    mutationFn: (values: NoticeValues) =>
      noticeService.create({
        ...values,
        departmentId: values.audience === 'DEPARTMENT' ? values.departmentId : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notices'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Notice published');
      setComposerOpen(false);
      reset({ audience: 'ALL', title: '', body: '' });
    },
    onError: (error) => toast.error(errorMessage(error, 'Could not publish the notice')),
  });

  const remove = useMutation({
    mutationFn: noticeService.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notices'] });
      toast.success('Notice removed');
      setPendingDelete(null);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notices</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Announcements from the department and the administration.
          </p>
        </div>
        {isAdmin ? (
          <Button size="sm" onClick={() => setComposerOpen(true)}>
            <Plus />
            New notice
          </Button>
        ) : null}
      </header>

      {notices.isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-5 w-64" />
              <Skeleton className="mt-3 h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-3/4" />
            </Card>
          ))}
        </div>
      ) : notices.isError ? (
        <Card>
          <ErrorState message={errorMessage(notices.error)} onRetry={() => void notices.refetch()} />
        </Card>
      ) : (notices.data ?? []).length === 0 ? (
        <Card>
          <EmptyState
            title="No notices"
            message="Announcements will appear here as they are published."
            icon={<Megaphone className="h-5 w-5" />}
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {notices.data!.map((notice) => (
            <Card key={notice.id} interactive className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold tracking-tight">{notice.title}</h2>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge tone="primary">{notice.audience.toLowerCase()}</Badge>
                    {notice.department ? <span>{notice.department.name}</span> : null}
                    <span>·</span>
                    <span>{formatDate(notice.publishedAt)}</span>
                    <span>({formatRelative(notice.publishedAt)})</span>
                  </div>
                </div>
                {isAdmin ? (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setPendingDelete(notice.id)}
                    aria-label={`Delete notice: ${notice.title}`}
                  >
                    <Trash2 className="text-danger" />
                  </Button>
                ) : null}
              </div>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {notice.body}
              </p>
              {notice.author ? (
                <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
                  Posted by {notice.author.fullName}
                </p>
              ) : null}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={composerOpen} onOpenChange={setComposerOpen}>
        <DialogContent title="Publish a notice" description="Everyone in the audience is notified.">
          <form
            onSubmit={handleSubmit((values) => create.mutate(values))}
            className="space-y-4"
            noValidate
          >
            <div className="space-y-1.5">
              <Label htmlFor="notice-title">Title</Label>
              <Input id="notice-title" aria-invalid={!!errors.title} {...register('title')} />
              <FieldError>{errors.title?.message}</FieldError>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notice-body">Notice</Label>
              <Textarea id="notice-body" rows={6} aria-invalid={!!errors.body} {...register('body')} />
              <FieldError>{errors.body?.message}</FieldError>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="notice-audience">Audience</Label>
                <Select id="notice-audience" {...register('audience')}>
                  <option value="ALL">Everyone</option>
                  <option value="STUDENTS">Students only</option>
                  <option value="TEACHERS">Faculty only</option>
                  <option value="DEPARTMENT">A single department</option>
                </Select>
              </div>
              {audience === 'DEPARTMENT' ? (
                <div className="space-y-1.5">
                  <Label htmlFor="notice-department">Department</Label>
                  <Select id="notice-department" {...register('departmentId')}>
                    <option value="">Choose a department</option>
                    {(reference.data?.departments ?? []).map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </Select>
                </div>
              ) : null}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setComposerOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || create.isPending}>
                {create.isPending ? 'Publishing…' : 'Publish notice'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete this notice?"
        message="It will be removed for everyone. This cannot be undone."
        confirmLabel="Delete notice"
        busy={remove.isPending}
        onConfirm={() => pendingDelete && remove.mutate(pendingDelete)}
      />
    </div>
  );
}
