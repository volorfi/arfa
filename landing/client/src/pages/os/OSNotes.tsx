import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Archive, Edit2 } from "lucide-react";
import { OSLayout } from "./OSLayout";

export default function OSNotes() {
  const utils = trpc.useUtils();
  const { data: notesList } = trpc.os.listNotes.useQuery({ limit: 100 });
  const createNote = trpc.os.createNote.useMutation({ onSuccess: () => utils.os.listNotes.invalidate() });
  const updateNote = trpc.os.updateNote.useMutation({ onSuccess: () => utils.os.listNotes.invalidate() });

  const [editId,    setEditId]    = useState<string | null>(null);
  const [newTitle,  setNewTitle]  = useState("");
  const [newBody,   setNewBody]   = useState("");
  const [newAssetId,setNewAssetId]= useState("");
  const [showNew,   setShowNew]   = useState(false);

  return (
    <OSLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Analyst Notes</h1>
          <Button size="sm" className="gap-1.5" onClick={() => setShowNew(true)}>
            <Plus className="w-3.5 h-3.5" /> New Note
          </Button>
        </div>

        {showNew && (
          <div className="rounded-xl border p-4 space-y-3 bg-muted/20">
            <h3 className="font-semibold text-sm">New Note</h3>
            <input className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
              placeholder="Asset ID…" value={newAssetId} onChange={e => setNewAssetId(e.target.value)} />
            <input className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
              placeholder="Title…" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
            <textarea className="w-full border rounded-lg px-3 py-2 text-sm bg-background min-h-[120px] resize-none"
              placeholder="Body (markdown)…" value={newBody} onChange={e => setNewBody(e.target.value)} />
            <div className="flex gap-2">
              <Button size="sm"
                disabled={!newTitle || !newBody || !newAssetId || createNote.isPending}
                onClick={() => {
                  createNote.mutate({ assetId: newAssetId, noteType: "analysis", title: newTitle, bodyMarkdown: newBody, status: "active" });
                  setShowNew(false); setNewTitle(""); setNewBody(""); setNewAssetId("");
                }}>Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowNew(false)}>Cancel</Button>
            </div>
          </div>
        )}

        <div className="rounded-xl border divide-y">
          {(notesList ?? []).map(n => (
            <div key={n.noteId} className="px-4 py-3 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="font-medium text-sm">{n.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {n.identifier} · {n.noteType} · {new Date(n.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                    onClick={() => setEditId(n.noteId === editId ? null : n.noteId)}>
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground"
                    onClick={() => updateNote.mutate({ noteId: n.noteId, status: "archived" })}>
                    <Archive className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              {editId === n.noteId && (
                <div className="pt-2 space-y-2">
                  <textarea className="w-full border rounded-lg px-3 py-2 text-sm bg-background min-h-[100px] resize-none"
                    defaultValue={n.bodyMarkdown} id={`body-${n.noteId}`} />
                  <Button size="sm" disabled={updateNote.isPending}
                    onClick={() => {
                      const el = document.getElementById(`body-${n.noteId}`) as HTMLTextAreaElement;
                      updateNote.mutate({ noteId: n.noteId, bodyMarkdown: el.value });
                      setEditId(null);
                    }}>Save</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </OSLayout>
  );
}
