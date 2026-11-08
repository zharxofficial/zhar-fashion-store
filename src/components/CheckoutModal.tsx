import React, { useState } from 'react';
import { CartItem, Order, PaymentMethod, StoreSettings } from '../types/index.ts';
import { X, CheckCircle, CreditCard, Banknote, Smartphone, ShieldCheck, ArrowRight, Printer } from 'lucide-react';
import { ZharLogo } from './ZharLogo.tsx';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  settings: StoreSettings;
  onOrderSuccess: (order: Order) => void;
  currencySymbol?: string;
}

const CheckoutModalInner: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
  settings,
  onOrderSuccess,
  currencySymbol = 'PKR '
}) => {

  const [step, setStep] = useState<'form' | 'success'>('form');
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Shipping form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('Pakistan');
  const [notes, setNotes] = useState('');

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');

  // Manual payment details
  const [transactionId, setTransactionId] = useState('');
  const [senderNumber, setSenderNumber] = useState('');


  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const shipping = subtotal >= 25000 ? 0 : 1500;
  const total = subtotal + shipping;

  const formatPrice = (val: number) => {
    return val.toLocaleString('en-US');
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!fullName || !email || !phone || !address || !city) {
      setErrorMsg('Please complete all mandatory shipping and contact details.');
      return;
    }

    if ((paymentMethod === 'jazzcash' || paymentMethod === 'easypaisa') && !transactionId) {
      setErrorMsg(`Please enter your ${paymentMethod === 'jazzcash' ? 'JazzCash' : 'Easypaisa'} Transaction ID (TID) after transferring.`);
      return;
    }

    setLoading(true);

    try {
      const orderPayload = {
        customer: {
          fullName,
          email,
          phone,
          address,
          city,
          postalCode,
          country,
          notes
        },
        items: items.map(i => ({
          productId: i.product.id,
          size: i.size,
          quantity: i.quantity
        })),
        paymentMethod,
        paymentDetails: {
          transactionId: transactionId || undefined,
          senderNumber: senderNumber || undefined,
          notes: notes || undefined
        }
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to place order.');
      }

      setCreatedOrder(data.order);
      setStep('success');
      onOrderSuccess(data.order);
    } catch (err: any) {
      setErrorMsg(err.message || 'Server error occurred during checkout.');
    } finally {
      setLoading(false);
    }
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
              {step === 'form' ? 'Atelier Checkout & Verification' : 'Order Confirmation'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === 'form' ? (
          <form onSubmit={handleSubmitOrder} className="p-6 md:p-8">
            {errorMsg && (
              <div className="mb-6 p-4 bg-red-950/40 border border-red-900/60 text-red-200 text-xs tracking-wide">
                {errorMsg}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Shipping & Payment Info */}
              <div className="lg:col-span-7 flex flex-col gap-6">
                {/* 1. Customer Details */}
                <div>
                  <h3 className="text-xs uppercase tracking-[0.25em] text-neutral-400 mb-3 font-medium">
                    01. Recipient & Shipping Atelier
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        placeholder="e.g. Mian Azaan Khalil"
                        className="w-full bg-neutral-900/80 border border-neutral-800 px-3 py-2 text-white placeholder-neutral-600 focus:outline-none focus:border-white transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-1">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="recipient@example.com"
                        className="w-full bg-neutral-900/80 border border-neutral-800 px-3 py-2 text-white placeholder-neutral-600 focus:outline-none focus:border-white transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-1">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="0300-1234567"
                        className="w-full bg-neutral-900/80 border border-neutral-800 px-3 py-2 text-white placeholder-neutral-600 focus:outline-none focus:border-white transition-colors"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-1">
                        Delivery Address *
                      </label>
                      <input
                        type="text"
                        required
                        value={address}
                        onChange={e => setAddress(e.target.value)}
                        placeholder="Street, Residence or Villa Number"
                        className="w-full bg-neutral-900/80 border border-neutral-800 px-3 py-2 text-white placeholder-neutral-600 focus:outline-none focus:border-white transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-1">
                        City *
                      </label>
                      <input
                        type="text"
                        required
                        value={city}
                        onChange={e => setCity(e.target.value)}
                        placeholder="Lahore / Karachi / Islamabad"
                        className="w-full bg-neutral-900/80 border border-neutral-800 px-3 py-2 text-white placeholder-neutral-600 focus:outline-none focus:border-white transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-1">
                        Postal Code
                      </label>
                      <input
                        type="text"
                        value={postalCode}
                        onChange={e => setPostalCode(e.target.value)}
                        placeholder="54000"
                        className="w-full bg-neutral-900/80 border border-neutral-800 px-3 py-2 text-white placeholder-neutral-600 focus:outline-none focus:border-white transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Payment Method Selection */}
                <div>
                  <h3 className="text-xs uppercase tracking-[0.25em] text-neutral-400 mb-3 font-medium">
                    02. Payment Selection
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {/* COD */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cod')}
                      className={`p-3 border text-left flex items-start gap-3 transition-all ${
                        paymentMethod === 'cod'
                          ? 'border-white bg-neutral-900 text-white'
                          : 'border-neutral-800 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      <Banknote className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-white text-[11px] uppercase tracking-wider">
                          Cash on Delivery
                        </div>
                        <div className="text-[10px] text-neutral-500 mt-0.5">
                          Pay upon courier arrival
                        </div>
                      </div>
                    </button>

                    {/* JazzCash */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('jazzcash')}
                      className={`p-3 border text-left flex items-start gap-3 transition-all ${
                        paymentMethod === 'jazzcash'
                          ? 'border-white bg-neutral-900 text-white'
                          : 'border-neutral-800 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      <Smartphone className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-white text-[11px] uppercase tracking-wider">
                          JazzCash Transfer
                        </div>
                        <div className="text-[10px] text-neutral-500 mt-0.5">
                          Direct mobile account transfer
                        </div>
                      </div>
                    </button>

                    {/* Easypaisa */}
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('easypaisa')}
                      className={`p-3 border text-left flex items-start gap-3 transition-all ${
                        paymentMethod === 'easypaisa'
                          ? 'border-white bg-neutral-900 text-white'
                          : 'border-neutral-800 text-neutral-400 hover:border-neutral-700'
                      }`}
                    >
                      <Smartphone className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-white text-[11px] uppercase tracking-wider">
                          Easypaisa Transfer
                        </div>
                        <div className="text-[10px] text-neutral-500 mt-0.5">
                          Direct mobile account transfer
                        </div>
                      </div>
                    </button>
                  </div>

                  {/* Payment Details Drawer based on selection */}
                  {paymentMethod === 'jazzcash' && (
                    <div className="mt-4 p-4 bg-neutral-900/80 border border-neutral-800 text-xs flex flex-col gap-3">
                      <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                        <span className="text-[10px] uppercase tracking-widest text-neutral-400">
                          Official ZHĀR JazzCash Account:
                        </span>
                        <span className="font-mono text-white font-medium">
                          {settings.jazzcashNumber || 'Not configured yet - contact the store'}
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-300">
                        Account Title: <span className="font-medium text-white">{settings.jazzcashTitle || 'Not configured yet - contact the store'}</span>
                      </div>
                      {settings.jazzcashInstructions && (<p className="text-[11px] text-white whitespace-pre-line">{settings.jazzcashInstructions}</p>)}
                      <p className="text-[10px] text-neutral-400 leading-relaxed font-light">
                        1. Open JazzCash App or dial *786# &gt; Send Money to Mobile Account.<br />
                        2. Transfer total amount of <span className="font-mono text-white font-bold">{currencySymbol}{formatPrice(total)}</span>.<br />
                        3. Input the Transaction ID (TID) received in confirmation SMS below.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        <div>
                          <label className="block text-[10px] uppercase text-neutral-400 mb-1">
                            Transaction ID (TID) *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. 8921473210"
                            value={transactionId}
                            onChange={e => setTransactionId(e.target.value)}
                            className="w-full bg-black border border-neutral-700 px-3 py-1.5 text-white font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase text-neutral-400 mb-1">
                            Sender Phone Number
                          </label>
                          <input
                            type="tel"
                            placeholder="e.g. 0300-1234567"
                            value={senderNumber}
                            onChange={e => setSenderNumber(e.target.value)}
                            className="w-full bg-black border border-neutral-700 px-3 py-1.5 text-white font-mono text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'easypaisa' && (
                    <div className="mt-4 p-4 bg-neutral-900/80 border border-neutral-800 text-xs flex flex-col gap-3">
                      <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                        <span className="text-[10px] uppercase tracking-widest text-neutral-400">
                          Official ZHĀR Easypaisa Account:
                        </span>
                        <span className="font-mono text-white font-medium">
                          {settings.easypaisaNumber || 'Not configured yet - contact the store'}
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-300">
                        Account Title: <span className="font-medium text-white">{settings.easypaisaTitle || 'Not configured yet - contact the store'}</span>
                      </div>
                      {settings.easypaisaInstructions && (<p className="text-[11px] text-white whitespace-pre-line">{settings.easypaisaInstructions}</p>)}
                      <p className="text-[10px] text-neutral-400 leading-relaxed font-light">
                        1. Open Easypaisa App &gt; Money Transfer &gt; Easypaisa Account.<br />
                        2. Transfer total amount of <span className="font-mono text-white font-bold">{currencySymbol}{formatPrice(total)}</span>.<br />
                        3. Input the Transaction ID (TID) received in SMS below.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        <div>
                          <label className="block text-[10px] uppercase text-neutral-400 mb-1">
                            Transaction ID (TID) *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. 5928194021"
                            value={transactionId}
                            onChange={e => setTransactionId(e.target.value)}
                            className="w-full bg-black border border-neutral-700 px-3 py-1.5 text-white font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase text-neutral-400 mb-1">
                            Sender Phone Number
                          </label>
                          <input
                            type="tel"
                            placeholder="e.g. 0345-9876543"
                            value={senderNumber}
                            onChange={e => setSenderNumber(e.target.value)}
                            className="w-full bg-black border border-neutral-700 px-3 py-1.5 text-white font-mono text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* Right Column: Order Summary */}
              <div className="lg:col-span-5 bg-neutral-900/40 border border-neutral-900 p-6 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs uppercase tracking-[0.25em] text-neutral-400 mb-4 font-medium">
                    Order Summary ({items.length} pieces)
                  </h3>

                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2 divide-y divide-neutral-900">
                    {items.map((i, idx) => (
                      <div key={idx} className="pt-2 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <img
                            src={i.product.images[0]}
                            alt=""
                            className="w-10 h-12 object-cover bg-neutral-950 border border-neutral-800"
                          />
                          <div>
                            <div className="text-white font-medium line-clamp-1">{i.product.name}</div>
                            <div className="text-[10px] text-neutral-400 font-mono">
                              Qty: {i.quantity} · Size: {i.size}
                            </div>
                          </div>
                        </div>
                        <div className="font-mono text-white text-[11px] tabular-nums">
                          {currencySymbol}{formatPrice(i.product.price * i.quantity)}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-neutral-800 mt-6 pt-4 space-y-2 text-xs">
                    <div className="flex justify-between text-neutral-400">
                      <span>Subtotal</span>
                      <span className="font-mono text-white tabular-nums">
                        {currencySymbol}{formatPrice(subtotal)}
                      </span>
                    </div>
                    <div className="flex justify-between text-neutral-400">
                      <span>White-Glove Courier</span>
                      <span className="font-mono text-white tabular-nums">
                        {shipping === 0 ? 'Complimentary' : `${currencySymbol}${formatPrice(shipping)}`}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm font-medium text-white pt-2 border-t border-neutral-800">
                      <span className="uppercase tracking-wider">Total</span>
                      <span className="font-mono text-base tabular-nums">
                        {currencySymbol}{formatPrice(total)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-white text-black text-xs uppercase tracking-[0.25em] font-medium hover:bg-neutral-200 transition-all flex items-center justify-center gap-2 group shadow-xl disabled:opacity-50"
                  >
                    <span>{loading ? 'Authenticating Order...' : 'Confirm Order & Authorize'}</span>
                    {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                  </button>
                  <p className="text-[10px] text-neutral-500 text-center mt-3 font-light">
                    Protected under ZHĀR Maison authenticity and white-glove warranty.
                  </p>
                </div>
              </div>
            </div>
          </form>
        ) : (
          /* Success Screen */
          <div className="p-8 md:p-12 text-center max-w-2xl mx-auto flex flex-col items-center">
            <CheckCircle className="w-12 h-12 text-white mb-4 stroke-1" />
            <span className="text-[11px] uppercase tracking-[0.3em] text-neutral-400 mb-2 font-light">
              Order Confirmed & Logged in Atelier Database
            </span>
            <h2 className="text-3xl font-serif-luxury uppercase tracking-wider text-white mb-2">
              Thank You, {createdOrder?.customer.fullName}
            </h2>
            <div className="inline-block bg-neutral-900 border border-neutral-800 px-4 py-2 font-mono text-sm tracking-widest text-neutral-200 my-4">
              ORDER REF: {createdOrder?.orderNumber}
            </div>
            <p className="text-xs text-neutral-400 font-light max-w-md mx-auto leading-relaxed mb-6">
              A bespoke dispatch receipt has been recorded. Our concierge team is preparing your package for white-glove courier delivery to {createdOrder?.customer.city}.
            </p>

            <div className="w-full bg-neutral-900/60 border border-neutral-800 p-4 text-xs text-left mb-6 font-mono space-y-1">
              <div className="text-neutral-400">Payment Status: <span className="text-white uppercase">{createdOrder?.status}</span></div>
              <div className="text-neutral-400">Method: <span className="text-white uppercase">{createdOrder?.paymentMethod}</span></div>
              <div className="text-neutral-400">Delivery Address: <span className="text-white">{createdOrder?.customer.address}, {createdOrder?.customer.city}</span></div>
              <div className="text-neutral-400">Total Billed: <span className="text-white font-bold">{currencySymbol}{createdOrder ? formatPrice(createdOrder.total) : ''}</span></div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 border border-neutral-700 text-neutral-300 hover:text-white hover:border-white text-xs uppercase tracking-wider flex items-center gap-2 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Receipt</span>
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-white text-black text-xs uppercase tracking-wider font-medium hover:bg-neutral-200 transition-colors"
              >
                Return to Collection
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Wrapper keeps hooks out of the early return (React rules of hooks).
export const CheckoutModal: React.FC<CheckoutModalProps> = props => (props.isOpen ? <CheckoutModalInner {...props} /> : null);
