import { PET_ACTIONS, ACTION_EMOJIS } from '../types/pet'

interface ActionBarProps {
  currentAction: number
  onPreviewAction: (index: number) => void
}

export function ActionBar({ currentAction, onPreviewAction }: ActionBarProps) {
  return (
    <div className="action-bar">
      {PET_ACTIONS.map((action, index) => (
        <button
          key={action}
          className={`action-btn ${currentAction === index ? 'active' : ''}`}
          onClick={() => onPreviewAction(index)}
          title={action}
        >
          {ACTION_EMOJIS[action]}
        </button>
      ))}
    </div>
  )
}
