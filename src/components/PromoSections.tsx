import React from 'react';
import { StoreSettings } from '../types/index.ts';

/** Owner-managed homepage banner, promo block and contact strip (edited in Admin > Content). Renders nothing when empty. */
export const PromoSections: React.FC<{ settings: StoreSettings }> = ({ settings }) => {
  const b = settings.homepageBanner, p = settings.promo, c = settings.contact;
  const hasContact = c && (c.email || c.phone || c.address);
  return (
    <>
      {b && (b.imageUrl || b.title) && (
        <section className="relative w-full h-[50vh] min-h-[260px] overflow-hidden border-y border-neutral-900">
          {b.imageUrl && <img src={b.imageUrl} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-60" />}
          <div className="relative h-full flex flex-col items-center justify-center text-center px-6">
            {b.title && <h2 className="text-3xl md:text-5xl font-serif-luxury uppercase tracking-[0.2em]">{b.title}</h2>}
            {b.subtitle && <p className="mt-3 text-xs md:text-sm tracking-[0.25em] uppercase text-neutral-300">{b.subtitle}</p>}
          </div>
        </section>
      )}
      {p && (p.imageUrl || p.title || p.text) && (
        <section className="max-w-6xl mx-auto w-full px-6 py-16 grid md:grid-cols-2 gap-10 items-center">
          {p.imageUrl && <img src={p.imageUrl} alt="" loading="lazy" className="w-full aspect-[4/5] object-cover bg-neutral-900" />}
          <div className={p.imageUrl ? '' : 'md:col-span-2 text-center'}>
            {p.title && <h3 className="text-2xl md:text-3xl font-serif-luxury uppercase tracking-[0.2em] mb-4">{p.title}</h3>}
            {p.text && <p className="text-sm text-neutral-400 leading-relaxed whitespace-pre-line">{p.text}</p>}
          </div>
        </section>
      )}
      {hasContact && (
        <section className="border-t border-neutral-900 py-6 px-6 text-center text-[11px] uppercase tracking-[0.2em] text-neutral-400 flex flex-wrap justify-center gap-x-8 gap-y-2">
          {c!.email && <a href={`mailto:${c!.email}`} className="hover:text-white">{c!.email}</a>}
          {c!.phone && <a href={`tel:${c!.phone.replace(/[^\d+]/g, '')}`} className="hover:text-white">{c!.phone}</a>}
          {c!.address && <span>{c!.address}</span>}
        </section>
      )}
    </>
  );
};
