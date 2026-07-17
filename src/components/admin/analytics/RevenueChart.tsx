import React, { useMemo } from 'react';
import { formatPrice } from '../../../lib/money';
import type { AnalyticsGranularity, RevenuePoint } from '../../../api/admin';

interface RevenueChartProps {
  points: RevenuePoint[];
  granularity: AnalyticsGranularity;
}

// Format a bucket key ('YYYY-MM-DD' for day/week, 'YYYY-MM' for month) into a
// short human label. Parsed as UTC to avoid a local-timezone off-by-one.
function bucketLabel(date: string, granularity: AnalyticsGranularity): string {
  if (granularity === 'month') {
    const [y, m] = date.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  }
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Lightweight native-SVG revenue chart (no chart dependency). Draws a filled area
// + line over the paid-revenue series, with a plain-text summary beneath for
// accessibility. Handles the all-zero and single-point cases gracefully.
const W = 720;
const H = 240;
const PAD_X = 10;
const PAD_TOP = 14;
const PAD_BOTTOM = 30;

export const RevenueChart: React.FC<RevenueChartProps> = ({ points, granularity }) => {
  const summary = useMemo(() => {
    const totalRevenue = points.reduce((s, p) => s + p.revenue, 0);
    const totalOrders = points.reduce((s, p) => s + p.orders, 0);
    const peak = points.reduce<RevenuePoint | null>(
      (best, p) => (p.revenue > (best?.revenue ?? -1) ? p : best),
      null
    );
    return { totalRevenue, totalOrders, peak };
  }, [points]);

  const first = points[0];
  const last = points[points.length - 1];
  const rangeLabel =
    points.length === 0
      ? ''
      : points.length === 1
        ? bucketLabel(first.date, granularity)
        : `${bucketLabel(first.date, granularity)} – ${bucketLabel(last.date, granularity)}`;

  const summaryText =
    points.length === 0
      ? 'No revenue data for this period.'
      : summary.totalRevenue > 0
        ? `Paid revenue by ${granularity}, ${rangeLabel}. Total ${formatPrice(summary.totalRevenue)} across ${summary.totalOrders} paid order${summary.totalOrders === 1 ? '' : 's'}. Highest: ${bucketLabel(summary.peak!.date, granularity)} (${formatPrice(summary.peak!.revenue)}).`
        : `No paid revenue by ${granularity} for ${rangeLabel}.`;

  // Plot geometry.
  const plotW = W - PAD_X * 2;
  const plotH = H - PAD_TOP - PAD_BOTTOM;
  const baseY = PAD_TOP + plotH;
  const max = Math.max(1, ...points.map((p) => p.revenue));
  const xFor = (i: number) =>
    PAD_X + (points.length <= 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const yFor = (v: number) => PAD_TOP + plotH - (v / max) * plotH;

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(p.revenue).toFixed(1)}`).join(' ');
  const areaPath =
    points.length >= 2
      ? `${linePath} L ${xFor(points.length - 1).toFixed(1)} ${baseY} L ${xFor(0).toFixed(1)} ${baseY} Z`
      : '';

  // Up to ~6 evenly spaced x-axis labels.
  const labelStep = Math.max(1, Math.ceil(points.length / 6));
  const showDots = points.length <= 31;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto text-primary"
        role="img"
        aria-label={summaryText}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* baseline */}
        <line x1={PAD_X} y1={baseY} x2={W - PAD_X} y2={baseY} className="text-outline-variant" stroke="currentColor" strokeWidth={1} vectorEffect="non-scaling-stroke" />

        {areaPath && <path d={areaPath} fill="currentColor" opacity={0.12} />}
        {points.length >= 2 && (
          <path d={linePath} fill="none" stroke="currentColor" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
        )}

        {(showDots || points.length === 1) &&
          points.map((p, i) => (
            <circle key={p.date} cx={xFor(i)} cy={yFor(p.revenue)} r={points.length === 1 ? 5 : 3} fill="currentColor">
              <title>{`${bucketLabel(p.date, granularity)}: ${formatPrice(p.revenue)} · ${p.orders} order${p.orders === 1 ? '' : 's'}`}</title>
            </circle>
          ))}

        {/* x-axis labels */}
        {points.map((p, i) =>
          i % labelStep === 0 || i === points.length - 1 ? (
            <text
              key={`label-${p.date}`}
              x={xFor(i)}
              y={H - 8}
              textAnchor="middle"
              className="fill-on-surface-variant"
              style={{ fontSize: 11 }}
            >
              {bucketLabel(p.date, granularity)}
            </text>
          ) : null
        )}

        {summary.totalRevenue === 0 && points.length > 0 && (
          <text x={W / 2} y={PAD_TOP + plotH / 2} textAnchor="middle" className="fill-on-surface-variant" style={{ fontSize: 14 }}>
            No paid revenue in this period
          </text>
        )}
      </svg>

      {/* Textual summary — accessibility + a scannable takeaway. */}
      <p className="font-body-md text-body-md text-on-surface-variant mt-sm">{summaryText}</p>
    </div>
  );
};
