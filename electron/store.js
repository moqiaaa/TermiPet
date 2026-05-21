const Store = require('electron-store')

const store = new Store({
  defaults: {
    floatBall: { edge: 'right', y: 0.5 },
    alicloud: { speechKey: '', chatKey: '' },
    scenes: [
      {
        id: 'builtin-meeting',
        name: '通用会议',
        summaryPrompt: '请对以下录音内容进行整理，生成结构化会议纪要，包含：主要议题、讨论内容、结论和决策。',
        todoPrompt: '请从以下录音内容中提取所有待办事项和行动项，以清单形式列出，标注负责人（如有提及）。'
      },
      {
        id: 'builtin-todo',
        name: '待办提取',
        summaryPrompt: '请对以下录音内容进行整理，提取关键信息和要点。',
        todoPrompt: '请从以下录音内容中提取所有待办事项，以清单形式列出，每项包含具体的行动描述和截止时间（如有提及）。'
      }
    ],
    defaultSceneId: 'builtin-meeting',
    projects: [
      { id: 'inbox', name: '收件箱', color: '#d0d0d0', createdAt: 0 }
    ],
    todos: [],
    modeShortcutConfig: {
      activeModeId: 'assistant',
      modes: [
        { id: 'assistant', name: '助手', icon: '💬', color: '#7c6ef0', order: 0, enabled: true },
        { id: 'todo', name: '待办', icon: '✅', color: '#29c487', order: 1, enabled: true },
        { id: 'recording', name: '录音', icon: '🎙', color: '#f06292', order: 2, enabled: true },
        { id: 'stock', name: '股票', icon: '📈', color: '#ef5d68', order: 3, enabled: true },
        { id: 'diary', name: '日记', icon: '📝', color: '#e4a037', order: 4, enabled: true },
        { id: 'commands', name: '命令', icon: '>_', color: '#7c6ef0', order: 5, enabled: true },
      ],
      shortcuts: [
        { id: 'assistant-chat', modeId: 'assistant', label: '聊天', icon: '💬', actionType: 'toggleChat', order: 0, enabled: true },
        { id: 'assistant-commands', modeId: 'assistant', label: '命令', icon: '📋', actionType: 'toggleCommands', order: 1, enabled: true },
        { id: 'assistant-settings', modeId: 'assistant', label: '设置', icon: '⚙️', actionType: 'openSettingsWindow', order: 2, enabled: true },
        { id: 'assistant-quit', modeId: 'assistant', label: '退出', icon: '❌', actionType: 'quit', order: 3, enabled: true },
        { id: 'todo-open', modeId: 'todo', label: '待办', icon: '✅', actionType: 'openTodoWindow', order: 0, enabled: true },
        { id: 'todo-add', modeId: 'todo', label: '新增待办', icon: '➕', actionType: 'addTodo', order: 1, enabled: true },
        { id: 'todo-voice', modeId: 'todo', label: '语音录入', icon: '🎤', actionType: 'voiceTodo', order: 2, enabled: true },
        { id: 'recording-open', modeId: 'recording', label: '录音纪要', icon: '🎙', actionType: 'openRecordingWindow', order: 0, enabled: true },
        { id: 'recording-panel', modeId: 'recording', label: '录音面板', icon: '📂', actionType: 'openRecordingPanel', order: 1, enabled: true },
        { id: 'recording-settings', modeId: 'recording', label: '设置', icon: '⚙️', actionType: 'openSettingsWindow', order: 2, enabled: true },
        { id: 'stock-open', modeId: 'stock', label: '股票', icon: '📈', actionType: 'openStockWindow', order: 0, enabled: true },
        { id: 'diary-open', modeId: 'diary', label: '日记', icon: '📝', actionType: 'openDiaryWindow', order: 0, enabled: true },
        { id: 'commands-panel', modeId: 'commands', label: '命令面板', icon: '📋', actionType: 'toggleCommands', order: 0, enabled: true },
      ],
    }
  }
})

module.exports = store
