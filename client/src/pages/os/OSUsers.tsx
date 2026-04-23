import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { UserCheck, UserX } from "lucide-react";
import { OSLayout } from "./OSLayout";

const roleBadge: Record<string, string> = {
  admin:      "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  subscriber: "bg-blue-100   text-blue-700   dark:bg-blue-900/40   dark:text-blue-300",
  user:       "bg-slate-100  text-slate-600  dark:bg-slate-800     dark:text-slate-400",
};

export default function OSUsers() {
  const utils = trpc.useUtils();
  const { data: users, isLoading } = trpc.os.listUsers.useQuery({ limit: 200 });
  const setRole = trpc.os.setUserRole.useMutation({ onSuccess: () => utils.os.listUsers.invalidate() });
  const [search, setSearch] = useState("");

  const filtered = (users ?? []).filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <OSLayout>
      <div className="space-y-4">
        <h1 className="text-xl font-bold">User Management</h1>
        <input
          className="border rounded-lg px-3 py-2 text-sm w-full max-w-sm bg-background"
          placeholder="Search by name or email…"
          value={search} onChange={e => setSearch(e.target.value)}
        />
        <div className="rounded-xl border overflow-hidden">
          {isLoading ? (
            <div className="divide-y">{Array.from({length:8}).map((_,i)=><div key={i} className="h-14 animate-pulse bg-muted/30 m-2 rounded"/>)}</div>
          ) : (
            <div className="divide-y">
              {filtered.map(u => (
                <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email ?? "no email"}</p>
                  </div>
                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", roleBadge[u.role ?? "user"])}>
                    {u.role}
                  </span>
                  <div className="flex gap-1.5">
                    {u.role !== "subscriber" && u.role !== "admin" && (
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                        disabled={setRole.isPending}
                        onClick={() => setRole.mutate({ userId: u.id, role: "subscriber" })}>
                        <UserCheck className="w-3 h-3" /> Grant
                      </Button>
                    )}
                    {u.role === "subscriber" && (
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-red-600"
                        disabled={setRole.isPending}
                        onClick={() => setRole.mutate({ userId: u.id, role: "user" })}>
                        <UserX className="w-3 h-3" /> Revoke
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{filtered.length} users · Subscribers get access to the Insights section.</p>
      </div>
    </OSLayout>
  );
}
