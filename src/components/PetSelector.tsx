import { useState, useEffect } from 'react'
import type { PetMetadata } from '../types/pet'

interface PetSelectorProps {
  pets: PetMetadata[]
  selectedPetId: string
  onSelect: (pet: PetMetadata) => void
  onClose: () => void
}

export function PetSelector({ pets, selectedPetId, onSelect, onClose }: PetSelectorProps) {
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({})

  useEffect(() => {
    pets.forEach(async (pet) => {
      const dataUrl = await window.electronAPI.getSpritesheetBase64(
        pet.folderPath,
        pet.spritesheetPath,
      )
      if (dataUrl) {
        setThumbnails((prev) => ({ ...prev, [pet.id]: dataUrl }))
      }
    })
  }, [pets])

  return (
    <div className="pet-selector-overlay" onClick={onClose}>
      <div className="pet-selector" onClick={(e) => e.stopPropagation()}>
        <div className="pet-selector-header">
          <span>选择宠物</span>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="pet-grid">
          {pets.map((pet) => (
            <button
              key={pet.id}
              className={`pet-card ${pet.id === selectedPetId ? 'selected' : ''}`}
              onClick={() => onSelect(pet)}
            >
              <div className="pet-thumb">
                {thumbnails[pet.id] ? (
                  <img
                    src={thumbnails[pet.id]}
                    alt={pet.displayName}
                    style={{ imageRendering: 'pixelated', objectFit: 'cover', objectPosition: '0 0' }}
                  />
                ) : (
                  <span>🐾</span>
                )}
              </div>
              <div className="pet-name">{pet.displayName}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
