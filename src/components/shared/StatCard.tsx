import React from 'react';

interface StatCardProps {
  icon: string;
  label: string;
  value: string;
  delta?: { value: string; direction: 'up' | 'down' };
  accent?: 'primary' | 'secondary' | 'tertiary' | 'outline';
  footnote?: string;
}

const ACCENT_STYLES: Record<NonNullable<StatCardProps['accent']>, { bg: string; text: string }> = {
  primary: { bg: 'bg-primary/10', text: 'text-primary' },
  secondary: { bg: 'bg-secondary/40', text: 'text-on-secondary' },
  tertiary: { bg: 'bg-tertiary/30', text: 'text-on-tertiary' },
  outline: { bg: 'bg-outline/20', text: 'text-on-surface-variant' },
};

export const StatCard: React.FC<StatCardProps> = ({
  icon,
  label,
  value,
  delta,
  accent = 'primary',
  footnote,
}) => {
  const styles = ACCENT_STYLES[accent];

  return (
    <div className="bg-surface-container-low p-md rounded-xl bronze-shadow border border-outline-variant/30 hover:bg-surface-container transition-all duration-300">
      <div className="flex justify-between items-start mb-sm">
        <div className={`p-xs ${styles.bg} rounded-lg`}>
          <span className={`material-symbols-outlined ${styles.text}`}>{icon}</span>
        </div>
        {delta && (
          <span
            className={`font-label-sm text-label-sm flex items-center gap-1 ${
              delta.direction === 'up' ? styles.text : 'text-error'
            }`}
          >
            {delta.value}
            <span className="material-symbols-outlined text-[16px]">
              {delta.direction === 'up' ? 'trending_up' : 'trending_down'}
            </span>
          </span>
        )}
      </div>
      <p className="font-label-sm text-label-sm text-outline uppercase tracking-widest mb-xs">{label}</p>
      <h3 className="font-display text-headline-lg text-primary">{value}</h3>
      {footnote && <p className="text-[10px] text-on-surface-variant mt-sm">{footnote}</p>}
    </div>
  );
};
