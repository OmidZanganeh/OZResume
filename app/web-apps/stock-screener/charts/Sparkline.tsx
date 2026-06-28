'use client';

import { memo } from 'react';
import { sparklineFromBars, weeklySliceWeeks } from './chartSeries';
import { returnColor } from './chartTheme';
import type { Stock } from '../types';
import chartStyles from './Charts.module.css';

interface Props {
  stock: Stock;
  weeks?: number;
  onClick?: () => void;
}

function SparklineInner({ stock, weeks = 52, onClick }: Props) {
  const bars = weeklySliceWeeks(stock, weeks);
  const data = sparklineFromBars(bars, weeks);

  if (!data) {
    return <span className={chartStyles.sparkEmpty} title="Weekly history loading">—</span>;
  }

  const color = returnColor(data.changePct);
  const label = `${data.changePct >= 0 ? '+' : ''}${data.changePct.toFixed(1)}% (${weeks}w)`;

  const inner = (
    <svg
      viewBox={`0 0 ${data.width} ${data.height}`}
      className={chartStyles.sparkSvg}
      aria-hidden
    >
      <path
        d={data.path}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={chartStyles.sparkBtn}
        onClick={onClick}
        title={`${stock.ticker} trend — ${label}. Click for chart.`}
        aria-label={`${stock.ticker} ${weeks}-week trend ${label}`}
      >
        {inner}
      </button>
    );
  }

  return (
    <span className={chartStyles.sparkWrap} title={label}>
      {inner}
    </span>
  );
}

export default memo(SparklineInner);
