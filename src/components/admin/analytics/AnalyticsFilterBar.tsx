import React, { useState } from 'react';
import { PRESETS, isValidDayStr, type RangePreset, type ResolvedRange } from '../../../lib/analyticsFilters';

interface AnalyticsFilterBarProps {
  preset: RangePreset;
  /** The currently resolved range (used to seed the custom inputs). */
  resolved: ResolvedRange;
  onSelectPreset: (preset: RangePreset) => void;
  onApplyCustom: (from: string, to: string) => void;
}

// Global date-range filter. Preset chips + a custom range editor; the selection
// lives in the URL (owned by the page) so it's shareable and the browser back
// button restores it. Changing it re-keys every widget's query → all refresh.
export const AnalyticsFilterBar: React.FC<AnalyticsFilterBarProps> = ({
  preset,
  resolved,
  onSelectPreset,
  onApplyCustom,
}) => {
  const [from, setFrom] = useState(resolved.from);
  const [to, setTo] = useState(resolved.to);

  // Keep the custom inputs in step with the resolved range when a preset changes.
  React.useEffect(() => {
    setFrom(resolved.from);
    setTo(resolved.to);
  }, [resolved.from, resolved.to]);

  const canApply = isValidDayStr(from) && isValidDayStr(to) && from <= to;
  const dateInput =
    'bg-surface-container-lowest border border-outline-variant rounded-lg px-sm py-xs text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary';

  return (
    <div className="bg-surface-container-lowest/60 p-md rounded-xl border border-outline-variant/20 mb-lg">
      <div
        className="flex flex-wrap gap-xs"
        role="group"
        aria-label="Analytics date range"
      >
        {PRESETS.map((p) => {
          const active = p.value === preset;
          return (
            <button
              key={p.value}
              type="button"
              aria-pressed={active}
              onClick={() => onSelectPreset(p.value)}
              className={`font-label-sm text-label-sm uppercase tracking-widest px-md py-xs rounded-full border transition-colors ${
                active
                  ? 'bg-primary text-on-primary border-primary'
                  : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:text-primary hover:border-primary'
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {preset === 'custom' && (
        <form
          className="flex flex-wrap items-end gap-md mt-md"
          onSubmit={(e) => {
            e.preventDefault();
            if (canApply) onApplyCustom(from, to);
          }}
        >
          <div className="flex flex-col gap-1">
            <label htmlFor="analytics-from" className="font-label-sm text-label-sm text-outline uppercase tracking-widest">
              From
            </label>
            <input
              id="analytics-from"
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => setFrom(e.target.value)}
              className={dateInput}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="analytics-to" className="font-label-sm text-label-sm text-outline uppercase tracking-widest">
              To
            </label>
            <input
              id="analytics-to"
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => setTo(e.target.value)}
              className={dateInput}
            />
          </div>
          <button
            type="submit"
            disabled={!canApply}
            className="font-label-sm text-label-sm uppercase tracking-widest px-md py-xs rounded-full bg-primary text-on-primary disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            Apply
          </button>
        </form>
      )}
    </div>
  );
};
