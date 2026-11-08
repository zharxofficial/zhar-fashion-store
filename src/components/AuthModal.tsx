import { ProfileForm } from './ProfileForm.tsx';
import React, { useState } from 'react';
import { User } from '../types/index.ts';
import { X, User as UserIcon, Lock, Mail, Phone, ArrowRight, CheckCircle2 } from 'lucide-react';
import { ZharLogo } from './ZharLogo.tsx';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onLoginSuccess: (user: User, token: string, isAdmin?: boolean) => void;
  onLogout: () => void;
  onOpenOrderHistory: () => void;
  onOpenAdmin: () => void;
}

const AuthModalInner: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLoginSuccess,
  onLogout,
  onOpenOrderHistory,
  onOpenAdmin
}) => {

  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed.');

        onLoginSuccess(data.user, data.token, data.isAdmin);
        onClose();
      } else if (mode === 'signup') {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, fullName, phone })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Registration failed.');

        if (data.needsConfirmation) { setSuccessMsg(data.message); setMode('login'); return; }
        onLoginSuccess(data.user, data.token, false);
        onClose();
      } else if (mode === 'reset') {
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Password reset request failed.');

        setSuccessMsg(data.message || 'Recovery email has been dispatched.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-neutral-950 border border-neutral-800 text-white shadow-2xl my-auto overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-neutral-900 flex items-center justify-between">
          <ZharLogo size="sm" variant="wordmark" />
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {currentUser ? (
          /* Logged In View */
          <div className="p-6 md:p-8 flex flex-col gap-6">
            <ProfileForm user={currentUser} onSaved={u => onLoginSuccess(u, localStorage.getItem('zhar_customer_token') || '', false)} />
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-neutral-900 border border-neutral-800 flex items-center justify-center text-white">
                <UserIcon className="w-6 h-6 stroke-1" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-white">{currentUser.fullName}</h3>
                <p className="text-xs text-neutral-500 font-mono">{currentUser.email}</p>
                <span className="text-[10px] uppercase tracking-wider text-neutral-400">
                  {currentUser.role === 'admin' ? 'Atelier Owner / Admin' : 'Society Member'}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2 border-t border-neutral-900">
              <button
                onClick={() => {
                  onClose();
                  onOpenOrderHistory();
                }}
                className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs uppercase tracking-widest text-left px-4 flex items-center justify-between transition-colors"
              >
                <span>My Atelier Order History</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {currentUser.role === 'admin' && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenAdmin();
                  }}
                  className="w-full py-3 bg-white text-black hover:bg-neutral-200 text-xs uppercase tracking-widest font-medium text-left px-4 flex items-center justify-between transition-colors"
                >
                  <span>Open Atelier Admin Panel (/admin)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="w-full py-2.5 text-xs uppercase tracking-widest text-neutral-500 hover:text-white mt-2 transition-colors text-center"
              >
                Sign Out
              </button>
            </div>
          </div>
        ) : (
          /* Auth Form */
          <div className="p-6 md:p-8">
            {/* Mode Tabs */}
            <div className="flex border-b border-neutral-900 mb-6 text-xs uppercase tracking-widest">
              <button
                onClick={() => {
                  setMode('login');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className={`flex-1 pb-3 text-center transition-colors ${
                  mode === 'login' ? 'text-white border-b border-white' : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setMode('signup');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className={`flex-1 pb-3 text-center transition-colors ${
                  mode === 'signup' ? 'text-white border-b border-white' : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                Create Account
              </button>
              <button
                onClick={() => {
                  setMode('reset');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className={`flex-1 pb-3 text-center transition-colors ${
                  mode === 'reset' ? 'text-white border-b border-white' : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                Reset
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 bg-red-950/40 border border-red-900/60 text-red-300 text-xs">
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3 bg-neutral-900 border border-neutral-700 text-neutral-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs">
              {mode === 'signup' && (
                <>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-1">
                      Full Name *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        placeholder="Mian Azaan"
                        className="w-full bg-neutral-900 border border-neutral-800 px-3 py-2 text-white focus:outline-none focus:border-white transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-1">
                      Mobile Phone
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="0300-1234567"
                        className="w-full bg-neutral-900 border border-neutral-800 px-3 py-2 text-white focus:outline-none focus:border-white transition-colors"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="concierge@zhar.com"
                    className="w-full bg-neutral-900 border border-neutral-800 px-3 py-2 text-white focus:outline-none focus:border-white transition-colors"
                  />
                </div>
              </div>

              {mode !== 'reset' && (
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-neutral-500 mb-1">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-neutral-900 border border-neutral-800 px-3 py-2 text-white focus:outline-none focus:border-white transition-colors"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-white text-black text-xs uppercase tracking-[0.25em] font-medium hover:bg-neutral-200 transition-colors mt-2 disabled:opacity-50"
              >
                {loading
                  ? 'Processing...'
                  : mode === 'login'
                  ? 'Sign In to Atelier'
                  : mode === 'signup'
                  ? 'Create Membership'
                  : 'Send Reset Link'}
              </button>

              <div className="pt-2 text-center text-[11px] text-neutral-500">
                {mode === 'login' ? (
                  <span>
                    Need an atelier account?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('signup')}
                      className="text-white underline underline-offset-4"
                    >
                      Join now
                    </button>
                  </span>
                ) : mode === 'signup' ? (
                  <span>
                    Already registered?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className="text-white underline underline-offset-4"
                    >
                      Sign In
                    </button>
                  </span>
                ) : (
                  <span>
                    Remembered password?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className="text-white underline underline-offset-4"
                    >
                      Return to Sign In
                    </button>
                  </span>
                )}
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

// Wrapper keeps hooks out of the early return (React rules of hooks).
export const AuthModal: React.FC<AuthModalProps> = props => (props.isOpen ? <AuthModalInner {...props} /> : null);
