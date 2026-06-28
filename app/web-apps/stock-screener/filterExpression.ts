import type { Sector, Stock, StockMetrics } from './types';
import { SIMILARITY_KEYS, FUNDAMENTAL_SIMILARITY_KEYS, type SimilarityKey } from './similarity';
import type { MomentumProfile } from './weeklyMomentum';

export type CompareOp = '>' | '>=' | '<' | '<=' | '==' | '!=';

type MetricId = keyof StockMetrics;

export type MomentumField = SimilarityKey;

export type ContextField =
  | 'returnToTodayPct'
  | 'returnToTargetPct'
  | 'priceThen'
  | 'similarity';

export type NumericFilterField = MetricId | ContextField | MomentumField;

export type ExprField = NumericFilterField | 'sector' | 'ticker' | 'name';

export type FilterAst =
  | { type: 'and'; left: FilterAst; right: FilterAst }
  | { type: 'or'; left: FilterAst; right: FilterAst }
  | { type: 'compare'; field: NumericFilterField; op: CompareOp; value: number }
  | { type: 'sectorEq'; sector: Sector }
  | { type: 'sectorIn'; sectors: Sector[] }
  | { type: 'tickerEq'; ticker: string }
  | { type: 'tickerNeq'; ticker: string }
  | { type: 'tickerIn'; tickers: string[] }
  | { type: 'nameContains'; text: string };

export interface CodeFilterContext {
  returnToTodayPct?: number;
  returnToTargetPct?: number;
  priceThen?: number;
  similarity?: number;
  /** Today's weekly-derived momentum profile (pattern-match factors). */
  momentum?: Partial<MomentumProfile>;
  /** Today's fundamentals for pattern factor matching (vs past reference). */
  todayMetrics?: StockMetrics;
  /** When true, pattern fundamental fields use todayMetrics instead of timeline snap. */
  patternFactorScreen?: boolean;
}

export interface ParseResult {
  ast: FilterAst | null;
  error: string | null;
}

/** Shorthand names users can type in code filters (case-insensitive keys). */
export const METRIC_ALIASES: Record<string, ExprField> = {
  pe: 'peRatio',
  per: 'peRatio',
  'p/e': 'peRatio',
  pe_ratio: 'peRatio',
  fpe: 'forwardPe',
  forward_pe: 'forwardPe',
  forwardpe: 'forwardPe',
  peg: 'pegRatio',
  pb: 'pbRatio',
  ps: 'psRatio',
  pcf: 'pcfRatio',
  pcf_ratio: 'pcfRatio',
  ev: 'evToEbitda',
  ev_ebitda: 'evToEbitda',
  evebitda: 'evToEbitda',
  mcap: 'marketCap',
  marketcap: 'marketCap',
  market_cap: 'marketCap',
  cap: 'marketCap',
  eps_growth: 'epsGrowth',
  epsgrowth: 'epsGrowth',
  revenue_growth: 'revenueGrowth',
  revenuegrowth: 'revenueGrowth',
  margin: 'profitMargin',
  profitmargin: 'profitMargin',
  netmargin: 'profitMargin',
  grossmargin: 'grossMargin',
  operatingmargin: 'operatingMargin',
  roe: 'roe',
  roa: 'roa',
  roic: 'roic',
  de: 'debtToEquity',
  dte: 'debtToEquity',
  debt: 'debtToEquity',
  div: 'dividendYield',
  yield: 'dividendYield',
  divyield: 'dividendYield',
  dividend: 'dividendYield',
  payout: 'payoutRatio',
  fcf_yield: 'freeCashFlowYield',
  fcfyield: 'freeCashFlowYield',
  '52w': 'priceChange52w',
  ret52: 'priceChange52w',
  change52w: 'priceChange52w',
  '6m': 'priceChange6m',
  ret6m: 'priceChange6m',
  '3m': 'priceChange3m',
  ret3m: 'priceChange3m',
  '1m': 'priceChange1m',
  '4w': 'priceChange1m',
  ret1m: 'priceChange1m',
  vs_high: 'priceVs52wHigh',
  vs52high: 'priceVs52wHigh',
  from_high: 'priceVs52wHigh',
  vs_low: 'priceVs52wLow',
  vs52low: 'priceVs52wLow',
  from_low: 'priceVs52wLow',
  beta: 'beta',
  price: 'price',
  vol: 'avgVolume',
  volume: 'avgVolume',
  avgvolume: 'avgVolume',
  sector: 'sector',
  ticker: 'ticker',
  symbol: 'ticker',
  name: 'name',
  company: 'name',
  companyname: 'name',
  company_name: 'name',
  retnow: 'returnToTodayPct',
  return_to_today: 'returnToTodayPct',
  returntotoday: 'returnToTodayPct',
  returntotodaypct: 'returnToTodayPct',
  rettarget: 'returnToTargetPct',
  return_to_target: 'returnToTargetPct',
  returntotarget: 'returnToTargetPct',
  returntotargetpct: 'returnToTargetPct',
  price_then: 'priceThen',
  pricethen: 'priceThen',
  similarity: 'similarity',
  sim: 'similarity',
  match: 'similarity',
  ch4w: 'priceChange4w',
  ch8w: 'priceChange8w',
  ch13w: 'priceChange13w',
  ch20w: 'priceChange20w',
  ch26w: 'priceChange26w',
  ch52w: 'priceChange52w',
  vol13: 'realizedVol13w',
  vol26: 'realizedVol26w',
  accel4w: 'returnAccel4w',
  drawdown26w: 'maxDrawdown26w',
  range26w: 'rangePosition26w',
  posweeks13w: 'positiveWeeksPct13w',
  slope13w: 'trendSlope13w',
  slope26w: 'trendSlope26w',
};

type Token =
  | { kind: 'ident'; value: string; pos: number }
  | { kind: 'number'; value: number; pos: number }
  | { kind: 'string'; value: string; pos: number }
  | { kind: 'op'; value: string; pos: number }
  | { kind: 'lparen'; pos: number }
  | { kind: 'rparen'; pos: number }
  | { kind: 'comma'; pos: number };

function normalizeIdent(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '_');
}

const ALL_SECTORS: Sector[] = ['Tech', 'Healthcare', 'Finance', 'Energy', 'Consumer'];

const METRIC_IDS = new Set<string>([
  'peRatio', 'forwardPe', 'pegRatio', 'pbRatio', 'psRatio', 'pcfRatio', 'evToEbitda',
  'epsGrowth', 'revenueGrowth', 'profitMargin', 'grossMargin', 'operatingMargin',
  'roe', 'roa', 'roic', 'debtToEquity', 'debtToAssets', 'currentRatio', 'quickRatio',
  'interestCoverage', 'dividendYield', 'payoutRatio', 'freeCashFlowYield', 'price',
  'marketCap', 'priceChange1m', 'priceChange3m', 'priceChange6m', 'priceChange52w',
  'priceVs52wHigh', 'priceVs52wLow', 'avgVolume', 'volatility30d', 'atrPercent', 'beta',
]);

const CONTEXT_FIELDS = new Set<string>([
  'returnToTodayPct', 'returnToTargetPct', 'priceThen', 'similarity',
]);

const MOMENTUM_IDS = new Set<string>(SIMILARITY_KEYS);

const PATTERN_FUNDAMENTAL_IDS = new Set<string>(FUNDAMENTAL_SIMILARITY_KEYS);

function resolveField(raw: string): ExprField | null {
  const key = normalizeIdent(raw);
  if (METRIC_ALIASES[key]) return METRIC_ALIASES[key]!;
  if (METRIC_ALIASES[raw.toLowerCase()]) return METRIC_ALIASES[raw.toLowerCase()]!;
  const camel = raw.trim();
  if (METRIC_IDS.has(camel)) return camel as MetricId;
  if (MOMENTUM_IDS.has(camel)) return camel as MomentumField;
  if (CONTEXT_FIELDS.has(camel)) return camel as ContextField;
  return null;
}

function resolveSector(raw: string): Sector | null {
  const trimmed = raw.trim();
  return ALL_SECTORS.find(s => s.toLowerCase() === trimmed.toLowerCase()) ?? null;
}

function tokenize(input: string): { tokens: Token[]; error: string | null } {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const ch = input[i]!;

    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }

    if (ch === '"' || ch === "'") {
      const quote = ch;
      let j = i + 1;
      let value = '';
      while (j < input.length && input[j] !== quote) {
        value += input[j]!;
        j += 1;
      }
      if (j >= input.length) {
        return { tokens: [], error: `Unclosed string at column ${i + 1}` };
      }
      tokens.push({ kind: 'string', value, pos: i });
      i = j + 1;
      continue;
    }

    if (ch === '(') {
      tokens.push({ kind: 'lparen', pos: i });
      i += 1;
      continue;
    }
    if (ch === ')') {
      tokens.push({ kind: 'rparen', pos: i });
      i += 1;
      continue;
    }
    if (ch === ',') {
      tokens.push({ kind: 'comma', pos: i });
      i += 1;
      continue;
    }

    const two = input.slice(i, i + 2);
    if (two === '>=' || two === '<=' || two === '==' || two === '!=' || two === '&&' || two === '||') {
      tokens.push({ kind: 'op', value: two, pos: i });
      i += 2;
      continue;
    }
    if (ch === '>' || ch === '<' || ch === '&' || ch === '|' || ch === '=') {
      tokens.push({ kind: 'op', value: ch, pos: i });
      i += 1;
      continue;
    }

    if (/[0-9.]/.test(ch) || (ch === '-' && /[0-9]/.test(input[i + 1] ?? ''))) {
      let j = i;
      while (j < input.length && /[0-9.]/.test(input[j]!)) j += 1;
      if (j < input.length && /[a-zA-Z_]/.test(input[j]!)) {
        while (j < input.length && /[a-zA-Z_0-9/]/.test(input[j]!)) j += 1;
        tokens.push({ kind: 'ident', value: input.slice(i, j), pos: i });
        i = j;
        continue;
      }
      const num = Number(input.slice(i, j));
      if (!Number.isFinite(num)) {
        return { tokens: [], error: `Invalid number at column ${i + 1}` };
      }
      tokens.push({ kind: 'number', value: num, pos: i });
      i = j;
      continue;
    }

    if (/[a-zA-Z_0-9/]/.test(ch)) {
      let j = i + 1;
      while (j < input.length && /[a-zA-Z_0-9/]/.test(input[j]!)) j += 1;
      tokens.push({ kind: 'ident', value: input.slice(i, j), pos: i });
      i = j;
      continue;
    }

    return { tokens: [], error: `Unexpected character "${ch}" at column ${i + 1}` };
  }

  return { tokens, error: null };
}

class Parser {
  private pos = 0;

  constructor(private readonly tokens: Token[]) {}

  parse(): FilterAst {
    const node = this.parseOr();
    if (this.peek()) {
      throw new Error(`Unexpected token at column ${this.peek()!.pos + 1}`);
    }
    return node;
  }

  private peek(): Token | null {
    return this.tokens[this.pos] ?? null;
  }

  private consume(): Token {
    const t = this.tokens[this.pos];
    if (!t) throw new Error('Unexpected end of expression');
    this.pos += 1;
    return t;
  }

  private matchOp(...ops: string[]): string | null {
    const t = this.peek();
    if (t?.kind === 'op' && ops.includes(t.value)) {
      this.pos += 1;
      return t.value;
    }
    return null;
  }

  private parseOr(): FilterAst {
    let left = this.parseAnd();
    while (this.matchOp('||', '|')) {
      left = { type: 'or', left, right: this.parseAnd() };
    }
    return left;
  }

  private parseAnd(): FilterAst {
    let left = this.parsePrimary();
    while (this.matchOp('&&', '&')) {
      left = { type: 'and', left, right: this.parsePrimary() };
    }
    return left;
  }

  private parsePrimary(): FilterAst {
    if (this.peek()?.kind === 'lparen') {
      this.consume();
      const inner = this.parseOr();
      const next = this.peek();
      if (next?.kind !== 'rparen') {
        throw new Error(`Expected ")" at column ${(next?.pos ?? 0) + 1}`);
      }
      this.consume();
      return inner;
    }
    return this.parseComparison();
  }

  private parseInList<T>(
    parseItem: (raw: string, pos: number) => T,
    itemLabel: string,
  ): T[] {
    if (this.peek()?.kind !== 'lparen') {
      throw new Error(`Expected "(" after "in" at column ${(this.peek()?.pos ?? 0) + 1}`);
    }
    this.consume();
    const items: T[] = [];
    while (true) {
      const tok = this.consume();
      if (tok.kind !== 'ident' && tok.kind !== 'string') {
        throw new Error(`Expected ${itemLabel} at column ${tok.pos + 1}`);
      }
      items.push(parseItem(tok.value, tok.pos));
      if (this.peek()?.kind === 'comma') {
        this.consume();
        continue;
      }
      break;
    }
    if (this.peek()?.kind !== 'rparen') {
      throw new Error(`Expected ")" at column ${(this.peek()?.pos ?? 0) + 1}`);
    }
    this.consume();
    return items;
  }

  private parseComparison(): FilterAst {
    const identTok = this.consume();
    if (identTok.kind !== 'ident') {
      throw new Error(`Expected field name at column ${identTok.pos + 1}`);
    }

    const field = resolveField(identTok.value);
    if (!field) {
      throw new Error(`Unknown field "${identTok.value}" at column ${identTok.pos + 1}`);
    }

    if (field === 'sector') {
      const opTok = this.peek();
      if (opTok?.kind === 'ident' && opTok.value.toLowerCase() === 'in') {
        this.consume();
        const sectors = this.parseInList(
          (raw, pos) => {
            const sec = resolveSector(raw);
            if (!sec) {
              throw new Error(`Unknown sector "${raw}" at column ${pos + 1}`);
            }
            return sec;
          },
          'sector name',
        );
        return { type: 'sectorIn', sectors };
      }

      const opRaw = this.matchOp('==', '=', '!=');
      if (!opRaw) {
        throw new Error(
          `Expected = or != after sector at column ${identTok.pos + identTok.value.length + 1}`,
        );
      }
      const valTok = this.consume();
      if (valTok.kind !== 'ident' && valTok.kind !== 'string') {
        throw new Error(`Expected sector name at column ${valTok.pos + 1}`);
      }
      const secRaw = valTok.kind === 'string' ? valTok.value : valTok.value;
      const sec = resolveSector(secRaw);
      if (!sec) {
        throw new Error(`Unknown sector "${secRaw}" at column ${valTok.pos + 1}`);
      }
      if (opRaw === '!=') {
        return { type: 'sectorIn', sectors: ALL_SECTORS.filter(s => s !== sec) };
      }
      return { type: 'sectorEq', sector: sec };
    }

    if (field === 'ticker') {
      const opTok = this.peek();
      if (opTok?.kind === 'ident' && opTok.value.toLowerCase() === 'in') {
        this.consume();
        const tickers = this.parseInList(
          raw => raw.toUpperCase(),
          'ticker',
        );
        return { type: 'tickerIn', tickers };
      }

      const opRaw = this.matchOp('==', '=', '!=');
      if (!opRaw) {
        throw new Error(
          `Expected = or != after ticker at column ${identTok.pos + identTok.value.length + 1}`,
        );
      }
      const valTok = this.consume();
      if (valTok.kind !== 'ident' && valTok.kind !== 'string') {
        throw new Error(`Expected ticker at column ${valTok.pos + 1}`);
      }
      const ticker = (valTok.kind === 'string' ? valTok.value : valTok.value).toUpperCase();
      if (opRaw === '!=') {
        return { type: 'tickerNeq', ticker };
      }
      return { type: 'tickerEq', ticker };
    }

    if (field === 'name') {
      const containsTok = this.peek();
      if (containsTok?.kind !== 'ident' || containsTok.value.toLowerCase() !== 'contains') {
        throw new Error(
          `Expected "contains" after name at column ${identTok.pos + identTok.value.length + 1}`,
        );
      }
      this.consume();
      const valTok = this.consume();
      if (valTok.kind !== 'ident' && valTok.kind !== 'string') {
        throw new Error(`Expected company name text at column ${valTok.pos + 1}`);
      }
      const text = valTok.kind === 'string' ? valTok.value : valTok.value;
      return { type: 'nameContains', text };
    }

    const opTok = this.peek();
    if (opTok?.kind !== 'op' || !['>', '>=', '<', '<=', '==', '=', '!='].includes(opTok.value)) {
      throw new Error(
        `Expected comparison operator after "${identTok.value}" at column ${identTok.pos + identTok.value.length + 1}`,
      );
    }
    this.consume();
    const opRaw = opTok.value;
    const op: CompareOp = opRaw === '=' ? '==' : (opRaw as CompareOp);

    const numTok = this.consume();
    if (numTok.kind !== 'number') {
      throw new Error(`Expected number at column ${numTok.pos + 1}`);
    }

    return { type: 'compare', field, op, value: numTok.value };
  }
}

export function parseFilterExpression(input: string): ParseResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ast: null, error: null };
  }

  const { tokens, error: tokErr } = tokenize(trimmed);
  if (tokErr) return { ast: null, error: tokErr };

  try {
    const ast = new Parser(tokens).parse();
    return { ast, error: null };
  } catch (err) {
    return {
      ast: null,
      error: err instanceof Error ? err.message : 'Invalid expression',
    };
  }
}

/** Pattern factor filters include weekly momentum fields — fundamentals then use today's values. */
export function astUsesMomentumField(ast: FilterAst): boolean {
  switch (ast.type) {
    case 'compare':
      return MOMENTUM_IDS.has(ast.field);
    case 'and':
      return astUsesMomentumField(ast.left) || astUsesMomentumField(ast.right);
    case 'or':
      return astUsesMomentumField(ast.left) || astUsesMomentumField(ast.right);
    default:
      return false;
  }
}

export function filterExpressionUsesMomentum(input: string): boolean {
  const { ast } = parseFilterExpression(input);
  if (!ast) return false;
  return astUsesMomentumField(ast);
}

function compareNumber(val: number, op: CompareOp, target: number): boolean {
  if (!Number.isFinite(val)) return false;
  switch (op) {
    case '>': return val > target;
    case '>=': return val >= target;
    case '<': return val < target;
    case '<=': return val <= target;
    case '==': return val === target;
    case '!=': return val !== target;
    default: return false;
  }
}

function contextValue(field: ContextField, ctx?: CodeFilterContext): number {
  if (!ctx) return NaN;
  switch (field) {
    case 'returnToTodayPct': return ctx.returnToTodayPct ?? NaN;
    case 'returnToTargetPct': return ctx.returnToTargetPct ?? NaN;
    case 'priceThen': return ctx.priceThen ?? NaN;
    case 'similarity': return ctx.similarity ?? NaN;
    default: return NaN;
  }
}

export function evaluateFilterAst(
  ast: FilterAst,
  stock: Stock,
  metrics: StockMetrics,
  ctx?: CodeFilterContext,
): boolean {
  switch (ast.type) {
    case 'and':
      return evaluateFilterAst(ast.left, stock, metrics, ctx)
        && evaluateFilterAst(ast.right, stock, metrics, ctx);
    case 'or':
      return evaluateFilterAst(ast.left, stock, metrics, ctx)
        || evaluateFilterAst(ast.right, stock, metrics, ctx);
    case 'sectorEq':
      return stock.sector === ast.sector;
    case 'sectorIn':
      return ast.sectors.includes(stock.sector);
    case 'tickerEq':
      return stock.ticker === ast.ticker;
    case 'tickerNeq':
      return stock.ticker !== ast.ticker;
    case 'tickerIn':
      return ast.tickers.includes(stock.ticker);
    case 'nameContains':
      return stock.companyName.toLowerCase().includes(ast.text.toLowerCase());
    case 'compare': {
      if (CONTEXT_FIELDS.has(ast.field)) {
        return compareNumber(contextValue(ast.field as ContextField, ctx), ast.op, ast.value);
      }
      if (MOMENTUM_IDS.has(ast.field)) {
        const val = ctx?.momentum?.[ast.field as MomentumField] ?? NaN;
        return compareNumber(val, ast.op, ast.value);
      }
      if (ctx?.todayMetrics && ctx.patternFactorScreen && PATTERN_FUNDAMENTAL_IDS.has(ast.field)) {
        const val = ctx.todayMetrics[ast.field as MetricId];
        return compareNumber(val, ast.op, ast.value);
      }
      const val = metrics[ast.field as MetricId];
      return compareNumber(val, ast.op, ast.value);
    }
    default:
      return true;
  }
}
