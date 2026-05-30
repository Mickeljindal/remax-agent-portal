import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Download,
  Loader2,
  Building2,
  DollarSign,
  LayoutGrid,
  Gift,
  Presentation,
  FileBox,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ListingDocument {
  id: string;
  title: string;
  doc_type: string;
  file_url: string;
  file_name: string;
  file_size: number | null;
}

interface ListingDocumentsProps {
  projectId: string;
}

const DOC_TYPE_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  project_details: { label: "Project Details", icon: <Building2 className="h-4 w-4" />, color: "text-blue-600" },
  price_list: { label: "Price List", icon: <DollarSign className="h-4 w-4" />, color: "text-green-600" },
  floor_plans: { label: "Floor Plans", icon: <LayoutGrid className="h-4 w-4" />, color: "text-purple-600" },
  incentives: { label: "Incentives", icon: <Gift className="h-4 w-4" />, color: "text-amber-600" },
  presentation: { label: "Presentation", icon: <Presentation className="h-4 w-4" />, color: "text-rose-600" },
  general: { label: "Documents", icon: <FileBox className="h-4 w-4" />, color: "text-gray-600" },
};

export default function ListingDocuments({ projectId }: ListingDocumentsProps) {
  const [docs, setDocs] = useState<ListingDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingAll, setDownloadingAll] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("precon_documents")
        .select("*")
        .eq("project_id", projectId)
        .eq("is_active", true)
        .order("sort_order");
      setDocs((data as ListingDocument[]) || []);
      setLoading(false);
    })();
  }, [projectId]);

  const downloadFile = async (doc: ListingDocument) => {
    try {
      const res = await fetch(doc.file_url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.file_name || doc.title;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: open in new tab
      window.open(doc.file_url, "_blank");
    }
  };

  const downloadAll = async () => {
    setDownloadingAll(true);
    for (const doc of docs) {
      await downloadFile(doc);
      // small delay so browser doesn't block multiple downloads
      await new Promise((r) => setTimeout(r, 400));
    }
    setDownloadingAll(false);
    toast({ title: "Downloads started", description: `${docs.length} files downloading.` });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (docs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No documents available for this project yet.
      </p>
    );
  }

  // Group by type
  const grouped = docs.reduce((acc, d) => {
    (acc[d.doc_type] ||= []).push(d);
    return acc;
  }, {} as Record<string, ListingDocument[]>);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          <FileText className="h-4 w-4 text-[hsl(var(--remax-red,4_80%_52%))]" />
          Project Documents ({docs.length})
        </h4>
        <Button size="sm" variant="default" className="gap-1.5" onClick={downloadAll} disabled={downloadingAll}>
          {downloadingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          Download all
        </Button>
      </div>

      <div className="space-y-3">
        {Object.entries(grouped).map(([type, items]) => {
          const meta = DOC_TYPE_META[type] || DOC_TYPE_META.general;
          return (
            <div key={type}>
              <p className={`text-xs font-semibold uppercase tracking-wide mb-1.5 flex items-center gap-1.5 ${meta.color}`}>
                {meta.icon} {meta.label}
              </p>
              <div className="space-y-1.5">
                {items.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center gap-3 rounded-lg border bg-card p-2.5 hover:bg-muted/50 transition-colors"
                  >
                    <div className="h-9 w-9 rounded-md bg-red-50 dark:bg-red-950/30 flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4 text-[hsl(4_80%_52%)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{d.title}</p>
                      {d.file_size && (
                        <p className="text-[11px] text-muted-foreground">
                          {(d.file_size / 1024 / 1024).toFixed(1)} MB
                        </p>
                      )}
                    </div>
                    <Button size="sm" variant="outline" className="gap-1.5 shrink-0" onClick={() => downloadFile(d)}>
                      <Download className="h-3.5 w-3.5" /> Download
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
