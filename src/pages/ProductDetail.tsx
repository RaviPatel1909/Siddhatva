import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { ShippingBanner } from '../components/product/ShippingBanner';
import { ProductGallery } from '../components/product/ProductGallery';
import { ProductDetails } from '../components/product/ProductDetails';
import { ProductAccordion } from '../components/product/ProductAccordion';
import { RelatedProducts } from '../components/sections/RelatedProducts';
import { useCart } from '../context/CartContext';
import { getProductById, products } from '../data/products';

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();

  const product = getProductById(id ?? '') ?? products[0];

  const relatedProducts = products
    .filter((p) => p.id !== product.id && p.category === product.category)
    .concat(products.filter((p) => p.id !== product.id && p.category !== product.category))
    .slice(0, 4)
    .map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      image: p.images[0].src,
      imageAlt: p.images[0].alt,
      category: p.category,
    }));

  return (
    <MainLayout>
      <ShippingBanner />
      <div className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-xl">
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

        <RelatedProducts
          products={relatedProducts}
          onProductClick={(productId) => navigate(`/product/${productId}`)}
        />
      </div>
    </MainLayout>
  );
};
