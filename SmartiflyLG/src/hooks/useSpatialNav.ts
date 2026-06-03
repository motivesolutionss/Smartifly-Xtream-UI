import { useEffect, useState } from 'react';

type SpatialNavOptions<T extends string> = {
  enabled?: boolean;
  focusOrder: T[];
  initialFocusId?: T;
  axis?: 'vertical' | 'horizontal';
  onBack?: () => void;
  onEnter?: (focusId: T) => void;
};

export function useSpatialNav<T extends string>({
  enabled = true,
  focusOrder,
  initialFocusId,
  axis = 'vertical',
  onBack,
  onEnter
}: SpatialNavOptions<T>) {
  const [focusId, setFocusId] = useState<T>(() => (initialFocusId ?? focusOrder[0] ?? '') as T);

  useEffect(() => {
    if (initialFocusId) {
      setFocusId(initialFocusId);
      return;
    }

    if (focusOrder.length > 0) {
      setFocusId(focusOrder[0]);
    }
  }, [focusOrder, initialFocusId]);

  useEffect(() => {
    if (!enabled || focusOrder.length === 0) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const currentIndex = focusOrder.indexOf(focusId);

      if (axis === 'vertical' && event.key === 'ArrowDown') {
        event.preventDefault();
        setFocusId(focusOrder[(currentIndex + 1) % focusOrder.length]);
        return;
      }

      if (axis === 'vertical' && event.key === 'ArrowUp') {
        event.preventDefault();
        setFocusId(focusOrder[(currentIndex - 1 + focusOrder.length) % focusOrder.length]);
        return;
      }

      if (axis === 'horizontal' && event.key === 'ArrowRight') {
        event.preventDefault();
        setFocusId(focusOrder[(currentIndex + 1) % focusOrder.length]);
        return;
      }

      if (axis === 'horizontal' && event.key === 'ArrowLeft') {
        event.preventDefault();
        setFocusId(focusOrder[(currentIndex - 1 + focusOrder.length) % focusOrder.length]);
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        onEnter?.(focusId);
        return;
      }

      if (
        event.key === 'Backspace' ||
        event.key === 'Escape' ||
        event.key === 'GoBack' ||
        event.keyCode === 461
      ) {
        event.preventDefault();
        onBack?.();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled, focusId, focusOrder, onBack, onEnter]);

  return {
    focusId,
    setFocusId
  };
}
