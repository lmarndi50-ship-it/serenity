import { useMemo, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button, Input } from './ui/primitives';
import { EmptyState, TableSkeleton } from './ui/states';

export interface Column<T> {
  key: string;
  header: string;
  /** Cell renderer. Falls back to the raw value at `key`. */
  render?: (row: T) => ReactNode;
  /** Value used for sorting; omit to make the column unsortable. */
  sortValue?: (row: T) => string | number;
  className?: string;
  headerClassName?: string;
  /** Hidden below `sm`, so narrow screens show only the essentials. */
  hideOnMobile?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  isLoading?: boolean;
  /** Enables the built-in search box; return the text to match against. */
  searchable?: (row: T) => string;
  searchPlaceholder?: string;
  pageSize?: number;
  emptyTitle?: string;
  emptyMessage?: string;
  toolbar?: ReactNode;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  isLoading,
  searchable,
  searchPlaceholder = 'Search…',
  pageSize = 10,
  emptyTitle = 'Nothing to show yet',
  emptyMessage,
  toolbar,
  onRowClick,
}: DataTableProps<T>) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(null);

  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return rows;
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => searchable(row).toLowerCase().includes(needle));
  }, [rows, query, searchable]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const column = columns.find((c) => c.key === sort.key);
    if (!column?.sortValue) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = column.sortValue!(a);
      const bv = column.sortValue!(b);
      const cmp =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv));
      return sort.dir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sort, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const visible = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const toggleSort = (key: string) => {
    setSort((current) => {
      if (current?.key !== key) return { key, dir: 'asc' };
      if (current.dir === 'asc') return { key, dir: 'desc' };
      return null;
    });
  };

  return (
    <div className="flex flex-col">
      {(searchable || toolbar) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
          {searchable ? (
            <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="h-9 pl-9"
              />
            </div>
          ) : (
            <div />
          )}
          {toolbar ? <div className="flex flex-wrap items-center gap-2">{toolbar}</div> : null}
        </div>
      )}

      {isLoading ? (
        <TableSkeleton columns={columns.length} />
      ) : visible.length === 0 ? (
        <EmptyState
          title={emptyTitle}
          message={emptyMessage ?? (query ? 'No rows match your search.' : undefined)}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {columns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className={cn(
                      'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground',
                      column.hideOnMobile && 'hidden sm:table-cell',
                      column.headerClassName,
                    )}
                  >
                    {column.sortValue ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column.key)}
                        className="inline-flex items-center gap-1 rounded-sm transition-colors hover:text-foreground"
                        aria-label={`Sort by ${column.header}`}
                      >
                        {column.header}
                        {sort?.key === column.key ? (
                          sort.dir === 'asc' ? (
                            <ArrowUp className="h-3 w-3" aria-hidden="true" />
                          ) : (
                            <ArrowDown className="h-3 w-3" aria-hidden="true" />
                          )
                        ) : (
                          <ChevronsUpDown className="h-3 w-3 opacity-40" aria-hidden="true" />
                        )}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    'border-b border-border/70 last:border-0 transition-colors',
                    onRowClick ? 'cursor-pointer hover:bg-primary-soft/60' : 'hover:bg-muted/40',
                  )}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        'px-4 py-3 align-middle',
                        column.hideOnMobile && 'hidden sm:table-cell',
                        column.className,
                      )}
                    >
                      {column.render
                        ? column.render(row)
                        : String((row as Record<string, unknown>)[column.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && sorted.length > pageSize && (
        <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
          <p className="text-xs text-muted-foreground">
            Showing <strong>{(safePage - 1) * pageSize + 1}</strong>–
            <strong>{Math.min(safePage * pageSize, sorted.length)}</strong> of{' '}
            <strong>{sorted.length}</strong>
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              aria-label="Previous page"
            >
              <ChevronLeft />
            </Button>
            <span className="px-2 text-xs font-medium text-muted-foreground">
              {safePage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              aria-label="Next page"
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
