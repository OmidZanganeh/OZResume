import type { Sector, Stock, StockMetrics } from './types';

export type CompareOp = '>' | '>=' | '<' | '<=' | '==' | '!=';

type MetricId = keyof StockMetrics;

export type ExprField = MetricId | 'sector';

export type FilterAst =
  | { type: 'and'; left: FilterAst; right: FilterAst }
  | { type: 'or'; left: FilterAst; right: FilterAst }
  | { type: 'compare'; field: ExprField; op: CompareOp; value: number }
  | { type: 'sectorEq'; sector: Sector }
  | { type: 'sectorIn'; sectors: Sector[] };

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
  volatility: 'volatility30d',
  vol30: 'volatility30d',
  atr: 'atrPercent',
  sector: 'sector',
};

export const CODE_FILTER_EXAMPLES = [
  'PE > 10 & 52W > 55',
  'PE < 25 & ROE > 15 & sector = Tech',
  'marketCap > 10000 & div > 2',
  '(PE > 5 & PE < 30) | beta < 1',
  'sector in (Tech, Healthcare) & 52W > 20',
] as const;

export const ALIAS_CHEATSHEET: { alias: string; field: string }[] = [
  { alias: 'PE', field: 'P/E (trailing)' },
  { alias: 'FPE', field: 'Forward P/E' },
  { alias: 'PEG', field: 'PEG ratio' },
  { alias: 'ROE / ROA / ROIC', field: 'Returns' },
  { alias: '52W', field: '52-week price change %' },
  { alias: '6M / 3M / 4W', field: 'Price change windows' },
  { alias: 'div / yield', field: 'Dividend yield %' },
  { alias: 'marketCap', field: 'Market cap ($M)' },
  { alias: 'beta', field: 'Beta vs market' },
  { alias: 'sector = Tech', field: 'Sector equality' },
  { alias: 'sector in (Tech, Finance)', field: 'Sector list' },
];

type Token =
  | { kind: 'ident'; value: string; pos: number }
  | { kind: 'number'; value: number; pos: number }
  | { kind: 'op'; value: string; pos: number }
  | { kind: 'lparen'; pos: number }
  | { kind: 'rparen'; pos: number }
  | { kind: 'comma'; pos: number };

function normalizeIdent(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '_');
}

const ALL_SECTORS: Sector[] = ['Tech', 'Healthcare', 'Finance', 'Energy', 'Consumer'];

/** Allow typing full camelCase metric ids (peRatio, priceChange52w, …). */
const METRIC_IDS = new Set<string>([
  'peRatio', 'forwardPe', 'pegRatio', 'pbRatio', 'psRatio', 'pcfRatio', 'evToEbitda',
  'epsGrowth', 'revenueGrowth', 'profitMargin', 'grossMargin', 'operatingMargin',
  'roe', 'roa', 'roic', 'debtToEquity', 'debtToAssets', 'currentRatio', 'quickRatio',
  'interestCoverage', 'dividendYield', 'payoutRatio', 'freeCashFlowYield', 'price',
  'marketCap', 'priceChange1m', 'priceChange3m', 'priceChange6m', 'priceChange52w',
  'priceVs52wHigh', 'priceVs52wLow', 'avgVolume', 'volatility30d', 'atrPercent', 'beta',
]);

function resolveField(raw: string): ExprField | null {
  const key = normalizeIdent(raw);
  if (METRIC_ALIASES[key]) return METRIC_ALIASES[key]!;
  if (METRIC_ALIASES[raw.toLowerCase()]) return METRIC_ALIASES[raw.toLowerCase()]!;
  const camel = raw.trim();
  if (METRIC_IDS.has(camel)) return camel as MetricId;
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
      // Aliases like 52W, 6M, 3M — digit prefix + letters
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

  private matchOp(...ops: string[]): boolean {
    const t = this.peek();
    if (t?.kind === 'op' && ops.includes(t.value)) {
      this.pos += 1;
      return true;
    }
    return false;
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

  private parseComparison(): FilterAst {
    const identTok = this.consume();
    if (identTok.kind !== 'ident') {
      throw new Error(`Expected metric name at column ${identTok.pos + 1}`);
    }

    const field = resolveField(identTok.value);
    if (!field) {
      throw new Error(`Unknown metric "${identTok.value}" at column ${identTok.pos + 1}`);
    }

    if (field === 'sector') {
      const opTok = this.peek();
      if (opTok?.kind === 'ident' && opTok.value.toLowerCase() === 'in') {
        this.consume();
        if (this.peek()?.kind !== 'lparen') {
          throw new Error(`Expected "(" after "sector in" at column ${opTok.pos + 2}`);
        }
        this.consume();
        const sectors: Sector[] = [];
        while (true) {
          const secTok = this.consume();
          if (secTok.kind !== 'ident') {
            throw new Error(`Expected sector name at column ${secTok.pos + 1}`);
          }
          const sec = resolveSector(secTok.value);
          if (!sec) {
            throw new Error(`Unknown sector "${secTok.value}" at column ${secTok.pos + 1}`);
          }
          sectors.push(sec);
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
        return { type: 'sectorIn', sectors };
      }

      if (!this.matchOp('==', '=', '!=')) {
        throw new Error(
          `Expected = or != after sector at column ${identTok.pos + identTok.value.length + 1}`,
        );
      }
      const opRaw = this.tokens[this.pos - 1]!.value;
      const normalizedOp: CompareOp = opRaw === '=' ? '==' : (opRaw as CompareOp);
      const valTok = this.consume();
      if (valTok.kind !== 'ident') {
        throw new Error(`Expected sector name at column ${valTok.pos + 1}`);
      }
      const sec = resolveSector(valTok.value);
      if (!sec) {
        throw new Error(`Unknown sector "${valTok.value}" at column ${valTok.pos + 1}`);
      }
      if (normalizedOp === '!=') {
        return {
          type: 'sectorIn',
          sectors: ALL_SECTORS.filter(s => s !== sec),
        };
      }
      return { type: 'sectorEq', sector: sec };
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

export function evaluateFilterAst(
  ast: FilterAst,
  stock: Stock,
  metrics: StockMetrics,
): boolean {
  switch (ast.type) {
    case 'and':
      return evaluateFilterAst(ast.left, stock, metrics)
        && evaluateFilterAst(ast.right, stock, metrics);
    case 'or':
      return evaluateFilterAst(ast.left, stock, metrics)
        || evaluateFilterAst(ast.right, stock, metrics);
    case 'sectorEq':
      return stock.sector === ast.sector;
    case 'sectorIn':
      return ast.sectors.includes(stock.sector);
    case 'compare': {
      const val = metrics[ast.field as MetricId];
      return compareNumber(val, ast.op, ast.value);
    }
    default:
      return true;
  }
}
