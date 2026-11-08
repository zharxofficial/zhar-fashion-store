import React from 'react';
import { CartItem } from '../types/index.ts';
import { X, Trash2, ArrowRight, ShoppingBag } from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (index: number, newQty: number) => void;
  onRemoveItem: (index: number) => void;
  onProceedToCheckout: () => void;
  currencySymbol?: string;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
  currencySymbol = 'PKR '
}) => {
  if (!isOpen) return null;

  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const freeShippingThreshold = 25000;
  const amountToFreeShipping = Math.max(0, freeShippingThreshold - subtotal);
  const shippingProgress = Math.min(100, (subtotal / freeShippingThreshold) * 100);

  const formatPrice = (val: number) => {
    return val.toLocaleString('en-US');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/80 backdrop-blur-sm transition-opacity">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-neutral-950 border-l border-neutral-800 text-white flex flex-col justify-between shadow-2xl">
          {/* Drawer Header */}
          <div className="px-6 py-6 border-b border-neutral-900 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-4 h-4 text-white" />
              <h2 className="text-xs uppercase tracking-[0.25em] font-medium text-white">
                Shopping Bag ({items.reduce((s, i) => s + i.quantity, 0)})
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white transition-colors"
              aria-label="Close bag"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Complimentary Shipping Progress Strip */}
          <div className="bg-neutral-900/60 px-6 py-3 border-b border-neutral-900 text-xs">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-neutral-400 mb-1.5">
              {amountToFreeShipping > 0 ? (
                <span>
                  Add {currencySymbol}
                  {formatPrice(amountToFreeShipping)} for complimentary courier
                </span>
              ) : (
                <span className="text-neutral-200">
                  Complimentary White-Glove Shipping Unlocked
                </span>
              )}
              <span className="font-mono text-[10px]">{Math.round(shippingProgress)}%</span>
            </div>
            <div className="w-full bg-neutral-800 h-[2px]">
              <div
                className="bg-white h-full transition-all duration-300"
                style={{ width: `${shippingProgress}%` }}
              />
            </div>
          </div>

          {/* Items Container */}
          <div className="flex-1 overflow-y-auto px-6 py-4 divide-y divide-neutral-900">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <ShoppingBag className="w-10 h-10 text-neutral-700 mb-4 stroke-1" />
                <p className="text-sm uppercase tracking-widest text-neutral-300 mb-1 font-light">
                  Your bag is currently empty
                </p>
                <p className="text-xs text-neutral-500 font-light max-w-xs mb-6">
                  Explore our curated seasonal collection of handcrafted garments and accessories.
                </p>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-white text-black text-xs uppercase tracking-[0.2em] font-medium hover:bg-neutral-200 transition-colors"
                >
                  Explore Collection
                </button>
              </div>
            ) : (
              items.map((item, index) => (
                <div key={`${item.product.id}-${item.size}-${index}`} className="py-4 flex gap-4">
                  {/* Item Image */}
                  <div className="w-20 h-24 bg-neutral-900 overflow-hidden shrink-0 border border-neutral-800">
                    <img
                      src={item.product.images[0]}
                      alt={item.product.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-medium text-white line-clamp-1">
                          {item.product.name}
                        </h4>
                        <button
                          onClick={() => onRemoveItem(index)}
                          className="text-neutral-500 hover:text-white transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-[11px] font-mono text-neutral-400 mt-0.5">
                        Size: {item.size}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      {/* Quantity Stepper */}
                      <div className="flex items-center border border-neutral-800 bg-black font-mono">
                        <button
                          onClick={() => onUpdateQuantity(index, item.quantity - 1)}
                          className="px-2 py-0.5 text-neutral-400 hover:text-white text-xs"
                          disabled={item.quantity <= 1}
                        >
                          -
                        </button>
                        <span className="px-2 py-0.5 text-[11px] text-white tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(index, item.quantity + 1)}
                          className="px-2 py-0.5 text-neutral-400 hover:text-white text-xs"
                          disabled={item.quantity >= item.product.stock}
                        >
                          +
                        </button>
                      </div>

                      {/* Line Item Total */}
                      <span className="font-mono text-xs tabular-nums text-white">
                        {currencySymbol}
                        {formatPrice(item.product.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Drawer Footer with Subtotal & Checkout */}
          {items.length > 0 && (
            <div className="p-6 border-t border-neutral-900 bg-neutral-950 flex flex-col gap-4">
              <div className="flex items-center justify-between text-xs tracking-wider uppercase text-neutral-400">
                <span>Subtotal</span>
                <span className="font-mono text-sm text-white tabular-nums">
                  {currencySymbol}
                  {formatPrice(subtotal)}
                </span>
              </div>

              <p className="text-[10px] text-neutral-500 font-light">
                Taxes calculated at checkout. Complimentary white-glove packaging included.
              </p>

              <button
                onClick={onProceedToCheckout}
                className="w-full py-3.5 bg-white text-black text-xs uppercase tracking-[0.25em] font-medium hover:bg-neutral-200 transition-all flex items-center justify-center gap-2 group shadow-xl"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
