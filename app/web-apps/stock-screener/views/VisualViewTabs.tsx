'use client';

import { LayoutGrid, LineChart, PieChart, GitCompare, Trophy } from 'lucide-react';
import { VISUAL_VIEW_MODES, type VisualViewMode } from './visualViewMode';
import chartStyles from '../charts/Charts.module.css';

const ICONS = {
  table: LayoutGrid,
  winners: Trophy,
  charts: LineChart,
  sector: PieChart,
  compare: GitCompare,
} as const;

interface Props {
  mode: VisualViewMode;
  onChange: (mode: VisualViewMode) => void;
}

export default function VisualViewTabs({ mode, onChange }: Props) {
  return (
    <nav className={chartStyles.viewTabs} aria-label="Results view">
      {VISUAL_VIEW_MODES.map(({ id, label, hint }) => {
        const Icon = ICONS[id];
        const active = mode === id;
        return (
          <button
            key={id}
            type="button"
            className={`${chartStyles.viewTab} ${active ? chartStyles.viewTabActive : ''}`}
            onClick={() => onChange(id)}
            title={hint}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={15} aria-hidden />
            {label}
          </button>
        );
      })}
    </nav>
  );
}
