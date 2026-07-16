import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ProductCard } from './ProductCard';
import { ProductCardSkeleton } from './ProductCardSkeleton';
import { ErrorState } from '../ui/ErrorState';
import { useCart } from '../../context/CartContext';
import { ApiProduct } from '../../api/types';

interface ProductGridProps {
  items: ApiProduct[];
  isLoading: boolean;
  isError: boolean;
  isPlaceholderData: boolean;
  onRetry: () => void;
}

// The catalog grid shared by Shop All and Search Results: error / loading-skeleton /
// product cards, with the keepPreviousData dim-while-refetching treatment. Owning it
// here keeps a single copy of the ProductCard idiom (badge, sold-out, quick-add of the
// first colour/size). Callers own the surrounding header, sidebar, empty state, and
// pagination — those differ between the two pages.
export const ProductGrid: React.FC<ProductGridProps> = ({
  items,
  isLoading,
  isError,
  isPlaceholderData,
  onRetry,
}) => {
  const navigate = useNavigate();
  const { addItem } = useCart();

  if (isError) {
    return (
      <ErrorState
        title="Couldn't load the collection"
        message="We had trouble reaching the atelier. Please try again."
        onRetry={onRetry}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-gutter">
        {Array.from({ length: 6 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`grid grid-cols-2 lg:grid-cols-3 gap-gutter transition-opacity ${
        isPlaceholderData ? 'opacity-60' : 'opacity-100'
      }`}
    >
      {items.map((product) => (
        <ProductCard
          key={product.id}
          id={product.id}
          name={product.name}
          price={product.price}
          image={product.images[0].src}
          imageAlt={product.images[0].alt}
          subtitle={product.variant}
          badge={product.badge}
          soldOut={product.status === 'out-of-stock'}
          onViewDetails={() => navigate(`/product/${product.id}`)}
          onAddToCart={() => addItem(product, product.colors[0], product.sizes[0])}
        />
      ))}
    </div>
  );
};
