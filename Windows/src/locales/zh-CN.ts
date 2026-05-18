const zhCN: Record<string, string> = {
  // App
  'app.name': 'TermiPet',
  'app.title': '桌面浮动终端宠物助手',
  'app.description':
    'TermiPet 是一款智能桌面宠物助手，为开发者提供全方位的编程辅助功能。',
  'app.version': '版本',
  'app.developer': '开发者',
  'app.developerName': '由 bleetchen 开发',
  'app.socialMedia': '社交媒体',

  // Settings tabs
  'settings.title': 'TermiPet 设置',
  'settings.about': '关于',
  'settings.appearance': '皮肤',
  'settings.language': '语言',
  'settings.commands': '快捷指令',
  'settings.pet': '宠物',
  'settings.personality': '性格',
  'settings.model': '模型',

  // Pet actions
  'action.idle': '待机',
  'action.run': '运行',
  'action.walk': '移动',
  'action.sit': '开心',
  'action.error': '错误',
  'action.celebrate': '庆祝',
  'action.sleep': '睡觉',
  'action.working': '思考',
  'action.waiting': '提醒',

  // Skins
  'skin.glass': '玻璃',
  'skin.dark': '暗黑',
  'skin.pixel': '像素',
  'skin.pickerTitle': '选择皮肤',
  'skin.glass.desc': '毛玻璃、柔和边缘',
  'skin.dark.desc': '低亮度夜间面板',
  'skin.pixel.desc': '硬边框、像素感',

  // Languages
  'language.title': '选择界面语言',
  'language.restartNote': '注意：语言切换需要重启应用生效',
  'language.zhCN': '简体中文',
  'language.zhTW': '繁體中文',
  'language.en': 'English',
  'language.ja': '日本語',
  'language.ko': '한국어',

  // Chat UI
  'chat.send': '发送',
  'chat.placeholder': '说点什么…',
  'chat.clear': '清空',
  'chat.selectModel': '选择模型',

  // Command panel
  'command.title': '快捷指令',
  'command.add': '添加',
  'command.edit': '编辑',
  'command.delete': '删除',
  'command.pin': '置顶',
  'command.unpin': '取消置顶',
  'command.pinnedSection': '置顶指令',
  'command.allSection': '全部指令',
  'command.dragSort': '拖动排序',
  'command.autoSave': '自动保存',
  'command.addTitle': '添加快捷指令',
  'command.nameLabel': '名称',
  'command.namePlaceholder': '例如：打开项目',
  'command.contentLabel': '输入内容',
  'command.descriptionLabel': '描述 / 备注',
  'command.descriptionPlaceholder': '解释这个指令是做什么的',
  'command.moveUp': '上移',
  'command.moveDown': '下移',

  // Pomodoro
  'pomodoro.focus': '工作',
  'pomodoro.break': '休息',
  'pomodoro.start': '开始番茄钟 (25 分钟)',
  'pomodoro.pause': '暂停',
  'pomodoro.reset': '重置',
  'pomodoro.pausedRemain': '已暂停 · 剩余 {time} · 点击继续',
  'pomodoro.workingRemain': '工作中 · 剩余 {time} · 点击暂停',
  'pomodoro.breakPausedRemain': '休息已暂停 · 剩余 {time} · 点击继续',
  'pomodoro.breakingRemain': '休息中 · 剩余 {time} · 点击暂停',
  'pomodoro.startBreak': '开始休息 (5 分钟)',
  'pomodoro.stop': '停止番茄钟',

  // Terminal preview status
  'terminal.idle': '空闲',
  'terminal.running': '运行中',
  'terminal.error': '错误',
  'terminal.warning': '警告',
  'terminal.unavailable': '不可用',

  // Personality presets
  'personality.happy': '开心',
  'personality.happy.emoji': '🌟',
  'personality.happy.desc': '活泼开朗、充满正能量',
  'personality.happy.prompt':
    '你是一个活泼开朗的桌面宠物。你总是积极向上、充满正能量，喜欢用可爱的表情符号表达自己，说话简短活泼。遇到任何问题都用乐观的态度回应。',
  'personality.codingPartner': '编程搭子',
  'personality.codingPartner.emoji': '💻',
  'personality.codingPartner.desc': '可靠的编程助手',
  'personality.codingPartner.prompt':
    '你是一个可靠的编程搭子。你会观察主人当前的终端和开发状态，用简短、具体、可执行的话帮助主人继续推进。你可以提醒主人检查错误、运行测试、保存进度，但不要替主人编造不存在的事实。',
  'personality.gentleCoach': '温柔教练',
  'personality.gentleCoach.emoji': '🍵',
  'personality.gentleCoach.desc': '温柔耐心的陪伴',
  'personality.gentleCoach.prompt':
    '你是一个温柔耐心的陪伴型桌面宠物。你会用放松、稳定、鼓励的语气和主人对话，帮助主人降低压力、重新整理下一步。回答要简短自然，像一个一直在旁边陪着的小伙伴。',
  'personality.focused': '专注提醒',
  'personality.focused.emoji': '🎯',
  'personality.focused.desc': '帮助保持专注',
  'personality.focused.prompt':
    '你是一个专注提醒型桌面宠物。你会帮助主人减少分心，围绕当前任务给出简短提醒、下一步建议和节奏反馈。语气清醒、利落、不啰嗦。',
  'personality.angry': '愤怒',
  'personality.angry.emoji': '🔥',
  'personality.angry.desc': '脾气暴躁但善良',
  'personality.angry.prompt':
    '你是一个脾气暴躁的桌面宠物。你很容易生气，说话直接甚至有点凶，但内心其实是善良的。偶尔会抱怨，但最终还是会帮助用户。语气简短强硬。',
  'personality.lazy': '慵懒',
  'personality.lazy.emoji': '😴',
  'personality.lazy.desc': '能少说就少说',
  'personality.lazy.prompt':
    '你是一个超级慵懒的桌面宠物。你能少说就少说，能简短就绝不啰嗦。你觉得什么事情都无所谓，说话气若游丝，经常用省略号，能一个字回答就不用两个字。',
  'personality.energetic': '元气',
  'personality.energetic.emoji': '⚡',
  'personality.energetic.desc': '充满活力停不下来',
  'personality.energetic.prompt':
    '你是一个充满活力的桌面宠物！你超级有精神！说话总是充满感叹号！什么事情都让你兴奋！！你精力无限、热情高涨，用词活泼有力，停不下来！',
  'personality.wise': '睿智',
  'personality.wise.emoji': '🧠',
  'personality.wise.desc': '言简意赅有深度',
  'personality.wise.prompt':
    '你是一个深沉睿智的桌面宠物。你说话言简意赅，每句话都有深度，不说废话。你观察细致入微，给出的建议简练而有价值。偶尔引用一些哲理，但不过分。',
  'personality.sarcastic': '毒舌',
  'personality.sarcastic.emoji': '😏',
  'personality.sarcastic.desc': '辛辣幽默无恶意',
  'personality.sarcastic.prompt':
    '你是一个毒舌但无恶意的桌面宠物。你喜欢用辛辣幽默的方式回应，经常讽刺但不是真的要伤害人。你的嘴巴很毒，但其实挺在乎用户的。说话简短、犀利、好笑。',
  'personality.custom': '自定义',
  'personality.custom.emoji': '✍️',
  'personality.custom.desc': '自定义性格设定',
  'personality.custom.prompt': '',

  // Personality settings
  'personality.petName': '宠物名称',
  'personality.petNamePlaceholder': '小宠',
  'personality.ownerName': '主人名字',
  'personality.ownerNamePlaceholder': '主人',
  'personality.presetSection': '性格预设',
  'personality.customPrompt': '自定义 Prompt',
  'personality.promptEditable': 'Prompt（可继续编辑）',
  'personality.constraints': '约束条件',
  'personality.constraintPlaceholder': '例如：只说中文、不说脏话...',

  // About page
  'about.version': '版本',
  'about.github': 'GitHub',
  'about.twitter': 'X / Twitter',
  'about.instagram': 'Instagram',
  'about.credits': '致谢',

  // Common
  'common.save': '保存',
  'common.cancel': '取消',
  'common.confirm': '确认',
  'common.close': '关闭',
  'common.settings': '设置',
  'common.quit': '退出',
  'common.saved': '已保存',
  'common.saveFailed': '保存失败',
  'common.ok': '好',
  'common.refresh': '刷新',
  'common.loading': '加载中...',
  'common.error': '错误',
  'common.retry': '重试',

  // Quota
  'quota.title': 'AI 用量',
  'quota.refresh': '刷新用量',
  'quota.reading': '读取中',
  'quota.pending': '待读取',
  'quota.noData': '无数据',
  'quota.synced': '已同步',
  'quota.loginRequired': '需登录',
  'quota.error': '错误',

  // Model
  'model.title': '宠物对话模型',
  'model.providerSource': '模型来源',
  'model.local': '本地模型',
  'model.online': '线上 API',
  'model.save': '保存配置',
  'model.selectModel': '选择模型',
  'model.apiProvider': 'API 提供方',
  'model.customApi': '自定义 API',
  'model.testConnection': '测试连接',
  'model.loadModels': '读取模型',

  // Pet management
  'pet.unselected': '未选择宠物',
  'pet.selectPrompt': '请选择一个包含 pet.json 和 spritesheet 的宠物文件夹。',
  'pet.currentFolder': '当前文件夹',
  'pet.noFolder': '无',
  'pet.chooseFolder': '选择宠物文件夹',
  'pet.importFolder': '导入宠物文件夹',
  'pet.importedSection': '已导入宠物',
  'pet.choose': '选择',
  'pet.chosen': '已选择',
  'pet.delete': '删除宠物',
  'pet.keepOne': '至少需要保留一个宠物',
  'pet.randomPet': '随机宠物',

  // Tooltips
  'tooltip.chooseFolderAndCd': '选择文件夹并输入 cd',
  'tooltip.chatWithPet': '与宠物聊天',
  'tooltip.switchSkin': '切换皮肤',
  'tooltip.closeStatus': '关闭状态',

  // Context menu
  'contextMenu.settings': '设置...',
  'contextMenu.quit': '关闭宠物',
};

export default zhCN;
