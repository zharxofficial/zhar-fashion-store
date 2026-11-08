import React from 'react';

interface ZharLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'wordmark' | 'monogram' | 'full';
  className?: string;
}

export const ZharLogo: React.FC<ZharLogoProps> = ({
  size = 'md',
  variant = 'wordmark',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'text-base tracking-[0.25em]',
    md: 'text-xl tracking-[0.3em]',
    lg: 'text-3xl tracking-[0.35em]',
    xl: 'text-5xl tracking-[0.4em]'
  };

  if (variant === 'monogram') {
    return (
      <div className={`inline-flex items-center justify-center font-serif-luxury select-none ${className}`}>
        <span className="relative font-bold text-white tracking-widest text-xl">
          <span className="inline-block border-b-2 border-white pb-0.5">Z</span>
        </span>
      </div>
    );
  }

  return (
    <div className={`inline-flex flex-col items-center select-none group cursor-pointer ${className}`}>
      <div className="flex items-center">
        {/* ZHĀR Wordmark in uncompromising black and white luxury */}
        <span
          className={`font-serif-luxury font-medium text-white transition-opacity duration-300 uppercase ${sizeClasses[size]}`}
          style={{ fontFamily: "'Bodoni Moda', 'Cinzel', serif" }}
        >
          ZHĀR
        </span>
      </div>
      {variant === 'full' && (
        <span className="text-[9px] tracking-[0.45em] text-neutral-400 font-light uppercase mt-1">
          HAUTE ATELIER
        </span>
      )}
    </div>
  );
};
