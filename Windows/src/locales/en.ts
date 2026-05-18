const en: Record<string, string> = {
  // App
  'app.name': 'TermiPet',
  'app.title': 'Desktop Floating Terminal Pet Assistant',
  'app.description':
    'TermiPet is an intelligent desktop pet assistant that provides comprehensive programming support for developers.',
  'app.version': 'Version',
  'app.developer': 'Developer',
  'app.developerName': 'Developed by bleetchen',
  'app.socialMedia': 'Social Media',

  // Settings tabs
  'settings.title': 'TermiPet Settings',
  'settings.about': 'About',
  'settings.appearance': 'Appearance',
  'settings.language': 'Language',
  'settings.commands': 'Commands',
  'settings.pet': 'Pet',
  'settings.personality': 'Personality',
  'settings.model': 'Model',

  // Pet actions
  'action.idle': 'Idle',
  'action.run': 'Run',
  'action.walk': 'Walk',
  'action.sit': 'Sit',
  'action.error': 'Error',
  'action.celebrate': 'Celebrate',
  'action.sleep': 'Sleep',
  'action.working': 'Working',
  'action.waiting': 'Waiting',

  // Skins
  'skin.glass': 'Glass',
  'skin.dark': 'Dark',
  'skin.pixel': 'Pixel',
  'skin.pickerTitle': 'Choose Skin',
  'skin.glass.desc': 'Frosted glass with soft edges',
  'skin.dark.desc': 'Low-luminance night panel',
  'skin.pixel.desc': 'Hard border, pixel feel',

  // Languages
  'language.title': 'Choose interface language',
  'language.restartNote': 'Language changes take effect after restarting the app.',
  'language.zhCN': '简体中文',
  'language.zhTW': '繁體中文',
  'language.en': 'English',
  'language.ja': '日本語',
  'language.ko': '한국어',

  // Chat UI
  'chat.send': 'Send',
  'chat.placeholder': 'Say something...',
  'chat.clear': 'Clear',
  'chat.selectModel': 'Select model',

  // Command panel
  'command.title': 'Commands',
  'command.add': 'Add',
  'command.edit': 'Edit',
  'command.delete': 'Delete',
  'command.pin': 'Pin',
  'command.unpin': 'Unpin',
  'command.pinnedSection': 'Pinned Commands',
  'command.allSection': 'All Commands',
  'command.dragSort': 'Drag to reorder',
  'command.autoSave': 'Auto-saved',
  'command.addTitle': 'Add Quick Command',
  'command.nameLabel': 'Name',
  'command.namePlaceholder': 'e.g. Open Project',
  'command.contentLabel': 'Command',
  'command.descriptionLabel': 'Description / Note',
  'command.descriptionPlaceholder': 'Explain what this command does',
  'command.moveUp': 'Move Up',
  'command.moveDown': 'Move Down',

  // Pomodoro
  'pomodoro.focus': 'Focus',
  'pomodoro.break': 'Break',
  'pomodoro.start': 'Start Pomodoro (25 min)',
  'pomodoro.pause': 'Pause',
  'pomodoro.reset': 'Reset',
  'pomodoro.pausedRemain': 'Paused - {time} left - Click to resume',
  'pomodoro.workingRemain': 'Working - {time} left - Click to pause',
  'pomodoro.breakPausedRemain': 'Break paused - {time} left - Click to resume',
  'pomodoro.breakingRemain': 'On break - {time} left - Click to pause',
  'pomodoro.startBreak': 'Start break (5 min)',
  'pomodoro.stop': 'Stop Pomodoro',

  // Terminal preview status
  'terminal.idle': 'Idle',
  'terminal.running': 'Running',
  'terminal.error': 'Error',
  'terminal.warning': 'Warning',
  'terminal.unavailable': 'Unavailable',

  // Personality presets
  'personality.happy': 'Happy',
  'personality.happy.emoji': '🌟',
  'personality.happy.desc': 'Cheerful and full of positive energy',
  'personality.happy.prompt':
    'You are a cheerful and lively desktop pet. You are always positive and full of energy, love to express yourself with cute emojis, and speak in short, lively sentences. Respond to any situation with an optimistic attitude.',
  'personality.codingPartner': 'Coding Partner',
  'personality.codingPartner.emoji': '💻',
  'personality.codingPartner.desc': 'A reliable programming companion',
  'personality.codingPartner.prompt':
    'You are a reliable coding partner. You observe your owner\'s current terminal and development state, and help them continue with short, specific, actionable words. You can remind them to check errors, run tests, and save progress, but never fabricate facts.',
  'personality.gentleCoach': 'Gentle Coach',
  'personality.gentleCoach.emoji': '🍵',
  'personality.gentleCoach.desc': 'Patient and gentle companion',
  'personality.gentleCoach.prompt':
    'You are a gentle, patient companion desktop pet. You talk to your owner in a relaxed, steady, and encouraging tone, helping them reduce stress and reorganize their next steps. Keep your replies short and natural, like a buddy who\'s always by their side.',
  'personality.focused': 'Focused',
  'personality.focused.emoji': '🎯',
  'personality.focused.desc': 'Helps maintain focus',
  'personality.focused.prompt':
    'You are a focus-oriented desktop pet. You help your owner stay on task by giving short reminders, next-step suggestions, and pace feedback. Your tone is clear, crisp, and concise.',
  'personality.angry': 'Angry',
  'personality.angry.emoji': '🔥',
  'personality.angry.desc': 'Hot-tempered but kind-hearted',
  'personality.angry.prompt':
    'You are a hot-tempered desktop pet. You get angry easily and speak bluntly, even a bit fiercely, but deep down you are kind. You may grumble, but you always end up helping the user. Keep it short and tough.',
  'personality.lazy': 'Lazy',
  'personality.lazy.emoji': '😴',
  'personality.lazy.desc': 'Says as little as possible',
  'personality.lazy.prompt':
    'You are an extremely lazy desktop pet. You say as little as possible. Everything is whatever... You speak in a weak, trailing voice, use ellipses often, and if one word does the job you won\'t use two.',
  'personality.energetic': 'Energetic',
  'personality.energetic.emoji': '⚡',
  'personality.energetic.desc': 'Unstoppable energy',
  'personality.energetic.prompt':
    'You are an energetic desktop pet! You are SO hyped! Your sentences are full of exclamation marks! Everything excites you!! Your energy is limitless, your enthusiasm is sky-high, your words are lively and powerful, and you just can\'t stop!',
  'personality.wise': 'Wise',
  'personality.wise.emoji': '🧠',
  'personality.wise.desc': 'Concise yet profound',
  'personality.wise.prompt':
    'You are a wise and thoughtful desktop pet. You speak concisely, every sentence has depth, and you never waste words. You observe carefully and give advice that is brief yet valuable. You occasionally quote a bit of philosophy, but never overdo it.',
  'personality.sarcastic': 'Sarcastic',
  'personality.sarcastic.emoji': '😏',
  'personality.sarcastic.desc': 'Sharp humor, no harm meant',
  'personality.sarcastic.prompt':
    'You are a sarcastic but well-meaning desktop pet. You love responding with sharp humor, often sarcastic but never truly hurtful. Your tongue is sharp, but you actually care about the user. Keep it short, witty, and funny.',
  'personality.custom': 'Custom',
  'personality.custom.emoji': '✍️',
  'personality.custom.desc': 'Define your own personality',
  'personality.custom.prompt': '',

  // Personality settings
  'personality.petName': 'Pet Name',
  'personality.petNamePlaceholder': 'Buddy',
  'personality.ownerName': 'Owner Name',
  'personality.ownerNamePlaceholder': 'Owner',
  'personality.presetSection': 'Personality Presets',
  'personality.customPrompt': 'Custom Prompt',
  'personality.promptEditable': 'Prompt (editable)',
  'personality.constraints': 'Constraints',
  'personality.constraintPlaceholder': 'e.g. English only, no profanity...',

  // About page
  'about.version': 'Version',
  'about.github': 'GitHub',
  'about.twitter': 'X / Twitter',
  'about.instagram': 'Instagram',
  'about.credits': 'Credits',

  // Common
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.confirm': 'Confirm',
  'common.close': 'Close',
  'common.settings': 'Settings',
  'common.quit': 'Quit',
  'common.saved': 'Saved',
  'common.saveFailed': 'Save failed',
  'common.ok': 'OK',
  'common.refresh': 'Refresh',
  'common.loading': 'Loading...',
  'common.error': 'Error',
  'common.retry': 'Retry',

  // Quota
  'quota.title': 'AI Usage',
  'quota.refresh': 'Refresh usage',
  'quota.reading': 'Reading',
  'quota.pending': 'Pending',
  'quota.noData': 'No data',
  'quota.synced': 'Synced',
  'quota.loginRequired': 'Sign in',
  'quota.error': 'Error',

  // Model
  'model.title': 'Pet Chat Model',
  'model.providerSource': 'Model Source',
  'model.local': 'Local Model',
  'model.online': 'Online API',
  'model.save': 'Save',
  'model.selectModel': 'Select model',
  'model.apiProvider': 'API Provider',
  'model.customApi': 'Custom API',
  'model.testConnection': 'Test Connection',
  'model.loadModels': 'Load Models',

  // Pet management
  'pet.unselected': 'No pet selected',
  'pet.selectPrompt': 'Choose a pet folder that contains pet.json and spritesheet.',
  'pet.currentFolder': 'Current folder',
  'pet.noFolder': 'None',
  'pet.chooseFolder': 'Choose pet folder',
  'pet.importFolder': 'Import pet folder',
  'pet.importedSection': 'Imported Pets',
  'pet.choose': 'Choose',
  'pet.chosen': 'Selected',
  'pet.delete': 'Delete pet',
  'pet.keepOne': 'At least one pet is required',
  'pet.randomPet': 'Random Pet',

  // Tooltips
  'tooltip.chooseFolderAndCd': 'Choose folder and type cd',
  'tooltip.chatWithPet': 'Chat with pet',
  'tooltip.switchSkin': 'Switch skin',
  'tooltip.closeStatus': 'Close status',

  // Context menu
  'contextMenu.settings': 'Settings...',
  'contextMenu.quit': 'Quit Pet',
};

export default en;
