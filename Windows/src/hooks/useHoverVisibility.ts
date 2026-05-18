import { useState, useRef, useCallback } from 'react';

interface UseHoverVisibilityOptions {
  showDelay?: number;
  hideDelay?: number;
}

interface UseHoverVisibilityReturn {
  isVisible: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  show: () => void;
  hide: () => void;
}

export function useHoverVisibility({
  showDelay = 100,
  hideDelay = 400,
}: UseHoverVisibilityOptions = {}): UseHoverVisibilityReturn {
  const [isVisible, setIsVisible] = useState(false);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const onMouseEnter = useCallback(() => {
    clearTimers();
    showTimerRef.current = setTimeout(() => {
      setIsVisible(true);
    }, showDelay);
  }, [showDelay, clearTimers]);

  const onMouseLeave = useCallback(() => {
    clearTimers();
    hideTimerRef.current = setTimeout(() => {
      setIsVisible(false);
    }, hideDelay);
  }, [hideDelay, clearTimers]);

  const show = useCallback(() => {
    clearTimers();
    setIsVisible(true);
  }, [clearTimers]);

  const hide = useCallback(() => {
    clearTimers();
    setIsVisible(false);
  }, [clearTimers]);

  return { isVisible, onMouseEnter, onMouseLeave, show, hide };
}
