import { parseFilterExpression, type ParseResult } from './filterExpression';

let cachedInput = '';
let cachedResult: ParseResult = { ast: null, error: null };

/** Memoized parse — screener evaluates passesScreen per stock. */
export function getParsedExpression(input: string): ParseResult {
  if (input === cachedInput) return cachedResult;
  cachedInput = input;
  cachedResult = parseFilterExpression(input);
  return cachedResult;
}

export function invalidateExpressionCache(): void {
  cachedInput = '';
  cachedResult = { ast: null, error: null };
}
