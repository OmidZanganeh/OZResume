import { FILTER_DEFS, ALL_SECTORS, type FilterDef } from './filters';

export type CodeFieldCategory =
  | 'identity'
  | 'fundamental'
  | 'technical'
  | 'historical'
  | 'pattern';

export interface CodeFieldDoc {
  id: string;
  label: string;
  category: CodeFieldCategory;
  unit: string;
  aliases: string[];
  example: string;
  range?: string;
  note?: string;
}

const IDENTITY_FIELDS: CodeFieldDoc[] = [
  {
    id: 'sector',
    label: 'Sector',
    category: 'identity',
    unit: 'text',
    aliases: ['sector'],
    example: 'sector = Tech',
    note: 'Tech, Healthcare, Finance, Energy, Consumer',
  },
  {
    id: 'ticker',
    label: 'Ticker symbol',
    category: 'identity',
    unit: 'text',
    aliases: ['ticker', 'symbol'],
    example: 'ticker = AAPL',
    note: 'Also: ticker in (AAPL, MSFT, NVDA)',
  },
  {
    id: 'name',
    label: 'Company name',
    category: 'identity',
    unit: 'text',
    aliases: ['name', 'company', 'companyName'],
    example: 'name contains Apple',
    note: 'Case-insensitive substring match',
  },
];

const HISTORICAL_FIELDS: CodeFieldDoc[] = [
  {
    id: 'returnToTodayPct',
    label: 'Return → Today',
    category: 'historical',
    unit: '%',
    aliases: ['returnToTodayPct', 'retNow', 'returnToToday', 'ret_to_today'],
    example: 'retNow > 50',
    note: 'Historical timeline only — return from screen date to today',
  },
  {
    id: 'returnToTargetPct',
    label: 'Return → Target date',
    category: 'historical',
    unit: '%',
    aliases: ['returnToTargetPct', 'retTarget', 'returnToTarget'],
    example: 'retTarget > 20',
    note: 'Historical timeline only — uses return-period control under timeline',
  },
  {
    id: 'priceThen',
    label: 'Price at screen date',
    category: 'historical',
    unit: '$',
    aliases: ['priceThen', 'price_then'],
    example: 'priceThen < 100',
    note: 'Weekly close at selected past date',
  },
];

const PATTERN_FIELDS: CodeFieldDoc[] = [
  {
    id: 'similarity',
    label: 'Pattern similarity',
    category: 'pattern',
    unit: '%',
    aliases: ['similarity', 'sim', 'match'],
    example: 'sim > 75',
    note: 'Only when pattern-match references are active',
  },
];

function unitForDef(def: FilterDef): string {
  const id = def.id;
  if (id === 'marketCap') return '$M (millions)';
  if (id === 'price') return '$';
  if (id === 'avgVolume') return 'M shares/day';
  if (
    id === 'beta' || id === 'peRatio' || id === 'forwardPe' || id === 'pegRatio'
    || id === 'pbRatio' || id === 'psRatio' || id === 'pcfRatio' || id === 'evToEbitda'
    || id === 'debtToEquity' || id === 'currentRatio' || id === 'quickRatio'
    || id === 'interestCoverage'
  ) {
    return 'ratio';
  }
  if (
    id.includes('Growth') || id.includes('Margin') || id.includes('Change')
    || id.includes('Yield') || id === 'roe' || id === 'roa' || id === 'roic'
    || id === 'debtToAssets' || id === 'payoutRatio' || id === 'freeCashFlowYield'
    || id === 'volatility30d' || id === 'atrPercent' || id === 'priceVs52wHigh'
    || id === 'priceVs52wLow'
  ) {
    return '%';
  }
  return 'number';
}

function shorthandForDef(def: FilterDef): string[] {
  const extras: Record<string, string[]> = {
    peRatio: ['PE', 'pe'],
    forwardPe: ['FPE', 'fpe'],
    pegRatio: ['PEG', 'peg'],
    pbRatio: ['PB', 'pb'],
    psRatio: ['PS', 'ps'],
    pcfRatio: ['PCF', 'pcf'],
    evToEbitda: ['EV', 'ev'],
    marketCap: ['marketCap', 'mcap', 'cap'],
    epsGrowth: ['epsGrowth', 'eps_growth'],
    revenueGrowth: ['revenueGrowth', 'revenue_growth'],
    profitMargin: ['margin', 'profitMargin'],
    grossMargin: ['grossMargin'],
    operatingMargin: ['operatingMargin'],
    dividendYield: ['div', 'yield', 'dividendYield'],
    payoutRatio: ['payout', 'payoutRatio'],
    freeCashFlowYield: ['fcfYield', 'fcf_yield', 'freeCashFlowYield'],
    priceChange1m: ['1M', '4W', 'priceChange1m'],
    priceChange3m: ['3M', 'priceChange3m'],
    priceChange6m: ['6M', 'priceChange6m'],
    priceChange52w: ['52W', 'priceChange52w'],
    priceVs52wHigh: ['vs_high', 'vs52high', 'priceVs52wHigh'],
    priceVs52wLow: ['vs_low', 'vs52low', 'priceVs52wLow'],
    avgVolume: ['vol', 'volume', 'avgVolume'],
    volatility30d: ['volatility', 'vol30', 'volatility30d'],
    atrPercent: ['atr', 'atrPercent'],
    debtToEquity: ['de', 'dte', 'debtToEquity'],
    debtToAssets: ['debtToAssets'],
    currentRatio: ['currentRatio'],
    quickRatio: ['quickRatio'],
    interestCoverage: ['interestCoverage'],
    roe: ['ROE', 'roe'],
    roa: ['ROA', 'roa'],
    roic: ['ROIC', 'roic'],
    beta: ['beta'],
    price: ['price'],
  };
  const list = [...(extras[def.id] ?? [def.id])];
  if (!list.includes(def.id)) list.unshift(def.id);
  return list;
}

function metricFieldsFromDefs(): CodeFieldDoc[] {
  return FILTER_DEFS.map(def => ({
    id: def.id,
    label: def.label,
    category: def.category as CodeFieldCategory,
    unit: unitForDef(def),
    aliases: shorthandForDef(def),
    example: `${shorthandForDef(def)[0]} > 10`,
    range: `${def.min} … ${def.max}`,
    note: def.explanation.split('.')[0] + '.',
  }));
}

export const CODE_FILTER_FIELD_DOCS: CodeFieldDoc[] = [
  ...IDENTITY_FIELDS,
  ...metricFieldsFromDefs(),
  ...HISTORICAL_FIELDS,
  ...PATTERN_FIELDS,
];

export const CODE_FILTER_EXAMPLES = [
  'PE > 10 & 52W > 55',
  'PE < 25 & ROE > 15 & sector = Tech',
  'marketCap > 10000 & div > 2',
  '(PE > 5 & PE < 30) | beta < 1',
  'sector in (Tech, Healthcare) & 52W > 20',
  'retNow > 30 & peRatio < 40',
  'ticker in (AAPL, MSFT) & sim > 70',
  'name contains Apple & 52W > 10',
] as const;

export function buildCodeFilterAliasMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const field of CODE_FILTER_FIELD_DOCS) {
    for (const alias of field.aliases) {
      map[alias.toLowerCase()] = field.id;
      map[normalizeAliasKey(alias)] = field.id;
    }
    map[field.id.toLowerCase()] = field.id;
  }
  return map;
}

function normalizeAliasKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '_');
}

export function fieldsByCategory(cat: CodeFieldCategory): CodeFieldDoc[] {
  return CODE_FILTER_FIELD_DOCS.filter(f => f.category === cat);
}

export const CODE_FIELD_CATEGORIES: { id: CodeFieldCategory; label: string }[] = [
  { id: 'identity', label: 'Identity' },
  { id: 'fundamental', label: 'Fundamental' },
  { id: 'technical', label: 'Technical' },
  { id: 'historical', label: 'Historical timeline' },
  { id: 'pattern', label: 'Pattern match' },
];

export { ALL_SECTORS };
