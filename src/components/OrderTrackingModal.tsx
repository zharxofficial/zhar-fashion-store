import React, { useState } from 'react';
import { Order, OrderStatus } from '../types/index.ts';
import { X, Search, PackageCheck, Truck, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { ZharLogo } from './ZharLogo.tsx';

interface OrderTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialOrderNumber?: string;
  currencySymbol?: string;
}

const OrderTrackingModalInner: React.FC<OrderTrackingModalProps> = ({
  isOpen,
  onClose,
  initialOrderNumber = '',
  currencySymbol = 'PKR '
}) => {

  const [orderNumber, setOrderNumber] = useState(initialOrderNumber);
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [trackedOrder, setTrackedOrder] = useState<Order | null>(null);

  const statuses: { key: OrderStatus; label: string; desc: string }[] = [
    { key: 'Pending', label: '01. Order Logged', desc: 'Received & awaiting verification' },
    { key: 'Confirmed', label: '02. Atelier Confirmed', desc: 'Inspected & prepared for dispatch' },
    { key: 'Shipped', label: '03. In Transit', desc: 'Dispatched via premium courier' },
    { key: 'Delivered', label: '04. Delivered', desc: 'Handed to recipient' }
  ];

  const getStatusIndex = (st: OrderStatus) => {
    switch (st) {
      case 'Pending': return 0;
      case 'Confirmed': return 1;
      case 'Shipped': return 2;
      case 'Delivered': return 3;
      case 'Cancelled': return -1;
      default: return 0;
    }
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setTrackedOrder(null);

    if (!orderNumber.trim() || !emailOrPhone.trim()) {
      setErrorMsg('Please input your Order Reference Number and Email or Phone.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/orders/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNumber: orderNumber.trim(),
          emailOrPhone: emailOrPhone.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No matching order found in the Atelier records.');
      }

      setTrackedOrder(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Tracking search failed.');
    } finally {
      setLoading(false);
    }
  };

  const currentIdx = trackedOrder ? getStatusIndex(trackedOrder.status) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-3xl bg-neutral-950 border border-neutral-800 text-white shadow-2xl my-auto overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-neutral-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ZharLogo size="sm" variant="wordmark" />
            <span className="text-neutral-500 text-xs">/</span>
            <span className="text-xs uppercase tracking-[0.2em] text-neutral-300">
              Live Order & Consignment Tracking
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 md:p-8">
          {/* Tracking Query Form */}
          <form onSubmit={handleTrack} className="mb-8">
            <p className="text-xs text-neutral-400 mb-4 font-light">
              Enter your official ZHĀR Order Reference (e.g., ZHR-98210) along with your billing email or mobile contact number.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-5">
                <input
                  type="text"
                  required
                  placeholder="Order Number (ZHR-XXXXXX)"
                  value={orderNumber}
                  onChange={e => setOrderNumber(e.target.value.toUpperCase())}
                  className="w-full bg-neutral-900 border border-neutral-800 px-3 py-2.5 text-xs font-mono uppercase text-white placeholder-neutral-500 focus:outline-none focus:border-white transition-colors"
                />
              </div>

              <div className="sm:col-span-5">
                <input
                  type="text"
                  required
                  placeholder="Email or Mobile Number"
                  value={emailOrPhone}
                  onChange={e => setEmailOrPhone(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 px-3 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white transition-colors"
                />
              </div>

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-full py-2.5 bg-white text-black text-xs uppercase tracking-widest font-medium hover:bg-neutral-200 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{loading ? '...' : 'Track'}</span>
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="mt-4 p-3 bg-red-950/40 border border-red-900/60 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </form>

          {/* Tracking Results View */}
          {trackedOrder && (
            <div className="flex flex-col gap-6 border-t border-neutral-900 pt-6">
              {/* Top Order Badge & Carrier Info */}
              <div className="flex flex-wrap items-center justify-between gap-4 bg-neutral-900/40 p-4 border border-neutral-800">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-neutral-400">Order Reference</div>
                  <div className="font-mono text-base text-white font-medium">{trackedOrder.orderNumber}</div>
                </div>

                <div>
                  <div className="text-[10px] uppercase tracking-widest text-neutral-400">Current Status</div>
                  <div className="font-mono text-sm text-white font-bold uppercase">{trackedOrder.status}</div>
                </div>

                {trackedOrder.trackingNumber && (
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-neutral-400">Courier Consignment</div>
                    <div className="font-mono text-xs text-neutral-200">
                      {trackedOrder.carrier || 'Courier'}: {trackedOrder.trackingNumber}
                    </div>
                  </div>
                )}
              </div>

              {/* 4-Step Visual Timeline */}
              <div className="py-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {statuses.map((st, idx) => {
                    const isPassed = currentIdx >= idx;
                    const isCurrent = currentIdx === idx;

                    return (
                      <div
                        key={st.key}
                        className={`p-3 border transition-colors flex flex-col justify-between ${
                          isCurrent
                            ? 'border-white bg-neutral-900'
                            : isPassed
                            ? 'border-neutral-700 bg-neutral-950/60'
                            : 'border-neutral-900 opacity-40'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-mono text-neutral-400">
                            0{idx + 1}
                          </span>
                          {isPassed && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <div>
                          <div className="text-xs font-medium text-white uppercase tracking-wider mb-0.5">
                            {st.key}
                          </div>
                          <div className="text-[10px] text-neutral-400 font-light leading-snug">
                            {st.desc}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Items in Consignment */}
              <div>
                <h4 className="text-xs uppercase tracking-widest text-neutral-400 mb-3">
                  Consignment Line Items
                </h4>
                <div className="divide-y divide-neutral-900 border border-neutral-900 bg-neutral-900/20">
                  {trackedOrder.items.map((item, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.productImage}
                          alt=""
                          className="w-10 h-12 object-cover bg-neutral-950 border border-neutral-800"
                        />
                        <div>
                          <span className="text-white font-medium">{item.productName}</span>
                          <span className="text-neutral-500 font-mono text-[11px] block">
                            Size: {item.size} · Qty: {item.quantity}
                          </span>
                        </div>
                      </div>
                      <span className="font-mono text-white tabular-nums">
                        {currencySymbol}{(item.price * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status History Timeline */}
              {trackedOrder.statusHistory && trackedOrder.statusHistory.length > 0 && (
                <div>
                  <h4 className="text-xs uppercase tracking-widest text-neutral-400 mb-3">
                    Audit Log & Timestamps
                  </h4>
                  <div className="space-y-2 text-[11px] font-mono text-neutral-400">
                    {trackedOrder.statusHistory.map((h, i) => (
                      <div key={i} className="flex items-baseline justify-between border-b border-neutral-900 pb-1.5">
                        <span className="text-white">[{h.status.toUpperCase()}] {h.note}</span>
                        <span className="text-neutral-500 text-[10px]">
                          {new Date(h.timestamp).toLocaleDateString()} {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Wrapper keeps hooks out of the early return (React rules of hooks).
export const OrderTrackingModal: React.FC<OrderTrackingModalProps> = props => (props.isOpen ? <OrderTrackingModalInner {...props} /> : null);
