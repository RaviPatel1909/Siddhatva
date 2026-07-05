import React from 'react';

// ============================================================================
// 8. PRODUCT ACCORDION (Details, Care, Shipping)
// ============================================================================

interface AccordionItem {
  id: string;
  title: string;
  content: React.ReactNode;
}

interface ProductAccordionProps {
  items: AccordionItem[];
}

export const ProductAccordion: React.FC<ProductAccordionProps> = ({
  items,
}) => (
  <div className="space-y-0 border-t border-outline-variant/30 mt-xl">
    {items.map((item) => (
      <details
        key={item.id}
        className="group border-b border-outline-variant/30 py-md cursor-pointer"
      >
        <summary
          className="flex justify-between items-center list-none 
                    font-label-sm text-label-sm uppercase tracking-widest 
                    text-on-surface hover:text-primary transition-colors 
                    focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          {item.title}
          <span
            className="material-symbols-outlined text-on-surface 
                      group-open:rotate-180 transition-transform duration-300"
          >
            expand_more
          </span>
        </summary>
        <div className="pt-sm text-on-surface-variant font-body-md text-body-md">
          {item.content}
        </div>
      </details>
    ))}
  </div>
);
