import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import EditableHeading from "@/components/dashboard/EditableHeading";

const HST_RATE = 0.13;

function parseAmount(value: string): number {
  const cleaned = value.replace(/[^0-9.]/g, "");
  const numeric = Number.parseFloat(cleaned);
  return Number.isFinite(numeric) ? numeric : 0;
}

/** Illustrative Ontario net-of-HST and commission estimate — not tax advice. */
export default function HSTCalculator() {
  const { isAdmin } = useAuth();
  const [salePriceInclHst, setSalePriceInclHst] = useState("");
  const [commissionPct, setCommissionPct] = useState("2.5");

  const result = useMemo(() => {
    const gross = parseAmount(salePriceInclHst);
    const pct = parseAmount(commissionPct);

    if (gross <= 0) {
      return {
        gross,
        baseBeforeHst: 0,
        hstPortion: 0,
        commissionPct: pct,
        commissionPayout: 0,
      };
    }

    const baseBeforeHst = gross / (1 + HST_RATE);
    const hstPortion = gross - baseBeforeHst;
    const commissionPayout = pct > 0 ? (baseBeforeHst * pct) / 100 : 0;

    return {
      gross,
      baseBeforeHst,
      hstPortion,
      commissionPct: pct,
      commissionPayout,
    };
  }, [salePriceInclHst, commissionPct]);

  const fmt = (n: number) =>
    n.toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 2 });

  return (
    <Card className="overflow-hidden border border-[#003865]/20 bg-gradient-to-br from-card via-card to-[#0f2744]/[0.03] shadow-sm dark:border-[#003865]/35">
      <CardHeader className="pb-3">
        <EditableHeading
          sectionKey="calc-hst"
          defaultTitle="HST & commission payout calculator"
          defaultSubtitle="Commission is calculated on the net-of-HST base only (not on the HST amount)."
          isAdmin={isAdmin}
        >
          {(lbl) => (
            <div>
              <CardTitle className="text-base font-display flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[hsl(4_80%_56%)]/10 text-[hsl(4_80%_56%)]">
                  <Calculator className="h-4 w-4" />
                </span>
                {lbl.title}
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">{lbl.subtitle}</p>
            </div>
          )}
        </EditableHeading>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="hst-price" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Sale price (including 13% HST)
            </Label>
          <Input
            id="hst-price"
            inputMode="decimal"
            placeholder="850000"
            value={salePriceInclHst}
            onChange={(e) => setSalePriceInclHst(e.target.value)}
            className="mt-1.5 h-11 bg-background/90 text-base"
          />
          </div>
          <div>
            <Label htmlFor="commission-pct" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Agent commission %
            </Label>
          <Input
            id="commission-pct"
            inputMode="decimal"
            placeholder="2.5"
            value={commissionPct}
            onChange={(e) => setCommissionPct(e.target.value)}
            className="mt-1.5 h-11 bg-background/90 text-base"
          />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 text-center text-sm md:grid-cols-3">
          <div className="rounded-xl border border-border/70 bg-muted/60 p-3">
            <p className="text-[10px] uppercase text-muted-foreground">Sale price (incl. HST)</p>
            <p className="font-semibold">{fmt(result.gross)}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-muted/60 p-3">
            <p className="text-[10px] uppercase text-muted-foreground">Net before HST</p>
            <p className="font-semibold text-foreground">{fmt(result.baseBeforeHst)}</p>
          </div>
          <div className="rounded-xl border border-[hsl(4_80%_56%)]/25 bg-[hsl(4_80%_56%)]/8 p-3">
            <p className="text-[10px] uppercase text-muted-foreground">HST portion (no commission)</p>
            <p className="font-semibold">{fmt(result.hstPortion)}</p>
          </div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-blue-700 to-blue-900 p-4 text-center shadow-md">
          <p className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-white/80">
            <Sparkles className="h-3 w-3 text-white/80" />
            Commission payout @ {result.commissionPct || 0}%
          </p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums text-white">
            {fmt(result.commissionPayout)}
          </p>
          <p className="mt-1 text-[11px] text-white/70">
            Formula: Net before HST × Commission %
          </p>
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/35 px-3 py-2 text-[11px] text-muted-foreground">
          This is an estimate for planning. Final brokerage payout can vary by agreement, split, and deductions.
        </div>
      </CardContent>
    </Card>
  );
}
