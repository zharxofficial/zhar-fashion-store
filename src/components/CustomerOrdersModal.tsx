import React, { useState, useEffect } from 'react';
import { Order, User } from '../types/index.ts';
import { X, Package, Clock, ExternalLink, RefreshCw } from 'lucide-react';
import { ZharLogo } from './ZharLogo.tsx';

interface CustomerOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onSelectTrackOrder: (orderNumber: string) => void;
  currencySymbol?: string;
}

const CustomerOrdersModalInner: React.FC<CustomerOrdersModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSelectTrackOrder,
  currencySymbol = 'PKR '
}) => {

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.email) return;

    const fetchOrders = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/orders/mine', { headers: { Authorization: `Bearer ${localStorage.getItem('zhar_customer_token') || ''}` } });
        if (res.ok) {
          const data = await res.json();
          setOrders(data);
        }
      } catch (err) {
        console.error('Failed to load customer orders:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [currentUser]);

  const formatPrice = (val: number) => {
    return val.toLocaleString('en-US');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-4xl bg-neutral-950 border border-neutral-800 text-white shadow-2xl my-auto overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-neutral-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ZharLogo size="sm" variant="wordmark" />
            <span className="text-neutral-500 text-xs">/</span>
            <span className="text-xs uppercase tracking-[0.2em] text-neutral-300">
              Personal Atelier Order Ledger
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 md:p-8 max-h-[75vh] overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
              <RefreshCw className="w-6 h-6 animate-spin mb-3 stroke-1" />
              <p className="text-xs uppercase tracking-widest">Retrieving your atelier archive...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16 flex flex-col items-center">
              <Package className="w-10 h-10 text-neutral-700 mb-4 stroke-1" />
              <h3 className="text-sm uppercase tracking-widest text-neutral-300 mb-1">
                No orders recorded under this account
              </h3>
              <p className="text-xs text-neutral-500 max-w-sm mb-6">
                When you acquire garments from our atelier, your receipts and tracking progress will be catalogued here.
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-white text-black text-xs uppercase tracking-widest font-medium hover:bg-neutral-200 transition-colors"
              >
                Explore Collection
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.map((ord) => (
                <div
                  key={ord.id}
                  className="bg-neutral-900/40 border border-neutral-800 p-6 flex flex-col gap-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-neutral-800/80">
                    <div>
                      <span className="text-[10px] uppercase tracking-widest text-neutral-500 block">
                        Order Reference
                      </span>
                      <span className="font-mono text-sm text-white font-medium">
                        {ord.orderNumber}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase tracking-widest text-neutral-500 block">
                        Date Logged
                      </span>
                      <span className="text-xs text-neutral-300">
                        {new Date(ord.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase tracking-widest text-neutral-500 block">
                        Status
                      </span>
                      <span className="inline-block bg-neutral-800 border border-neutral-700 px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider text-white">
                        {ord.status}
                      </span>
                    </div>

                    <div>
                      <button
                        onClick={() => {
                          onClose();
                          onSelectTrackOrder(ord.orderNumber);
                        }}
                        className="text-xs uppercase tracking-wider text-neutral-300 hover:text-white flex items-center gap-1.5 border border-neutral-700 hover:border-white px-3 py-1.5 transition-colors"
                      >
                        <span>Live Tracking</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Order Line Items */}
                  <div className="divide-y divide-neutral-900">
                    {ord.items.map((item, idx) => (
                      <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.productImage}
                            alt=""
                            className="w-10 h-12 object-cover bg-neutral-950 border border-neutral-800"
                          />
                          <div>
                            <span className="text-white font-medium block">{item.productName}</span>
                            <span className="text-[11px] font-mono text-neutral-500">
                              Size: {item.size} · Quantity: {item.quantity}
                            </span>
                          </div>
                        </div>
                        <span className="font-mono text-white tabular-nums">
                          {currencySymbol}{formatPrice(item.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Summary & Dispatch Status */}
                  <div className="flex flex-wrap items-center justify-between pt-3 border-t border-neutral-900 text-xs">
                    <div className="text-neutral-400 font-light">
                      Payment: <span className="uppercase text-neutral-300 font-mono">{ord.paymentMethod}</span>
                      {ord.carrier && ord.trackingNumber && (
                        <span className="ml-3 text-neutral-300">
                          · {ord.carrier}: <span className="font-mono">{ord.trackingNumber}</span>
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-sm text-white">
                      Total: <span className="font-bold">{currencySymbol}{formatPrice(ord.total)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Wrapper keeps hooks out of the early return (React rules of hooks).
export const CustomerOrdersModal: React.FC<CustomerOrdersModalProps> = props => (props.isOpen ? <CustomerOrdersModalInner {...props} /> : null);
