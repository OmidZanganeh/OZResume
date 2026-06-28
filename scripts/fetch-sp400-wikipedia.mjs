#!/usr/bin/env node
/** Fetch S&P 400 from Wikipedia → stdout CSV or write to data/sp400-constituents.csv */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const WIKI_URL = 'https://en.wikipedia.org/wiki/List_of_S%26P_400_companies';

function stripHtml(s) {
  return s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).trim();
}

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function gicsToSector(gics) {
  const g = gics.toLowerCase();
  if (g.includes('information technology')) return 'Tech';
  if (g.includes('health care')) return 'Healthcare';
  if (g.includes('financial')) return 'Finance';
  if (g.includes('energy')) return 'Energy';
  return 'Consumer';
}

async function main() {
  const res = await fetch(WIKI_URL, {
    headers: { 'User-Agent': 'resume-site-stock-screener/1.0 (constituent sync)' },
  });
  if (!res.ok) throw new Error(`Wikipedia fetch failed (${res.status})`);
  const html = await res.text();

  const tableMatch = html.match(/<table[^>]*class="[^"]*wikitable[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) throw new Error('Wikipedia S&P 400 table not found');

  const rows = [...tableMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  const symbols = [];

  for (const row of rows.slice(1)) {
    const cells = [...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(m => stripHtml(m[1]));
    const symbol = cells[0]?.replace(/\s/g, '');
    const name = cells[1];
    const gics = cells[2] ?? '';
    if (!symbol || !name || symbol.toLowerCase() === 'symbol') continue;
    symbols.push({
      symbol: symbol.replace(/\./g, '-'),
      name,
      rawGics: gics,
      sector: gicsToSector(gics),
    });
  }

  if (symbols.length < 350) throw new Error(`Too few symbols (${symbols.length})`);

  symbols.sort((a, b) => a.symbol.localeCompare(b.symbol));

  const lines = ['Symbol,Security,GICS Sector', ...symbols.map(s => {
    const esc = n => (n.includes(',') ? `"${n.replace(/"/g, '""')}"` : n);
    return `${esc(s.symbol)},${esc(s.name)},${esc(s.rawGics)}`;
  })];

  const outPath = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'sp400-constituents.csv');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, lines.join('\n') + '\n', 'utf8');
  console.log(`Wrote ${symbols.length} symbols → ${outPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
