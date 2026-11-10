import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/layout/app-shell";
import { SidebarSkeleton } from "@/components/layout/sidebar-skeleton";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<SidebarSkeleton />}>
      <AuthGate>{children}</AuthGate>
    </Suspense>
  );
}

async function AuthGate({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return <AppShell>{children}</AppShell>;
}
