const zhTW: Record<string, string> = {
  // App
  'app.name': 'TermiPet',
  'app.title': '桌面浮動終端寵物助手',
  'app.description':
    'TermiPet 是一款智慧桌面寵物助手，為開發者提供全方位的程式設計輔助功能。',
  'app.version': '版本',
  'app.developer': '開發者',
  'app.developerName': '由 bleetchen 開發',
  'app.socialMedia': '社交媒體',

  // Settings tabs
  'settings.title': 'TermiPet 設定',
  'settings.about': '關於',
  'settings.appearance': '外觀',
  'settings.language': '語言',
  'settings.commands': '快捷指令',
  'settings.pet': '寵物',
  'settings.personality': '性格',
  'settings.model': '模型',

  // Pet actions
  'action.idle': '待機',
  'action.run': '運行',
  'action.walk': '移動',
  'action.sit': '開心',
  'action.error': '錯誤',
  'action.celebrate': '慶祝',
  'action.sleep': '睡覺',
  'action.working': '思考',
  'action.waiting': '提醒',

  // Skins
  'skin.glass': '玻璃',
  'skin.dark': '暗黑',
  'skin.pixel': '像素',
  'skin.pickerTitle': '選擇外觀',
  'skin.glass.desc': '毛玻璃、柔和邊緣',
  'skin.dark.desc': '低亮度夜間面板',
  'skin.pixel.desc': '硬邊框、像素感',

  // Languages
  'language.title': '選擇介面語言',
  'language.restartNote': '注意：語言切換需要重新啟動應用程式才會生效',
  'language.zhCN': '简体中文',
  'language.zhTW': '繁體中文',
  'language.en': 'English',
  'language.ja': '日本語',
  'language.ko': '한국어',

  // Chat UI
  'chat.send': '傳送',
  'chat.placeholder': '說點什麼…',
  'chat.clear': '清除',
  'chat.selectModel': '選擇模型',

  // Command panel
  'command.title': '快捷指令',
  'command.add': '新增',
  'command.edit': '編輯',
  'command.delete': '刪除',
  'command.pin': '置頂',
  'command.unpin': '取消置頂',
  'command.pinnedSection': '置頂指令',
  'command.allSection': '全部指令',
  'command.dragSort': '拖曳排序',
  'command.autoSave': '自動儲存',
  'command.addTitle': '新增快捷指令',
  'command.nameLabel': '名稱',
  'command.namePlaceholder': '例如：開啟專案',
  'command.contentLabel': '輸入內容',
  'command.descriptionLabel': '描述 / 備註',
  'command.descriptionPlaceholder': '說明這個指令的作用',
  'command.moveUp': '上移',
  'command.moveDown': '下移',

  // Pomodoro
  'pomodoro.focus': '工作',
  'pomodoro.break': '休息',
  'pomodoro.start': '開始番茄鐘 (25 分鐘)',
  'pomodoro.pause': '暫停',
  'pomodoro.reset': '重置',
  'pomodoro.pausedRemain': '已暫停 · 剩餘 {time} · 點擊繼續',
  'pomodoro.workingRemain': '工作中 · 剩餘 {time} · 點擊暫停',
  'pomodoro.breakPausedRemain': '休息已暫停 · 剩餘 {time} · 點擊繼續',
  'pomodoro.breakingRemain': '休息中 · 剩餘 {time} · 點擊暫停',
  'pomodoro.startBreak': '開始休息 (5 分鐘)',
  'pomodoro.stop': '停止番茄鐘',

  // Terminal preview status
  'terminal.idle': '閒置',
  'terminal.running': '執行中',
  'terminal.error': '錯誤',
  'terminal.warning': '警告',
  'terminal.unavailable': '不可用',

  // Personality presets
  'personality.happy': '開心',
  'personality.happy.emoji': '🌟',
  'personality.happy.desc': '活潑開朗、充滿正能量',
  'personality.happy.prompt':
    '你是一個活潑開朗的桌面寵物。你總是積極向上、充滿正能量，喜歡用可愛的表情符號表達自己，說話簡短活潑。遇到任何問題都用樂觀的態度回應。',
  'personality.codingPartner': '程式設計搭子',
  'personality.codingPartner.emoji': '💻',
  'personality.codingPartner.desc': '可靠的程式設計助手',
  'personality.codingPartner.prompt':
    '你是一個可靠的程式設計搭子。你會觀察主人當前的終端和開發狀態，用簡短、具體、可執行的話幫助主人繼續推進。你可以提醒主人檢查錯誤、執行測試、儲存進度，但不要替主人編造不存在的事實。',
  'personality.gentleCoach': '溫柔教練',
  'personality.gentleCoach.emoji': '🍵',
  'personality.gentleCoach.desc': '溫柔耐心的陪伴',
  'personality.gentleCoach.prompt':
    '你是一個溫柔耐心的陪伴型桌面寵物。你會用放鬆、穩定、鼓勵的語氣和主人對話，幫助主人降低壓力、重新整理下一步。回答要簡短自然，像一個一直在旁邊陪著的小夥伴。',
  'personality.focused': '專注提醒',
  'personality.focused.emoji': '🎯',
  'personality.focused.desc': '幫助保持專注',
  'personality.focused.prompt':
    '你是一個專注提醒型桌面寵物。你會幫助主人減少分心，圍繞當前任務給出簡短提醒、下一步建議和節奏反饋。語氣清醒、俐落、不囉嗦。',
  'personality.angry': '憤怒',
  'personality.angry.emoji': '🔥',
  'personality.angry.desc': '脾氣暴躁但善良',
  'personality.angry.prompt':
    '你是一個脾氣暴躁的桌面寵物。你很容易生氣，說話直接甚至有點兇，但內心其實是善良的。偶爾會抱怨，但最終還是會幫助使用者。語氣簡短強硬。',
  'personality.lazy': '慵懶',
  'personality.lazy.emoji': '😴',
  'personality.lazy.desc': '能少說就少說',
  'personality.lazy.prompt':
    '你是一個超級慵懶的桌面寵物。你能少說就少說，能簡短就絕不囉嗦。你覺得什麼事情都無所謂，說話氣若遊絲，經常用省略號，能一個字回答就不用兩個字。',
  'personality.energetic': '元氣',
  'personality.energetic.emoji': '⚡',
  'personality.energetic.desc': '充滿活力停不下來',
  'personality.energetic.prompt':
    '你是一個充滿活力的桌面寵物！你超級有精神！說話總是充滿感嘆號！什麼事情都讓你興奮！！你精力無限、熱情高漲，用詞活潑有力，停不下來！',
  'personality.wise': '睿智',
  'personality.wise.emoji': '🧠',
  'personality.wise.desc': '言簡意賅有深度',
  'personality.wise.prompt':
    '你是一個深沉睿智的桌面寵物。你說話言簡意賅，每句話都有深度，不說廢話。你觀察細緻入微，給出的建議簡練而有價值。偶爾引用一些哲理，但不過分。',
  'personality.sarcastic': '毒舌',
  'personality.sarcastic.emoji': '😏',
  'personality.sarcastic.desc': '辛辣幽默無惡意',
  'personality.sarcastic.prompt':
    '你是一個毒舌但無惡意的桌面寵物。你喜歡用辛辣幽默的方式回應，經常諷刺但不是真的要傷害人。你的嘴巴很毒，但其實挺在乎使用者的。說話簡短、犀利、好笑。',
  'personality.custom': '自訂',
  'personality.custom.emoji': '✍️',
  'personality.custom.desc': '自訂性格設定',
  'personality.custom.prompt': '',

  // Personality settings
  'personality.petName': '寵物名稱',
  'personality.petNamePlaceholder': '小寵',
  'personality.ownerName': '主人名字',
  'personality.ownerNamePlaceholder': '主人',
  'personality.presetSection': '性格預設',
  'personality.customPrompt': '自訂 Prompt',
  'personality.promptEditable': 'Prompt（可繼續編輯）',
  'personality.constraints': '約束條件',
  'personality.constraintPlaceholder': '例如：只說中文、不說髒話...',

  // About page
  'about.version': '版本',
  'about.github': 'GitHub',
  'about.twitter': 'X / Twitter',
  'about.instagram': 'Instagram',
  'about.credits': '致謝',

  // Common
  'common.save': '儲存',
  'common.cancel': '取消',
  'common.confirm': '確認',
  'common.close': '關閉',
  'common.settings': '設定',
  'common.quit': '退出',
  'common.saved': '已儲存',
  'common.saveFailed': '儲存失敗',
  'common.ok': '好',
  'common.refresh': '重新整理',
  'common.loading': '載入中...',
  'common.error': '錯誤',
  'common.retry': '重試',

  // Quota
  'quota.title': 'AI 用量',
  'quota.refresh': '重新整理用量',
  'quota.reading': '讀取中',
  'quota.pending': '待讀取',
  'quota.noData': '無資料',
  'quota.synced': '已同步',
  'quota.loginRequired': '需登入',
  'quota.error': '錯誤',

  // Model
  'model.title': '寵物對話模型',
  'model.providerSource': '模型來源',
  'model.local': '本地模型',
  'model.online': '線上 API',
  'model.save': '儲存設定',
  'model.selectModel': '選擇模型',
  'model.apiProvider': 'API 提供方',
  'model.customApi': '自訂 API',
  'model.testConnection': '測試連線',
  'model.loadModels': '讀取模型',

  // Pet management
  'pet.unselected': '尚未選擇寵物',
  'pet.selectPrompt': '請選擇包含 pet.json 和 spritesheet 的寵物資料夾。',
  'pet.currentFolder': '目前資料夾',
  'pet.noFolder': '無',
  'pet.chooseFolder': '選擇寵物資料夾',
  'pet.importFolder': '匯入寵物資料夾',
  'pet.importedSection': '已匯入寵物',
  'pet.choose': '選擇',
  'pet.chosen': '已選擇',
  'pet.delete': '刪除寵物',
  'pet.keepOne': '至少需要保留一個寵物',
  'pet.randomPet': '隨機寵物',

  // Tooltips
  'tooltip.chooseFolderAndCd': '選擇資料夾並輸入 cd',
  'tooltip.chatWithPet': '與寵物聊天',
  'tooltip.switchSkin': '切換外觀',
  'tooltip.closeStatus': '關閉狀態',

  // Context menu
  'contextMenu.settings': '設定...',
  'contextMenu.quit': '關閉寵物',
};

export default zhTW;
