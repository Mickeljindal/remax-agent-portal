import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Percent } from "lucide-react";

const HST_RATE = 0.13;

function parseAmount(value: string): number {
  const cleaned = value.replace(/[^0-9.]/g, "");
  const numeric = Number.parseFloat(cleaned);
  return Number.isFinite(numeric) ? numeric : 0;
}

/** Illustrative co-op payout from price including HST — not a commission statement. */
export default function CommissionCalculator() {
  const [price, setPrice] = useState("");
  const [coopPct, setCoopPct] = useState("2.5");

  const result = useMemo(() => {
    const gross = parseAmount(price);
    const c = parseAmount(coopPct);
    if (gross <= 0 || c <= 0) {
      return { baseBeforeHst: 0, payout: 0 };
    }
    const baseBeforeHst = gross / (1 + HST_RATE);
    return {
      baseBeforeHst,
      payout: (baseBeforeHst * c) / 100,
    };
  }, [price, coopPct]);

  const fmt = (n: number) =>
    n.toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 font-display text-base">
          <Percent className="h-5 w-5 text-[hsl(4_80%_52%)]" />
          Co-op commission estimate (net of HST)
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Commission is calculated from the net price before HST.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label htmlFor="coop-price">Sale price (including HST)</Label>
          <Input
            id="coop-price"
            inputMode="decimal"
            placeholder="689900"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="coop-pct">Co-op % offered</Label>
          <Input
            id="coop-pct"
            inputMode="decimal"
            placeholder="2.5"
            value={coopPct}
            onChange={(e) => setCoopPct(e.target.value)}
          />
        </div>
        <div className="rounded-lg bg-gradient-to-br from-blue-700 to-blue-900 p-3 text-center shadow-md">
          <p className="text-[10px] font-medium uppercase tracking-wide text-white/70">
            Net before HST: {fmt(result.baseBeforeHst)}
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-white/80">Estimated co-op dollars</p>
          <p className="mt-1 font-display text-lg font-bold tabular-nums text-white">{fmt(result.payout)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
