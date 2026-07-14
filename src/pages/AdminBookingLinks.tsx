import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useBookingLinks, type BookingLink } from "@/hooks/useBookingLinks";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, CalendarClock, Plus, Trash2, Save, ChevronUp, ChevronDown } from "lucide-react";
import remaxLogo from "@/assets/remax-excellence-logo.png";

export default function AdminBookingLinks() {
  const navigate = useNavigate();
  const { user, loading, isAdmin } = useAuth();
  const { setting, loading: loadingData, save } = useBookingLinks();
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [links, setLinks] = useState<BookingLink[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
    else if (!loading && !isAdmin) { navigate("/dashboard"); toast({ variant: "destructive", title: "Access denied" }); }
  }, [user, loading, isAdmin, navigate]);

  useEffect(() => {
    if (!loadingData) {
      setTitle(setting.title);
      setSubtitle(setting.subtitle);
      setLinks(setting.links);
    }
  }, [loadingData, setting]);

  const update = (i: number, key: keyof BookingLink, value: string) =>
    setLinks((prev) => prev.map((l, idx) => (idx === i ? { ...l, [key]: value } : l)));
  const add = () => setLinks((prev) => [...prev, { label: "", url: "", email: "", phone: "", note: "" }]);
  const remove = (i: number) => setLinks((prev) => prev.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => {
    const t = i + dir;
    if (t < 0 || t >= links.length) return;
    const next = [...links];
    [next[i], next[t]] = [next[t], next[i]];
    setLinks(next);
  };

  const handleSave = async () => {
    const clean = links
      .map((l) => ({
        label: l.label.trim(),
        url: (l.url || "").trim(),
        email: (l.email || "").trim(),
        phone: (l.phone || "").trim(),
        note: (l.note || "").trim(),
      }))
      .filter((l) => l.label && (l.url || l.email || l.phone));
    setSaving(true);
    const ok = await save({ title: title.trim() || "Book a meeting", subtitle: subtitle.trim(), links: clean });
    setSaving(false);
    if (ok) { setLinks(clean); toast({ title: "Booking links saved", description: "Agents see these under Support." }); }
    else toast({ variant: "destructive", title: "Could not save" });
  };

  if (loading || (!isAdmin && user) || loadingData) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground shadow-lg">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <img src={remaxLogo} alt="" className="h-10 w-auto brightness-0 invert object-contain" />
          </div>
          <h1 className="font-display text-xl font-semibold">Booking Links</h1>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-4 py-8 space-y-5">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><CalendarClock className="h-6 w-6 text-primary" /> Meeting Booking Links</h2>
          <p className="text-sm text-muted-foreground mt-1">
            These appear under the Support section so agents can reach out. For each person, add a booking
            URL (e.g. Calendly), and/or an email and WhatsApp number — agents get a button for each option you fill in.
          </p>
        </div>

        <Card>
          <CardContent className="pt-5 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Section title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Book a 1-on-1 meeting" />
              </div>
              <div>
                <Label className="text-xs">Subtitle</Label>
                <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Pick a time that works for you" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {links.map((l, i) => (
            <Card key={i}>
              <CardContent className="pt-4 flex items-start gap-3">
                <div className="flex flex-col pt-1">
                  <button className="text-muted-foreground hover:text-foreground disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)}><ChevronUp className="h-4 w-4" /></button>
                  <button className="text-muted-foreground hover:text-foreground disabled:opacity-30" disabled={i === links.length - 1} onClick={() => move(i, 1)}><ChevronDown className="h-4 w-4" /></button>
                </div>
                <div className="flex-1 grid gap-2 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs">Button label *</Label>
                    <Input value={l.label} onChange={(e) => update(i, "label", e.target.value)} placeholder="Book with Aman" />
                  </div>
                  <div>
                    <Label className="text-xs">Booking URL (optional)</Label>
                    <Input value={l.url || ""} onChange={(e) => update(i, "url", e.target.value)} placeholder="https://calendly.com/..." />
                  </div>
                  <div>
                    <Label className="text-xs">Email (optional)</Label>
                    <Input type="email" value={l.email || ""} onChange={(e) => update(i, "email", e.target.value)} placeholder="aman@remaxex.com" />
                  </div>
                  <div>
                    <Label className="text-xs">Phone / WhatsApp (optional)</Label>
                    <Input value={l.phone || ""} onChange={(e) => update(i, "phone", e.target.value)} placeholder="+1 (416) 520-3462" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs">Note (optional)</Label>
                    <Input value={l.note || ""} onChange={(e) => update(i, "note", e.target.value)} placeholder="e.g. Email or message to request a meeting" />
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive mt-5" onClick={() => remove(i)}><Trash2 className="h-4 w-4" /></Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <Button variant="outline" className="gap-1.5" onClick={add}><Plus className="h-4 w-4" /> Add link</Button>
          <Button className="gap-1.5" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
          </Button>
        </div>
      </main>
    </div>
  );
}
