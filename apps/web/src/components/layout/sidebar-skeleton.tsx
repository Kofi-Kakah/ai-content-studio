export function SidebarSkeleton() {
  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background">
      <div className="hidden w-64 shrink-0 border-r bg-muted/40 md:block">
        <div className="h-full w-full animate-pulse p-3">
          <div className="mb-4 h-7 w-32 rounded-md bg-black/5 dark:bg-white/10" />
          <div className="mb-4 h-8 w-full rounded-lg bg-black/5 dark:bg-white/10" />
          <div className="grid gap-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-8 w-full rounded-lg bg-black/5 dark:bg-white/10" />
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-1 flex-col">
        <div className="h-12 border-b" />
        <div className="flex-1 animate-pulse p-6">
          <div className="mx-auto h-full max-w-3xl rounded-xl bg-black/5 dark:bg-white/10" />
        </div>
      </div>
    </div>
  );
}
