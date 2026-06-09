import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft, Loader2, FileText, Search, Eye, Phone, Mail, Building2,
} from "lucide-react";
import { format } from "date-fns";
import remaxLogo from "@/assets/remax-excellence-logo.png";
import { useAdminCardLabels } from "@/hooks/useAdminCardLabels";

interface Worksheet {
  id: string;
  agent_id: string | null;
  project_name: string;
  model_name: string | null;
  floor_type: string | null;
  direction_exposure: string | null;
  choices: string[] | null;
  need_parking: boolean;
  need_locker: boolean;
  worksheet_date: string | null;
  additional_comments: string | null;
  brokerage_name: string | null;
  broker_agent_name: string | null;
  broker_agent_email: string | null;
  broker_office_phone: string | null;
  broker_cell_phone: string | null;
  broker_reco_number: string | null;
  purchasers: any[];
  id_attachment_filename: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

const STATUS_OPTIONS = ["submitted", "reviewed", "processed", "archived"];
const statusColors: Record<string, string> = {
  submitted: "bg-blue-100 text-blue-800",
  reviewed: "bg-amber-100 text-amber-800",
  processed: "bg-green-100 text-green-800",
  archived: "bg-muted text-muted-foreground",
};

export default function AdminWorksheets() {
  const navigate = useNavigate();
  const { user, loading, isAdmin } = useAuth();
  const { label: cardLabel } = useAdminCardLabels();
  const pageLabel = cardLabel("worksheets", "Pre-con worksheets", "View & manage worksheet submissions");
  const [worksheets, setWorksheets] = useState<Worksheet[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<Worksheet | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
    else if (!loading && !isAdmin) { navigate("/dashboard"); toast({ variant: "destructive", title: "Access denied" }); }
  }, [user, loading, isAdmin]);

  useEffect(() => { if (isAdmin) fetchData(); }, [isAdmin]);

  const fetchData = async () => {
    setLoadingData(true);
    const { data } = await supabase
      .from("precon_worksheets")
      .select("*")
      .order("created_at", { ascending: false });
    setWorksheets((data as Worksheet[]) || []);
    setLoadingData(false);
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("precon_worksheets").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    setWorksheets((prev) => prev.map((w) => (w.id === id ? { ...w, status } : w)));
    if (selected?.id === id) setSelected({ ...selected, status });
    toast({ title: `Marked as ${status}` });
  };

  const saveNotes = async () => {
    if (!selected) return;
    await supabase.from("precon_worksheets").update({ admin_notes: adminNotes, updated_at: new Date().toISOString() }).eq("id", selected.id);
    setWorksheets((prev) => prev.map((w) => (w.id === selected.id ? { ...w, admin_notes: adminNotes } : w)));
    toast({ title: "Notes saved" });
  };

  const openDetail = (w: Worksheet) => {
    setSelected(w);
    setAdminNotes(w.admin_notes || "");
  };

  const filtered = worksheets.filter((w) => {
    const matchesSearch = !search ||
      w.project_name.toLowerCase().includes(search.toLowerCase()) ||
      w.broker_agent_name?.toLowerCase().includes(search.toLowerCase()) ||
      w.brokerage_name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || w.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading || (!isAdmin && user)) {
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
          <h1 className="font-display text-xl font-semibold">{pageLabel.title}</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6 text-primary" /> {pageLabel.title}</h2>
          <p className="text-sm text-muted-foreground mt-1">{pageLabel.description}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by project, agent, brokerage..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loadingData ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">No worksheet submissions yet.</p>
          </CardContent></Card>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Brokerage</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">View</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell className="font-medium">{w.project_name}{w.model_name ? ` · ${w.model_name}` : ""}</TableCell>
                    <TableCell className="text-sm">{w.broker_agent_name || "—"}</TableCell>
                    <TableCell className="text-sm">{w.brokerage_name || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{format(new Date(w.created_at), "MMM d, yyyy h:mm a")}</TableCell>
                    <TableCell><Badge variant="outline" className={`text-xs capitalize ${statusColors[w.status] || ""}`}>{w.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openDetail(w)}><Eye className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" /> {selected.project_name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Status control */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Status:</span>
                  <Select value={selected.status} onValueChange={(v) => updateStatus(selected.id, v)}>
                    <SelectTrigger className="w-44 h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Unit details */}
                <div className="border rounded-lg p-4 space-y-2">
                  <h3 className="font-semibold text-sm flex items-center gap-1"><Building2 className="h-4 w-4" /> Unit Details</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Model:</span> {selected.model_name || "—"}</div>
                    <div><span className="text-muted-foreground">Floor:</span> {selected.floor_type || "—"}</div>
                    <div><span className="text-muted-foreground">Exposure:</span> {selected.direction_exposure || "—"}</div>
                    <div><span className="text-muted-foreground">Date:</span> {selected.worksheet_date || "—"}</div>
                    <div><span className="text-muted-foreground">Parking:</span> {selected.need_parking ? "Yes" : "No"}</div>
                    <div><span className="text-muted-foreground">Locker:</span> {selected.need_locker ? "Yes" : "No"}</div>
                  </div>
                  {selected.choices && selected.choices.length > 0 && (
                    <div className="text-sm"><span className="text-muted-foreground">Choices:</span> {selected.choices.join(", ")}</div>
                  )}
                </div>

                {/* Broker info */}
                <div className="border rounded-lg p-4 space-y-2">
                  <h3 className="font-semibold text-sm">Cooperating Broker</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Brokerage:</span> {selected.brokerage_name || "—"}</div>
                    <div><span className="text-muted-foreground">Agent:</span> {selected.broker_agent_name || "—"}</div>
                    <div><span className="text-muted-foreground">RECO #:</span> {selected.broker_reco_number || "—"}</div>
                    <div className="flex items-center gap-1"><Mail className="h-3 w-3 text-muted-foreground" /> {selected.broker_agent_email || "—"}</div>
                    <div className="flex items-center gap-1"><Phone className="h-3 w-3 text-muted-foreground" /> {selected.broker_office_phone || "—"}</div>
                    <div className="flex items-center gap-1"><Phone className="h-3 w-3 text-muted-foreground" /> {selected.broker_cell_phone || "—"}</div>
                  </div>
                </div>

                {/* Purchasers */}
                {selected.purchasers && selected.purchasers.length > 0 && (
                  <div className="border rounded-lg p-4 space-y-2">
                    <h3 className="font-semibold text-sm">Purchasers ({selected.purchasers.length})</h3>
                    {selected.purchasers.map((p: any, i: number) => (
                      <div key={i} className="text-sm border-t pt-2 first:border-t-0 first:pt-0">
                        <p className="font-medium">{p.firstName} {p.lastName}</p>
                        <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground mt-1">
                          {p.email && <div>Email: {p.email}</div>}
                          {p.cell && <div>Cell: {p.cell}</div>}
                          {p.address && <div className="col-span-2">Address: {p.address}</div>}
                          {p.employerOccupation && <div className="col-span-2">Occupation: {p.employerOccupation}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {selected.additional_comments && (
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold text-sm mb-1">Additional Comments</h3>
                    <p className="text-sm text-muted-foreground">{selected.additional_comments}</p>
                  </div>
                )}

                {selected.id_attachment_filename && (
                  <p className="text-xs text-muted-foreground">📎 Client ID attached: {selected.id_attachment_filename} (sent via email)</p>
                )}

                {/* Admin notes */}
                <div>
                  <label className="text-sm font-medium">Admin Notes</label>
                  <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={3} placeholder="Internal notes about this submission..." className="mt-1" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
                <Button onClick={saveNotes}>Save Notes</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
