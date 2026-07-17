import type { AnalyticsGranularity } from '../api/admin';

// Date-range presets for the Analytics filter bar. All date math is done in IST
// (UTC+05:30) to match the backend's bucketing timezone, so `from`/`to` (both
// inclusive 'YYYY-MM-DD' IST days) line up exactly with what the API aggregates.

export type RangePreset = 'today' | '7d' | '30d' | '90d' | 'month' | 'custom';

export const DEFAULT_PRESET: RangePreset = '30d';

export const PRESETS: { value: RangePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: 'month', label: 'This Month' },
  { value: 'custom', label: 'Custom Range' },
];

const IST_OFFSET_MIN = 330;
const MS_PER_DAY = 86_400_000;

// `now` (or an offset from it) as an IST calendar-day 'YYYY-MM-DD'.
function istDayStr(offsetDays = 0): string {
  const ist = new Date(Date.now() + IST_OFFSET_MIN * 60_000 - offsetDays * MS_PER_DAY);
  const y = ist.getUTCFullYear();
  const m = String(ist.getUTCMonth() + 1).padStart(2, '0');
  const d = String(ist.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// First day of the current IST month, 'YYYY-MM-DD'.
function istMonthStartStr(): string {
  const ist = new Date(Date.now() + IST_OFFSET_MIN * 60_000);
  const y = ist.getUTCFullYear();
  const m = String(ist.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const isValidDayStr = (s: string | null | undefined): s is string =>
  !!s && DATE_RE.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));

export interface ResolvedRange {
  from: string;
  to: string;
}

// Resolve a preset (plus optional custom from/to) into concrete inclusive IST
// day bounds. Custom falls back to the 30-day window if its dates are missing or
// malformed, so a hand-edited URL never yields an invalid request.
export function resolveRange(
  preset: RangePreset,
  customFrom?: string | null,
  customTo?: string | null
): ResolvedRange {
  const today = istDayStr(0);
  switch (preset) {
    case 'today':
      return { from: today, to: today };
    case '7d':
      return { from: istDayStr(6), to: today };
    case '90d':
      return { from: istDayStr(89), to: today };
    case 'month':
      return { from: istMonthStartStr(), to: today };
    case 'custom': {
      if (isValidDayStr(customFrom) && isValidDayStr(customTo) && customFrom <= customTo) {
        return { from: customFrom, to: customTo };
      }
      return { from: istDayStr(29), to: today }; // safe fallback
    }
    case '30d':
    default:
      return { from: istDayStr(29), to: today };
  }
}

// Sensible default bucket size per preset (user can override in the chart). Short
// windows read best by day; a quarter reads best by week.
export function defaultGranularity(preset: RangePreset): AnalyticsGranularity {
  if (preset === '90d') return 'week';
  return 'day';
}

export const parsePreset = (raw: string | null): RangePreset =>
  PRESETS.some((p) => p.value === raw) ? (raw as RangePreset) : DEFAULT_PRESET;

export const parseGranularity = (raw: string | null): AnalyticsGranularity | null =>
  raw === 'day' || raw === 'week' || raw === 'month' ? raw : null;
