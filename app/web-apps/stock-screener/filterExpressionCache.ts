import { parseFilterExpression, astUsesMomentumField, astUsesTechnicalField, astUsesWeeklyDerivedField, type ParseResult } from './filterExpression';

let cachedInput = '';
let cachedResult: ParseResult = { ast: null, error: null };

/** Memoized parse — screener evaluates passesScreen per stock. */
export function getParsedExpression(input: string): ParseResult {
  if (input === cachedInput) return cachedResult;
  cachedInput = input;
  cachedResult = parseFilterExpression(input);
  return cachedResult;
}

/** Uses the same parse cache as screening — avoids double-parsing long pattern filters. */
export function parsedExpressionUsesMomentum(input: string): boolean {
  const { ast } = getParsedExpression(input);
  if (!ast) return false;
  return astUsesMomentumField(ast);
}

export function parsedExpressionUsesTechnical(input: string): boolean {
  const { ast } = getParsedExpression(input);
  if (!ast) return false;
  return astUsesTechnicalField(ast);
}

export function parsedExpressionUsesWeeklyFields(input: string): boolean {
  const { ast } = getParsedExpression(input);
  if (!ast) return false;
  return astUsesWeeklyDerivedField(ast);
}

export function invalidateExpressionCache(): void {
  cachedInput = '';
  cachedResult = { ast: null, error: null };
}
