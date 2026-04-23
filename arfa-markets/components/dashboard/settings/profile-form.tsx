"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { updateDisplayName } from "@/app/actions/user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";

export function ProfileForm({
  initialName,
  email,
}: {
  initialName: string;
  email: string;
}) {
  const router = useRouter();
  const [name, setName] = React.useState(initialName);
  const [pending, startTransition] = React.useTransition();
  const [msg, setMsg] = React.useState<
    { kind: "success" | "error"; text: string } | null
  >(null);

  const dirty = name.trim() !== initialName.trim();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const form = new FormData();
    form.set("name", name);
    startTransition(async () => {
      const res = await updateDisplayName(form);
      if (res.ok) {
        setMsg({ kind: "success", text: "Display name updated." });
        router.refresh();
      } else {
        setMsg({
          kind: "error",
          text: res.error ?? "Something went wrong. Try again.",
        });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Display name</Label>
        <Input
          id="name"
          name="name"
          value={name}
          maxLength={120}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" value={email} readOnly disabled />
        <p className="text-xs text-text-faint">
          Email changes are managed through your sign-in provider.
        </p>
      </div>

      {msg && (
        <Alert variant={msg.kind === "success" ? "success" : "destructive"}>
          {msg.text}
        </Alert>
      )}

      <div>
        <Button type="submit" disabled={!dirty || pending}>
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Save changes"
          )}
        </Button>
      </div>
    </form>
  );
}
