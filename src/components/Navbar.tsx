import React, { useState } from 'react';
import { ShoppingBag, Search, User, SlidersHorizontal, Menu, X, Film } from 'lucide-react';
import { ZharLogo } from './ZharLogo.tsx';

interface NavbarProps {
  cartCount: number;
  onOpenCart: () => void;
  onOpenSearch: () => void;
  onOpenAuth: () => void;
  onOpenTracking: () => void;
  onOpenAdmin: () => void;
  onReplayFilm?: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  announcementText?: string;
  announcementEnabled?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  cartCount,
  onOpenCart,
  onOpenSearch,
  onOpenAuth,
  onOpenTracking,
  onOpenAdmin,
  onReplayFilm,
  activeTab,
  setActiveTab,
  announcementText,
  announcementEnabled = true
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const navLinks = [
    { id: 'all', label: 'Shop All' },
    { id: 'men', label: 'Men' },
    { id: 'women', label: 'Women' },
    { id: 'new', label: 'New Arrivals' },
    { id: 'sale', label: 'Atelier Sale' }
  ];

  return (
    <header className="sticky top-0 z-40 bg-black/95 backdrop-blur-md border-b border-neutral-800 transition-colors">
      {/* Optional Top Announcement Banner */}
      {announcementEnabled && !bannerDismissed && announcementText && (
        <div className="bg-neutral-900 border-b border-neutral-800 text-neutral-300 px-4 py-2 text-[11px] uppercase tracking-[0.2em] flex items-center justify-between">
          <div className="w-full text-center truncate">
            <span>{announcementText}</span>
          </div>
          <button
            onClick={() => setBannerDismissed(true)}
            className="text-neutral-500 hover:text-white ml-2 transition-colors"
            aria-label="Dismiss banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Strict 3-Zone Top Bar Contract */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-4 shrink-0">
          <button
            onClick={() => {
              setActiveTab('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="focus:outline-none"
          >
            <ZharLogo size="md" variant="wordmark" />
          </button>
        </div>

        {/* Zone 2: 4-5 Concise Single-Line Nav Links (Desktop) */}
        <nav className="hidden lg:flex items-center gap-8 text-[13px] tracking-[0.18em] uppercase text-neutral-400 font-light">
          {navLinks.map(link => (
            <button
              key={link.id}
              onClick={() => {
                setActiveTab(link.id);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`hover:text-white transition-colors py-1 relative whitespace-nowrap shrink-0 ${
                activeTab === link.id ? 'text-white' : ''
              }`}
            >
              {link.label}
              {activeTab === link.id && (
                <span className="absolute bottom-0 left-0 w-full h-[1px] bg-white transition-all" />
              )}
            </button>
          ))}
          <button
            onClick={onOpenTracking}
            className="hover:text-white transition-colors py-1 text-neutral-400 whitespace-nowrap shrink-0"
          >
            Track Order
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action Lockup */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          {onReplayFilm && (
            <button
              onClick={onReplayFilm}
              className="p-2 text-neutral-400 hover:text-white transition-colors"
              title="Play Cinematic Opening"
              aria-label="Play Cinematic Opening"
            >
              <Film className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onOpenSearch}
            className="p-2 text-neutral-400 hover:text-white transition-colors"
            title="Search Products"
            aria-label="Search Catalog"
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenAuth}
            className="p-2 text-neutral-400 hover:text-white transition-colors"
            title="Account & Orders"
            aria-label="Customer Account"
          >
            <User className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenCart}
            className="relative flex items-center justify-center p-2.5 text-white bg-neutral-900 border border-neutral-700 hover:border-white transition-colors duration-200"
            aria-label="Shopping Bag"
          >
            <ShoppingBag className="w-4 h-4" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white text-black text-[10px] font-bold flex items-center justify-center rounded-none tabular-nums">
                {cartCount}
              </span>
            )}
          </button>

          {/* Mobile hamburger menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-neutral-300 hover:text-white"
            aria-label="Open Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-neutral-950 border-b border-neutral-800 px-6 py-6 flex flex-col gap-4 text-xs uppercase tracking-[0.2em] text-neutral-300">
          {navLinks.map(link => (
            <button
              key={link.id}
              onClick={() => {
                setActiveTab(link.id);
                setMobileMenuOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-left py-2 hover:text-white border-b border-neutral-900"
            >
              {link.label}
            </button>
          ))}
          <button
            onClick={() => {
              onOpenTracking();
              setMobileMenuOpen(false);
            }}
            className="text-left py-2 hover:text-white border-b border-neutral-900"
          >
            Track Order
          </button>
          <button
            onClick={() => {
              onOpenAdmin();
              setMobileMenuOpen(false);
            }}
            className="text-left py-2 text-neutral-500 hover:text-white"
          >
            Atelier Executive Portal (/admin)
          </button>
        </div>
      )}
    </header>
  );
};
