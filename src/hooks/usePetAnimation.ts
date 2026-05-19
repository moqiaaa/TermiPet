import { useState, useEffect, useRef, useCallback } from 'react'
import {
  type PetMetadata,
  type SpritesheetGrid,
  inferSpritesheetGrid,
  getValidFrameCount,
} from '../types/pet'

const FRAME_DURATION = 160

interface UsePetAnimationResult {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  currentAction: number
  setAction: (action: number) => void
  grid: SpritesheetGrid | null
  isLoaded: boolean
}

export function usePetAnimation(pet: PetMetadata | null): UsePetAnimationResult {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [currentAction, setCurrentAction] = useState(0)
  const [grid, setGrid] = useState<SpritesheetGrid | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  const imageRef = useRef<HTMLImageElement | null>(null)
  const frameIndexRef = useRef(0)
  const animationRef = useRef<number | null>(null)
  const lastFrameTimeRef = useRef(0)

  useEffect(() => {
    if (!pet) {
      setIsLoaded(false)
      setGrid(null)
      return
    }

    let cancelled = false
    setIsLoaded(false)

    window.electronAPI
      .getSpritesheetBase64(pet.folderPath, pet.spritesheetPath)
      .then((dataUrl) => {
        if (cancelled || !dataUrl) return

        const img = new Image()
        img.onload = () => {
          if (cancelled) return
          imageRef.current = img
          const g = inferSpritesheetGrid(img.naturalWidth, img.naturalHeight)
          setGrid(g)
          setIsLoaded(true)
        }
        img.src = dataUrl
      })

    return () => {
      cancelled = true
    }
  }, [pet?.id, pet?.folderPath])

  useEffect(() => {
    frameIndexRef.current = 0
    lastFrameTimeRef.current = 0
  }, [currentAction])

  const render = useCallback(
    (timestamp: number) => {
      const canvas = canvasRef.current
      const img = imageRef.current
      const g = grid
      if (!canvas || !img || !g) {
        animationRef.current = requestAnimationFrame(render)
        return
      }

      if (timestamp - lastFrameTimeRef.current >= FRAME_DURATION) {
        lastFrameTimeRef.current = timestamp

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          animationRef.current = requestAnimationFrame(render)
          return
        }

        const action = Math.min(Math.max(currentAction, 0), g.actionCount - 1)
        const validFrames = getValidFrameCount(g, action)
        const frame = frameIndexRef.current % validFrames

        const sx = frame * g.frameWidth
        const sy = action * g.frameHeight

        canvas.width = g.frameWidth
        canvas.height = g.frameHeight

        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(
          img,
          sx,
          sy,
          g.frameWidth,
          g.frameHeight,
          0,
          0,
          g.frameWidth,
          g.frameHeight,
        )

        frameIndexRef.current = (frame + 1) % validFrames
      }

      animationRef.current = requestAnimationFrame(render)
    },
    [grid, currentAction],
  )

  useEffect(() => {
    if (!isLoaded) return

    animationRef.current = requestAnimationFrame(render)
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isLoaded, render])

  return {
    canvasRef,
    currentAction,
    setAction: setCurrentAction,
    grid,
    isLoaded,
  }
}
