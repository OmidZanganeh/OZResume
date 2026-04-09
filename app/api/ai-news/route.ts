import { NextRequest, NextResponse } from 'next/server';

// Get a free personal key at https://open-platform.theguardian.com/access/
// Add it to .env.local as GUARDIAN_API_KEY=your-key-here
// Falls back to 'test' which works at low rate for demos.
const KEY = process.env.GUARDIAN_API_KEY ?? 'test';

const AI_QUERY   = 'artificial intelligence OR machine learning OR generative AI OR ChatGPT OR "large language model"';
const AI_SECTION = 'technology';

export interface NewsArticle {
  id:        string;
  title:     string;
  url:       string;
  date:      string;
  section:   string;
  thumbnail: string | null;
  trail:     string | null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g,  '&')
    .replace(/&lt;/g,   '<')
    .replace(/&gt;/g,   '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g,  "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

export async function GET(_req: NextRequest) {
  const url = new URL('https://content.guardianapis.com/search');
  url.searchParams.set('q',           AI_QUERY);
  url.searchParams.set('section',     AI_SECTION);
  url.searchParams.set('show-fields', 'thumbnail,trailText');
  url.searchParams.set('page-size',   '12');
  url.searchParams.set('order-by',    'newest');
  url.searchParams.set('api-key',     KEY);

  try {
    // cache: 'no-store' — always fetch fresh from Guardian, never serve stale
    const res = await fetch(url.toString(), { cache: 'no-store' });

    const json = await res.json();

    if (!res.ok || json?.response?.status !== 'ok') {
      console.error('Guardian API error:', JSON.stringify(json));
      return NextResponse.json(
        { error: 'Guardian error', detail: json },
        { status: 502 },
      );
    }

    const results = json.response?.results ?? [];
    const articles: NewsArticle[] = results.map((r: {
      id: string;
      webTitle: string;
      webUrl: string;
      webPublicationDate: string;
      sectionName: string;
      fields?: { thumbnail?: string; trailText?: string };
    }) => ({
      id:        r.id,
      title:     r.webTitle,
      url:       r.webUrl,
      date:      r.webPublicationDate,
      section:   r.sectionName,
      thumbnail: r.fields?.thumbnail ?? null,
      trail:     r.fields?.trailText ? stripHtml(r.fields.trailText) : null,
    }));

    return NextResponse.json(
      { articles, fetchedAt: new Date().toISOString() },
      { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=120' } },
    );
  } catch (err) {
    console.error('ai-news route error:', err);
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  }
}
