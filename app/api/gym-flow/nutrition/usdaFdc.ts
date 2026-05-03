/**
 * USDA FoodData Central — generic / reference foods for Gym Flow nutrition.
 * @see https://fdc.nal.usda.gov/api-guide.html
 */

export const USDA_CODE_PREFIX = 'usda:';

export type UsdaSearchResult = {
  code: string;
  name: string;
  brands?: string;
  quantity?: string;
  servingSize?: string;
  image?: string;
};

export type UsdaNutritionItem = {
  code: string;
  name: string;
  brands?: string;
  quantity?: string;
  servingSize?: string;
  suggestedServingGrams?: number | null;
  per100g: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
};

const FDC_SEARCH = 'https://api.nal.usda.gov/fdc/v1/foods/search';

function roundN(n: number): number {
  return Math.round(n * 10) / 10;
}

function nutrientMapFromFoodNutrients(foodNutrients: unknown): Map<number, number> {
  const m = new Map<number, number>();
  if (!Array.isArray(foodNutrients)) return m;
  for (const row of foodNutrients) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const n = r.nutrient as Record<string, unknown> | undefined;
    if (n && typeof n.id === 'number' && typeof r.amount === 'number') {
      m.set(n.id, r.amount);
      continue;
    }
    if (typeof r.nutrientId === 'number' && typeof r.value === 'number') {
      m.set(r.nutrientId, r.value);
    }
  }
  return m;
}

function macrosFromNutrientMapPer100g(m: Map<number, number>): UsdaNutritionItem['per100g'] | null {
  const protein = m.get(1003);
  const fat = m.get(1004);
  const carbs = m.get(1005);
  let kcal = m.get(1008);
  if (kcal == null && m.has(1062)) {
    const kj = m.get(1062);
    if (kj != null) kcal = kj / 4.184;
  }
  if (kcal == null || protein == null || fat == null || carbs == null) return null;
  if (![kcal, protein, fat, carbs].every((x) => Number.isFinite(x))) return null;
  return {
    calories: roundN(kcal),
    protein: roundN(protein),
    carbs: roundN(carbs),
    fat: roundN(fat),
  };
}

function servingGramsFromBranded(food: Record<string, unknown>): number | null {
  const size = food.servingSize;
  const unit = String(food.servingSizeUnit ?? '')
    .toLowerCase()
    .trim();
  if (typeof size !== 'number' || !Number.isFinite(size)) return null;
  if (unit === 'g' || unit === 'gram' || unit === 'grams') return size;
  if (unit === 'ml') return size;
  if (unit === 'oz') return size * 28.3495;
  // Some branded rows mis-label grams as MG (e.g. 30 for a 30 g serving).
  if (unit === 'mg' && size >= 10 && size <= 250) return size;
  return null;
}

function servingHintFromMeasures(food: Record<string, unknown>): { grams: number; label: string } | null {
  const measures = food.foodMeasures as
    | { gramWeight?: number; disseminationText?: string }[]
    | undefined;
  if (!Array.isArray(measures)) return null;
  const hit = measures.find((x) => typeof x.gramWeight === 'number' && x.gramWeight > 0);
  if (!hit?.gramWeight) return null;
  const grams = Math.round(hit.gramWeight);
  const label = hit.disseminationText
    ? `${hit.disseminationText} (~${grams} g)`
    : `${grams} g`;
  return { grams, label };
}

function tryBrandedLabelPer100g(food: Record<string, unknown>): {
  per100g: UsdaNutritionItem['per100g'];
  suggestedServingGrams: number;
  servingLabel: string;
} | null {
  const ln = food.labelNutrients as
    | Record<string, { value?: number } | undefined>
    | undefined;
  const sg = servingGramsFromBranded(food);
  if (!ln || sg == null || !(sg > 0)) return null;
  const cal = ln.calories?.value;
  if (cal == null || !Number.isFinite(cal)) return null;
  const k = 100 / sg;
  return {
    per100g: {
      calories: roundN(cal * k),
      protein: roundN((ln.protein?.value ?? 0) * k),
      carbs: roundN((ln.carbohydrates?.value ?? 0) * k),
      fat: roundN((ln.fat?.value ?? 0) * k),
    },
    suggestedServingGrams: Math.min(5000, Math.round(sg)),
    servingLabel: food.householdServingFullText
      ? `${String(food.householdServingFullText)} (~${Math.round(sg)} g)`
      : `${Math.round(sg)} g (label serving)`,
  };
}

function tryPerServingNutrients(food: Record<string, unknown>, m: Map<number, number>): UsdaNutritionItem['per100g'] | null {
  const sg = servingGramsFromBranded(food);
  if (sg == null || !(sg > 0)) return null;
  const protein = m.get(1003);
  const fat = m.get(1004);
  const carbs = m.get(1005);
  let kcal = m.get(1008);
  if (kcal == null && m.has(1062)) {
    const kj = m.get(1062);
    if (kj != null) kcal = kj / 4.184;
  }
  if (kcal == null || protein == null || fat == null || carbs == null) return null;
  if (![kcal, protein, fat, carbs].every((x) => Number.isFinite(x))) return null;
  const factor = 100 / sg;
  return {
    calories: roundN(kcal * factor),
    protein: roundN(protein * factor),
    carbs: roundN(carbs * factor),
    fat: roundN(fat * factor),
  };
}

export function mapFdcFoodDocumentToItem(food: Record<string, unknown>, code: string): UsdaNutritionItem | null {
  const name = String(food.description ?? '').trim() || 'Unknown food';
  const dataType = typeof food.dataType === 'string' ? food.dataType : '';
  const brands = dataType ? `USDA · ${dataType}` : 'USDA';

  const branded = tryBrandedLabelPer100g(food);
  const m = nutrientMapFromFoodNutrients(food.foodNutrients);

  let per100g: UsdaNutritionItem['per100g'] | null = null;
  if (branded) {
    per100g = branded.per100g;
  } else {
    per100g = macrosFromNutrientMapPer100g(m);
    if (!per100g && dataType === 'Branded') {
      per100g = tryPerServingNutrients(food, m);
    }
  }

  if (!per100g) return null;

  let suggestedServingGrams: number | null = null;
  let servingSize: string | undefined;

  if (branded) {
    suggestedServingGrams = branded.suggestedServingGrams;
    servingSize = branded.servingLabel;
  } else {
    const fromMeasures = servingHintFromMeasures(food);
    if (fromMeasures) {
      suggestedServingGrams = fromMeasures.grams;
      servingSize = fromMeasures.label;
    }
  }

  return {
    code,
    name,
    brands,
    quantity: dataType || undefined,
    servingSize,
    suggestedServingGrams,
    per100g,
  };
}

export async function searchUsdaFoods(query: string, apiKey: string): Promise<UsdaSearchResult[]> {
  const url = new URL(FDC_SEARCH);
  url.searchParams.set('api_key', apiKey);

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      pageSize: 12,
      dataType: ['Foundation', 'SR Legacy', 'Survey (FNDDS)', 'Branded'],
    }),
    cache: 'no-store',
  });

  if (!res.ok) return [];

  const data = (await res.json()) as { foods?: Record<string, unknown>[] };
  const foods = data.foods ?? [];

  const out: UsdaSearchResult[] = [];
  for (const f of foods) {
    const fdcId = f.fdcId;
    if (typeof fdcId !== 'number' || !Number.isFinite(fdcId)) continue;
    const name = String(f.description ?? '').trim();
    if (!name) continue;
    const dataType = typeof f.dataType === 'string' ? f.dataType : '';
    const hint =
      servingHintFromMeasures(f)?.label ??
      (typeof f.householdServingFullText === 'string' ? f.householdServingFullText : undefined);
    out.push({
      code: `${USDA_CODE_PREFIX}${fdcId}`,
      name,
      brands: dataType ? `USDA · ${dataType}` : 'USDA',
      servingSize: hint,
    });
  }
  return out;
}

export async function fetchUsdaFoodItem(fdcId: number, apiKey: string): Promise<UsdaNutritionItem | null> {
  const url = new URL(`https://api.nal.usda.gov/fdc/v1/food/${fdcId}`);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('format', 'full');

  const res = await fetch(url.toString(), { cache: 'no-store' });
  if (!res.ok) return null;

  const food = (await res.json()) as Record<string, unknown>;
  if (!food || typeof food !== 'object' || food.fdcId == null) return null;

  return mapFdcFoodDocumentToItem(food, `${USDA_CODE_PREFIX}${fdcId}`);
}

export function parseUsdaFdcIdFromCode(code: string): number | null {
  if (!code.startsWith(USDA_CODE_PREFIX)) return null;
  const id = Number.parseInt(code.slice(USDA_CODE_PREFIX.length), 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}
