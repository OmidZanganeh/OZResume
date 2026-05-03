import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { searchUsdaFoods } from '../usdaFdc';

type SearchResult = {
  code: string;
  name: string;
  brands?: string;
  quantity?: string;
  servingSize?: string;
  image?: string;
};

function mapOffProductsToResults(data: { products?: Record<string, unknown>[] }): SearchResult[] {
  return (data.products ?? [])
    .map((p) => {
      const image = (p.image_front_small_url ?? p.image_small_url ?? p.image_thumb_url ?? p.image_front_thumb_url) as string | undefined;
      return {
        code: String(p.code ?? ''),
        name: String(p.product_name_en ?? p.product_name ?? '').trim(),
        brands: typeof p.brands === 'string' ? p.brands : undefined,
        quantity: typeof p.quantity === 'string' ? p.quantity : undefined,
        servingSize: typeof p.serving_size === 'string' ? p.serving_size : undefined,
        image: image && image.length > 0 ? image : undefined,
      };
    })
    .filter((p) => p.code && p.name);
}

async function openFoodFactsSearch(query: string): Promise<SearchResult[]> {
  const hosts = ['https://us.openfoodfacts.org', 'https://world.openfoodfacts.org'];
  for (const host of hosts) {
    try {
      const url = new URL(`${host}/cgi/search.pl`);
      url.searchParams.set('search_terms', query);
      url.searchParams.set('search_simple', '1');
      url.searchParams.set('action', 'process');
      url.searchParams.set('json', '1');
      url.searchParams.set('page_size', '20');
      url.searchParams.set('fields', 'code,product_name,product_name_en,brands,quantity,serving_size,image_small_url,image_thumb_url,image_front_small_url,image_front_thumb_url');

      const res = await fetchWithRetry(url.toString(), {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'GymFlow/1.0 (https://omidzanganeh.com/gym-flow)',
        },
        cache: 'no-store',
      });
      const text = await res.text();
      const trimmed = text.trim();
      if (!res.ok || (!trimmed.startsWith('{') && !trimmed.startsWith('['))) {
        if (!res.ok) {
          console.error('[gym-flow/nutrition search] OFF HTTP', host, res.status, trimmed.slice(0, 120));
        }
        continue;
      }
      let data: { products?: Record<string, unknown>[] };
      try {
        data = JSON.parse(text) as { products?: Record<string, unknown>[] };
      } catch {
        console.error('[gym-flow/nutrition search] OFF JSON parse', host);
        continue;
      }
      const items = mapOffProductsToResults(data);
      if (items.length > 0) return items;
    } catch (e) {
      console.error('[gym-flow/nutrition search] Open Food Facts', host, e);
    }
  }
  return [];
}

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

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get('query')?.trim();
  if (!query) {
    return NextResponse.json({ error: 'Missing query' }, { status: 400 });
  }

  const usdaKey = process.env.USDA_FDC_API_KEY?.trim();

  try {
    const offSafe = openFoodFactsSearch(query).catch((e) => {
      console.error('[gym-flow/nutrition search] Open Food Facts', e);
      return [] as SearchResult[];
    });

    const usdaSafe = (usdaKey
      ? searchUsdaFoods(query, usdaKey).catch((e) => {
          console.error('[gym-flow/nutrition search] USDA', e);
          return [] as SearchResult[];
        })
      : Promise.resolve([] as SearchResult[]));

    const [offRes, usdaItems] = await Promise.all([offSafe, usdaSafe]);

    const items: SearchResult[] = [...usdaItems, ...offRes];

    return NextResponse.json(
      { items },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=60' } },
    );
  } catch (error) {
    console.error('[gym-flow/nutrition search]', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
