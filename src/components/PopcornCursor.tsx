import { useEffect, useRef, useState } from 'react';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';

export const PopcornCursor = () => {
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const rawThinking = isFetching > 0 || isMutating > 0;

  const [forcedThinking, setForcedThinking] = useState(false);
  const [active, setActive] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [visible, setVisible] = useState(false);
  const minTimerRef = useRef<number | null>(null);

  // Global listeners and debug trigger
  useEffect(() => {
    const handleThinking = (e: Event) => {
      const custom = e as CustomEvent<boolean>;
      setForcedThinking(Boolean(custom.detail));
    };

    window.addEventListener('moviebox:thinking', handleThinking as EventListener);
    (window as unknown as { movieboxThinking: (val: boolean) => void }).movieboxThinking = (val: boolean) => {
      setForcedThinking(Boolean(val));
    };

    return () => {
      window.removeEventListener('moviebox:thinking', handleThinking as EventListener);
      delete (window as unknown as { movieboxThinking?: (val: boolean) => void }).movieboxThinking;
    };
  }, []);

  // Ensure thinking cursor stays visible for a minimum duration to avoid flickering on fast requests
  useEffect(() => {
    const thinking = rawThinking || forcedThinking;
    if (thinking) {
      setActive(true);
      if (minTimerRef.current) {
        clearTimeout(minTimerRef.current);
        minTimerRef.current = null;
      }
    } else if (active) {
      minTimerRef.current = window.setTimeout(() => {
        setActive(false);
        minTimerRef.current = null;
      }, 650);
    }
    return () => {
      if (minTimerRef.current) {
        clearTimeout(minTimerRef.current);
      }
    };
  }, [rawThinking, forcedThinking, active]);

  // Track mouse position
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
      if (!visible) setVisible(true);
    };

    const handleMouseLeave = () => setVisible(false);
    const handleMouseEnter = () => setVisible(true);

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [visible]);

  // Toggle html class to hide default cursor when thinking
  useEffect(() => {
    if (active) {
      document.documentElement.classList.add('cursor-thinking');
      return () => {
        document.documentElement.classList.remove('cursor-thinking');
      };
    }
  }, [active]);

  // Do not render on touch-only devices
  const isTouch = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  if (isTouch || !active || !visible || !pos) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed z-[999999] select-none transition-opacity duration-150"
      style={{
        left: 0,
        top: 0,
        transform: `translate3d(${pos.x - 4}px, ${pos.y - 6}px, 0)`,
        willChange: 'transform',
      }}
      aria-hidden="true"
    >
      <div className="relative h-12 w-10 origin-top-left scale-[1.28]">
        {/* Animated Popcorn Kernels jumping out */}
        <div className="absolute inset-0 overflow-visible">
          {/* Palomita 1 (Izquierda) */}
          <div className="popcorn-kernel popcorn-kernel-1 absolute left-2 top-4">
            <svg viewBox="0 0 10 10" className="h-3 w-3 drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]">
              <path
                d="M5,2 C3.5,0.5 1,1.5 1,3.5 C-0.5,5 0.5,8 2.5,8 C3.5,9.5 6.5,9.5 7.5,8 C9.5,8 10.5,5 9,3.5 C9,1.5 6.5,0.5 5,2 Z"
                fill="#FFFDE7"
                stroke="#F59E0B"
                strokeWidth="0.6"
              />
              <circle cx="5" cy="5" r="1.8" fill="#FCD34D" opacity="0.9" />
            </svg>
          </div>

          {/* Palomita 2 (Centro alta) */}
          <div className="popcorn-kernel popcorn-kernel-2 absolute left-4 top-3">
            <svg viewBox="0 0 10 10" className="h-3.5 w-3.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]">
              <path
                d="M5,2 C3.5,0.5 1,1.5 1,3.5 C-0.5,5 0.5,8 2.5,8 C3.5,9.5 6.5,9.5 7.5,8 C9.5,8 10.5,5 9,3.5 C9,1.5 6.5,0.5 5,2 Z"
                fill="#FFFFFF"
                stroke="#F59E0B"
                strokeWidth="0.6"
              />
              <circle cx="4.5" cy="5.2" r="2" fill="#FDE047" opacity="0.95" />
            </svg>
          </div>

          {/* Palomita 3 (Derecha) */}
          <div className="popcorn-kernel popcorn-kernel-3 absolute left-6 top-4">
            <svg viewBox="0 0 10 10" className="h-3 w-3 drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]">
              <path
                d="M5,2 C3.5,0.5 1,1.5 1,3.5 C-0.5,5 0.5,8 2.5,8 C3.5,9.5 6.5,9.5 7.5,8 C9.5,8 10.5,5 9,3.5 C9,1.5 6.5,0.5 5,2 Z"
                fill="#FFFDE7"
                stroke="#D97706"
                strokeWidth="0.6"
              />
              <circle cx="5.2" cy="4.8" r="1.7" fill="#FBBF24" opacity="0.9" />
            </svg>
          </div>

          {/* Palomita 4 (Centro-derecha rápida) */}
          <div className="popcorn-kernel popcorn-kernel-4 absolute left-3.5 top-4">
            <svg viewBox="0 0 10 10" className="h-2.5 w-2.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]">
              <path
                d="M5,2 C3.5,0.5 1,1.5 1,3.5 C-0.5,5 0.5,8 2.5,8 C3.5,9.5 6.5,9.5 7.5,8 C9.5,8 10.5,5 9,3.5 C9,1.5 6.5,0.5 5,2 Z"
                fill="#FFFFFF"
                stroke="#F59E0B"
                strokeWidth="0.6"
              />
              <circle cx="5" cy="5" r="1.5" fill="#FCD34D" opacity="0.9" />
            </svg>
          </div>
        </div>

        {/* El Bote / Cubo de Palomitas */}
        <div className="popcorn-bucket-body absolute left-0 top-3 filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.35)]">
          <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
            {/* Popcorn fluffy base inside the bucket rim */}
            <circle cx="10" cy="11" r="3.5" fill="#FFFDE7" stroke="#F59E0B" strokeWidth="0.5" />
            <circle cx="15" cy="9.5" r="4.2" fill="#FFFFFF" stroke="#F59E0B" strokeWidth="0.5" />
            <circle cx="21" cy="9.5" r="4" fill="#FEF08A" stroke="#F59E0B" strokeWidth="0.5" />
            <circle cx="26" cy="11" r="3.5" fill="#FFFDE7" stroke="#F59E0B" strokeWidth="0.5" />
            <circle cx="13" cy="11.5" r="3" fill="#FDE047" opacity="0.8" />
            <circle cx="19" cy="11.5" r="3.2" fill="#FDE047" opacity="0.8" />

            {/* Rim of the popcorn tub */}
            <rect x="5" y="12" width="24" height="3.5" rx="1.75" fill="#EF5544" stroke="#B91C1C" strokeWidth="0.75" />

            {/* Tub trapezoid background */}
            <path
              d="M7 15 L10 32 C10.2 32.8 10.8 33 11.5 33 L22.5 33 C23.2 33 23.8 32.8 24 32 L27 15 Z"
              fill="#FFFFFF"
              stroke="#B91C1C"
              strokeWidth="0.75"
            />

            {/* Red vertical stripes */}
            <path
              d="M7 15 L10 32 L13 32 L11.5 15 Z"
              fill="#EF5544"
            />
            <path
              d="M15.5 15 L16 32 L18 32 L18.5 15 Z"
              fill="#EF5544"
            />
            <path
              d="M22.5 15 L21 32 L24 32 L27 15 Z"
              fill="#EF5544"
            />

            {/* Gloss / shadow highlight */}
            <path
              d="M8.5 16 L10.8 31 C10.9 31.5 11.2 31.8 11.6 31.8 L12.5 31.8 L10.2 16 Z"
              fill="#FFFFFF"
              opacity="0.35"
            />
          </svg>
        </div>

        {/* Small subtle cursor pointer at top-left hotspot */}
        <svg
          className="absolute -left-1 -top-1 h-3.5 w-3.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
          viewBox="0 0 12 12"
          fill="none"
        >
          <path
            d="M1 1 L1 10 L3.8 7.5 L6.5 11 L8 10 L5.2 6.5 L9 6.5 Z"
            fill="#FFFFFF"
            stroke="#1E293B"
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
};
