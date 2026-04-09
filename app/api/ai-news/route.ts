import { NextRequest, NextResponse } from 'next/server';

// Get a free personal key at https://open-platform.theguardian.com/access/
// Add it to .env.local as GUARDIAN_API_KEY=your-key-here
// Falls back to 'test' which works at low rate for demos.
const KEY = process.env.GUARDIAN_API_KEY ?? 'test';

// Strict AI query scoped to the Technology section only
const AI_QUERY   = '"artificial intelligence" OR "machine learning" OR "generative AI" OR "large language model" OR ChatGPT OR "AI model"';
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

export async function GET(req: NextRequest) {
  // Ignore cat param — always serve AI-tagged articles
  void new URL(req.url).searchParams.get('cat');

  const url = new URL('https://content.guardianapis.com/search');
  url.searchParams.set('q',           AI_QUERY);
  url.searchParams.set('section',     AI_SECTION);
  url.searchParams.set('show-fields', 'thumbnail,trailText');
  url.searchParams.set('page-size',   '12');
  url.searchParams.set('order-by',    'newest');
  url.searchParams.set('api-key',     KEY);

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 300 } });
    if (!res.ok) throw new Error(`Guardian ${res.status}`);

    const json = await res.json();
    const articles: NewsArticle[] = json.response.results.map((r: {
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
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' } },
    );
  } catch (err) {
    console.error('ai-news route error:', err);
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  }
}
