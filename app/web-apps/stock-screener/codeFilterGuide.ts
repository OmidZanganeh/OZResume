/** In-app copy for the code filter guide panel. */

export const CODE_FILTER_GUIDE = {
  title: 'Code filter guide',
  intro:
    'Switch to Code mode to write screening rules as text — like a spreadsheet formula. ' +
    'Every table column is filterable: fundamentals, technicals, sector, ticker, company name, ' +
    'historical returns, and pattern similarity. Click Apply filter to run the expression — ' +
    'the table stays unchanged while you edit.',
  steps: [
    'Open Filters → click Code (next to Sliders).',
    'Type a condition, e.g. PE > 10 & 52W > 55.',
    'Fix any red syntax errors, then click Apply filter (or Ctrl+Enter).',
    'Open Full field reference below for every column id, alias, and example.',
    'Save named filters with Save — load them into the editor, then Apply.',
    'Click an example chip to paste a ready-made formula (Apply to run it).',
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
    { label: 'Filter by ticker', example: 'ticker = AAPL', note: 'Also: ticker in (AAPL, MSFT, NVDA)' },
    { label: 'Company name', example: 'name contains Apple', note: 'Quotes for spaces: name contains "Johnson & Johnson"' },
    { label: 'Historical return', example: 'retNow > 30 & peRatio < 40', note: 'Timeline mode — return from screen date to today' },
    { label: 'Pattern similarity', example: 'sim > 75', note: 'When pattern-match references are active' },
  ],
  tips: [
    'Percent metrics (52W, ROE, div, retNow) use plain numbers — write 55 not 0.55 for 55%.',
    'Market cap is in millions: marketCap > 10000 ≈ $10B+.',
    'Full slider names work: peRatio > 15, priceChange52w > 30, dividendYield > 2.',
    'Historical-only fields: retNow, retTarget, priceThen — meaningful when timeline is in the past.',
    'If syntax errors appear, Apply stays disabled until you fix the expression.',
    'Code mode replaces slider filters — use one style at a time.',
    'Saved filters live in this browser (localStorage) — they do not sync across devices.',
  ],
} as const;
