import React, { useState } from 'react';
import { Product } from '../types/index.ts';
import { X, Check, ShieldCheck, Truck, RefreshCw, Sparkles } from 'lucide-react';

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product, size: string, quantity: number) => void;
  currencySymbol?: string;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  product,
  onClose,
  onAddToCart,
  currencySymbol = 'PKR '
}) => {
  if (!product) return null;

  const [selectedSize, setSelectedSize] = useState<string>(
    product.sizes && product.sizes.length > 0 ? product.sizes[0] : 'Standard'
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [addedNotice, setAddedNotice] = useState(false);
  const [imageError, setImageError] = useState(false);

  const formatPrice = (val: number) => {
    return val.toLocaleString('en-US');
  };

  const [selectedColor, setSelectedColor] = useState<string>(product.colors && product.colors.length > 0 ? product.colors[0] : '');
  const unavailable = product.stock <= 0 || product.isAvailable === false;

  const handleAdd = () => {
    onAddToCart(product, selectedColor ? `${selectedSize} · ${selectedColor}` : selectedSize, quantity);
    setAddedNotice(true);
    setTimeout(() => setAddedNotice(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8 overflow-y-auto bg-black/85 backdrop-blur-md">
      <div
        className="relative w-full max-w-5xl bg-neutral-950 border border-neutral-800 text-white shadow-2xl overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 text-neutral-400 hover:text-white transition-colors bg-black/60 backdrop-blur-md border border-neutral-800"
          aria-label="Close product view"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Gallery Column */}
          <div className="relative bg-neutral-900 flex flex-col justify-between p-6">
            <div className="aspect-[3/4] w-full overflow-hidden flex items-center justify-center bg-black/50">
              {!imageError && product.images && product.images.length > 0 ? (
                <img
                  src={product.images[activeImageIndex] || product.images[0]}
                  alt={product.name}
                  referrerPolicy="no-referrer"
                  onError={() => setImageError(true)}
                  className="w-full h-full object-cover object-center transition-all duration-500"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-center p-8 bg-neutral-900">
                  <span className="font-serif-luxury text-3xl tracking-[0.3em] text-neutral-500 mb-2">ZHĀR</span>
                  <span className="text-xs uppercase tracking-widest text-neutral-400">{product.category}</span>
                </div>
              )}
            </div>

            {/* Thumbnail switcher if multiple images */}
            {product.images && product.images.length > 1 && (
              <div className="flex items-center gap-3 mt-4">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`w-14 h-16 border overflow-hidden transition-all ${
                      activeImageIndex === idx ? 'border-white' : 'border-neutral-800 opacity-60'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Stable Contiguous Purchase Module */}
          <div className="p-6 md:p-8 flex flex-col justify-between gap-6">
            <div className="flex flex-col gap-4">
              {/* Unboxed Header Metadata */}
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-neutral-400 font-light">
                <span>{product.gender}</span>
                <span aria-hidden="true">·</span>
                <span>{product.category}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-[11px] text-neutral-500">{product.sku}</span>
              </div>

              <h2 className="text-2xl md:text-3xl font-serif-luxury text-white font-normal uppercase tracking-wide">
                {product.name}
              </h2>

              {/* Price */}
              <div className="flex items-baseline gap-3 font-mono tabular-nums text-lg text-white">
                <span>
                  {currencySymbol}
                  {formatPrice(product.price)}
                </span>
                {product.originalPrice && product.originalPrice > product.price && (
                  <span className="text-sm text-neutral-500 line-through">
                    {currencySymbol}
                    {formatPrice(product.originalPrice)}
                  </span>
                )}
                {product.isSale && (
                  <span className="text-[10px] tracking-widest text-neutral-300 uppercase px-2 py-0.5 bg-neutral-900 border border-neutral-700">
                    Atelier Privilege
                  </span>
                )}
              </div>

              {/* Description */}
              <p className="text-xs md:text-sm text-neutral-400 font-light leading-relaxed">
                {product.description}
              </p>

              {/* Size Variant Selector */}
              {product.sizes && product.sizes.length > 0 && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs tracking-[0.2em] uppercase text-neutral-400 mb-2">
                    <span>Select Specification / Size</span>
                    <span className="text-[11px] text-neutral-500">Size Guide Available</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {product.sizes.map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setSelectedSize(sz)}
                        className={`px-4 py-2 text-xs uppercase tracking-wider font-mono border transition-all ${
                          selectedSize === sz
                            ? 'bg-white text-black border-white'
                            : 'bg-black text-neutral-400 border-neutral-800 hover:border-neutral-500 hover:text-white'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Colour Selector */}
              {product.colors && product.colors.length > 0 && (
                <div className="mt-2">
                  <div className="text-xs tracking-[0.2em] uppercase text-neutral-400 mb-2">Colour</div>
                  <div className="flex flex-wrap gap-2">
                    {product.colors.map(col => (
                      <button key={col} type="button" onClick={() => setSelectedColor(col)}
                        className={`px-4 py-2 text-xs uppercase tracking-wider font-mono border transition-all ${selectedColor === col ? 'bg-white text-black border-white' : 'bg-black text-neutral-400 border-neutral-800 hover:border-neutral-500 hover:text-white'}`}>
                        {col}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Stock Indicator */}
              <div className="flex items-center gap-2 text-xs tracking-wider text-neutral-400 font-light">
                <span className="w-1.5 h-1.5 bg-neutral-300 rounded-full" />
                <span>
                  {product.stock > 0
                    ? `In Stock (${product.stock} units handcrafted and ready)`
                    : 'Bespoke Order Only'}
                </span>
              </div>

              {/* Quantity Stepper */}
              <div className="flex items-center gap-4 mt-2">
                <span className="text-xs uppercase tracking-widest text-neutral-400">Qty</span>
                <div className="flex items-center border border-neutral-800 bg-black font-mono">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3 py-1.5 text-neutral-400 hover:text-white text-sm"
                    disabled={quantity <= 1}
                  >
                    -
                  </button>
                  <span className="px-3 py-1.5 text-xs text-white tabular-nums">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    className="px-3 py-1.5 text-neutral-400 hover:text-white text-sm"
                    disabled={quantity >= product.stock}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-3 pt-4 border-t border-neutral-900">
              <button
                onClick={handleAdd}
                disabled={unavailable}
                className={`w-full py-3.5 text-xs uppercase tracking-[0.25em] font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
                  product.stock <= 0
                    ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                    : addedNotice
                    ? 'bg-neutral-200 text-black'
                    : 'bg-white text-black hover:bg-neutral-200'
                }`}
              >
                {addedNotice ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Added to Shopping Bag</span>
                  </>
                ) : (
                  <span>{unavailable ? 'Unavailable' : 'Add to Shopping Bag'}</span>
                )}
              </button>

              {/* Craftsmanship & Service Highlights */}
              <div className="grid grid-cols-2 gap-3 text-[11px] text-neutral-400 font-light mt-2 pt-2 border-t border-neutral-900">
                <div className="flex items-center gap-2">
                  <Truck className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                  <span>White-Glove Courier</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                  <span>Authenticity Guarantee</span>
                </div>
              </div>

              {/* Product Specifications & Details */}
              {product.details && product.details.length > 0 && (
                <div className="mt-2 text-[11px] text-neutral-400">
                  <span className="uppercase tracking-widest text-[10px] text-neutral-500 block mb-1">
                    Composition & Origin:
                  </span>
                  <ul className="space-y-0.5 list-disc list-inside">
                    {product.details.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
