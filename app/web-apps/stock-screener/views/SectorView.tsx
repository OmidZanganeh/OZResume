'use client';

import { useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ScatterChart,
  Scatter,
  ZAxis,
  Legend,
} from 'recharts';
import type { TableRow } from '../StockTable';
import { aggregateBySector, scatterPeVsReturn } from '../charts/chartSeries';
import { CHART, SECTOR_COLORS, returnColor } from '../charts/chartTheme';
import chartStyles from '../charts/Charts.module.css';

interface Props {
  rows: TableRow[];
  filteredOnly?: boolean;
}

export default function SectorView({ rows, filteredOnly = true }: Props) {
  const sectors = useMemo(
    () => aggregateBySector(rows, filteredOnly),
    [rows, filteredOnly],
  );

  const scatter = useMemo(
    () => scatterPeVsReturn(rows, filteredOnly),
    [rows, filteredOnly],
  );

  const pieData = sectors.map(s => ({
    name: s.sector,
    value: s.count,
    fill: SECTOR_COLORS[s.sector],
  }));

  const barData = sectors.map(s => ({
    sector: s.sector,
    avgReturn52w: Math.round(s.avgReturn52w * 10) / 10,
    fill: SECTOR_COLORS[s.sector],
  }));

  const total = sectors.reduce((n, s) => n + s.count, 0);

  if (total === 0) {
    return (
      <p className={chartStyles.viewEmpty}>
        No stocks in the current view — widen filters or switch universe.
      </p>
    );
  }

  return (
    <div className={chartStyles.sectorLayout}>
      <div className={chartStyles.sectorSummary}>
        <div className={chartStyles.sectorSummaryCard}>
          <span className={chartStyles.statLabel}>Stocks shown</span>
          <span className={chartStyles.statValue}>{total}</span>
        </div>
        <div className={chartStyles.sectorSummaryCard}>
          <span className={chartStyles.statLabel}>Sectors</span>
          <span className={chartStyles.statValue}>{sectors.length}</span>
        </div>
        <div className={chartStyles.sectorSummaryCard}>
          <span className={chartStyles.statLabel}>Top sector</span>
          <span className={chartStyles.statValue}>{sectors[0]?.sector ?? '—'}</span>
          <span className={chartStyles.statSub}>{sectors[0]?.pctOfCount.toFixed(0)}% of count</span>
        </div>
      </div>

      <div className={chartStyles.sectorGrid}>
        <section className={chartStyles.chartPanel}>
          <h3 className={chartStyles.panelTitle}>Count by sector</h3>
          <div className={chartStyles.panelChart} style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={88}
                  paddingAngle={2}
                  isAnimationActive={false}
                >
                  {pieData.map(entry => (
                    <Cell key={entry.name} fill={entry.fill} stroke={CHART.bg} strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#121820',
                    border: `1px solid ${CHART.grid}`,
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v, _n, p) => [
                    `${v} (${((Number(v) / total) * 100).toFixed(1)}%)`,
                    String(p?.payload?.name ?? ''),
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: CHART.text }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className={chartStyles.chartPanel}>
          <h3 className={chartStyles.panelTitle}>Avg 52-week return by sector</h3>
          <div className={chartStyles.panelChart} style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: CHART.text, fontSize: 11 }}
                  axisLine={{ stroke: CHART.grid }}
                  tickFormatter={v => `${v}%`}
                />
                <YAxis
                  type="category"
                  dataKey="sector"
                  width={72}
                  tick={{ fill: CHART.text, fontSize: 11 }}
                  axisLine={{ stroke: CHART.grid }}
                />
                <Tooltip
                  contentStyle={{
                    background: '#121820',
                    border: `1px solid ${CHART.grid}`,
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v) => [`${Number(v)}%`, 'Avg 52W return']}
                />
                <Bar dataKey="avgReturn52w" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                  {barData.map(entry => (
                    <Cell
                      key={entry.sector}
                      fill={entry.avgReturn52w >= 0 ? CHART.up : CHART.down}
                      fillOpacity={0.85}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className={chartStyles.chartPanel}>
        <h3 className={chartStyles.panelTitle}>P/E vs 52-week return</h3>
        <p className={chartStyles.panelSub}>
          Each dot is one stock — size reflects market cap. Helps spot expensive momentum vs value laggards.
        </p>
        <div className={chartStyles.panelChart} style={{ height: 320 }}>
          {scatter.length < 3 ? (
            <p className={chartStyles.viewEmpty}>Need more stocks with P/E and return data.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 12, right: 20, bottom: 8, left: 0 }}>
                <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="pe"
                  name="P/E"
                  tick={{ fill: CHART.text, fontSize: 11 }}
                  axisLine={{ stroke: CHART.grid }}
                  label={{ value: 'P/E (TTM)', position: 'bottom', fill: CHART.text, fontSize: 11 }}
                />
                <YAxis
                  type="number"
                  dataKey="return52w"
                  name="52W return"
                  tick={{ fill: CHART.text, fontSize: 11 }}
                  axisLine={{ stroke: CHART.grid }}
                  tickFormatter={v => `${v}%`}
                  label={{
                    value: '52W return %',
                    angle: -90,
                    position: 'insideLeft',
                    fill: CHART.text,
                    fontSize: 11,
                  }}
                />
                <ZAxis type="number" dataKey="marketCapB" range={[24, 400]} />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3', stroke: CHART.text }}
                  contentStyle={{
                    background: '#121820',
                    border: `1px solid ${CHART.grid}`,
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v, name) => {
                    if (name === 'return52w') return [`${Number(v).toFixed(1)}%`, '52W return'];
                    if (name === 'pe') return [Number(v).toFixed(1), 'P/E'];
                    return [v, name];
                  }}
                  labelFormatter={(_l, payload) => {
                    const p = payload?.[0]?.payload;
                    return p?.ticker ?? '';
                  }}
                />
                {(['Tech', 'Healthcare', 'Finance', 'Energy', 'Consumer'] as const).map(sec => (
                  <Scatter
                    key={sec}
                    name={sec}
                    data={scatter.filter(p => p.sector === sec)}
                    fill={SECTOR_COLORS[sec]}
                    isAnimationActive={false}
                  />
                ))}
                <Legend wrapperStyle={{ fontSize: 12, color: CHART.text }} />
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <div className={chartStyles.sectorTableWrap}>
        <table className={chartStyles.sectorTable}>
          <thead>
            <tr>
              <th>Sector</th>
              <th>Count</th>
              <th>Share</th>
              <th>Avg 52W</th>
              <th>Avg P/E</th>
            </tr>
          </thead>
          <tbody>
            {sectors.map(s => (
              <tr key={s.sector}>
                <td>
                  <span
                    className={chartStyles.sectorDot}
                    style={{ background: SECTOR_COLORS[s.sector] }}
                  />
                  {s.sector}
                </td>
                <td>{s.count}</td>
                <td>{s.pctOfCount.toFixed(1)}%</td>
                <td style={{ color: returnColor(s.avgReturn52w) }}>
                  {s.avgReturn52w > 0 ? '+' : ''}{s.avgReturn52w.toFixed(1)}%
                </td>
                <td>{s.avgPe > 0 ? s.avgPe.toFixed(1) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
