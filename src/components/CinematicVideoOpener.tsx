import React, { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX, ArrowRight, Play } from 'lucide-react';
import { ZharLogo } from './ZharLogo.tsx';

interface CinematicVideoOpenerProps {
  onComplete: () => void;
  videoUrl?: string;
  title?: string;
  subtitle?: string;
  buttonText?: string;
}

export const CinematicVideoOpener: React.FC<CinematicVideoOpenerProps> = ({
  onComplete,
  videoUrl = '/videos/zhar_fashion_film.mp4',
  title = 'THE MONOCHROME MANIFESTO',
  subtitle = 'ÉDITION NOIR 2026 // HAUTE ATELIER',
  buttonText = 'Enter Atelier'
}) => {
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [hasVideoError, setHasVideoError] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // If video fails or isn't available, run fallback progressive timer
    if (hasVideoError || !videoUrl) {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            onComplete();
            return 100;
          }
          return prev + 1.5;
        });
      }, 100);
      return () => clearInterval(interval);
    }

    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (video.duration && !isNaN(video.duration)) {
        setProgress((video.currentTime / video.duration) * 100);
      }
    };

    const handleEnded = () => {
      onComplete();
    };

    const handleError = () => {
      setHasVideoError(true);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);

    // Attempt autoplay safely
    try {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsVideoLoaded(true);
            setHasStarted(true);
          })
          .catch(() => {
            // Browser prevented autoplay without interaction
            setIsVideoLoaded(true);
          });
      }
    } catch {
      setIsVideoLoaded(true);
    }

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
    };
  }, [hasVideoError, videoUrl, onComplete]);

  const toggleSound = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleManualPlay = () => {
    if (videoRef.current) {
      videoRef.current
        .play()
        .then(() => setHasStarted(true))
        .catch(() => setHasStarted(true));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between overflow-hidden select-none transition-opacity duration-1000">
      {/* Visual Background (Video with Resilient Fallback) */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        {!hasVideoError && videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            autoPlay
            muted={isMuted}
            playsInline
            loop={false}
            onError={() => setHasVideoError(true)}
            onLoadedData={() => setIsVideoLoaded(true)}
            className="w-full h-full object-cover filter grayscale contrast-125 brightness-90 transition-opacity duration-700"
          />
        ) : (
          /* High-Fashion Animated Cinematic Fallback */
          <div className="relative w-full h-full overflow-hidden">
            <img
              src="/images/zhar_luxury_jacket_1794080538698.jpg"
              alt="ZHĀR Campaign"
              className="w-full h-full object-cover filter grayscale contrast-125 brightness-50 scale-105 animate-pulse"
              style={{ animationDuration: '8s' }}
            />
          </div>
        )}

        {/* Cinematic Scrims */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/60 pointer-events-none" />
        <div className="absolute inset-0 bg-black/20 pointer-events-none film-grain" />
      </div>

      {/* Top Header in Video Screen */}
      <div className="relative z-10 flex items-center justify-between px-6 md:px-12 py-8">
        <ZharLogo size="md" variant="full" />

        <div className="flex items-center gap-4">
          {!hasVideoError && (
            <button
              onClick={toggleSound}
              className="flex items-center gap-2 text-xs uppercase tracking-widest text-neutral-400 hover:text-white transition-colors duration-200 px-3 py-1.5 border border-white/20 hover:border-white/50 backdrop-blur-md"
              aria-label={isMuted ? 'Unmute video' : 'Mute video'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isMuted ? 'Muted' : 'Sound On'}</span>
            </button>
          )}

          <button
            onClick={onComplete}
            className="group flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-white bg-white/10 hover:bg-white text-white hover:text-black transition-all duration-300 px-5 py-2 border border-white/40 hover:border-white backdrop-blur-md"
          >
            <span>{buttonText}</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-300" />
          </button>
        </div>
      </div>

      {/* Center Cinematic Typography */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center my-auto">
        <p className="text-[11px] md:text-xs tracking-[0.4em] uppercase text-neutral-400 mb-4 font-light">
          {subtitle}
        </p>

        <h1 className="text-3xl sm:text-5xl md:text-7xl font-serif-luxury tracking-tight text-white mb-6 font-normal uppercase leading-tight">
          {title}
        </h1>

        <div className="w-12 h-[1px] bg-white/60 mx-auto my-6" />

        <p className="text-xs md:text-sm text-neutral-300 font-light tracking-wide max-w-lg mx-auto leading-relaxed">
          The convergence of uncompromising minimalism, architectural tailoring, and rare artisanal materiality.
        </p>

        {!hasStarted && isVideoLoaded && !hasVideoError && (
          <button
            onClick={handleManualPlay}
            className="mt-8 inline-flex items-center gap-3 px-6 py-2.5 bg-white text-black text-xs uppercase tracking-widest hover:bg-neutral-200 transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Play Film</span>
          </button>
        )}
      </div>

      {/* Bottom Progress & Skip Bar */}
      <div className="relative z-10 px-6 md:px-12 py-8 flex flex-col gap-4">
        <div className="flex items-center justify-between text-[10px] tracking-[0.3em] uppercase text-neutral-400">
          <span>ATELIER ARCHIVE // 00:0{Math.floor(progress / 10)}</span>
          <button
            onClick={onComplete}
            className="underline underline-offset-4 hover:text-white transition-colors"
          >
            SKIP INTRODUCTION
          </button>
        </div>

        {/* Video progress indicator line */}
        <div className="w-full bg-white/10 h-[2px] overflow-hidden">
          <div
            className="bg-white h-full transition-all duration-200"
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
      </div>
    </div>
  );
};
