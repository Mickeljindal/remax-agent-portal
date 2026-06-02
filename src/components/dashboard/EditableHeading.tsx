import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Pencil, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useSectionLabels } from "@/hooks/useSectionLabels";

interface EditableHeadingProps {
  sectionKey: string;
  defaultTitle: string;
  defaultSubtitle?: string;
  isAdmin: boolean;
  /** Render the resolved title/subtitle. */
  children: (label: { title: string; subtitle: string }) => React.ReactNode;
}

/**
 * Wraps a section heading. Agents see the (possibly overridden) title.
 * Admins get a pencil to edit the title + subtitle inline (saved to section_labels).
 */
export default function EditableHeading({ sectionKey, defaultTitle, defaultSubtitle = "", isAdmin, children }: EditableHeadingProps) {
  const { label, saveLabel } = useSectionLabels();
  const resolved = label(sectionKey, defaultTitle, defaultSubtitle);
  const [open, setOpen] = useState(false);
  const [t, setT] = useState(resolved.title);
  const [s, setS] = useState(resolved.subtitle);
  const [saving, setSaving] = useState(false);

  const openEdit = () => { setT(resolved.title); setS(resolved.subtitle); setOpen(true); };

  const save = async () => {
    setSaving(true);
    const ok = await saveLabel(sectionKey, t.trim(), s.trim());
    setSaving(false);
    if (ok) { toast({ title: "Heading updated" }); setOpen(false); }
    else toast({ variant: "destructive", title: "Could not save" });
  };

  return (
    <div className="group/heading relative inline-flex w-full items-start">
      <div className="flex-1">{children(resolved)}</div>
      {isAdmin && (
        <button
          onClick={openEdit}
          className="ml-2 mt-1 hidden group-hover/heading:flex h-7 w-7 shrink-0 items-center justify-center rounded-md border bg-background/90 text-muted-foreground hover:text-foreground shadow-sm"
          aria-label="Edit heading"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Edit section heading</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={t} onChange={(e) => setT(e.target.value)} placeholder={defaultTitle} /></div>
            <div><Label>Subtitle</Label><Input value={s} onChange={(e) => setS(e.target.value)} placeholder={defaultSubtitle} /></div>
            <button className="text-xs text-muted-foreground underline hover:text-foreground" onClick={() => { setT(defaultTitle); setS(defaultSubtitle); }}>
              Reset to default
            </button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
