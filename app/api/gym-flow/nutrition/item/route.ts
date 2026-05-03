import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { fetchUsdaFoodItem, parseUsdaFdcIdFromCode } from '../usdaFdc';

type NutritionPer100g = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
};

type NutritionItem = {
  code: string;
  name: string;
  brands?: string;
  quantity?: string;
  servingSize?: string;
  /** Grams parsed from `serving_size` when it looks like "30 g" (optional hint for logging). */
  suggestedServingGrams?: number | null;
  per100g: NutritionPer100g;
};

/** Prefer US mirror first; fall back to world for barcodes not on the US shard. */
const OPENFOODFACTS_HOSTS = ['https://us.openfoodfacts.org', 'https://world.openfoodfacts.org'] as const;

async function fetchWithRetry(url: string, init: RequestInit, attempts = 3): Promise<Response> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(url, init);
      if (res.ok || ![429, 502, 503, 504].includes(res.status)) return res;
      lastError = new Error(`Retryable status ${res.status}`);
    } catch (err) {
      lastError = err;
    }
    const delayMs = 350 + i * 550;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  throw lastError ?? new Error('Upstream fetch failed');
}

function asNumber(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number.parseFloat(value) : NaN;
  return Number.isFinite(n) ? n : null;
}

function parseGramsFromServingText(text: string | undefined): number | null {
  if (!text || typeof text !== 'string') return null;
  const m = text.match(/(\d+(?:[.,]\d+)?)\s*g(?:ram)?s?\b/i);
  if (!m) return null;
  const n = Number.parseFloat(m[1].replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0 || n > 5000) return null;
  return n;
}

function nutritionItemFromOffProduct(product: Record<string, unknown>, fallbackCode: string): NutritionItem | null {
  const nutriments = (product.nutriments ?? {}) as Record<string, unknown>;
  const energyKcal = asNumber(nutriments['energy-kcal_100g']);
  const energyKj = asNumber(nutriments['energy_100g']);
  const calories = energyKcal ?? (energyKj != null ? energyKj / 4.184 : null);
  const protein = asNumber(nutriments['proteins_100g']);
  const carbs = asNumber(nutriments['carbohydrates_100g']);
  const fat = asNumber(nutriments['fat_100g']);
  const fiber = asNumber(nutriments['fiber_100g']) ?? 0;

  if (calories === null || protein === null || carbs === null || fat === null) {
    return null;
  }

  return {
    code: String(product.code ?? fallbackCode),
    name: String(product.product_name_en ?? product.product_name ?? '').trim() || 'Unknown food',
    brands: typeof product.brands === 'string' ? product.brands : undefined,
    quantity: typeof product.quantity === 'string' ? product.quantity : undefined,
    servingSize: typeof product.serving_size === 'string' ? product.serving_size : undefined,
    per100g: {
      calories,
      protein,
      carbs,
      fat,
      fiber: Number.isFinite(fiber) ? fiber : 0,
    },
    suggestedServingGrams: parseGramsFromServingText(
      typeof product.serving_size === 'string' ? product.serving_size : undefined,
    ),
  };
}

async function lookupOpenFoodFactsProduct(code: string): Promise<
  | { ok: true; item: NutritionItem }
  | { ok: false; reason: 'not_found' }
  | { ok: false; reason: 'incomplete' }
  | { ok: false; reason: 'upstream'; status: number; details: string }
> {
  let lastUpstream: { status: number; details: string } | null = null;
  let sawProductMissingMacros = false;

  for (const host of OPENFOODFACTS_HOSTS) {
    const url = new URL(`${host}/api/v2/product/${encodeURIComponent(code)}`);
    url.searchParams.set('fields', 'code,product_name,product_name_en,brands,quantity,serving_size,nutriments');

    let res: Response;
    try {
      res = await fetchWithRetry(url.toString(), {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'GymFlow/1.0 (https://omidzanganeh.com/gym-flow)',
        },
        cache: 'no-store',
      });
    } catch {
      continue;
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      lastUpstream = { status: res.status, details: text.slice(0, 400) };
      continue;
    }

    const data = (await res.json()) as {
      status?: number;
      product?: Record<string, unknown>;
    };

    if (data.status !== 1 || !data.product) {
      continue;
    }

    const item = nutritionItemFromOffProduct(data.product, code);
    if (!item) {
      sawProductMissingMacros = true;
      continue;
    }
    return { ok: true, item };
  }

  if (lastUpstream) {
    return { ok: false, reason: 'upstream', status: lastUpstream.status, details: lastUpstream.details };
  }
  if (sawProductMissingMacros) {
    return { ok: false, reason: 'incomplete' };
  }
  return { ok: false, reason: 'not_found' };
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code')?.trim();
  if (!code) {
    return NextResponse.json({ error: 'Missing code' }, { status: 400 });
  }

  const usdaId = parseUsdaFdcIdFromCode(code);
  if (usdaId != null) {
    const apiKey = process.env.USDA_FDC_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: 'USDA FoodData Central is not configured (missing USDA_FDC_API_KEY)' },
        { status: 503 },
      );
    }
    try {
      const item = await fetchUsdaFoodItem(usdaId, apiKey);
      if (!item) {
        return NextResponse.json({ error: 'Food not found' }, { status: 404 });
      }
      return NextResponse.json(
        { item },
        { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=60' } },
      );
    } catch (error) {
      console.error('[gym-flow/nutrition item USDA]', error);
      return NextResponse.json({ error: 'USDA lookup failed' }, { status: 502 });
    }
  }

  try {
    const off = await lookupOpenFoodFactsProduct(code);
    if (!off.ok) {
      if (off.reason === 'not_found') {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
      if (off.reason === 'incomplete') {
        return NextResponse.json({ error: 'Missing nutrient data' }, { status: 422 });
      }
      return NextResponse.json(
        { error: 'Upstream error', status: off.status, details: off.details },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { item: off.item },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=60' } },
    );
  } catch (error) {
    console.error('[gym-flow/nutrition item]', error);
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
  }
}
