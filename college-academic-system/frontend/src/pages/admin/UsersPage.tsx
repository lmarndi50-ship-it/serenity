import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { adminService } from '@/services';
import { errorMessage } from '@/services/api';
import { formatDate, formatRelative } from '@/utils/format';
import type { Role } from '@/types';
import { Badge, Button, Card, Input, Select } from '@/components/ui/primitives';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/states';

const ROLE_TONE: Record<Role, 'primary' | 'success' | 'assignment'> = {
  ADMIN: 'assignment',
  TEACHER: 'success',
  STUDENT: 'primary',
};

export function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<'' | Role>('');

  const params = { page: 1, pageSize: 50, ...(search ? { search } : {}), ...(role ? { role } : {}) };

  const users = useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: () => adminService.users(params),
  });

  const changeRole = useMutation({
    mutationFn: (payload: { id: string; role: Role }) =>
      adminService.updateUserRole(payload.id, payload.role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('Role updated. That user must sign in again.');
    },
    onError: (error) => toast.error(errorMessage(error, 'Could not change the role')),
  });

  const toggleActive = useMutation({
    mutationFn: (payload: { id: string; isActive: boolean }) =>
      adminService.setUserActive(payload.id, payload.isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('Account status updated');
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const rows = users.data?.data ?? [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Users &amp; Roles</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Change what an account can do, or deactivate it. Both actions sign that user out everywhere.
        </p>
      </header>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              aria-label="Search users"
              className="h-9 pl-9"
            />
          </div>
          <Select
            value={role}
            onChange={(e) => setRole(e.target.value as '' | Role)}
            aria-label="Filter by role"
            className="h-9 w-[160px]"
          >
            <option value="">All roles</option>
            <option value="STUDENT">Students</option>
            <option value="TEACHER">Teachers</option>
            <option value="ADMIN">Admins</option>
          </Select>
        </div>

        {users.isLoading ? (
          <TableSkeleton rows={8} columns={5} />
        ) : users.isError ? (
          <ErrorState message={errorMessage(users.error)} onRetry={() => void users.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState title="No users found" icon={<ShieldCheck className="h-5 w-5" />} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="px-5 py-2.5 text-left font-semibold">User</th>
                  <th scope="col" className="px-4 py-2.5 text-left font-semibold">Role</th>
                  <th scope="col" className="px-4 py-2.5 text-left font-semibold">Last sign-in</th>
                  <th scope="col" className="px-4 py-2.5 text-left font-semibold">Created</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const isSelf = row.id === currentUser?.id;
                  return (
                    <tr key={row.id} className="border-b border-border/70 last:border-0 hover:bg-muted/30">
                      <td className="px-5 py-3">
                        <p className="font-medium">
                          {row.fullName}
                          {isSelf ? (
                            <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                          ) : null}
                        </p>
                        <p className="text-xs text-muted-foreground">{row.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={ROLE_TONE[row.role]}>
                          {row.role.charAt(0) + row.role.slice(1).toLowerCase()}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {row.lastLoginAt ? formatRelative(row.lastLoginAt) : 'Never'}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {formatDate(row.createdAt)}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Select
                            value={row.role}
                            disabled={isSelf || changeRole.isPending}
                            onChange={(e) =>
                              changeRole.mutate({ id: row.id, role: e.target.value as Role })
                            }
                            aria-label={`Role for ${row.fullName}`}
                            className="h-8 w-[130px] text-xs"
                          >
                            <option value="STUDENT">Student</option>
                            <option value="TEACHER">Teacher</option>
                            <option value="ADMIN">Admin</option>
                          </Select>
                          <Button
                            size="sm"
                            variant={row.isActive ? 'ghost' : 'outline'}
                            disabled={isSelf || toggleActive.isPending}
                            onClick={() =>
                              toggleActive.mutate({ id: row.id, isActive: !row.isActive })
                            }
                          >
                            {row.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <p className="text-sm text-muted-foreground">
          A user can only be given a role their profile supports — an account with no teacher record
          cannot become a teacher. Create the profile first from the Teachers or Students page.
        </p>
      </Card>
    </div>
  );
}
