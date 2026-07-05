import React from 'react';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ checked, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={() => onChange(!checked)}
    className={`relative w-12 h-7 rounded-full shrink-0 transition-colors duration-300 ${
      checked ? 'bg-primary' : 'bg-outline-variant'
    }`}
  >
    <span
      className={`absolute top-1 left-1 w-5 h-5 bg-surface rounded-full shadow-sm transition-transform duration-300 ${
        checked ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </button>
);
