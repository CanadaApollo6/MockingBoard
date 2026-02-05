import { useEffect, useRef, useCallback } from 'react';

export function useClickOutside<T extends HTMLElement>(handler: () => void) {
  const ref = useRef<T>(null);
  const stableHandler = useCallback(handler, [handler]);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        stableHandler();
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') stableHandler();
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [stableHandler]);

  return ref;
}
