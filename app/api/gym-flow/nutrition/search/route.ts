import { auth } from '@/auth';
import { NextResponse } from 'next/server';

type SearchResult = {
  code: string;
  name: string;
  brands?: string;
  quantity?: string;
  servingSize?: string;
};

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
    const url = new URL('https://world.openfoodfacts.org/api/v2/search');
    url.searchParams.set('search_terms', query);
    url.searchParams.set('page_size', '20');
    url.searchParams.set('countries_tags', 'en:united-states');
    url.searchParams.set('lang', 'en');
    url.searchParams.set('sort_by', 'unique_scans_n');
    url.searchParams.set('fields', 'code,product_name,product_name_en,brands,quantity,serving_size');

    const res = await fetch(url.toString(), {
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
      .map((p) => ({
        code: String(p.code ?? ''),
        name: String(p.product_name_en ?? p.product_name ?? '').trim(),
        brands: typeof p.brands === 'string' ? p.brands : undefined,
        quantity: typeof p.quantity === 'string' ? p.quantity : undefined,
        servingSize: typeof p.serving_size === 'string' ? p.serving_size : undefined,
      }))
      .filter((p) => p.code && p.name);

    return NextResponse.json({ items });
  } catch (error) {
    console.error('[gym-flow/nutrition search]', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
