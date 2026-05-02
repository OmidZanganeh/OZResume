import { auth } from '@/auth';
import { NextResponse } from 'next/server';

type SearchResult = {
  code: string;
  name: string;
  brands?: string;
  quantity?: string;
  servingSize?: string;
  image?: string;
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

  try {
    const url = new URL(`${OPENFOODFACTS_HOST}/cgi/search.pl`);
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
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json(
        { error: 'Upstream error', status: res.status, details: text.slice(0, 400) },
        { status: 502 },
      );
    }

    const data = (await res.json()) as { products?: Record<string, unknown>[] };
    const items: SearchResult[] = (data.products ?? [])
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

    return NextResponse.json(
      { items },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=60' } },
    );
  } catch (error) {
    console.error('[gym-flow/nutrition search]', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
