import { useEffect, useMemo, useState } from "react";
import { subDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PreConCoopHeaderChip } from "@/components/dashboard/PreConCoopDisplay";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { buildListingShareUrl, buildListingSharePayloadForPrecon } from "@/lib/shareLandingPayload";
import { PRECON_DOC_SECTION_ORDER, classifyPreconDocAsset, type PreconDocSectionId } from "@/lib/preconDocumentSections";
import { cn } from "@/lib/utils";
import SocialShareIconRow from "@/components/share/SocialShareIconRow";
import ListingDocuments from "@/components/dashboard/ListingDocuments";
import {
  BarChart3,
  Bookmark,
  Download,
  Eye,
  ExternalLink,
  FileText,
  ImageIcon,
  MapPin,
  Phone,
  Printer,
} from "lucide-react";

export interface PreconListingProject {
  id: string;
  name: string;
  developer: string | null;
  location: string | null;
  description: string | null;
  price_range: string | null;
  thumbnail_url: string | null;
  gallery_urls?: unknown;
  status: string;
  external_url: string | null;
  property_type: string;
  commission_rate_percent: number | null;
  precon_cities?: { id: string; name: string } | null;
  created_at?: string;
  contact_phone?: string | null;
  /** When false, co-op % is hidden from agents (cards, detail, share). */
  commission_public?: boolean | null;
}

export interface PreconListingAsset {
  id: string;
  project_id: string | null;
  title: string;
  asset_type: string;
  file_url: string;
  file_name: string;
  category: string;
}

function normalizeGalleryUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((u): u is string => typeof u === "string" && u.trim().length > 0);
}

function propertyTypeLabel(t: string): string {
  if (t === "condo") return "Condo";
  if (t === "home") return "Home";
  if (t === "townhome") return "Townhome";
  return "Mixed";
}

function isFloorAsset(a: PreconListingAsset): boolean {
  const c = (a.category || "").toLowerCase();
  const title = (a.title || "").toLowerCase();
  return c.includes("floor") || title.includes("floor plan") || a.asset_type === "floor_plan";
}

function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url) || url.includes("images.unsplash.com");
}

function isGalleryAsset(a: PreconListingAsset): boolean {
  if (isFloorAsset(a)) return false;
  const c = (a.category || "").toLowerCase();
  if (c.includes("floor")) return false;
  if (c.includes("gallery") || c.includes("photo") || c.includes("rendering") || c.includes("image")) return true;
  return isImageUrl(a.file_url);
}

type PreConListingDetailSheetProps = {
  project: PreconListingProject | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: string | undefined;
  isDemo: boolean;
  hideCommissionRates: boolean;
  projectAssets: PreconListingAsset[];
  bookmarked: boolean;
  onToggleBookmark: () => void;
};

const VIEW_KEY = (id: string) => `precon:${id}`;

function safeDownloadName(title: string, fallback: string): string {
  const base = title.replace(/[^\w\d.\-]+/g, "_").replace(/_+/g, "_").slice(0, 80);
  return base || fallback;
}

async function downloadListingFile(url: string, filename: string) {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) throw new Error("fetch failed");
    const blob = await res.blob();
    const obj = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = obj;
    a.download = filename || "document";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(obj);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

type FileKind = "pdf" | "docx" | "jpeg" | "png" | "other";

function fileKindFromAsset(a: PreconListingAsset): FileKind {
  const path = `${a.file_name} ${a.file_url}`.toLowerCase();
  const t = (a.asset_type || "").toLowerCase();
  if (/\.pdf(\?|#|$)/i.test(path) || t.includes("pdf")) return "pdf";
  if (/\.docx(\?|#|$)/i.test(path) || t.includes("docx") || t.includes("word")) return "docx";
  if (/\.doc(\?|#|$)/i.test(path)) return "docx";
  if (/\.png(\?|#|$)/i.test(path) || t === "png") return "png";
  if (/\.(jpe?g|jfif)(\?|#|$)/i.test(path) || t.includes("jpeg") || t.includes("jpg")) return "jpeg";
  if (isImageUrl(a.file_url)) return "jpeg";
  return "other";
}

function fileKindLabel(k: FileKind): string {
  if (k === "pdf") return "PDF";
  if (k === "docx") return "DOCX";
  if (k === "jpeg") return "JPEG";
  if (k === "png") return "PNG";
  return "FILE";
}

function fileKindBadgeClass(k: FileKind): string {
  if (k === "pdf") return "bg-red-600/90 text-white border-0";
  if (k === "docx") return "bg-blue-600/90 text-white border-0";
  if (k === "jpeg" || k === "png") return "bg-emerald-600/90 text-white border-0";
  return "bg-slate-600/90 text-white border-0";
}

function defaultDownloadName(a: PreconListingAsset): string {
  if (a.file_name?.trim()) return a.file_name.trim();
  const k = fileKindFromAsset(a);
  const ext = k === "pdf" ? "pdf" : k === "docx" ? "docx" : k === "png" ? "png" : k === "jpeg" ? "jpg" : "bin";
  return `${safeDownloadName(a.title, "document")}.${ext}`;
}

function openFileForPrint(url: string) {
  const w = window.open(url, "_blank", "noopener,noreferrer");
  if (!w) {
    toast({ variant: "destructive", title: "Pop-up blocked", description: "Allow pop-ups to print or save this file." });
    return;
  }
  toast({
    title: "Opened for printing",
    description: "When the file loads, use your browser’s Print option (Ctrl+P).",
  });
}

function sectionSortIndex(id: PreconDocSectionId): number {
  const i = PRECON_DOC_SECTION_ORDER.findIndex((x) => x.id === id);
  return i === -1 ? 999 : i;
}

export default function PreConListingDetailSheet({
  project,
  open,
  onOpenChange,
  agentId,
  isDemo,
  hideCommissionRates,
  projectAssets,
  bookmarked,
  onToggleBookmark,
}: PreConListingDetailSheetProps) {
  const [views30d, setViews30d] = useState<number | null>(null);
  const [activeGalleryIdx, setActiveGalleryIdx] = useState(0);

  const galleryImages = useMemo(() => {
    if (!project) return [];
    const fromProject = normalizeGalleryUrls(project.gallery_urls);
    const thumb = project.thumbnail_url?.trim();
    const fromAssets = projectAssets.filter(isGalleryAsset).map((a) => a.file_url);
    const merged = [...(thumb ? [thumb] : []), ...fromProject, ...fromAssets];
    return [...new Set(merged)];
  }, [project, projectAssets]);

  const nonGalleryAssets = useMemo(() => projectAssets.filter((a) => !isGalleryAsset(a)), [projectAssets]);
  /** Single ordered list: all project files (PDFs, docs, floor plans, etc.) in one horizontal row. */
  const allFilesOneLine = useMemo(() => {
    const list = [...nonGalleryAssets];
    list.sort((a, b) => {
      const da = sectionSortIndex(classifyPreconDocAsset(a));
      const db = sectionSortIndex(classifyPreconDocAsset(b));
      if (da !== db) return da - db;
      return a.title.localeCompare(b.title);
    });
    return list;
  }, [nonGalleryAssets]);

  useEffect(() => {
    setActiveGalleryIdx(0);
  }, [project?.id, open]);

  useEffect(() => {
    if (!open || !project || !agentId || isDemo) {
      setViews30d(null);
      return;
    }
    const key = VIEW_KEY(project.id);
    const since = subDays(new Date(), 30).toISOString();
    void supabase
      .from("content_views")
      .insert({ agent_id: agentId, resource_key: key })
      .then(({ error }) => {
        if (error && !error.message?.includes("duplicate") && !error.message?.includes("unique"))
          console.warn("content_views insert", error);
      });
    void supabase
      .from("content_views")
      .select("*", { count: "exact", head: true })
      .eq("agent_id", agentId)
      .eq("resource_key", key)
      .gte("viewed_at", since)
      .then(({ count }) => setViews30d(count ?? 0));
  }, [open, project?.id, agentId, isDemo]);

  const handleDownloadAll = async (list: PreconListingAsset[], label: string) => {
    if (!list.length) return;
    toast({
      title: "Downloading",
      description: `${list.length} file(s) from ${label} — allow multiple downloads if your browser asks.`,
    });
    for (const a of list) {
      await downloadListingFile(a.file_url, defaultDownloadName(a));
      await new Promise((r) => setTimeout(r, 380));
    }
    toast({ title: "Downloads finished", description: label });
  };

  const handlePrint = () => {
    if (!project) return;
    const w = window.open("", "_blank");
    if (!w) {
      toast({ variant: "destructive", title: "Pop-up blocked", description: "Allow pop-ups to print this listing." });
      return;
    }
    const coopVisible =
      !hideCommissionRates &&
      project.commission_public !== false &&
      project.commission_rate_percent != null &&
      !Number.isNaN(Number(project.commission_rate_percent));
    const coop = coopVisible ? `<p><strong>${project.commission_rate_percent}%</strong></p>` : "";
    w.document.write(`<!DOCTYPE html><html><head><title>${project.name}</title>
      <style>
        body{font-family:system-ui,sans-serif;padding:24px;max-width:720px;margin:0 auto;color:#111}
        h1{font-size:1.35rem;margin:0 0 8px}
        .muted{color:#555;font-size:14px}
        img{max-width:100%;border-radius:8px;margin:12px 0}
        @media print{body{padding:12px}}
      </style></head><body>
      <h1>${project.name}</h1>
      <p class="muted">${project.developer || ""}${project.developer && project.location ? " · " : ""}${project.location || ""}</p>
      ${project.thumbnail_url ? `<img src="${project.thumbnail_url}" alt="" />` : ""}
      <p><strong>Status:</strong> ${project.status}</p>
      <p><strong>Price:</strong> ${project.price_range || "—"}</p>
      ${coop}
      <p><strong>Description</strong></p>
      <p>${(project.description || "—").replace(/\n/g, "<br/>")}</p>
      <p class="muted" style="margin-top:32px;font-size:12px">Printed from RE MAX Excellence agent portal — for internal use.</p>
      </body></html>`);
    w.document.close();
    w.focus();
    w.print();
    w.close();
  };

  if (!project) return null;

  const coopVisible =
    !hideCommissionRates &&
    project.commission_public !== false &&
    project.commission_rate_percent != null &&
    !Number.isNaN(Number(project.commission_rate_percent));

  const shareUrl = buildListingShareUrl(
    buildListingSharePayloadForPrecon(project, projectAssets, hideCommissionRates)
  );

  const phone = (project as any).phone_public === false ? undefined : project.contact_phone?.trim();
  const mainGallerySrc = galleryImages.length ? galleryImages[Math.min(activeGalleryIdx, galleryImages.length - 1)]! : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[100dvh] max-h-[100dvh] w-full max-w-none flex-col gap-0 overflow-hidden rounded-none border-0 p-0 shadow-none !left-0 !top-0 !translate-x-0 !translate-y-0 data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100 data-[state=closed]:slide-out-to-top-0 data-[state=open]:slide-in-from-top-0 sm:max-w-none sm:rounded-none"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogDescription className="sr-only">Listing details: {project.name}</DialogDescription>
        <DialogHeader className="space-y-0 border-b border-border px-4 py-4 text-left sm:px-6">
          <div className="flex items-start justify-between gap-3 pr-10 sm:pr-12">
            <div className="min-w-0">
              {project.developer && (
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{project.developer}</p>
              )}
              <DialogTitle className="font-display text-xl leading-tight md:text-2xl">{project.name}</DialogTitle>
              {project.location && (
                <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {project.location}
                  {project.precon_cities?.name && (
                    <span className="text-xs"> · {project.precon_cities.name}</span>
                  )}
                </p>
              )}
              {phone && (
                <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-primary">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="underline-offset-4 hover:underline">
                    {phone}
                  </a>
                </p>
              )}
            </div>
            <Button type="button" size="icon" variant={bookmarked ? "default" : "outline"} onClick={onToggleBookmark} aria-label="Bookmark">
              <Bookmark className={`h-4 w-4 ${bookmarked ? "fill-current" : ""}`} />
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{project.status}</Badge>
            {coopVisible && <PreConCoopHeaderChip percent={Number(project.commission_rate_percent)} />}
            <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" onClick={handlePrint}>
              <Printer className="h-3.5 w-3.5" />
              Print
            </Button>
            {project.external_url && (
              <Button variant="outline" size="sm" className="h-8 gap-1" asChild>
                <a href={project.external_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Site
                </a>
              </Button>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="mx-auto max-w-4xl space-y-10 px-4 pb-12 pt-5 sm:px-6">
            {galleryImages.length > 0 && mainGallerySrc ? (
              <section aria-label="Photo gallery" className="space-y-3">
                <div>
                  <h2 className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
                    <ImageIcon className="h-4 w-4 text-primary" />
                    Photo gallery
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Main preview below — use thumbnails to switch photos; open full size in a new tab.
                  </p>
                </div>
                <div className="overflow-hidden rounded-2xl border border-border/50 bg-muted/25 shadow-md ring-1 ring-black/[0.04] dark:ring-white/10">
                  <div className="relative aspect-[20/11] min-h-[200px] w-full max-h-[min(48vh,440px)] bg-muted sm:aspect-[2/1]">
                    <img src={mainGallerySrc} alt="" className="h-full w-full object-cover" />
                    <a
                      href={mainGallerySrc}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute bottom-3 right-3 rounded-md bg-background/90 px-2.5 py-1 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm hover:bg-background"
                    >
                      Open full size
                    </a>
                  </div>
                  {galleryImages.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto border-t border-border/50 bg-card/95 px-3 py-3 [scrollbar-width:thin]">
                      {galleryImages.map((src, i) => (
                        <button
                          key={`${src}-${i}`}
                          type="button"
                          onClick={() => setActiveGalleryIdx(i)}
                          className={cn(
                            "relative h-14 w-[4.5rem] shrink-0 overflow-hidden rounded-lg ring-2 ring-offset-2 ring-offset-background transition",
                            i === activeGalleryIdx
                              ? "ring-primary opacity-100"
                              : "ring-transparent opacity-75 hover:opacity-100",
                          )}
                        >
                          <img src={src} alt="" className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            ) : null}

            <section aria-label="Summary" className="space-y-4">
              {project.price_range && (
                <p className="font-display text-xl font-semibold text-foreground">{project.price_range}</p>
              )}
              <p className="text-sm leading-relaxed text-muted-foreground sm:text-[15px]">{project.description || "No description provided."}</p>
              <ul className="grid gap-3 rounded-xl border border-border/60 bg-muted/15 p-4 text-sm sm:grid-cols-2">
                <li>
                  <span className="font-medium text-foreground">Property type:</span> {propertyTypeLabel(project.property_type)}
                </li>
                <li>
                  <span className="font-medium text-foreground">Sales status:</span> {project.status}
                </li>
                {project.created_at && (
                  <li>
                    <span className="font-medium text-foreground">Listed:</span>{" "}
                    {new Date(project.created_at).toLocaleDateString()}
                  </li>
                )}
              </ul>
            </section>

            {allFilesOneLine.length > 0 ? (
              <section aria-label="Project files" className="space-y-4">
                <div className="flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
                    <FileText className="h-4 w-4 text-primary" />
                    Project files
                  </h2>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full shrink-0 gap-1.5 sm:w-auto"
                    onClick={() => void handleDownloadAll(allFilesOneLine, "all files")}
                  >
                    <Download className="h-4 w-4" />
                    Download all ({allFilesOneLine.length})
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  PDF, Word, JPEG, PNG, and floor plans in <strong className="text-foreground">one row</strong> — scroll sideways. View, download, or print
                  each file.
                </p>
                <div className="-mx-2 rounded-xl border border-border/50 bg-muted/25 p-3 sm:-mx-0">
                  <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [scrollbar-width:thin]">
                    {allFilesOneLine.map((a) => {
                      const kind = fileKindFromAsset(a);
                      const showImagePreview =
                        (kind === "jpeg" || kind === "png") && isImageUrl(a.file_url);
                      return (
                        <div
                          key={a.id}
                          className="flex w-[200px] shrink-0 snap-start flex-col rounded-xl border border-border/70 bg-card p-3 shadow-sm sm:w-[220px]"
                        >
                          {showImagePreview ? (
                            <div className="mb-2 aspect-[4/3] w-full overflow-hidden rounded-lg bg-muted">
                              <img src={a.file_url} alt="" className="h-full w-full object-cover" />
                            </div>
                          ) : (
                            <div className="mb-2 flex aspect-[4/3] w-full items-center justify-center rounded-lg bg-muted/80">
                              <FileText className="h-10 w-10 text-muted-foreground/60" />
                            </div>
                          )}
                          <Badge className={`w-fit text-[10px] font-bold ${fileKindBadgeClass(kind)}`}>{fileKindLabel(kind)}</Badge>
                          <p className="mt-2 line-clamp-3 text-xs font-medium leading-snug text-foreground">{a.title}</p>
                          {a.file_name && (
                            <p className="mt-1 line-clamp-2 break-all text-[10px] text-muted-foreground">{a.file_name}</p>
                          )}
                          <div className="mt-auto flex justify-center gap-1 border-t border-border/50 pt-3">
                            <Button variant="outline" size="icon" className="h-8 w-8" asChild title="View">
                              <a href={a.file_url} target="_blank" rel="noopener noreferrer">
                                <Eye className="h-3.5 w-3.5" />
                              </a>
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              title="Download"
                              onClick={() => void downloadListingFile(a.file_url, defaultDownloadName(a))}
                            >
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              title="Print"
                              onClick={() => openFileForPrint(a.file_url)}
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            ) : null}

            <section aria-label="Project documents" className="space-y-2">
              <ListingDocuments projectId={project.id} />
            </section>

            <section aria-label="Share listing" className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Share</p>
              <SocialShareIconRow className="justify-start" preface={`Pre-con project: ${project.name}`} linkUrl={shareUrl} />
            </section>

            <Button
              className="w-full max-w-4xl"
              onClick={() => toast({ title: "Interest registered", description: "CRM hook can be added here." })}
            >
              Register client interest
            </Button>

            <section aria-label="Activity" className="space-y-3">
              <h2 className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
                <BarChart3 className="h-4 w-4 text-primary" />
                Activity
              </h2>
              {isDemo ? (
                <p className="text-sm text-muted-foreground">
                  Demo mode: view tracking is simulated locally. Sign in with a live project to record opens in Analytics.
                </p>
              ) : (
                <>
                  <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                    <p className="font-medium text-foreground">Your listing opens</p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums">{views30d ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">Times you opened this project in the last 30 days (includes this visit).</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Admins can aggregate portal activity under <strong>Admin → Analytics</strong>. Each open logs a content view with key{" "}
                    <code className="rounded bg-muted px-1 text-xs">{VIEW_KEY(project.id)}</code>.
                  </p>
                </>
              )}
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
