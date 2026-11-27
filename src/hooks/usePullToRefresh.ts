'use client';

import { useEffect, useRef, useState } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => void | Promise<unknown>;
  thresholdPx?: number;
  disabled?: boolean;
}

/**
 * Déclenche un rafraîchissement tactile vers le bas lorsque l'utilisateur est en haut de page (mobile/tablette).
 */
export function usePullToRefresh({
  onRefresh,
  thresholdPx = 78,
  disabled = false,
}: UsePullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef<number | null>(null);
  const startXRef = useRef<number | null>(null);
  const pullingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (disabled || typeof window === 'undefined') return;

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY > 2 || refreshing || e.touches.length !== 1) return;
      const touch = e.touches[0];
      startYRef.current = touch.clientY;
      startXRef.current = touch.clientX;
      pullingRef.current = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!pullingRef.current || startYRef.current === null || startXRef.current === null) return;
      if (window.scrollY > 4) {
        pullingRef.current = false;
        setPullDistance(0);
        return;
      }
      const touch = e.touches[0];
      const deltaY = touch.clientY - startYRef.current;
      const deltaX = Math.abs(touch.clientX - startXRef.current);

      if (deltaY > 10 && deltaY > deltaX * 1.4) {
        setPullDistance(Math.min(deltaY * 0.55, thresholdPx + 24));
      } else if (deltaY < -5) {
        pullingRef.current = false;
        setPullDistance(0);
      }
    };

    const handleTouchEnd = async () => {
      if (!pullingRef.current) return;
      pullingRef.current = false;
      const triggered = pullDistance >= thresholdPx * 0.65;
      startYRef.current = null;
      startXRef.current = null;
      setPullDistance(0);

      if (triggered && !refreshing) {
        setRefreshing(true);
        try {
          await onRefreshRef.current();
        } finally {
          setTimeout(() => setRefreshing(false), 450);
        }
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [disabled, pullDistance, refreshing, thresholdPx]);

  return { pullDistance, refreshing };
}
