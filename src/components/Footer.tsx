import React from 'react';
import { ZharLogo } from './ZharLogo.tsx';
import { StoreSettings } from '../types/index.ts';
import { ArrowUpRight, Shield, Lock } from 'lucide-react';

interface FooterProps {
  settings: StoreSettings;
  onOpenTracking: () => void;
  onOpenAdmin: () => void;
  onOpenShop: (category?: string) => void;
}

export const Footer: React.FC<FooterProps> = ({
  settings,
  onOpenTracking,
  onOpenAdmin,
  onOpenShop
}) => {
  return (
    <footer className="bg-black border-t border-neutral-900 text-neutral-400 text-xs">
      {/* Upper Footer: Brand & Pillars */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
          {/* Brand Manifesto Column */}
          <div className="md:col-span-5 flex flex-col justify-between gap-6">
            <div>
              <ZharLogo size="lg" variant="full" className="mb-6 items-start" />
              <p className="text-neutral-400 text-xs font-light leading-relaxed max-w-sm">
                ZHĀR is an uncompromising monochrome fashion house founded on architectural precision, virgin materials, and timeless brutalist aesthetics. Every garment is crafted in limited numbered editions.
              </p>
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-6 text-[11px] uppercase tracking-[0.2em] text-neutral-400">
              {settings.socialLinks.instagram && (
                <a
                  href={settings.socialLinks.instagram}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Instagram
                </a>
              )}
              {settings.socialLinks.twitter && (
                <a
                  href={settings.socialLinks.twitter}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Twitter / X
                </a>
              )}
              {settings.socialLinks.tiktok && (
                <a
                  href={settings.socialLinks.tiktok}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition-colors"
                >
                  TikTok
                </a>
              )}
              {settings.socialLinks.whatsapp && (
                <a
                  href={`https://wa.me/${settings.socialLinks.whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition-colors"
                >
                  WhatsApp
                </a>
              )}
            </div>
          </div>

          {/* Navigation Columns */}
          <div className="md:col-span-2">
            <h4 className="text-[11px] uppercase tracking-[0.25em] text-white font-medium mb-4">
              Collections
            </h4>
            <ul className="space-y-2.5 font-light text-neutral-400">
              <li>
                <button onClick={() => onOpenShop('Jackets')} className="hover:text-white transition-colors">
                  Jackets & Overcoats
                </button>
              </li>
              <li>
                <button onClick={() => onOpenShop('Hoodies')} className="hover:text-white transition-colors">
                  Sculptural Hoodies
                </button>
              </li>
              <li>
                <button onClick={() => onOpenShop('T-Shirts')} className="hover:text-white transition-colors">
                  Architectural Tees
                </button>
              </li>
              <li>
                <button onClick={() => onOpenShop('Perfumes')} className="hover:text-white transition-colors">
                  Noir Extrait Parfum
                </button>
              </li>
              <li>
                <button onClick={() => onOpenShop('Watches')} className="hover:text-white transition-colors">
                  Titanium Horology
                </button>
              </li>
              <li>
                <button onClick={() => onOpenShop('Shoes')} className="hover:text-white transition-colors">
                  Footwear & Boots
                </button>
              </li>
              <li>
                <button onClick={() => onOpenShop('Accessories')} className="hover:text-white transition-colors">
                  Bespoke Leather
                </button>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <h4 className="text-[11px] uppercase tracking-[0.25em] text-white font-medium mb-4">
              Client Care
            </h4>
            <ul className="space-y-2.5 font-light text-neutral-400">
              <li>
                <button onClick={onOpenTracking} className="hover:text-white transition-colors text-left">
                  Track Consignment
                </button>
              </li>
              <li>
                <span className="text-neutral-500 cursor-default">Complimentary Courier</span>
              </li>
              <li>
                <span className="text-neutral-500 cursor-default">Atelier Fittings</span>
              </li>
              <li>
                <span className="text-neutral-500 cursor-default">Authenticity Guarantee</span>
              </li>
              <li>
                <span className="text-neutral-500 cursor-default">Garment Care Manual</span>
              </li>
            </ul>
          </div>

          <div className="md:col-span-3">
            <h4 className="text-[11px] uppercase tracking-[0.25em] text-white font-medium mb-4">
              Atelier Society
            </h4>
            <p className="text-[11px] text-neutral-500 font-light leading-relaxed mb-4">
              Receive private invitations to seasonal salon previews and private archive allocations.
            </p>
            <div className="flex">
              <input
                type="email"
                placeholder="Enter your email"
                className="bg-neutral-900 border border-neutral-800 px-3 py-2 text-white text-xs placeholder-neutral-600 focus:outline-none focus:border-white flex-1"
              />
              <button
                type="button"
                onClick={() => alert('You have been enrolled into the ZHĀR Private Archive Circle.')}
                className="bg-white text-black px-4 text-xs uppercase tracking-widest font-medium hover:bg-neutral-200 transition-colors"
              >
                Join
              </button>
            </div>

            <div className="mt-6 flex flex-col gap-1 text-[11px] text-neutral-500">
              <div>JazzCash & Easypaisa manual transfers verified within 1 hour.</div>
              <div>Nationwide Cash on Delivery available across Pakistan.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Lower Bar: Copyright, Payment Methods, and Admin Link */}
      <div className="border-t border-neutral-900 bg-neutral-950/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-neutral-500">
          <div>
            &copy; 2026 ZHĀR HAUTE ATELIER. All Rights Reserved.
          </div>

          <div className="flex items-center gap-4 text-[10px] font-mono uppercase tracking-wider text-neutral-400">
            <span>COD</span>
            <span aria-hidden="true">·</span>
            <span>JazzCash</span>
            <span aria-hidden="true">·</span>
            <span>Easypaisa</span>
            <span aria-hidden="true">·</span>
            <span>Visa / Mastercard</span>
          </div>

          <div>
            <button
              onClick={onOpenAdmin}
              className="text-neutral-500 hover:text-white transition-colors flex items-center gap-1.5 font-mono text-[11px]"
            >
              <Lock className="w-3 h-3" />
              <span>Owner Access (/admin)</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
