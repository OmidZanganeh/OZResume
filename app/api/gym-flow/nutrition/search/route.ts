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
    const url = new URL('https://world.openfoodfacts.org/cgi/search.pl');
    url.searchParams.set('search_terms', query);
    url.searchParams.set('search_simple', '1');
    url.searchParams.set('action', 'process');
    url.searchParams.set('json', '1');
    url.searchParams.set('page_size', '20');
    url.searchParams.set('fields', 'code,product_name,brands,quantity,serving_size');

    const res = await fetch(url.toString());
    if (!res.ok) {
      return NextResponse.json({ error: 'Upstream error' }, { status: 502 });
    }

    const data = (await res.json()) as { products?: Record<string, unknown>[] };
    const items: SearchResult[] = (data.products ?? [])
      .map((p) => ({
        code: String(p.code ?? ''),
        name: String(p.product_name ?? '').trim(),
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
