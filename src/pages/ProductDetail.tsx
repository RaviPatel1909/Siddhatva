import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '../components/layout/MainLayout';
import { ShippingBanner } from '../components/product/ShippingBanner';
import { ProductGallery } from '../components/product/ProductGallery';
import { ProductDetails } from '../components/product/ProductDetails';
import { ProductAccordion } from '../components/product/ProductAccordion';
import { RelatedProducts } from '../components/sections/RelatedProducts';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { getProduct, getProducts } from '../api/products';
import { queryKeys } from '../api/queryKeys';
import { ApiError } from '../api/client';
import { trackViewItem } from '../lib/analytics';

const DetailSkeleton = () => (
  <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
    <div className="lg:col-span-7">
      <Skeleton className="aspect-square rounded-lg" />
    </div>
    <div className="lg:col-span-5 space-y-lg pt-md">
      <Skeleton className="h-9 w-2/3" />
      <Skeleton className="h-6 w-1/4" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-10 w-1/2" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  </div>
);

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { isInWishlist, toggle } = useWishlist();

  const productId = id ?? '';
  const {
    data: product,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.product(productId),
    queryFn: () => getProduct(productId),
    enabled: Boolean(productId),
  });

  // GA4 view_item once the product resolves (id guards re-fires on refetch).
  useEffect(() => {
    if (!product) return;
    trackViewItem({
      item_id: product.id,
      item_name: product.name,
      item_category: product.category,
      price: product.price,
      quantity: 1,
    });
  }, [product?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: relatedData } = useQuery({
    queryKey: queryKeys.products({ category: product?.category, pageSize: 5 }),
    queryFn: () => getProducts({ category: product?.category, pageSize: 5 }),
    enabled: Boolean(product),
  });

  const relatedProducts = (relatedData?.items ?? [])
    .filter((p) => p.id !== product?.id)
    .slice(0, 4)
    .map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      image: p.images[0].src,
      imageAlt: p.images[0].alt,
      category: p.category,
    }));

  const notFound = isError && error instanceof ApiError && error.status === 404;

  return (
    <MainLayout>
      <ShippingBanner />
      <div className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-xl">
        {isLoading ? (
          <DetailSkeleton />
        ) : notFound ? (
          <ErrorState
            title="Piece not found"
            message="This piece may have sold out or moved. Explore the rest of the collection."
            onRetry={() => navigate('/shop')}
          />
        ) : isError || !product ? (
          <ErrorState
            title="Couldn't load this piece"
            message="We had trouble reaching the atelier. Please try again."
            onRetry={() => refetch()}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
              <div className="lg:col-span-7">
                <ProductGallery images={product.images} productName={product.name} />
              </div>
              <div className="lg:col-span-5">
                <ProductDetails
                  name={product.name}
                  price={product.price}
                  description={product.description}
                  colors={product.colors}
                  sizes={product.sizes}
                  onAddToCart={(data) => addItem(product, data.color, data.size, data.quantity)}
                  isWished={isInWishlist(product.id)}
                  onToggleWishlist={() => toggle(product)}
                />
                <ProductAccordion
                  items={[
                    {
                      id: 'material',
                      title: 'Material',
                      content: '100% Mulberry Silk. Dry clean only. Iron at low temperature if necessary.',
                    },
                    {
                      id: 'shipping',
                      title: 'Shipping & Returns',
                      content: 'Complimentary premium shipping. Returns accepted within 14 days of delivery.',
                    },
                  ]}
                />
              </div>
            </div>

            {relatedProducts.length > 0 && (
              <RelatedProducts
                products={relatedProducts}
                onProductClick={(pid) => navigate(`/product/${pid}`)}
              />
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
};
