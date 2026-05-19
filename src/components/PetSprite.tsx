import { useEffect, useRef } from 'react'
import type { PetMetadata } from '../types/pet'
import { usePetAnimation } from '../hooks/usePetAnimation'

interface PetSpriteProps {
  pet: PetMetadata | null
  action: number
}

export function PetSprite({ pet, action }: PetSpriteProps) {
  const { canvasRef, setAction, isLoaded } = usePetAnimation(pet)
  const prevAction = useRef(action)

  useEffect(() => {
    setAction(action)
    prevAction.current = action
  }, [action, setAction])

  return (
    <div className="pet-sprite-container">
      <div className="pet-canvas-wrapper">
        {isLoaded ? (
          <canvas ref={canvasRef as React.RefObject<HTMLCanvasElement>} className="pet-canvas" />
        ) : (
          <div className="pet-loading">
            <span className="loading-icon">🐾</span>
          </div>
        )}
      </div>
    </div>
  )
}
