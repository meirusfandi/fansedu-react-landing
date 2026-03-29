/** Placeholder saat memuat daftar tryout (landing + LMS). */
export function TryoutListSkeleton({ rows = 3, className = '' }: { rows?: number; className?: string }) {
  return (
    <div className={`space-y-4 ${className}`.trim()} aria-busy="true" aria-label="Memuat daftar tryout">
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-[var(--border)] p-6 bg-[var(--card)] animate-pulse"
        >
          <div className="h-5 bg-[var(--bg-secondary)] rounded-lg w-2/5 max-w-xs mb-3" />
          <div className="h-3 bg-[var(--bg-secondary)] rounded w-full mb-2 opacity-80" />
          <div className="h-3 bg-[var(--bg-secondary)] rounded w-3/5 opacity-70" />
        </div>
      ))}
    </div>
  )
}

/** Varian LMS (gray) bila tidak pakai token tema landing. */
export function TryoutListSkeletonLms({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Memuat daftar tryout">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="border rounded-2xl p-6 bg-white animate-pulse">
          <div className="h-5 bg-gray-200 rounded-lg w-2/5 max-w-xs mb-3" />
          <div className="h-3 bg-gray-100 rounded w-full mb-2" />
          <div className="h-3 bg-gray-100 rounded w-3/5" />
        </div>
      ))}
    </div>
  )
}
