'use client';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import type { CumulativePoint } from './chartSeries';
import { CHART } from './chartTheme';
import chartStyles from './Charts.module.css';

interface Props {
  points: CumulativePoint[];
  universeLabel: string;
  height?: number;
}

export default function BacktestLineChart({
  points,
  universeLabel,
  height = 220,
}: Props) {
  if (points.length < 2) return null;

  const tickInterval = Math.max(1, Math.floor(points.length / 8));

  return (
    <div className={chartStyles.backtestChartWrap} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
          <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tick={{ fill: CHART.text, fontSize: 11 }}
            axisLine={{ stroke: CHART.grid }}
            tickLine={false}
            interval={tickInterval}
          />
          <YAxis
            tick={{ fill: CHART.text, fontSize: 11 }}
            axisLine={{ stroke: CHART.grid }}
            tickLine={false}
            domain={['auto', 'auto']}
            tickFormatter={v => `${v}`}
          />
          <Tooltip
            contentStyle={{
              background: '#121820',
              border: `1px solid ${CHART.grid}`,
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: CHART.textBright }}
            formatter={(value, name) => [
              `${Number(value).toFixed(1)} (rebased 100)`,
              name === 'matched' ? 'Filter basket' : universeLabel,
            ]}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, color: CHART.text }}
            formatter={v => (v === 'matched' ? 'Filter basket' : universeLabel)}
          />
          <ReferenceLine y={100} stroke={CHART.grid} strokeDasharray="4 4" />
          <Line
            type="monotone"
            dataKey="universe"
            name="universe"
            stroke={CHART.benchmark}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="matched"
            name="matched"
            stroke={CHART.accent2}
            strokeWidth={2.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
