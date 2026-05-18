import { useRef, useEffect, useState, useCallback } from 'react';
import { PetAction } from '../types/pet';
import type { PetSpritesheetGrid } from '../types/pet';

interface UsePetAnimationOptions {
  spritesheetUrl: string;
  grid: PetSpritesheetGrid;
  action: PetAction;
  frameInterval?: number;
  canvasWidth?: number;
  canvasHeight?: number;
}

interface UsePetAnimationReturn {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  currentFrame: number;
  isLoaded: boolean;
  setAction: (action: PetAction) => void;
}

const DEFAULT_FRAME_INTERVAL = 160;

export function usePetAnimation({
  spritesheetUrl,
  grid,
  action,
  frameInterval = DEFAULT_FRAME_INTERVAL,
  canvasWidth = 112,
  canvasHeight = 112,
}: UsePetAnimationOptions): UsePetAnimationReturn {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentAction, setCurrentAction] = useState<PetAction>(action);

  // Sync external action prop
  useEffect(() => {
    setCurrentAction(action);
    setCurrentFrame(0);
  }, [action]);

  // Load spritesheet image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      setIsLoaded(true);
    };
    img.onerror = () => {
      console.warn('Failed to load spritesheet:', spritesheetUrl);
      setIsLoaded(false);
    };
    img.src = spritesheetUrl;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [spritesheetUrl]);

  // Compute source rectangle for the current frame
  const getSourceRect = useCallback(
    (frameIndex: number) => {
      const actionIndex = currentAction as number;
      // Calculate the starting row for this action
      let startRow = 0;
      for (let i = 0; i < actionIndex; i++) {
        const framesForAction = grid.framesPerAction[i] ?? 1;
        startRow += Math.ceil(framesForAction / grid.columns);
      }

      const col = frameIndex % grid.columns;
      const rowOffset = Math.floor(frameIndex / grid.columns);
      const row = startRow + rowOffset;

      return {
        sx: col * grid.frameWidth,
        sy: row * grid.frameHeight,
        sw: grid.frameWidth,
        sh: grid.frameHeight,
      };
    },
    [currentAction, grid]
  );

  // Draw current frame to canvas
  const drawFrame = useCallback(
    (frameIndex: number) => {
      const canvas = canvasRef.current;
      const img = imageRef.current;
      if (!canvas || !img) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      ctx.imageSmoothingEnabled = false;

      const { sx, sy, sw, sh } = getSourceRect(frameIndex);
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvasWidth, canvasHeight);
    },
    [canvasWidth, canvasHeight, getSourceRect]
  );

  // Animation loop
  useEffect(() => {
    if (!isLoaded) return;

    const totalFrames =
      grid.framesPerAction[currentAction as number] ?? 1;

    // Draw initial frame
    drawFrame(0);
    setCurrentFrame(0);
    animFrameRef.current = 0;

    if (totalFrames <= 1) return;

    timerRef.current = setInterval(() => {
      animFrameRef.current = (animFrameRef.current + 1) % totalFrames;
      setCurrentFrame(animFrameRef.current);
      drawFrame(animFrameRef.current);
    }, frameInterval);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isLoaded, currentAction, frameInterval, grid, drawFrame]);

  const setAction = useCallback((newAction: PetAction) => {
    setCurrentAction(newAction);
    setCurrentFrame(0);
    animFrameRef.current = 0;
  }, []);

  return {
    canvasRef,
    currentFrame,
    isLoaded,
    setAction,
  };
}
