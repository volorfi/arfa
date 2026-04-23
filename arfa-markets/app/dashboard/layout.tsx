import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createServerSupabase } from "@/lib/supabase";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

/**
 * Dashboard layout — auth gate + shell.
 *
 * Middleware already redirects unauthenticated requests to /login, but we
 * re-check here as defence in depth. The shell itself is a client
 * component so it can host the mobile drawer state.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerSupabase(cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  return <DashboardShell>{children}</DashboardShell>;
}
