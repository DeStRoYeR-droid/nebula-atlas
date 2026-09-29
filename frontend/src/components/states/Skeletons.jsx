// Loading placeholders that match the final layout, so nothing jumps when data arrives.

export function LoadingAnnouncement({ label = 'Loading nebulae…' }) {
  return (
    <p role="status" className="sr-only">
      {label}
    </p>
  );
}

export function PuzzleSkeleton() {
  return (
    <div aria-hidden="true" className="grid size-full grid-cols-4 grid-rows-4">
      {Array.from({ length: 15 }, (_, index) => (
        <div key={index} className="p-1 sm:p-1.5">
          <div className="skeleton size-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ count = 6 }) {
  return (
    <ul aria-hidden="true" className="grid gap-4 lg:grid-cols-2">
      {Array.from({ length: count }, (_, index) => (
        <li key={index} className="glass flex gap-4 rounded-2xl p-3 sm:p-4">
          <div className="skeleton aspect-[4/3] w-[40%] shrink-0 rounded-xl sm:w-48 lg:w-56" />
          <div className="flex flex-1 flex-col gap-3 py-1">
            <div className="skeleton h-5 w-2/3 rounded" />
            <div className="skeleton h-3 w-1/2 rounded" />
            <div className="skeleton h-3 w-full rounded" />
            <div className="skeleton h-3 w-5/6 rounded" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function CardSkeleton({ count = 4 }) {
  return (
    <ul aria-hidden="true" className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <li key={index} className="glass overflow-hidden rounded-2xl">
          <div className="skeleton aspect-[16/9]" />
          <div className="flex flex-col gap-3 p-5">
            <div className="skeleton h-5 w-1/2 rounded" />
            <div className="skeleton h-3 w-full rounded" />
            <div className="skeleton h-3 w-4/5 rounded" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Fallback while a lazily loaded page's code downloads. */
export function PageLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <LoadingAnnouncement label="Loading page…" />
      <div aria-hidden="true" className="flex flex-col gap-4">
        <div className="skeleton h-8 w-1/2 rounded" />
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="skeleton mt-4 h-64 w-full rounded-2xl" />
      </div>
    </div>
  );
}
