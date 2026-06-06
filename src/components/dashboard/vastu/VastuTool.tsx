import { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  Upload, RotateCw, RotateCcw, Compass, Download, Trash2, Eye, EyeOff, Loader2, Move,
} from "lucide-react";
import { VASTU_ZONES } from "@/config/vastuData";
import VastuChakra from "./VastuChakra";
import { cn } from "@/lib/utils";

/**
 * Interactive Vastu Chakra tool: upload a floor plan (image or PDF), overlay
 * the 16-direction Vastu compass, then rotate / resize / move it to align with
 * the plan. Click a zone to see its meaning. Export the result as a PNG.
 */
export default function VastuTool() {
  const [planUrl, setPlanUrl] = useState<string | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [chakraSize, setChakraSize] = useState(320);
  const [opacity, setOpacity] = useState(0.85);
  const [showLabels, setShowLabels] = useState(true);
  const [pos, setPos] = useState({ x: 50, y: 50 }); // % of container
  const [activeZone, setActiveZone] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setLoadingPlan(true);
    try {
      if (file.type === "application/pdf") {
        const { pdfFirstPageToDataUrl } = await import("@/lib/pdfToImage");
        const url = await pdfFirstPageToDataUrl(file, 2);
        setPlanUrl(url);
      } else if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = () => setPlanUrl(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        toast({ variant: "destructive", title: "Unsupported file", description: "Upload a JPG, PNG, or PDF floor plan." });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Could not load file", description: e instanceof Error ? e.message : "Try another file." });
    } finally {
      setLoadingPlan(false);
    }
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  // Drag the chakra around the plan.
  const onPointerDown = (e: React.PointerEvent) => {
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPos({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  };
  const onPointerUp = () => setDragging(false);

  const reset = () => { setRotation(0); setChakraSize(320); setOpacity(0.85); setPos({ x: 50, y: 50 }); setActiveZone(null); };

  // Export the stage (plan + chakra) to a PNG using a fresh canvas.
  const exportPng = async () => {
    if (!planUrl || !stageRef.current) return;
    try {
      const planImg = new Image();
      planImg.src = planUrl;
      await planImg.decode();

      const W = planImg.naturalWidth;
      const H = planImg.naturalHeight;
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported");
      ctx.drawImage(planImg, 0, 0, W, H);

      // Scale chakra from on-screen pixels to the plan's natural pixels.
      const rect = stageRef.current.getBoundingClientRect();
      const scale = W / rect.width;
      const drawSize = chakraSize * scale;
      const cxNat = (pos.x / 100) * W;
      const cyNat = (pos.y / 100) * H;

      // Rasterise the SVG chakra to an image.
      const svgEl = stageRef.current.querySelector("svg");
      if (svgEl) {
        const clone = svgEl.cloneNode(true) as SVGSVGElement;
        clone.removeAttribute("style");
        clone.setAttribute("width", `${drawSize}`);
        clone.setAttribute("height", `${drawSize}`);
        const xml = new XMLSerializer().serializeToString(clone);
        const svgUrl = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(xml)));
        const svgImg = new Image();
        svgImg.src = svgUrl;
        await svgImg.decode();

        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.translate(cxNat, cyNat);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.drawImage(svgImg, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
        ctx.restore();
      }

      const link = document.createElement("a");
      link.download = "vastu-floor-plan.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast({ title: "Exported", description: "Vastu floor plan saved as PNG." });
    } catch (e) {
      toast({ variant: "destructive", title: "Export failed", description: e instanceof Error ? e.message : "Try again." });
    }
  };

  const active = VASTU_ZONES.find((z) => z.code === activeZone) || null;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      {/* Stage */}
      <div className="space-y-3">
        {!planUrl ? (
          <div
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            className="flex min-h-[360px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/30 bg-muted/20 p-8 text-center transition hover:border-primary/50 hover:bg-muted/30"
          >
            {loadingPlan ? (
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            ) : (
              <>
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#e2231a] to-[#1a4d8f] text-white">
                  <Compass className="h-7 w-7" />
                </div>
                <p className="font-display text-lg font-semibold">Upload a floor plan</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Drag &amp; drop or click to choose a JPG, PNG, or PDF. The Vastu compass will overlay on top so you can align it.
                </p>
              </>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
            />
          </div>
        ) : (
          <div
            ref={stageRef}
            className="relative overflow-hidden rounded-2xl border border-border bg-white shadow-sm"
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            <img src={planUrl} alt="Floor plan" className="block w-full select-none" draggable={false} />
            {/* Chakra overlay */}
            <div
              className={cn("absolute touch-none", dragging ? "cursor-grabbing" : "cursor-grab")}
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                width: chakraSize,
                height: chakraSize,
                transform: "translate(-50%, -50%)",
              }}
              onPointerDown={onPointerDown}
            >
              <VastuChakra
                size={chakraSize}
                rotation={rotation}
                opacity={opacity}
                showLabels={showLabels}
                activeZone={activeZone}
                onZoneClick={setActiveZone}
              />
            </div>
            <div className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white">
              <Move className="h-3 w-3" /> Drag the wheel · click a zone for its meaning
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="space-y-4">
        <Card>
          <CardContent className="space-y-4 pt-5">
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 gap-1.5" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4" /> {planUrl ? "Replace" : "Upload"}
              </Button>
              {planUrl && (
                <Button variant="outline" size="icon" onClick={() => { setPlanUrl(null); reset(); }} aria-label="Remove plan">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>

            {planUrl && (
              <>
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <Label className="text-xs">Rotation</Label>
                    <span className="text-xs text-muted-foreground">{Math.round(rotation)}°</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => setRotation((r) => r - 5)}><RotateCcw className="h-4 w-4" /></Button>
                    <Slider value={[rotation]} min={0} max={360} step={1} onValueChange={([v]) => setRotation(v)} />
                    <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => setRotation((r) => r + 5)}><RotateCw className="h-4 w-4" /></Button>
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <Label className="text-xs">Size</Label>
                    <span className="text-xs text-muted-foreground">{chakraSize}px</span>
                  </div>
                  <Slider value={[chakraSize]} min={120} max={640} step={4} onValueChange={([v]) => setChakraSize(v)} />
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <Label className="text-xs">Opacity</Label>
                    <span className="text-xs text-muted-foreground">{Math.round(opacity * 100)}%</span>
                  </div>
                  <Slider value={[opacity * 100]} min={20} max={100} step={1} onValueChange={([v]) => setOpacity(v / 100)} />
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => setShowLabels((s) => !s)}>
                    {showLabels ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    {showLabels ? "Hide labels" : "Show labels"}
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={reset}>
                    <RotateCcw className="h-3.5 w-3.5" /> Reset
                  </Button>
                </div>

                <Button className="w-full gap-1.5 bg-[#e2231a] hover:bg-[#c41e16]" onClick={exportPng}>
                  <Download className="h-4 w-4" /> Export as image
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Zone meaning */}
        {active ? (
          <Card className="border-l-4" style={{ borderLeftColor: active.color }}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-md px-1.5 text-xs font-bold text-white" style={{ background: active.color }}>
                  {active.code}
                </span>
                <div>
                  <p className="font-semibold text-sm leading-tight">{active.name}</p>
                  <p className="text-xs text-muted-foreground">{active.aspect}</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-foreground">{active.meaning}</p>
              <p className="mt-2 text-xs text-muted-foreground"><span className="font-semibold text-foreground">Ideal use:</span> {active.ideal}</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm font-semibold">16 Vastu zones</p>
              <p className="mt-1 text-xs text-muted-foreground">Click any zone on the wheel to see what it governs and its ideal use.</p>
              <div className="mt-3 grid grid-cols-2 gap-1.5">
                {VASTU_ZONES.map((z) => (
                  <button
                    key={z.code}
                    onClick={() => setActiveZone(z.code)}
                    className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-left text-[11px] hover:bg-muted"
                  >
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: z.color }} />
                    <span className="truncate"><b>{z.code}</b> · {z.aspect}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
