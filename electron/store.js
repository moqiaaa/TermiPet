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
      }
    ],
    defaultSceneId: 'builtin-meeting',
    projects: [
      { id: 'inbox', name: '收件箱', color: '#d0d0d0', createdAt: 0 }
    ],
    todos: []
  }
})

module.exports = store
