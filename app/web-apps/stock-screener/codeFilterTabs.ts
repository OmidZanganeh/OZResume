export type CodeFilterTab = 'screen' | 'presets' | 'guide' | 'fields' | 'saved';

export const CODE_FILTER_TABS: {
  id: CodeFilterTab;
  label: string;
  hint: string;
}[] = [
  { id: 'screen', label: 'Screen', hint: 'Write and apply filter expressions' },
  { id: 'presets', label: 'Presets', hint: 'One-click strategy screens' },
  { id: 'guide', label: 'Guide', hint: 'Syntax and quick start' },
  { id: 'fields', label: 'Fields', hint: 'All filterable columns' },
  { id: 'saved', label: 'Saved', hint: 'Your saved expressions' },
];
