/** One fiscal period from Yahoo/yfinance statements (annual or quarterly). */
export interface FundamentalPeriod {
  /** Fiscal period end — unix seconds. */
  t: number;
  rev?: number;
  ni?: number;
  gp?: number;
  oi?: number;
  eq?: number;
  debt?: number;
  ca?: number;
  cl?: number;
  fcf?: number;
  /** Shares outstanding (absolute count). */
  sh?: number;
  ta?: number;
}

export interface FundamentalBulkStore {
  cachedAt: string;
  complete: boolean;
  /** Newest fiscal period first per ticker. */
  data: Record<string, FundamentalPeriod[]>;
}
