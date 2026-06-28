/** In-app copy for the code filter guide panel. */

export const CODE_FILTER_GUIDE = {
  title: 'Code filter guide',
  intro:
    'Switch to Code mode to write screening rules as text — like a spreadsheet formula. ' +
    'Each line in the box is one expression. When it validates (green check), the table and charts ' +
    'show only stocks that match all conditions.',
  steps: [
    'Open Filters → click Code (next to Sliders).',
    'Type a condition, e.g. PE > 10 & 52W > 55.',
    'Watch for the green “Expression valid” message — red text means a typo to fix.',
    'Click an example chip below the box to paste a ready-made formula.',
    'Drag the timeline to screen past dates — metrics update for that date.',
    'Switch back to Sliders anytime; your code is kept until you Reset.',
  ],
  syntax: [
    { label: 'Compare numbers', example: 'PE > 10', note: 'Use > >= < <= = !=' },
    { label: 'Combine with AND', example: 'PE > 10 & 52W > 55', note: '& or &&' },
    { label: 'Combine with OR', example: 'PE < 15 | div > 3', note: '| or ||' },
    { label: 'Group with parentheses', example: '(PE > 5 & PE < 30) & ROE > 12', note: '' },
    { label: 'Filter by sector', example: 'sector = Tech', note: 'Tech, Healthcare, Finance, Energy, Consumer' },
    { label: 'Multiple sectors', example: 'sector in (Tech, Finance) & 52W > 20', note: '' },
  ],
  tips: [
    'Percent metrics (52W, ROE, div) use plain numbers — write 55 not 0.55 for 55%.',
    'Market cap is in millions: marketCap > 10000 ≈ $10B+.',
    'Full slider names work: peRatio > 15, priceChange52w > 30, dividendYield > 2.',
    'If syntax errors appear, the universe is not filtered until you fix the expression.',
    'Code mode replaces slider filters — use one style at a time.',
  ],
} as const;

export const FULL_METRIC_ALIASES: { alias: string; metric: string; unit: string }[] = [
  { alias: 'PE', metric: 'Trailing P/E', unit: 'ratio' },
  { alias: 'FPE', metric: 'Forward P/E', unit: 'ratio' },
  { alias: 'PEG', metric: 'PEG ratio', unit: 'ratio' },
  { alias: 'PB', metric: 'Price / book', unit: 'ratio' },
  { alias: 'PS', metric: 'Price / sales', unit: 'ratio' },
  { alias: 'ROE / ROA / ROIC', metric: 'Return metrics', unit: '%' },
  { alias: 'div / yield', metric: 'Dividend yield', unit: '%' },
  { alias: '52W', metric: '52-week price change', unit: '%' },
  { alias: '6M / 3M / 4W', metric: 'Shorter price changes', unit: '%' },
  { alias: 'vs_high / vs_low', metric: 'Distance from 52W high/low', unit: '%' },
  { alias: 'marketCap', metric: 'Market capitalization', unit: '$M' },
  { alias: 'beta', metric: 'Beta vs market', unit: 'ratio' },
  { alias: 'vol / volume', metric: 'Avg daily volume', unit: 'M shares' },
  { alias: 'de / dte', metric: 'Debt to equity', unit: 'ratio' },
  { alias: 'margin', metric: 'Net profit margin', unit: '%' },
  { alias: 'price', metric: 'Share price', unit: '$' },
];
