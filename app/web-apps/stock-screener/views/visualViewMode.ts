export type VisualViewMode = 'table' | 'charts' | 'sector' | 'compare';

export const VISUAL_VIEW_MODES: { id: VisualViewMode; label: string; hint: string }[] = [
  { id: 'table', label: 'Table', hint: 'Sortable factor grid with sparklines' },
  { id: 'charts', label: 'Charts', hint: 'Price history and stats for one stock' },
  { id: 'sector', label: 'Sector', hint: 'Breakdown and factor scatter of filtered universe' },
  { id: 'compare', label: 'Compare', hint: 'Normalized performance vs benchmark' },
];
