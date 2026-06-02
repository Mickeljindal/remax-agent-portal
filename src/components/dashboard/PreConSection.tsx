import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import PreConListingDetailSheet from "@/components/dashboard/PreConListingDetailSheet";
import {
  Building2,
  ExternalLink,
  Image,
  FileText,
  Share2,
  MapPin,
  Bookmark,
  LayoutGrid,
  FolderOpen,
  FileSpreadsheet,
  ChevronRight,
  SlidersHorizontal,
  Phone,
} from "lucide-react";
import { parseISO, differenceInDays } from "date-fns";
import HSTCalculator from "@/components/dashboard/HSTCalculator";
import CommissionCalculator from "@/components/dashboard/CommissionCalculator";
import PreconLibrary from "@/components/dashboard/PreconLibrary";
import { useSectionLabels } from "@/hooks/useSectionLabels";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PORTAL_SHOWCASE } from "@/config/portalShowcase";
import { demoListings, demoAssetTiles, demoDocuments, demoPreconAssetsByProject } from "@/data/demoPortalContent";
import BuyerPresentationKit from "@/components/dashboard/BuyerPresentationKit";
import { buildListingShareUrl, buildListingSharePayloadForPrecon } from "@/lib/shareLandingPayload";
import SocialShareIconRow from "@/components/share/SocialShareIconRow";
import { PreConCoopInline } from "@/components/dashboard/PreConCoopDisplay";
import PreConWorksheetForm from "@/components/dashboard/PreConWorksheetForm";

interface PreconProject {
  id: string;
  name: string;
  developer: string | null;
  location: string | null;
  description: string | null;
  price_range: string | null;
  thumbnail_url: string | null;
  status: string;
  external_url: string | null;
  created_at?: string;
  city_id: string | null;
  property_type: string;
  commission_rate_percent: number | null;
  precon_cities?: { id: string; name: string } | null;
  gallery_urls?: unknown;
  contact_phone?: string | null;
  commission_public?: boolean | null;
}

interface PreconAsset {
  id: string;
  project_id: string | null;
  title: string;
  asset_type: string;
  file_url: string;
  file_name: string;
  category: string;
}

const BM_KEY = (agentId: string) => `remax-precon-bookmarks-${agentId}`;

const docLabels = [
  { key: "showing", title: "Showing Instructions", tint: "from-blue-600/90 to-blue-800" },
  { key: "offer", title: "Offer Data Sheet", tint: "from-slate-600/90 to-slate-800" },
  { key: "clauses", title: "Clauses", tint: "from-red-600/90 to-red-800" },
  { key: "schedule", title: "Schedule B", tint: "from-blue-700/90 to-blue-900" },
  { key: "deal", title: "Deal Sheet", tint: "from-red-700/90 to-red-900" },
];

interface PreConSectionProps {
  agentId: string | undefined;
  agentName?: string | null;
  agentEmail?: string | null;
  recoNumber?: string | null;
  /** When true, co-op % badges are hidden (e.g. showing portal to a buyer). */
  hideCommissionRates?: boolean;
}

function saleBucket(status: string): "selling" | "coming_soon" {
  const l = (status || "").toLowerCase();
  if (l.includes("coming")) return "coming_soon";
  return "selling";
}

function propertyTypeLabel(t: string): string {
  if (t === "condo") return "Condo";
  if (t === "home") return "Home";
  if (t === "townhome") return "Townhome";
  return "Mixed";
}

/** Per-listing admin switch: when false, agents do not see co-op % on cards, detail, or shared links. */
function isCoopVisibleToAgents(project: PreconProject, hideCommissionRates: boolean): boolean {
  if (hideCommissionRates) return false;
  if (project.commission_public === false) return false;
  return true;
}

function shareAssetsForPreconProject(projectId: string): PreconAsset[] {
  if (!PORTAL_SHOWCASE || !projectId.startsWith("demo-")) return [];
  return (demoPreconAssetsByProject[projectId] ?? []) as PreconAsset[];
}

function demoListingToProject(l: (typeof demoListings)[number]): PreconProject {
  const galleryUrls = "galleryUrls" in l && Array.isArray((l as { galleryUrls?: string[] }).galleryUrls) ? (l as { galleryUrls: string[] }).galleryUrls : [];
  const ext = l as typeof l & { contactPhone?: string; commissionPublic?: boolean };
  return {
    id: l.id,
    name: l.title,
    developer: l.builder,
    location: l.location,
    description: "Sample listing for visual review — connect CRM for live inventory.",
    price_range: l.price,
    thumbnail_url: l.image,
    status: l.status,
    external_url: null,
    created_at: undefined,
    city_id: null,
    property_type: l.propertyType,
    commission_rate_percent: l.commissionPercent,
    precon_cities: { id: "demo", name: l.cityName },
    gallery_urls: galleryUrls,
    contact_phone: ext.contactPhone ?? null,
    commission_public: ext.commissionPublic !== false,
  };
}

export default function PreConSection({
  agentId,
  agentName,
  agentEmail,
  recoNumber,
  hideCommissionRates = false,
}: PreConSectionProps) {
  const [projects, setProjects] = useState<PreconProject[]>([]);
  const [assets, setAssets] = useState<PreconAsset[]>([]);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [detail, setDetail] = useState<PreconProject | null>(null);
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [propertyFilter, setPropertyFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [worksheetOpen, setWorksheetOpen] = useState(false);
  const { label } = useSectionLabels();
  const listingsLabel = label("listings", "Pre-construction listings", "Projects, pricing, and client registration");
  const assetsLabel = label("assets", "Pre-con assets", "Tools, documents, and marketing");

  useEffect(() => {
    const load = async () => {
      if (PORTAL_SHOWCASE) {
        setProjects([]);
        setAssets([]);
        return;
      }
      const withCities = await supabase
        .from("precon_projects")
        .select("*, precon_cities ( id, name )")
        .eq("is_active", true);
      if (withCities.error) {
        const basic = await supabase.from("precon_projects").select("*").eq("is_active", true);
        setProjects((basic.data as PreconProject[]) || []);
      } else {
        setProjects((withCities.data as PreconProject[]) || []);
      }
      const { data: assetData } = await supabase.from("precon_assets").select("*").eq("is_active", true);
      setAssets((assetData as PreconAsset[]) || []);
    };
    load();
  }, []);

  useEffect(() => {
    if (!agentId) return;
    try {
      const raw = localStorage.getItem(BM_KEY(agentId));
      setBookmarks(raw ? JSON.parse(raw) : []);
    } catch {
      setBookmarks([]);
    }
  }, [agentId]);

  const toggleBookmark = (id: string) => {
    if (!agentId) return;
    const next = bookmarks.includes(id) ? bookmarks.filter((x) => x !== id) : [...bookmarks, id];
    setBookmarks(next);
    localStorage.setItem(BM_KEY(agentId), JSON.stringify(next));
    toast({ title: bookmarks.includes(id) ? "Removed from bookmarks" : "Saved to bookmarks" });
  };

  const isNew = (p: PreconProject) => {
    if (!p.created_at) return false;
    return differenceInDays(new Date(), parseISO(p.created_at)) <= 7;
  };

  const statusColors: Record<string, string> = {
    selling: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
    active: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
    "coming soon": "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
    "sold out": "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
  };

  const assetCategories = [...new Set(assets.map((a) => a.category))];

  const cityOptionsLive = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const p of projects) {
      const c = p.precon_cities;
      if (c?.id && c?.name) map.set(c.id, c);
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [projects]);

  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return projects.filter((p) => {
      if (cityFilter !== "all" && p.city_id !== cityFilter) return false;
      if (propertyFilter !== "all" && p.property_type !== "all" && p.property_type !== propertyFilter) return false;
      if (statusFilter !== "all") {
        if (statusFilter === "ready") {
          if (!p.status.toLowerCase().includes("ready")) return false;
        } else {
          const b = saleBucket(p.status);
          if (statusFilter === "selling" && b !== "selling") return false;
          if (statusFilter === "coming_soon" && b !== "coming_soon") return false;
        }
      }
      if (q) {
        const blob = `${p.name} ${p.developer || ""} ${p.location || ""}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [projects, cityFilter, propertyFilter, statusFilter, searchQuery]);

  const demoCities = useMemo(() => [...new Set(demoListings.map((l) => l.cityName))].sort(), []);
  const filteredDemoListings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return demoListings.filter((l) => {
      if (cityFilter !== "all" && l.cityName !== cityFilter) return false;
      if (propertyFilter !== "all" && l.propertyType !== propertyFilter) return false;
      if (statusFilter !== "all" && l.saleStatus !== statusFilter) return false;
      if (q) {
        const blob = `${l.title} ${l.builder} ${l.location}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [cityFilter, propertyFilter, statusFilter, searchQuery]);

  const detailAssets = useMemo((): PreconAsset[] => {
    if (!detail) return [];
    if (PORTAL_SHOWCASE && detail.id.startsWith("demo-")) {
      return (demoPreconAssetsByProject[detail.id] ?? []) as PreconAsset[];
    }
    return assets.filter((a) => a.project_id === detail.id);
  }, [detail, assets]);

  return (
    <>
      <section id="listings" className="scroll-mt-24 space-y-4">
        <div className="flex items-center gap-3">
          <Building2 className="h-7 w-7 text-accent" />
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground">{listingsLabel.title}</h2>
            <p className="text-sm text-muted-foreground">{listingsLabel.subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-t-xl border border-b-0 border-primary/30 bg-primary/5 px-4 py-2">
          <SlidersHorizontal className="h-5 w-5 text-primary" />
          <span className="font-display text-sm font-semibold text-foreground">Search &amp; filter projects</span>
          <span className="text-xs text-muted-foreground hidden sm:inline">— city, type, status, keywords</span>
        </div>
        <div className="flex flex-col gap-3 rounded-b-2xl rounded-t-none border border-t-0 border-primary/30 bg-card p-4 shadow-inner lg:flex-row lg:flex-wrap lg:items-end">
          <div className="min-w-[160px] flex-1">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">City</span>
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="City" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All cities</SelectItem>
                {PORTAL_SHOWCASE
                  ? demoCities.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))
                  : cityOptionsLive.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[160px] flex-1">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Property type</span>
            <Select value={propertyFilter} onValueChange={setPropertyFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="condo">Condos</SelectItem>
                <SelectItem value="home">Homes</SelectItem>
                <SelectItem value="townhome">Townhomes</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[160px] flex-1">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Sales status</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="selling">Now selling</SelectItem>
                <SelectItem value="coming_soon">Coming soon</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[200px] flex-[2]">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Search</span>
            <Input
              placeholder="Search by project, builder, or area…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {PORTAL_SHOWCASE &&
            filteredDemoListings.map((l) => {
              const demoProj = demoListingToProject(l);
              const demoPhone = "contactPhone" in l ? (l as { contactPhone?: string }).contactPhone : undefined;
              return (
              <Card
                key={l.id}
                className="group overflow-hidden border-border/80 bg-card/90 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <button type="button" className="relative block w-full text-left" onClick={() => setDetail(demoProj)}>
                  <div className="relative h-44 overflow-hidden">
                    <img src={l.image} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
                    {l.isNew && (
                      <Badge className="absolute left-3 top-3 bg-destructive text-destructive-foreground">New</Badge>
                    )}
                    <Badge
                      className={
                        l.status === "Active"
                          ? "absolute right-3 top-3 border-0 bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-100"
                          : "absolute right-3 top-3 border-0 bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-100"
                      }
                    >
                      {l.status}
                    </Badge>
                  </div>
                </button>
                <CardContent className="pt-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{l.builder}</p>
                  <h3 className="mt-1 font-semibold text-foreground">{l.title}</h3>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 shrink-0" /> {l.location}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground capitalize">
                    {l.cityName} · {l.propertyType === "condo" ? "Condo" : l.propertyType === "home" ? "Home" : "Townhome"}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-primary">{l.price}</p>
                  {isCoopVisibleToAgents(demoProj, hideCommissionRates) &&
                    l.commissionPercent != null && <PreConCoopInline percent={l.commissionPercent} />}
                  {demoPhone?.trim() && (
                    <p className="mt-2 flex items-center gap-1.5 text-sm">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-primary" />
                      <a
                        href={`tel:${demoPhone.replace(/[^\d+]/g, "")}`}
                        className="font-medium text-primary underline-offset-4 hover:underline"
                      >
                        {demoPhone}
                      </a>
                    </p>
                  )}
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Sample listing for visual review — connect CRM for live inventory.
                  </p>
                  <div className="mt-3">
                    <SocialShareIconRow
                      compact
                      preface={`Pre-con project: ${l.title}`}
                      linkUrl={buildListingShareUrl(
                        buildListingSharePayloadForPrecon(demoProj, shareAssetsForPreconProject(l.id), hideCommissionRates)
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            );
            })}

          {!PORTAL_SHOWCASE &&
            filteredProjects.map((project) => (
            <Card
              key={project.id}
              className="border-border hover:shadow-lg transition-all overflow-hidden group"
            >
              <button
                type="button"
                className="text-left w-full"
                onClick={() => setDetail(project)}
              >
                <div className="h-40 bg-gradient-to-br from-primary/60 to-primary/90 flex items-center justify-center relative">
                  {project.thumbnail_url ? (
                    <img src={project.thumbnail_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="h-14 w-14 text-primary-foreground/40" />
                  )}
                  <div className="absolute top-3 left-3 flex gap-2">
                    <Badge className={statusColors[project.status.toLowerCase()] || "bg-muted"}>
                      {project.status}
                    </Badge>
                    {isNew(project) && (
                      <Badge className="bg-accent text-accent-foreground">New</Badge>
                    )}
                  </div>
                  {project.developer && (
                    <span className="absolute bottom-2 right-2 rounded bg-background/85 px-2 py-0.5 text-[10px] font-semibold">
                      {project.developer}
                    </span>
                  )}
                </div>
              </button>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground text-lg group-hover:text-accent transition-colors line-clamp-1">
                      {project.name}
                    </h3>
                    {project.location && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3 shrink-0" /> {project.location}
                      </p>
                    )}
                    {(project.precon_cities?.name || project.property_type) && (
                      <p className="mt-1 text-[10px] text-muted-foreground capitalize">
                        {project.precon_cities?.name || "—"} ·{" "}
                        {project.property_type === "condo"
                          ? "Condo"
                          : project.property_type === "home"
                            ? "Home"
                            : project.property_type === "townhome"
                              ? "Townhome"
                              : "Mixed"}
                      </p>
                    )}
                    {project.price_range && (
                      <p className="text-sm font-semibold text-accent mt-2">{project.price_range}</p>
                    )}
                    {isCoopVisibleToAgents(project, hideCommissionRates) &&
                      project.commission_rate_percent != null &&
                      !Number.isNaN(Number(project.commission_rate_percent)) && (
                        <PreConCoopInline percent={Number(project.commission_rate_percent)} />
                      )}
                    {project.contact_phone?.trim() && (
                      <p className="mt-2 flex items-center gap-1.5 text-sm">
                        <Phone className="h-3.5 w-3.5 shrink-0 text-primary" />
                        <a
                          href={`tel:${project.contact_phone.replace(/[^\d+]/g, "")}`}
                          className="font-medium text-primary underline-offset-4 hover:underline"
                        >
                          {project.contact_phone}
                        </a>
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-start">
                    <SocialShareIconRow
                      compact
                      preface={`Pre-con project: ${project.name}`}
                      linkUrl={buildListingShareUrl(
                        buildListingSharePayloadForPrecon(project, assets, hideCommissionRates)
                      )}
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant={bookmarks.includes(project.id) ? "default" : "outline"}
                      className="shrink-0"
                      onClick={() => toggleBookmark(project.id)}
                      aria-label="Bookmark"
                    >
                      <Bookmark className={`h-4 w-4 ${bookmarks.includes(project.id) ? "fill-current" : ""}`} />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-2">{project.description}</p>
                {project.external_url && (
                  <Button variant="outline" size="sm" className="mt-3 w-full" asChild>
                    <a href={project.external_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3 mr-2" /> View project details
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
          {!PORTAL_SHOWCASE && filteredProjects.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>{projects.length === 0 ? "No pre-construction projects listed yet" : "No projects match your filters."}</p>
            </div>
          )}
          {PORTAL_SHOWCASE && filteredDemoListings.length === 0 && (
            <div className="col-span-full py-10 text-center text-sm text-muted-foreground">
              No demo listings match your filters.
            </div>
          )}
        </div>

        <div className="mt-12">
          <BuyerPresentationKit />
        </div>
      </section>

      <section id="assets" className="scroll-mt-24 space-y-10 pt-16 border-t border-border">
        <div className="flex items-center gap-3">
          <LayoutGrid className="h-7 w-7 text-accent" />
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground">{assetsLabel.title}</h2>
            <p className="text-sm text-muted-foreground">{assetsLabel.subtitle}</p>
          </div>
        </div>

        {PORTAL_SHOWCASE ? (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {demoAssetTiles.map((t) => (
                (() => {
                  const isWorksheet = t.title.toLowerCase().includes("worksheet");
                  return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    if (t.href) {
                      document.querySelector(t.href)?.scrollIntoView({ behavior: "smooth" });
                    } else if (t.action === "hst") {
                      document.getElementById("hst-calculator-anchor")?.scrollIntoView({ behavior: "smooth" });
                    } else if (t.title.toLowerCase().includes("worksheet")) {
                      setWorksheetOpen(true);
                    } else {
                      toast({ title: t.title, description: "Link your asset library in admin." });
                    }
                  }}
                  className={`group rounded-2xl border p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                    isWorksheet
                      ? "border-primary/40 bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/20 hover:border-primary/60"
                      : "border-border/80 bg-card/90 hover:border-primary/25"
                  }`}
                >
                  {isWorksheet && (
                    <span className="inline-flex rounded-full border border-primary/30 bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                      Featured
                    </span>
                  )}
                  <span className="text-3xl">{t.icon}</span>
                  <p className="mt-3 font-display text-base font-bold text-foreground">{t.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t.sub}</p>
                  <div className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                    {isWorksheet ? "Open worksheet" : "Open"}
                    <ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </div>
                </button>
                );
                })()
              ))}
            </div>
            <div className="mt-8 grid max-w-4xl grid-cols-1 gap-4 md:grid-cols-2">
              <div id="hst-calculator-anchor" className="scroll-mt-28">
                <HSTCalculator />
              </div>
              <div id="commission-calculator-anchor" className="scroll-mt-28">
                <CommissionCalculator />
              </div>
            </div>
            <div className="mt-10">
              <h3 className="mb-4 font-display text-lg font-semibold text-foreground">Pre-con documents</h3>
              <ScrollArea className="w-full pb-2">
                <div className="flex gap-3 pb-1">
                  {demoDocuments.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => toast({ title: d.name, description: "PDF preview can open in a modal or Drive." })}
                      className="flex min-w-[150px] shrink-0 flex-col items-center rounded-xl border border-border/80 bg-card/90 p-4 text-center shadow-sm transition hover:border-primary/30"
                    >
                      <span className="text-3xl">{d.icon}</span>
                      <span className="mt-2 text-xs font-semibold text-foreground">{d.name}</span>
                      <span className="mt-2 text-[10px] font-semibold text-primary">Download PDF</span>
                    </button>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <button
                type="button"
                className="group relative flex min-h-[140px] flex-col justify-between rounded-xl border-2 border-primary/35 bg-gradient-to-br from-primary/20 to-primary/5 p-6 text-left transition-all hover:border-primary/60 hover:shadow-md"
                onClick={() => setWorksheetOpen(true)}
              >
                <span className="absolute right-4 top-4 rounded-full border border-primary/30 bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                  Recommended
                </span>
                <FileSpreadsheet className="h-8 w-8 text-red-700 dark:text-red-400" />
                <div>
                  <p className="font-display text-lg font-semibold">Pre-con worksheet</p>
                  <p className="mt-1 text-xs text-muted-foreground">Fill and submit client worksheet details</p>
                </div>
                <div className="inline-flex items-center gap-1 self-end text-xs font-semibold text-primary">
                  Open worksheet
                  <ChevronRight className="h-5 w-5 text-primary" />
                </div>
              </button>

              <div className="flex min-h-[140px] flex-col justify-center rounded-xl border-2 border-border bg-gradient-to-br from-destructive/15 to-destructive/5 p-6">
                <FolderOpen className="mb-2 h-8 w-8 text-destructive" />
                <p className="font-display text-lg font-semibold">Pre-con documents</p>
                <p className="mt-1 text-xs text-muted-foreground">Download templates below</p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div id="hst-calculator-anchor" className="scroll-mt-28">
                <HSTCalculator />
              </div>
              <div id="commission-calculator-anchor" className="scroll-mt-28">
                <CommissionCalculator />
              </div>
            </div>

            <PreconLibrary />
          </>
        )}

        {!PORTAL_SHOWCASE && assetCategories.length > 0 && (
          <div>
            <h3 className="font-display font-semibold text-lg mb-3 flex items-center gap-2">
              <Share2 className="h-5 w-5 text-accent" />
              Social &amp; floor assets
            </h3>
            <Tabs defaultValue={assetCategories[0]} className="w-full">
              <TabsList className="mb-4 flex flex-wrap h-auto gap-1">
                {assetCategories.map((cat) => (
                  <TabsTrigger key={cat} value={cat}>
                    {cat}
                  </TabsTrigger>
                ))}
              </TabsList>
              {assetCategories.map((cat) => (
                <TabsContent key={cat} value={cat}>
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                    {assets
                      .filter((a) => a.category === cat)
                      .map((asset) => {
                        const Icon = asset.asset_type === "social_media" ? Share2 : Image;
                        return (
                          <Card key={asset.id} className="border-border hover:shadow-md transition-all">
                            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                                <Icon className="h-6 w-6 text-accent" />
                              </div>
                              <p className="text-sm font-medium text-foreground line-clamp-2">{asset.title}</p>
                              <Button variant="outline" size="sm" className="w-full" asChild>
                                <a href={asset.file_url} target="_blank" rel="noopener noreferrer">
                                  Download
                                </a>
                              </Button>
                            </CardContent>
                          </Card>
                        );
                      })}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        )}

        {!PORTAL_SHOWCASE && assetCategories.length === 0 && (
          <div className="py-6 text-center text-sm text-muted-foreground">
            <Image className="mx-auto mb-2 h-8 w-8 opacity-30" />
            No additional marketing assets yet — admins can upload per project.
          </div>
        )}
      </section>

      <PreConListingDetailSheet
        project={detail}
        open={!!detail}
        onOpenChange={(o) => !o && setDetail(null)}
        agentId={agentId}
        isDemo={(detail?.id ?? "").startsWith("demo-")}
        hideCommissionRates={hideCommissionRates}
        projectAssets={detailAssets}
        bookmarked={detail ? bookmarks.includes(detail.id) : false}
        onToggleBookmark={() => detail && toggleBookmark(detail.id)}
      />

      <PreConWorksheetForm
        open={worksheetOpen}
        onOpenChange={setWorksheetOpen}
        agentId={agentId}
        agentName={agentName}
        agentEmail={agentEmail}
        recoNumber={recoNumber}
      />
    </>
  );
}
