/** Yahoo Finance quote page for a US ticker (e.g. INTU → …/quote/INTU/). */
export function yahooQuoteUrl(ticker: string): string {
  const symbol = ticker.trim().replace(/\./g, '-');
  return `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}/`;
}
