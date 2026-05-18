import { useEffect, useState } from 'react';
import { usePetStore } from '../../stores/petStore';
import { useLocale } from '../../locales';
import { useSettingsStore } from '../../stores/settingsStore';
import { getTheme } from '../../styles/themes';
import type { PetPackage } from '../../types/pet';

export default function PetTab() {
  const { t } = useLocale();
  const skin = useSettingsStore((s) => s.skin);
  const theme = getTheme(skin);
  const selectedPetId = usePetStore((s) => s.selectedPetId);
  const selectPet = usePetStore((s) => s.selectPet);
  const petPackages = usePetStore((s) => s.petPackages);
  const loadPackages = usePetStore((s) => s.loadPackages);

  useEffect(() => {
    loadPackages();
  }, [loadPackages]);

  return (
    <div>
      <h2 style={{ fontSize: theme.font.size.lg, marginBottom: 16 }}>
        {t('settings.pet')}
      </h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140, 1fr))',
        gap: 12,
      }}>
        {petPackages.map((pkg) => {
          const isSelected = selectedPetId === pkg.metadata.id;
          return (
            <button
              key={pkg.metadata.id}
              onClick={() => selectPet(pkg.metadata.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: 16,
                borderRadius: theme.border.radius,
                border: isSelected
                  ? `2px solid ${theme.accent.primary}`
                  : `1px solid ${theme.border.color}`,
                background: isSelected ? theme.bg.active : theme.bg.card,
                cursor: 'pointer',
                transition: `all ${theme.transition.fast}`,
                fontFamily: 'inherit',
                color: theme.text.primary,
              }}
            >
              <div style={{
                width: 64,
                height: 64,
                borderRadius: theme.border.radiusSm,
                overflow: 'hidden',
                background: theme.bg.secondary,
                marginBottom: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <img
                  src={`/pets/${pkg.metadata.id}/spritesheet.webp`}
                  alt={pkg.metadata.displayName}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: '0 0',
                  }}
                />
              </div>
              <div style={{
                fontSize: theme.font.size.sm,
                fontWeight: isSelected ? 600 : 400,
                textAlign: 'center',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                width: '100%',
              }}>
                {pkg.metadata.displayName}
              </div>
              {isSelected && (
                <span style={{ fontSize: theme.font.size.xs, color: theme.accent.primary, marginTop: 4 }}>
                  ✓ {t('pet.chosen')}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
