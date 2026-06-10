import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Download, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useSectionLabels } from "@/hooks/useSectionLabels";

interface LibraryDoc {
  id: string;
  title: string;
  description: string | null;
  icon: string;
  file_url: string | null;
  link_url: string | null;
  file_name: string | null;
}

const TINTS = [
  "from-[#1a4d8f] to-[#0a2a52]",
  "from-[#334155] to-[#1e293b]",
  "from-[#e2231a] to-[#a3120c]",
  "from-[#1a4d8f] to-[#123a6b]",
  "from-[#b91c1c] to-[#7f1414]",
];

export default function PreconLibrary() {
  const [docs, setDocs] = useState<LibraryDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const { label } = useSectionLabels();
  const libLabel = label("precon-library", "Pre-con document library", "");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("precon_library_documents")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      setDocs((data as LibraryDoc[]) || []);
      setLoading(false);
    })();
  }, []);

  const open = (d: LibraryDoc) => {
    const url = d.file_url || d.link_url;
    if (!url) {
      toast({ title: d.title, description: "No file attached yet — ask an admin to upload it." });
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (docs.length === 0) return null;

  return (
    <div>
      <h3 className="mb-3 font-display text-lg font-semibold text-foreground">{libLabel.title}</h3>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {docs.map((d, i) => {
          const hasFile = !!(d.file_url || d.link_url);
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => open(d)}
              className={`group flex min-h-[120px] flex-col justify-between rounded-lg bg-gradient-to-br ${TINTS[i % TINTS.length]} p-4 text-left text-white shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5`}
            >
              <span className="text-2xl">{d.icon}</span>
              <div>
                <span className="block text-xs font-semibold leading-tight">{d.title}</span>
                <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-white/80">
                  {hasFile ? (
                    d.file_url ? <><Download className="h-3 w-3" /> Download</> : <><ExternalLink className="h-3 w-3" /> Open link</>
                  ) : (
                    "Coming soon"
                  )}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
