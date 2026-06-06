// Vastu Chakra reference data — 16 directions (MahaVastu zones) with the
// life-aspect each governs and the colour used on the chakra wheel.
// Based on the standard 16-zone MahaVastu compass.

export interface VastuZone {
  /** Short code shown on the wheel, e.g. "N", "NNE". */
  code: string;
  /** Full direction name. */
  name: string;
  /** Centre bearing in degrees (0 = North, clockwise). */
  angle: number;
  /** The life aspect this zone governs. */
  aspect: string;
  /** A short description of the zone's influence. */
  meaning: string;
  /** Recommended uses / activities for this zone. */
  ideal: string;
  /** Accent colour for the wheel segment. */
  color: string;
}

export const VASTU_ZONES: VastuZone[] = [
  { code: "N",   name: "North",              angle: 0,     aspect: "Career & Opportunities", meaning: "Governs new opportunities, career growth and cash flow.", ideal: "Entrance, living room, cash locker, water feature", color: "#1f7ae0" },
  { code: "NNE", name: "North-North-East",   angle: 22.5,  aspect: "Health & Immunity",      meaning: "Zone of health, recovery and immunity.",                  ideal: "Open space, water, light activity",                  color: "#16a34a" },
  { code: "NE",  name: "North-East",         angle: 45,    aspect: "Clarity of Mind",        meaning: "The most sacred zone — clarity, focus and divine energy.", ideal: "Pooja/prayer room, water, open & clutter-free",     color: "#0ea5b7" },
  { code: "ENE", name: "East-North-East",    angle: 67.5,  aspect: "Fun & Recreation",       meaning: "Zone of relaxation, recreation and entertainment.",        ideal: "Sitting area, recreation, open space",               color: "#22c55e" },
  { code: "E",   name: "East",               angle: 90,    aspect: "Social Connections",     meaning: "Governs social associations and networking.",              ideal: "Living room, entrance, study, balcony",              color: "#f59e0b" },
  { code: "ESE", name: "East-South-East",    angle: 112.5, aspect: "Anxiety & Churning",     meaning: "Zone of churning and overthinking — keep balanced.",       ideal: "Toilet, store, stairs (no bedroom)",                 color: "#a855f7" },
  { code: "SE",  name: "South-East",         angle: 135,   aspect: "Fire, Cash & Liquidity", meaning: "Zone of fire — governs cash liquidity and energy.",        ideal: "Kitchen, electricals, inverter",                     color: "#ef4444" },
  { code: "SSE", name: "South-South-East",   angle: 157.5, aspect: "Power & Confidence",     meaning: "Zone of strength, power and confidence.",                  ideal: "Bedroom (master), heavy storage",                    color: "#dc2626" },
  { code: "S",   name: "South",              angle: 180,   aspect: "Fame & Relaxation",      meaning: "Governs fame, reputation and rest.",                       ideal: "Bedroom, heavy storage, relaxation",                 color: "#e2231a" },
  { code: "SSW", name: "South-South-West",   angle: 202.5, aspect: "Expenditure & Disposal", meaning: "Zone of waste disposal and outgoing expenses.",            ideal: "Toilet, dustbin, store (waste)",                     color: "#7c3aed" },
  { code: "SW",  name: "South-West",         angle: 225,   aspect: "Relationships & Skills", meaning: "Zone of relationships, stability and skills.",             ideal: "Master bedroom, heavy storage, lockers",             color: "#6d28d9" },
  { code: "WSW", name: "West-South-West",    angle: 247.5, aspect: "Education & Savings",     meaning: "Governs education, learning and savings.",                 ideal: "Study room, children's bedroom, books",              color: "#4f46e5" },
  { code: "W",   name: "West",               angle: 270,   aspect: "Gains & Profits",        meaning: "Zone of gains, profits and returns.",                      ideal: "Dining, study, bedroom",                             color: "#2563eb" },
  { code: "WNW", name: "West-North-West",    angle: 292.5, aspect: "Depression & Detox",     meaning: "Zone of detoxification — keep light and active.",          ideal: "Toilet, bathroom, store",                            color: "#0891b2" },
  { code: "NW",  name: "North-West",         angle: 315,   aspect: "Support & Banking",      meaning: "Governs support, banking and finance relationships.",      ideal: "Guest room, store, finished goods",                  color: "#0d9488" },
  { code: "NNW", name: "North-North-West",   angle: 337.5, aspect: "Sex & Attraction",       meaning: "Zone of attraction, charm and indulgence.",                ideal: "Bedroom, guest room",                                color: "#15803d" },
];

/** The five Vastu elements and the colours used for the cross lines. */
export const VASTU_AXES = [
  { label: "Main axis (N–S)", color: "#1f7ae0" },
  { label: "Main axis (E–W)", color: "#16a34a" },
  { label: "Diagonal (NE–SW)", color: "#dc2626" },
  { label: "Diagonal (NW–SE)", color: "#7c3aed" },
];
