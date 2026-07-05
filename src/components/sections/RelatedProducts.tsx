import React from "react";
import { ProductCard, type ProductCardProps } from "../product/ProductCard";
// ============================================================================
// 10. RELATED PRODUCTS SECTION
// ============================================================================

interface RelatedProductsProps {
  title?: string;
  products: ProductCardProps[];
  onProductClick?: (productId: string) => void;
}

export const RelatedProducts: React.FC<RelatedProductsProps> = ({
  title = 'Complete the Look',
  products,
  onProductClick,
}) => (
  <section className="mt-xl pt-xl border-t border-outline-variant/30">
    <h2 className="font-display text-headline-lg text-primary mb-xl">
      {title}
    </h2>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          {...product}
          onViewDetails={() => onProductClick?.(product.id)}
        />
      ))}
    </div>
  </section>
);
