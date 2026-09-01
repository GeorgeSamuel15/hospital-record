/** A row skeleton resembling a list item with an avatar/icon, two text lines, and a trailing badge. */
export function SkeletonListRows({ count = 5 }: { count?: number }) {
  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-800">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 flex-shrink-0 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
            <div className="space-y-1.5">
              <div className="h-3.5 w-40 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
              <div className="h-3 w-28 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
            </div>
          </div>
          <div className="h-5 w-16 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
        </div>
      ))}
    </div>
  );
}

/** A grid of card-shaped skeletons, e.g. for stat cards or department tiles. */
export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card space-y-2 p-4">
          <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          <div className="h-5 w-12 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          <div className="h-3 w-20 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
        </div>
      ))}
    </div>
  );
}

/** A table skeleton with a header bar and several row placeholders. */
export function SkeletonTable({ rows = 6, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="overflow-hidden">
      <div className="flex gap-4 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-3 w-20 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-3.5">
            {Array.from({ length: columns }).map((__, j) => (
              <div key={j} className="h-3.5 w-24 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
