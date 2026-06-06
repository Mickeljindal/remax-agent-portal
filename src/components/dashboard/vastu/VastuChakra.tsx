import { VASTU_ZONES } from "@/config/vastuData";

interface VastuChakraProps {
  /** Diameter in pixels. */
  size: number;
  /** Rotation of the whole wheel in degrees. */
  rotation?: number;
  /** Opacity 0–1. */
  opacity?: number;
  /** Hide labels for a cleaner overlay. */
  showLabels?: boolean;
  /** Currently highlighted zone code. */
  activeZone?: string | null;
  onZoneClick?: (code: string) => void;
}

const polar = (cx: number, cy: number, r: number, deg: number) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

/** Builds an SVG arc path for a ring segment between two angles. */
function segPath(cx: number, cy: number, rOuter: number, rInner: number, a0: number, a1: number) {
  const p0 = polar(cx, cy, rOuter, a0);
  const p1 = polar(cx, cy, rOuter, a1);
  const p2 = polar(cx, cy, rInner, a1);
  const p3 = polar(cx, cy, rInner, a0);
  const large = a1 - a0 > 180 ? 1 : 0;
  return [
    `M ${p0.x} ${p0.y}`,
    `A ${rOuter} ${rOuter} 0 ${large} 1 ${p1.x} ${p1.y}`,
    `L ${p2.x} ${p2.y}`,
    `A ${rInner} ${rInner} 0 ${large} 0 ${p3.x} ${p3.y}`,
    "Z",
  ].join(" ");
}

/**
 * Renders the 16-direction Vastu compass as an SVG. Pure presentational —
 * rotation/opacity are controlled by the parent overlay tool.
 */
export default function VastuChakra({
  size,
  rotation = 0,
  opacity = 0.9,
  showLabels = true,
  activeZone = null,
  onZoneClick,
}: VastuChakraProps) {
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size / 2 - 2;
  const rRing = rOuter - 26;        // inner edge of the coloured zone ring
  const rLabel = (rOuter + rRing) / 2;
  const step = 360 / 16;            // 22.5° per zone

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ transform: `rotate(${rotation}deg)`, opacity }}
      className="select-none"
    >
      {/* Outer + inner circles */}
      <circle cx={cx} cy={cy} r={rOuter} fill="none" stroke="#111827" strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={rRing} fill="none" stroke="#111827" strokeWidth={1} />

      {/* Zone ring segments */}
      {VASTU_ZONES.map((z) => {
        const a0 = z.angle - step / 2;
        const a1 = z.angle + step / 2;
        const isActive = activeZone === z.code;
        return (
          <path
            key={z.code}
            d={segPath(cx, cy, rOuter, rRing, a0, a1)}
            fill={z.color}
            fillOpacity={isActive ? 0.85 : 0.35}
            stroke="#ffffff"
            strokeWidth={0.75}
            style={{ cursor: onZoneClick ? "pointer" : "default" }}
            onClick={() => onZoneClick?.(z.code)}
          />
        );
      })}

      {/* The four Vastu axes (N-S, E-W, and the two diagonals) */}
      {[
        { a: 0, c: "#1f7ae0" },     // N–S
        { a: 90, c: "#16a34a" },    // E–W
        { a: 45, c: "#dc2626" },    // NE–SW
        { a: 135, c: "#7c3aed" },   // NW–SE
      ].map(({ a, c }) => {
        const p0 = polar(cx, cy, rRing, a);
        const p1 = polar(cx, cy, rRing, a + 180);
        return <line key={a} x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke={c} strokeWidth={2.5} strokeOpacity={0.9} />;
      })}

      {/* Spokes between every zone */}
      {VASTU_ZONES.map((z) => {
        const p = polar(cx, cy, rOuter, z.angle - step / 2);
        return <line key={`spoke-${z.code}`} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#111827" strokeWidth={0.4} strokeOpacity={0.4} />;
      })}

      {/* Centre marker */}
      <circle cx={cx} cy={cy} r={4} fill="#e2231a" />

      {/* Labels (counter-rotated so they stay upright) */}
      {showLabels &&
        VASTU_ZONES.map((z) => {
          const p = polar(cx, cy, rLabel, z.angle);
          return (
            <text
              key={`lbl-${z.code}`}
              x={p.x}
              y={p.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={size > 360 ? 11 : 9}
              fontWeight={700}
              fill="#0f172a"
              transform={`rotate(${-rotation} ${p.x} ${p.y})`}
            >
              {z.code}
            </text>
          );
        })}
    </svg>
  );
}
