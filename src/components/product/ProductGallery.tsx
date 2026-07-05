import React, { useState } from 'react';
 
// ============================================================================
// 3. PRODUCT GALLERY WITH THUMBNAILS
// ============================================================================

interface ProductImage {
  src: string;
  alt: string;
  id: string;
}

interface ProductGalleryProps {
  images: ProductImage[];
  productName?: string;
}

export const ProductGallery: React.FC<ProductGalleryProps> = ({
  images,
  productName = 'Product',
}) => {
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  return (
    <div className="space-y-md">
      {/* Main Image */}
      <div
        className="aspect-[4/5] bg-surface-container-low rounded-lg 
                   overflow-hidden bronze-shadow"
      >
        <img
          src={images[activeImageIdx].src}
          alt={images[activeImageIdx].alt}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Thumbnail Gallery */}
      {images.length > 1 && (
        <div className="flex gap-sm overflow-x-auto pb-sm">
          {images.map((img, idx) => (
            <button
              key={img.id}
              onClick={() => setActiveImageIdx(idx)}
              className={`w-16 h-20 rounded-lg overflow-hidden border-2 
                          transition-all flex-shrink-0 ${
                            activeImageIdx === idx
                              ? 'border-primary'
                              : 'border-outline-variant hover:border-primary'
                          }`}
              aria-label={`View image ${idx + 1}`}
            >
              <img src={img.src} alt={`${productName} view ${idx + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
