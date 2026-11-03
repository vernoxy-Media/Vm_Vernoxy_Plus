import { useCallback, useRef, useState } from 'react';

const CLOSE_DISTANCE = 110; // px dragged down that closes the sheet
const CLOSE_VELOCITY = 0.6; // px per ms: a quick flick closes it too

/**
 * Swipe-down-to-close for a bottom sheet (phones only).
 * Put `handlers` on the grab handle / header; put `panelStyle` on the sheet and `backdropOpacity` on the backdrop.
 */
export function useSheetDrag(onClose: () => void) {
  const [dy, setDy] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ y: number; t: number } | null>(null);
  const last = useRef({ y: 0, t: 0 });

  const isPhone = () => typeof window !== 'undefined' && !window.matchMedia('(min-width: 640px)').matches;

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (!isPhone()) return;
    if ((e.target as HTMLElement).closest('button, a, input, select, textarea')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { y: e.clientY, t: performance.now() };
    last.current = { y: e.clientY, t: performance.now() };
    setDragging(true);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!start.current) return;
    last.current = { y: e.clientY, t: performance.now() };
    // Only downwards; a little resistance is not needed because the sheet cannot go above its place.
    setDy(Math.max(0, e.clientY - start.current.y));
  }, []);

  const end = useCallback(
    (e: React.PointerEvent) => {
      if (!start.current) return;
      const dist = Math.max(0, e.clientY - start.current.y);
      const dt = Math.max(1, performance.now() - start.current.t);
      const velocity = dist / dt;
      start.current = null;
      setDragging(false);
      if (dist > CLOSE_DISTANCE || velocity > CLOSE_VELOCITY) {
        setDy(window.innerHeight); // finish the slide off the screen, then close
        window.setTimeout(() => {
          onClose();
          setDy(0);
        }, 160);
      } else {
        setDy(0); // snap back
      }
    },
    [onClose],
  );

  return {
    handlers: { onPointerDown, onPointerMove, onPointerUp: end, onPointerCancel: end },
    panelStyle: {
      transform: dy ? `translateY(${dy}px)` : undefined,
      transition: dragging ? 'none' : 'transform 160ms ease-out',
    } as React.CSSProperties,
    /** 1 when untouched, fading to 0.25 as the sheet is pulled away. */
    backdropOpacity: Math.max(0.25, 1 - dy / 420),
    dragging,
  };
}
