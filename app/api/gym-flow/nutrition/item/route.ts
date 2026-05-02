import { auth } from '@/auth';
import { NextResponse } from 'next/server';

type NutritionPer100g = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

type NutritionItem = {
  code: string;
  name: string;
  brands?: string;
  quantity?: string;
  servingSize?: string;
  per100g: NutritionPer100g;
};

const OPENFOODFACTS_HOST = 'https://us.openfoodfacts.org';

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

  try {
    const url = new URL(`${OPENFOODFACTS_HOST}/api/v2/product/${encodeURIComponent(code)}`);
    url.searchParams.set('fields', 'code,product_name,product_name_en,brands,quantity,serving_size,nutriments');

    const res = await fetchWithRetry(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'GymFlow/1.0 (https://omidzanganeh.com/gym-flow)',
      },
      cache: 'no-store',
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json(
        { error: 'Upstream error', status: res.status, details: text.slice(0, 400) },
        { status: 502 },
      );
    }

    const data = (await res.json()) as {
      status?: number;
      product?: Record<string, unknown>;
    };

    if (data.status !== 1 || !data.product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const nutriments = (data.product.nutriments ?? {}) as Record<string, unknown>;
    const energyKcal = asNumber(nutriments['energy-kcal_100g']);
    const energyKj = asNumber(nutriments['energy_100g']);
    const calories = energyKcal ?? (energyKj != null ? energyKj / 4.184 : null);
    const protein = asNumber(nutriments['proteins_100g']);
    const carbs = asNumber(nutriments['carbohydrates_100g']);
    const fat = asNumber(nutriments['fat_100g']);

    if (calories === null || protein === null || carbs === null || fat === null) {
      return NextResponse.json({ error: 'Missing nutrient data' }, { status: 422 });
    }

    const item: NutritionItem = {
      code: String(data.product.code ?? code),
      name: String(data.product.product_name_en ?? data.product.product_name ?? '').trim() || 'Unknown food',
      brands: typeof data.product.brands === 'string' ? data.product.brands : undefined,
      quantity: typeof data.product.quantity === 'string' ? data.product.quantity : undefined,
      servingSize: typeof data.product.serving_size === 'string' ? data.product.serving_size : undefined,
      per100g: {
        calories,
        protein,
        carbs,
        fat,
      },
    };

    return NextResponse.json(
      { item },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=60' } },
    );
  } catch (error) {
    console.error('[gym-flow/nutrition item]', error);
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
  }
}
