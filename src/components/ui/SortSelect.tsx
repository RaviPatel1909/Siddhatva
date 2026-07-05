import React, { useEffect, useId, useRef, useState } from 'react';

export interface SortSelectOption {
  value: string;
  label: string;
}

interface SortSelectProps {
  options: SortSelectOption[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  className?: string;
}

// Custom listbox replacing the native <select>, whose option list can't be
// themed (browser-blue highlight). Keyboard: Enter/Space/Arrows open,
// Arrows move, Enter/Space select, Escape closes. Focus stays on the
// trigger; aria-activedescendant tracks the highlighted option.
export const SortSelect: React.FC<SortSelectProps> = ({
  options,
  value,
  onChange,
  ariaLabel = 'Sort',
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const openList = () => {
    setActiveIndex(selectedIndex);
    setOpen(true);
  };

  const selectIndex = (index: number) => {
    onChange(options[index].value);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((i) => Math.min(options.length - 1, i + 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
        break;
      case 'Home':
        e.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        selectIndex(activeIndex);
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        break;
      case 'Tab':
        setOpen(false);
        break;
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={open ? `${listboxId}-${activeIndex}` : undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={handleKeyDown}
        className="flex w-full items-center justify-between gap-xs bg-surface border border-border rounded-lg
                  px-md py-sm font-body-md text-sm text-on-surface transition-all
                  focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
      >
        {options[selectedIndex]?.label}
        <span
          className={`material-symbols-outlined text-[20px] text-on-surface-variant transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        >
          expand_more
        </span>
      </button>

      {open && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-surface shadow-md overflow-hidden py-1"
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isHighlighted = index === activeIndex;
            return (
              <li key={option.value} id={`${listboxId}-${index}`} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => selectIndex(index)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`w-full text-left px-md py-xs font-body-md text-sm transition-colors ${
                    isSelected
                      ? 'bg-primary/10 text-primary font-medium'
                      : isHighlighted
                        ? 'bg-surface-container text-on-surface'
                        : 'text-on-surface'
                  }`}
                >
                  {option.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
