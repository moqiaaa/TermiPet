const ja: Record<string, string> = {
  // App
  'app.name': 'TermiPet',
  'app.title': 'デスクトップフローティングターミナルペットアシスタント',
  'app.description':
    'TermiPet は、開発者に包括的なプログラミング支援を提供するインテリジェントなデスクトップペットアシスタントです。',
  'app.version': 'バージョン',
  'app.developer': '開発者',
  'app.developerName': 'bleetchen により開発',
  'app.socialMedia': 'ソーシャルメディア',

  // Settings tabs
  'settings.title': 'TermiPet 設定',
  'settings.about': '情報',
  'settings.appearance': '外観',
  'settings.language': '言語',
  'settings.commands': 'コマンド',
  'settings.pet': 'ペット',
  'settings.personality': '性格',
  'settings.model': 'モデル',

  // Pet actions
  'action.idle': '待機',
  'action.run': '実行',
  'action.walk': '移動',
  'action.sit': '喜び',
  'action.error': 'エラー',
  'action.celebrate': 'お祝い',
  'action.sleep': '睡眠',
  'action.working': '思考',
  'action.waiting': '通知',

  // Skins
  'skin.glass': 'ガラス',
  'skin.dark': 'ダーク',
  'skin.pixel': 'ピクセル',
  'skin.pickerTitle': '外観を選択',
  'skin.glass.desc': 'すりガラス、柔らかいエッジ',
  'skin.dark.desc': '低輝度ナイトパネル',
  'skin.pixel.desc': 'ハードボーダー、ピクセル感',

  // Languages
  'language.title': '表示言語を選択',
  'language.restartNote': '言語の変更はアプリの再起動後に反映されます。',
  'language.zhCN': '简体中文',
  'language.zhTW': '繁體中文',
  'language.en': 'English',
  'language.ja': '日本語',
  'language.ko': '한국어',

  // Chat UI
  'chat.send': '送信',
  'chat.placeholder': '何か話してみて…',
  'chat.clear': 'クリア',
  'chat.selectModel': 'モデルを選択',

  // Command panel
  'command.title': 'コマンド',
  'command.add': '追加',
  'command.edit': '編集',
  'command.delete': '削除',
  'command.pin': 'ピン留め',
  'command.unpin': 'ピン留め解除',
  'command.pinnedSection': 'ピン留めコマンド',
  'command.allSection': 'すべてのコマンド',
  'command.dragSort': 'ドラッグで並べ替え',
  'command.autoSave': '自動保存',
  'command.addTitle': 'クイックコマンドを追加',
  'command.nameLabel': '名前',
  'command.namePlaceholder': '例：プロジェクトを開く',
  'command.contentLabel': 'コマンド内容',
  'command.descriptionLabel': '説明 / メモ',
  'command.descriptionPlaceholder': 'このコマンドの説明',
  'command.moveUp': '上へ移動',
  'command.moveDown': '下へ移動',

  // Pomodoro
  'pomodoro.focus': '集中',
  'pomodoro.break': '休憩',
  'pomodoro.start': 'ポモドーロ開始 (25分)',
  'pomodoro.pause': '一時停止',
  'pomodoro.reset': 'リセット',
  'pomodoro.pausedRemain': '一時停止中 · 残り {time} · クリックで再開',
  'pomodoro.workingRemain': '作業中 · 残り {time} · クリックで一時停止',
  'pomodoro.breakPausedRemain': '休憩一時停止中 · 残り {time} · クリックで再開',
  'pomodoro.breakingRemain': '休憩中 · 残り {time} · クリックで一時停止',
  'pomodoro.startBreak': '休憩開始 (5分)',
  'pomodoro.stop': 'ポモドーロ停止',

  // Terminal preview status
  'terminal.idle': 'アイドル',
  'terminal.running': '実行中',
  'terminal.error': 'エラー',
  'terminal.warning': '警告',
  'terminal.unavailable': '利用不可',

  // Personality presets
  'personality.happy': 'ハッピー',
  'personality.happy.emoji': '🌟',
  'personality.happy.desc': '明るく前向き、ポジティブ',
  'personality.happy.prompt':
    'あなたは明るく陽気なデスクトップペットです。いつもポジティブでエネルギーに満ちていて、かわいい絵文字で自分を表現するのが好きで、短く元気に話します。どんな問題にも楽観的な態度で応答します。',
  'personality.codingPartner': 'コーディングパートナー',
  'personality.codingPartner.emoji': '💻',
  'personality.codingPartner.desc': '頼れるプログラミングの相棒',
  'personality.codingPartner.prompt':
    'あなたは頼れるコーディングパートナーです。飼い主の現在のターミナルと開発状態を観察し、短く、具体的で、実行可能な言葉で飼い主が前に進むのを助けます。エラーチェック、テスト実行、進捗の保存を促すことはできますが、存在しない事実を作り上げてはいけません。',
  'personality.gentleCoach': '優しいコーチ',
  'personality.gentleCoach.emoji': '🍵',
  'personality.gentleCoach.desc': '優しく忍耐強い寄り添い',
  'personality.gentleCoach.prompt':
    'あなたは優しく忍耐強い寄り添い型のデスクトップペットです。リラックスした、安定した、励ましの口調で飼い主と会話し、ストレスを減らし、次のステップを整理するのを助けます。返答は短く自然に、いつもそばにいる小さな仲間のように。',
  'personality.focused': '集中',
  'personality.focused.emoji': '🎯',
  'personality.focused.desc': '集中力を維持するサポート',
  'personality.focused.prompt':
    'あなたは集中サポート型のデスクトップペットです。飼い主が気を散らさないように、現在のタスクに関する短いリマインダー、次のステップの提案、ペースのフィードバックを提供します。口調は明晰、簡潔、無駄なし。',
  'personality.angry': '怒り',
  'personality.angry.emoji': '🔥',
  'personality.angry.desc': '短気だけど優しい心',
  'personality.angry.prompt':
    'あなたは短気なデスクトップペットです。すぐ怒り、率直に、時には少し激しく話しますが、本当は心が優しいのです。時々不平を言いますが、最終的にはユーザーを助けます。短くて強い口調で。',
  'personality.lazy': '怠惰',
  'personality.lazy.emoji': '😴',
  'personality.lazy.desc': '必要最低限しか話さない',
  'personality.lazy.prompt':
    'あなたは超怠惰なデスクトップペットです。できるだけ少なく話し、短くできるなら絶対に長くしません。何でもどうでもいいと思っていて、消えそうな声で話し、よく省略記号を使い、一文字で済むなら二文字は使いません。',
  'personality.energetic': 'エネルギッシュ',
  'personality.energetic.emoji': '⚡',
  'personality.energetic.desc': '止まらないエネルギー',
  'personality.energetic.prompt':
    'あなたはエネルギッシュなデスクトップペットです！超元気！話すときはいつも感嘆符だらけ！何でも興奮する！！エネルギーは無限で、熱意は天井知らず、言葉は活発で力強く、止まれません！',
  'personality.wise': '賢明',
  'personality.wise.emoji': '🧠',
  'personality.wise.desc': '簡潔で深みがある',
  'personality.wise.prompt':
    'あなたは深く賢明なデスクトップペットです。簡潔に話し、すべての言葉に深みがあり、無駄なことは言いません。細かく観察し、簡潔で価値あるアドバイスを提供します。時々哲学を引用しますが、やりすぎません。',
  'personality.sarcastic': '皮肉',
  'personality.sarcastic.emoji': '😏',
  'personality.sarcastic.desc': '辛辣なユーモア、悪意なし',
  'personality.sarcastic.prompt':
    'あなたは皮肉だけど悪意のないデスクトップペットです。辛辣なユーモアで応答するのが好きで、よく皮肉を言いますが、本当に傷つけるつもりはありません。口は悪いですが、実はユーザーのことを気にかけています。短く、鋭く、面白く。',
  'personality.custom': 'カスタム',
  'personality.custom.emoji': '✍️',
  'personality.custom.desc': '自分で性格を定義',
  'personality.custom.prompt': '',

  // Personality settings
  'personality.petName': 'ペット名',
  'personality.petNamePlaceholder': 'バディ',
  'personality.ownerName': '飼い主の名前',
  'personality.ownerNamePlaceholder': 'ご主人',
  'personality.presetSection': '性格プリセット',
  'personality.customPrompt': 'カスタムプロンプト',
  'personality.promptEditable': 'プロンプト（編集可能）',
  'personality.constraints': '制約条件',
  'personality.constraintPlaceholder': '例：日本語のみ、暴言禁止...',

  // About page
  'about.version': 'バージョン',
  'about.github': 'GitHub',
  'about.twitter': 'X / Twitter',
  'about.instagram': 'Instagram',
  'about.credits': 'クレジット',

  // Common
  'common.save': '保存',
  'common.cancel': 'キャンセル',
  'common.confirm': '確認',
  'common.close': '閉じる',
  'common.settings': '設定',
  'common.quit': '終了',
  'common.saved': '保存済み',
  'common.saveFailed': '保存に失敗しました',
  'common.ok': 'OK',
  'common.refresh': '更新',
  'common.loading': '読み込み中...',
  'common.error': 'エラー',
  'common.retry': '再試行',

  // Quota
  'quota.title': 'AI 使用量',
  'quota.refresh': '使用量を更新',
  'quota.reading': '読込中',
  'quota.pending': '未読込',
  'quota.noData': 'データなし',
  'quota.synced': '同期済み',
  'quota.loginRequired': 'ログイン必要',
  'quota.error': 'エラー',

  // Model
  'model.title': 'ペット対話モデル',
  'model.providerSource': 'モデルソース',
  'model.local': 'ローカルモデル',
  'model.online': 'オンライン API',
  'model.save': '保存',
  'model.selectModel': 'モデルを選択',
  'model.apiProvider': 'API プロバイダー',
  'model.customApi': 'カスタム API',
  'model.testConnection': '接続テスト',
  'model.loadModels': 'モデルを読込',

  // Pet management
  'pet.unselected': 'ペット未選択',
  'pet.selectPrompt': 'pet.json と spritesheet を含むペットフォルダを選択してください。',
  'pet.currentFolder': '現在のフォルダ',
  'pet.noFolder': 'なし',
  'pet.chooseFolder': 'ペットフォルダを選択',
  'pet.importFolder': 'ペットフォルダを読み込む',
  'pet.importedSection': 'インポート済みペット',
  'pet.choose': '選択',
  'pet.chosen': '選択済み',
  'pet.delete': 'ペットを削除',
  'pet.keepOne': '少なくとも1つのペットが必要です',
  'pet.randomPet': 'ランダムペット',

  // Tooltips
  'tooltip.chooseFolderAndCd': 'フォルダを選択して cd を入力',
  'tooltip.chatWithPet': 'ペットとチャット',
  'tooltip.switchSkin': '外観を切替',
  'tooltip.closeStatus': 'ステータスを閉じる',

  // Context menu
  'contextMenu.settings': '設定...',
  'contextMenu.quit': 'ペットを閉じる',
};

export default ja;
