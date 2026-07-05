import React from 'react';
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  ...props
}) => {
  const baseStyles = 'font-label-sm uppercase tracking-widest rounded transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/50';

  const variantStyles = {
    primary:
      'bg-primary text-on-primary hover:opacity-90 active:scale-95 disabled:opacity-50',
    secondary:
      'border border-primary text-primary hover:bg-primary/5 active:bg-primary/10 disabled:opacity-50',
    ghost:
      'text-primary hover:opacity-80 active:opacity-70 disabled:opacity-50',
  };

  const sizeStyles = {
    sm: 'py-xs px-sm text-xs',
    md: 'py-md px-lg text-sm',
    lg: 'py-lg px-xl text-base w-full',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${
        isLoading ? 'opacity-75 cursor-not-allowed' : ''
      }`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center justify-center gap-sm">
          <span className="inline-block animate-spin material-symbols-outlined text-sm">
            refresh
          </span>
          Processing...
        </span>
      ) : (
        children
      )}
    </button>
  );
};