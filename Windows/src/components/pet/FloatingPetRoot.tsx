import { useState, useEffect, useCallback } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import { useAppStore } from '../../stores/appStore';
import { usePetStore } from '../../stores/petStore';
import { useCommandStore } from '../../stores/commandStore';
import { useChatStore } from '../../stores/chatStore';
import { getTheme } from '../../styles/themes';
import { PetSprite } from './PetSprite';
import { ToolBar } from './ToolBar';
import { CommandPanel } from './CommandPanel';
import { QuotaCards } from './QuotaCards';
import { StickyPreview } from './StickyPreview';
import { ChatOverlay } from '../chat/ChatOverlay';
import { useHoverVisibility } from '../../hooks/useHoverVisibility';
import { PetAction } from '../../types/pet';
import type { ChatProvider } from '../../types/chat';

const DEFAULT_GRID = {
  actions: 9,
  framesPerAction: [6, 6, 6, 6, 6, 6, 6, 6, 6],
  frameWidth: 64,
  frameHeight: 64,
  columns: 6,
};

export default function FloatingPetRoot() {
  const skin = useSettingsStore((s) => s.skin);
  const setSkin = useSettingsStore((s) => s.setSkin);
  const theme = getTheme(skin);

  const chatIsOpen = useAppStore((s) => s.chatIsOpen);
  const toggleChat = useAppStore((s) => s.toggleChat);
  const agentState = useAppStore((s) => s.agentState);
  const terminalPreview = useAppStore((s) => s.terminalPreview);
  const quotas = useAppStore((s) => s.quotas);
  const pomodoro = useAppStore((s) => s.pomodoro);
  const startPomodoro = useAppStore((s) => s.startPomodoro);
  const pausePomodoro = useAppStore((s) => s.pausePomodoro);

  const selectedPetId = usePetStore((s) => s.selectedPetId);
  const currentAction = usePetStore((s) => s.currentAction);
  const loadPackages = usePetStore((s) => s.loadPackages);

  const commands = useCommandStore((s) => s.commands);
  const pinnedIds = useCommandStore((s) => s.pinnedIds);
  const togglePin = useCommandStore((s) => s.togglePin);

  const messages = useChatStore((s) => s.messages);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const modelConfig = useChatStore((s) => s.modelConfig);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const setModelConfig = useChatStore((s) => s.setModelConfig);

  const { isVisible: toolsVisible } = useHoverVisibility(300);
  const [showCommands, setShowCommands] = useState(false);
  const [showQuotas, setShowQuotas] = useState(true);
  const [showPreview, setShowPreview] = useState(true);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', skin);
    loadPackages();
  }, [skin, loadPackages]);

  const spritesheetUrl = selectedPetId
    ? `/pets/${selectedPetId}/spritesheet.webp`
    : '/pets/mochi/spritesheet.webp';

  const handleSkinCycle = useCallback(() => {
    const skins = ['glass', 'dark', 'pixel'] as const;
    const idx = skins.indexOf(skin);
    setSkin(skins[(idx + 1) % skins.length]);
  }, [skin, setSkin]);

  const handlePomodoro = useCallback(() => {
    if (pomodoro.status === 'running') {
      pausePomodoro();
    } else {
      startPomodoro();
    }
  }, [pomodoro.status, pausePomodoro, startPomodoro]);

  const noop = useCallback(() => {}, []);

  return (
    <div
      style={{
        width: 398,
        height: 760,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: theme.font.body,
        color: theme.text.primary,
        overflow: 'hidden',
        position: 'relative',
        userSelect: 'none',
      }}
      data-tauri-drag-region
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: 16,
          position: 'relative',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div style={{ width: 112, height: 112 }}>
          <PetSprite
            spritesheetUrl={spritesheetUrl}
            grid={DEFAULT_GRID}
            action={currentAction}
            size={112}
          />
        </div>
        <div
          style={{
            opacity: hovered ? 1 : 0,
            transform: hovered ? 'translateY(0)' : 'translateY(-8px)',
            transition: `opacity ${theme.transition.normal}, transform ${theme.transition.normal}`,
            pointerEvents: hovered ? 'auto' : 'none',
            marginTop: 8,
          }}
        >
          <ToolBar
            visible={hovered}
            onTerminal={noop}
            onFolder={noop}
            onChat={toggleChat}
            onAppearance={handleSkinCycle}
            onPomodoro={handlePomodoro}
            onQuota={() => setShowQuotas(!showQuotas)}
            onCommand={() => setShowCommands(!showCommands)}
            onPreview={() => setShowPreview(!showPreview)}
            onSettings={noop}
          />
        </div>
      </div>

      <div
        style={{
          flex: 1,
          width: '100%',
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '8px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <StickyPreview
          terminal={terminalPreview}
          agentState={agentState}
          visible={showPreview}
        />
        <QuotaCards quotas={quotas} visible={showQuotas} />
        <CommandPanel
          commands={commands}
          pinnedIds={pinnedIds}
          visible={showCommands}
          onExecute={noop}
          onPin={togglePin}
          onUnpin={togglePin}
          onAdd={noop}
          onReorder={noop}
        />
      </div>

      {chatIsOpen && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 100,
          }}
        >
          <ChatOverlay
            open={chatIsOpen}
            messages={messages}
            isStreaming={isStreaming}
            currentProvider={modelConfig.provider}
            currentModel={modelConfig.model}
            onSend={sendMessage}
            onClose={toggleChat}
            onChangeModel={(provider: ChatProvider, model: string) =>
              setModelConfig({ provider, model })
            }
          />
        </div>
      )}
    </div>
  );
}
