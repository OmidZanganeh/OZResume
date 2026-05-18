/**
 * Heuristic parser for compound food queries.
 *
 * Examples:
 *   "chicken and rice"            -> [{name:"chicken"},{name:"rice"}]
 *   "100g rice + 2 eggs"          -> [{name:"rice",grams:100},{name:"eggs",count:2}]
 *   "1 cup oats, 200g greek yogurt" -> [{name:"oats",count:1,unit:"cup"},{name:"greek yogurt",grams:200}]
 *
 * Intentionally conservative: only treats a query as compound when at least two
 * non-trivial parts come out. Anything shorter than 2 chars is dropped.
 */

export type ParsedFoodPart = {
  /** Raw fragment as the user typed it (after splitting). */
  raw: string;
  /** Food name only (qty/unit stripped). */
  name: string;
  /** Resolved grams if a recognized weight unit was given. */
  grams?: number;
  /** Count if a bare integer prefix or piece/each-style unit was given. */
  count?: number;
  /** Raw unit token captured, if any. */
  unit?: string;
};

const CONNECTOR_RE = /\s+(?:and|with|plus|w\/)\s+|\s*(?:[,&+]|\bw\/\b)\s*/i;

const WEIGHT_UNITS: Record<string, number> = {
  g: 1,
  gram: 1,
  grams: 1,
  gr: 1,
  kg: 1000,
  kgs: 1000,
  oz: 28.3495,
  ounce: 28.3495,
  ounces: 28.3495,
  lb: 453.592,
  lbs: 453.592,
  pound: 453.592,
  pounds: 453.592,
  ml: 1, // approx for liquids; close enough for portion prefill
  mls: 1,
};

const COUNT_UNITS = new Set([
  'cup',
  'cups',
  'tbsp',
  'tablespoon',
  'tablespoons',
  'tsp',
  'teaspoon',
  'teaspoons',
  'slice',
  'slices',
  'piece',
  'pieces',
  'each',
  'serving',
  'servings',
  'scoop',
  'scoops',
  'egg',
  'eggs',
  'banana',
  'bananas',
  'apple',
  'apples',
]);

const QTY_UNIT_RE =
  /^\s*(\d+(?:[.,]\d+)?)\s*([a-zA-Z]+)?\s+(.+?)\s*$/;
const QTY_ONLY_RE = /^\s*(\d+(?:[.,]\d+)?)\s+(.+?)\s*$/;

function parsePart(raw: string): ParsedFoodPart | null {
  const trimmed = raw.trim().replace(/\s+/g, ' ');
  if (trimmed.length < 2) return null;

  // "100g rice", "2 cups oats", "8 oz chicken"
  const m = QTY_UNIT_RE.exec(trimmed);
  if (m) {
    const qty = Number.parseFloat(m[1].replace(',', '.'));
    const unitToken = (m[2] ?? '').toLowerCase();
    const rest = m[3].trim();
    if (Number.isFinite(qty) && rest.length >= 2) {
      if (unitToken && WEIGHT_UNITS[unitToken] != null) {
        return { raw: trimmed, name: rest, grams: qty * WEIGHT_UNITS[unitToken], unit: unitToken };
      }
      if (unitToken && COUNT_UNITS.has(unitToken)) {
        return { raw: trimmed, name: rest, count: qty, unit: unitToken };
      }
      // Bare qty like "2 eggs" — no unit captured by group 2; fall through to QTY_ONLY_RE.
    }
  }

  const m2 = QTY_ONLY_RE.exec(trimmed);
  if (m2) {
    const qty = Number.parseFloat(m2[1].replace(',', '.'));
    const rest = m2[2].trim();
    if (Number.isFinite(qty) && rest.length >= 2) {
      return { raw: trimmed, name: rest, count: qty };
    }
  }

  return { raw: trimmed, name: trimmed };
}

/**
 * Returns the parsed parts when the query looks compound (>=2 parts), or
 * `null` when it should be searched as a single phrase.
 */
export function parseCompoundFoodQuery(query: string): ParsedFoodPart[] | null {
  const q = query.trim();
  if (q.length < 3) return null;
  // Skip pure barcodes.
  if (/^\d{8,14}$/.test(q)) return null;

  const fragments = q.split(CONNECTOR_RE);
  if (fragments.length < 2) return null;

  const parts: ParsedFoodPart[] = [];
  const seen = new Set<string>();
  for (const frag of fragments) {
    const parsed = parsePart(frag);
    if (!parsed) continue;
    const key = parsed.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    parts.push(parsed);
  }
  if (parts.length < 2) return null;
  return parts;
}
