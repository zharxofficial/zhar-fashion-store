import React, { useState } from 'react';
import { Product } from '../types/index.ts';
import { Eye, Plus } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
  onQuickAdd: (product: Product) => void;
  currencySymbol?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onSelect,
  onQuickAdd,
  currencySymbol = 'PKR '
}) => {
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const formatPrice = (val: number) => {
    return val.toLocaleString('en-US');
  };

  return (
    <div
      className="group relative flex flex-col bg-neutral-950/60 border border-neutral-900 hover:border-neutral-700 transition-all duration-300 select-none cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onSelect(product)}
    >
      {/* Product Image Stage */}
      <div className="relative aspect-[3/4] w-full bg-neutral-900/90 overflow-hidden flex items-center justify-center">
        {!imageError && product.images && product.images.length > 0 ? (
          <img
            src={product.images[0]}
            alt={product.name}
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
          />
        ) : (
          /* Zero-broken-image fallback container */
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-neutral-900 to-black">
            <span className="font-serif-luxury text-2xl tracking-[0.3em] text-neutral-600 mb-2">ZHĀR</span>
            <span className="text-[11px] uppercase tracking-widest text-neutral-400 font-light">
              {product.category}
            </span>
          </div>
        )}

        {/* Minimal Unboxed Status Tag (Max 1 subtle text tag per guidelines) */}
        {product.isSale && (
          <div className="absolute top-3 left-3 text-[10px] tracking-[0.25em] uppercase text-white bg-black/80 backdrop-blur-md px-2.5 py-1 border border-neutral-800">
            Sale
          </div>
        )}
        {!product.isSale && product.isNewArrival && (
          <div className="absolute top-3 left-3 text-[10px] tracking-[0.25em] uppercase text-neutral-300 bg-black/80 backdrop-blur-md px-2.5 py-1 border border-neutral-800">
            New
          </div>
        )}

        {/* Quick action buttons on hover */}
        <div
          className={`absolute inset-x-3 bottom-3 flex items-center gap-2 transition-all duration-300 ${
            isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
          }`}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onQuickAdd(product);
            }}
            className="flex-1 py-2.5 bg-white text-black text-[11px] uppercase tracking-[0.2em] font-medium hover:bg-neutral-200 transition-colors flex items-center justify-center gap-1.5 shadow-lg"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Quick Bag</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(product);
            }}
            className="p-2.5 bg-black/80 backdrop-blur-md text-white border border-neutral-700 hover:border-white transition-colors"
            title="Inspect Details"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Clean Unboxed Metadata & Pricing */}
      <div className="p-4 flex flex-col justify-between flex-1 gap-2">
        <div className="flex items-center gap-2 text-[11px] tracking-[0.25em] uppercase text-neutral-500 font-light">
          <span>{product.gender}</span>
          <span aria-hidden="true">·</span>
          <span>{product.category}</span>
          {product.stock <= 5 && product.stock > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-neutral-400 font-mono tabular-nums">{product.stock} Left</span>
            </>
          )}
        </div>

        <h3 className="text-sm font-medium text-neutral-100 group-hover:text-white transition-colors line-clamp-1">
          {product.name}
        </h3>

        {/* Pricing with tabular numerals */}
        <div className="flex items-center gap-2 mt-1 font-mono text-xs tabular-nums text-neutral-300">
          <span>
            {currencySymbol}
            {formatPrice(product.price)}
          </span>
          {product.originalPrice && product.originalPrice > product.price && (
            <span className="text-neutral-600 line-through">
              {currencySymbol}
              {formatPrice(product.originalPrice)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
