export type ProductBadge = 'new' | 'limited' | 'sold-out';
export type ProductStatus = 'active' | 'draft' | 'out-of-stock';

export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  images: ProductImage[];
  colors: Color[];
  sizes: string[];
  category: string;
  variant?: string;
  badge?: ProductBadge;
  stock?: number;
  sku?: string;
  status?: ProductStatus;
}

export interface ProductImage {
  id: string;
  src: string;
  alt: string;
}

export interface Color {
  id: string;
  name: string;
  hex: string;
}

export interface CartItem {
  productId: string;
  color: Color;
  size: string;
  quantity: number;
}