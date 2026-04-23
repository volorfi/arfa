"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { createBrowserSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";

/**
 * Password change form.
 *
 * Supabase's `updateUser({ password })` does NOT require the current
 * password — the user's active session cookie is the proof. We still
 * validate length + confirm-match on the client for UX.
 */
export function PasswordForm() {
  const supabase = React.useMemo(() => createBrowserSupabase(), []);

  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [msg, setMsg] = React.useState<
    { kind: "success" | "error"; text: string } | null
  >(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (password.length < 8) {
      setMsg({
        kind: "error",
        text: "Password must be at least 8 characters.",
      });
      return;
    }
    if (password !== confirm) {
      setMsg({ kind: "error", text: "Passwords don't match." });
      return;
    }

    setPending(true);
    const { error } = await supabase.auth.updateUser({ password });
    setPending(false);

    if (error) {
      setMsg({ kind: "error", text: error.message });
      return;
    }
    setMsg({ kind: "success", text: "Password updated." });
    setPassword("");
    setConfirm("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-password">New password</Label>
        <Input
          id="new-password"
          name="new-password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirm-password">Confirm new password</Label>
        <Input
          id="confirm-password"
          name="confirm-password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>

      {msg && (
        <Alert variant={msg.kind === "success" ? "success" : "destructive"}>
          {msg.text}
        </Alert>
      )}

      <div>
        <Button
          type="submit"
          disabled={
            pending || password.length < 8 || password !== confirm
          }
        >
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Updating…
            </>
          ) : (
            "Update password"
          )}
        </Button>
      </div>
    </form>
  );
}
