import { useRef, useCallback, useState, useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';

interface UseDragOptions {
  enabled?: boolean;
}

interface UseDragReturn {
  isDragging: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
}

export function useDrag({ enabled = true }: UseDragOptions = {}): UseDragReturn {
  const [isDragging, setIsDragging] = useState(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const windowPosRef = useRef<{ x: number; y: number } | null>(null);
  const draggingRef = useRef(false);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled) return;
      // Only handle primary button
      if (e.button !== 0) return;

      startPosRef.current = { x: e.screenX, y: e.screenY };
      draggingRef.current = false;

      const appWindow = getCurrentWindow();

      // Get the current window position
      appWindow
        .outerPosition()
        .then((pos) => {
          windowPosRef.current = { x: pos.x, y: pos.y };
        })
        .catch(() => {
          windowPosRef.current = null;
        });

      const onPointerMove = (ev: PointerEvent) => {
        if (!startPosRef.current || !windowPosRef.current) return;

        const dx = ev.screenX - startPosRef.current.x;
        const dy = ev.screenY - startPosRef.current.y;

        // Only start dragging after a small threshold
        if (!draggingRef.current && Math.abs(dx) + Math.abs(dy) < 4) return;

        draggingRef.current = true;
        setIsDragging(true);

        const newX = windowPosRef.current.x + dx;
        const newY = windowPosRef.current.y + dy;

        appWindow
          .setPosition({ type: 'Physical', x: Math.round(newX), y: Math.round(newY) })
          .catch(() => {
            // Silently ignore position errors
          });
      };

      const onPointerUp = () => {
        startPosRef.current = null;
        windowPosRef.current = null;
        draggingRef.current = false;
        setIsDragging(false);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    },
    [enabled]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setIsDragging(false);
    };
  }, []);

  return { isDragging, onPointerDown };
}
