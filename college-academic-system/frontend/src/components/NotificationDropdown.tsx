import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  BellOff,
  CalendarClock,
  CheckCheck,
  ClipboardList,
  Megaphone,
  UserCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { notificationService } from '@/services';
import { errorMessage } from '@/services/api';
import { cn } from '@/lib/utils';
import { formatRelative } from '@/utils/format';
import type { NotificationType } from '@/types';
import { Button } from './ui/primitives';
import { EmptyState, LoadingSpinner } from './ui/states';

const ICONS: Record<NotificationType, typeof Bell> = {
  ATTENDANCE: UserCheck,
  TEST: ClipboardList,
  ASSIGNMENT: CalendarClock,
  NOTICE: Megaphone,
  GENERAL: Bell,
};

const TONES: Record<NotificationType, string> = {
  ATTENDANCE: 'bg-warning-soft text-warning-foreground',
  TEST: 'bg-primary-soft text-primary',
  ASSIGNMENT: 'bg-assignment-soft text-assignment-foreground',
  NOTICE: 'bg-success-soft text-success-foreground',
  GENERAL: 'bg-muted text-muted-foreground',
};

export function NotificationDropdown() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationService.list,
    // Warnings are raised by the API as attendance is saved, so poll gently.
    refetchInterval: 60_000,
  });

  const markRead = useMutation({
    mutationFn: notificationService.markRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAll = useMutation({
    mutationFn: notificationService.markAllRead,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['student', 'dashboard'] });
      toast.success(`${result.updated} notification${result.updated === 1 ? '' : 's'} marked as read`);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const unread = data?.unread ?? 0;
  const notifications = data?.notifications ?? [];

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="relative flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-border bg-card shadow-pop data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            {unread > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAll.mutate()}
                disabled={markAll.isPending}
              >
                <CheckCheck />
                Mark all as read
              </Button>
            )}
          </div>

          <div className="scrollbar-slim max-h-[26rem] overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center py-10">
                <LoadingSpinner label="Loading notifications" />
              </div>
            ) : isError ? (
              <EmptyState title="Could not load notifications" icon={<BellOff className="h-5 w-5" />} />
            ) : notifications.length === 0 ? (
              <EmptyState
                title="You're all caught up"
                message="New notices, marks and attendance alerts will appear here."
                icon={<BellOff className="h-5 w-5" />}
              />
            ) : (
              <ul className="divide-y divide-border">
                {notifications.slice(0, 20).map((item) => {
                  const Icon = ICONS[item.type] ?? Bell;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => {
                          if (!item.isRead) markRead.mutate(item.id);
                          if (item.link) navigate(item.link);
                        }}
                        className={cn(
                          'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60',
                          !item.isRead && 'bg-primary-soft/40',
                        )}
                      >
                        <span
                          className={cn(
                            'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                            TONES[item.type],
                          )}
                        >
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-sm font-semibold">{item.title}</span>
                            {!item.isRead && (
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-label="Unread" />
                            )}
                          </span>
                          <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                            {item.message}
                          </span>
                          <span className="mt-1 block text-[11px] text-muted-foreground">
                            {formatRelative(item.createdAt)}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
