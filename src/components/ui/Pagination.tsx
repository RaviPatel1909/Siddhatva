import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="flex gap-xs items-center">
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-outline-variant/30 hover:bg-surface-container-high transition-colors disabled:opacity-40"
        aria-label="Previous page"
      >
        <span className="material-symbols-outlined text-[18px]">chevron_left</span>
      </button>
      {pages.map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`w-8 h-8 flex items-center justify-center rounded-lg font-label-sm text-label-sm transition-colors ${
            page === currentPage
              ? 'bg-primary text-on-primary'
              : 'border border-outline-variant/30 hover:bg-surface-container-high'
          }`}
        >
          {page}
        </button>
      ))}
      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-outline-variant/30 hover:bg-surface-container-high transition-colors disabled:opacity-40"
        aria-label="Next page"
      >
        <span className="material-symbols-outlined text-[18px]">chevron_right</span>
      </button>
    </div>
  );
};
