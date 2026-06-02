import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Pencil, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface EditableAdminCardProps {
  cardKey: string;
  title: string;          // resolved (override or default)
  description: string;    // resolved
  defaultTitle: string;   // original default (for the "reset" hint)
  defaultDescription: string;
  icon: React.ReactNode;
  iconWrapClass: string;  // e.g. "bg-primary/10"
  onClick: () => void;
  onSave: (title: string, description: string) => Promise<boolean>;
  editable: boolean;
}

/**
 * An admin panel card that an admin can rename in place.
 * Click the card to navigate; click the pencil (top-right) to edit its label.
 */
export default function EditableAdminCard({
  cardKey, title, description, defaultTitle, defaultDescription,
  icon, iconWrapClass, onClick, onSave, editable,
}: EditableAdminCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [t, setT] = useState(title);
  const [d, setD] = useState(description);
  const [saving, setSaving] = useState(false);

  const openEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setT(title);
    setD(description);
    setEditOpen(true);
  };

  const save = async () => {
    setSaving(true);
    const ok = await onSave(t.trim(), d.trim());
    setSaving(false);
    if (ok) { toast({ title: "Card updated" }); setEditOpen(false); }
    else toast({ variant: "destructive", title: "Could not save" });
  };

  return (
    <>
      <Card className="group relative cursor-pointer hover:shadow-lg transition-shadow" onClick={onClick}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${iconWrapClass}`}>{icon}</div>
            <div className="min-w-0">
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
        </CardContent>
        {editable && (
          <button
            onClick={openEdit}
            className="absolute top-2 right-2 hidden group-hover:flex h-7 w-7 items-center justify-center rounded-md bg-background/90 border text-muted-foreground hover:text-foreground shadow-sm"
            aria-label="Edit card label"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-sm" onClick={(e) => e.stopPropagation()}>
          <DialogHeader><DialogTitle>Edit card label</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Title</Label>
              <Input value={t} onChange={(e) => setT(e.target.value)} placeholder={defaultTitle} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={d} onChange={(e) => setD(e.target.value)} placeholder={defaultDescription} rows={2} />
            </div>
            <button
              className="text-xs text-muted-foreground hover:text-foreground underline"
              onClick={() => { setT(defaultTitle); setD(defaultDescription); }}
            >
              Reset to default
            </button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
