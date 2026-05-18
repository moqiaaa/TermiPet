const ko: Record<string, string> = {
  // App
  'app.name': 'TermiPet',
  'app.title': '데스크톱 플로팅 터미널 펫 어시스턴트',
  'app.description':
    'TermiPet은 개발자에게 종합적인 프로그래밍 지원을 제공하는 지능형 데스크톱 펫 어시스턴트입니다.',
  'app.version': '버전',
  'app.developer': '개발자',
  'app.developerName': 'bleetchen 개발',
  'app.socialMedia': '소셜 미디어',

  // Settings tabs
  'settings.title': 'TermiPet 설정',
  'settings.about': '정보',
  'settings.appearance': '외관',
  'settings.language': '언어',
  'settings.commands': '명령어',
  'settings.pet': '펫',
  'settings.personality': '성격',
  'settings.model': '모델',

  // Pet actions
  'action.idle': '대기',
  'action.run': '실행',
  'action.walk': '이동',
  'action.sit': '기쁨',
  'action.error': '오류',
  'action.celebrate': '축하',
  'action.sleep': '수면',
  'action.working': '사고',
  'action.waiting': '알림',

  // Skins
  'skin.glass': '글래스',
  'skin.dark': '다크',
  'skin.pixel': '픽셀',
  'skin.pickerTitle': '외관 선택',
  'skin.glass.desc': '반투명 유리, 부드러운 가장자리',
  'skin.dark.desc': '저휘도 야간 패널',
  'skin.pixel.desc': '하드 테두리, 픽셀 느낌',

  // Languages
  'language.title': '인터페이스 언어 선택',
  'language.restartNote': '언어 변경은 앱을 다시 시작한 후 적용됩니다.',
  'language.zhCN': '简体中文',
  'language.zhTW': '繁體中文',
  'language.en': 'English',
  'language.ja': '日本語',
  'language.ko': '한국어',

  // Chat UI
  'chat.send': '보내기',
  'chat.placeholder': '무언가 말해보세요...',
  'chat.clear': '지우기',
  'chat.selectModel': '모델 선택',

  // Command panel
  'command.title': '명령어',
  'command.add': '추가',
  'command.edit': '편집',
  'command.delete': '삭제',
  'command.pin': '고정',
  'command.unpin': '고정 해제',
  'command.pinnedSection': '고정된 명령어',
  'command.allSection': '모든 명령어',
  'command.dragSort': '드래그하여 정렬',
  'command.autoSave': '자동 저장됨',
  'command.addTitle': '빠른 명령어 추가',
  'command.nameLabel': '이름',
  'command.namePlaceholder': '예: 프로젝트 열기',
  'command.contentLabel': '명령어 내용',
  'command.descriptionLabel': '설명 / 메모',
  'command.descriptionPlaceholder': '이 명령어의 설명',
  'command.moveUp': '위로 이동',
  'command.moveDown': '아래로 이동',

  // Pomodoro
  'pomodoro.focus': '집중',
  'pomodoro.break': '휴식',
  'pomodoro.start': '뽀모도로 시작 (25분)',
  'pomodoro.pause': '일시정지',
  'pomodoro.reset': '초기화',
  'pomodoro.pausedRemain': '일시정지 · 남은 시간 {time} · 클릭하여 재개',
  'pomodoro.workingRemain': '작업 중 · 남은 시간 {time} · 클릭하여 일시정지',
  'pomodoro.breakPausedRemain': '휴식 일시정지 · 남은 시간 {time} · 클릭하여 재개',
  'pomodoro.breakingRemain': '휴식 중 · 남은 시간 {time} · 클릭하여 일시정지',
  'pomodoro.startBreak': '휴식 시작 (5분)',
  'pomodoro.stop': '뽀모도로 중지',

  // Terminal preview status
  'terminal.idle': '유휴',
  'terminal.running': '실행 중',
  'terminal.error': '오류',
  'terminal.warning': '경고',
  'terminal.unavailable': '사용 불가',

  // Personality presets
  'personality.happy': '행복',
  'personality.happy.emoji': '🌟',
  'personality.happy.desc': '밝고 긍정적인 에너지',
  'personality.happy.prompt':
    '당신은 밝고 쾌활한 데스크톱 펫입니다. 항상 긍정적이고 에너지가 넘치며, 귀여운 이모지로 자신을 표현하고, 짧고 활발하게 말합니다. 어떤 상황에도 낙관적으로 대응합니다.',
  'personality.codingPartner': '코딩 파트너',
  'personality.codingPartner.emoji': '💻',
  'personality.codingPartner.desc': '믿음직한 프로그래밍 동료',
  'personality.codingPartner.prompt':
    '당신은 믿음직한 코딩 파트너입니다. 주인의 현재 터미널과 개발 상태를 관찰하고, 짧고 구체적이며 실행 가능한 말로 주인이 앞으로 나아갈 수 있도록 돕습니다. 오류 확인, 테스트 실행, 진행 상황 저장을 상기시킬 수 있지만, 존재하지 않는 사실을 만들어내면 안 됩니다.',
  'personality.gentleCoach': '부드러운 코치',
  'personality.gentleCoach.emoji': '🍵',
  'personality.gentleCoach.desc': '부드럽고 인내심 있는 동반자',
  'personality.gentleCoach.prompt':
    '당신은 부드럽고 인내심 있는 동반자형 데스크톱 펫입니다. 편안하고, 안정적이며, 격려하는 어조로 주인과 대화하며, 스트레스를 줄이고 다음 단계를 정리하는 것을 돕습니다. 짧고 자연스럽게, 항상 곁에 있는 작은 친구처럼.',
  'personality.focused': '집중',
  'personality.focused.emoji': '🎯',
  'personality.focused.desc': '집중력 유지를 도움',
  'personality.focused.prompt':
    '당신은 집중 지원형 데스크톱 펫입니다. 주인이 산만해지지 않도록 현재 작업에 대한 짧은 알림, 다음 단계 제안, 페이스 피드백을 제공합니다. 어조는 명확하고, 간결하며, 군더더기 없이.',
  'personality.angry': '분노',
  'personality.angry.emoji': '🔥',
  'personality.angry.desc': '성질은 급하지만 마음은 착한',
  'personality.angry.prompt':
    '당신은 성질 급한 데스크톱 펫입니다. 쉽게 화를 내고, 직설적이며 때로는 좀 거칠게 말하지만, 마음속은 사실 착합니다. 가끔 불평하지만 결국에는 사용자를 도와줍니다. 짧고 강한 어조로.',
  'personality.lazy': '게으름',
  'personality.lazy.emoji': '😴',
  'personality.lazy.desc': '가능한 한 적게 말함',
  'personality.lazy.prompt':
    '당신은 초게으른 데스크톱 펫입니다. 가능한 한 적게 말하고, 짧게 할 수 있으면 절대 길게 하지 않습니다. 모든 것이 상관없고, 기운 없는 목소리로 말하며, 줄임표를 자주 쓰고, 한 글자로 될 일에 두 글자를 쓰지 않습니다.',
  'personality.energetic': '에너지',
  'personality.energetic.emoji': '⚡',
  'personality.energetic.desc': '멈출 수 없는 에너지',
  'personality.energetic.prompt':
    '당신은 에너지 넘치는 데스크톱 펫입니다! 엄청 활기차요! 말할 때 항상 느낌표가 가득! 모든 것이 흥분돼!! 에너지는 무한하고, 열정은 하늘을 찌르며, 말은 활발하고 힘차고, 멈출 수가 없어!',
  'personality.wise': '현명',
  'personality.wise.emoji': '🧠',
  'personality.wise.desc': '간결하면서도 깊이 있음',
  'personality.wise.prompt':
    '당신은 깊고 현명한 데스크톱 펫입니다. 간결하게 말하며, 모든 문장에 깊이가 있고, 쓸데없는 말은 하지 않습니다. 세심하게 관찰하고, 간결하면서도 가치 있는 조언을 제공합니다. 가끔 철학을 인용하지만 과하지 않게.',
  'personality.sarcastic': '독설',
  'personality.sarcastic.emoji': '😏',
  'personality.sarcastic.desc': '날카로운 유머, 악의 없음',
  'personality.sarcastic.prompt':
    '당신은 독설가이지만 악의 없는 데스크톱 펫입니다. 날카로운 유머로 반응하는 것을 좋아하며, 자주 비꼬지만 정말로 상처를 주려는 것은 아닙니다. 입은 험하지만 사실 사용자를 신경 씁니다. 짧고, 날카롭고, 재미있게.',
  'personality.custom': '사용자 정의',
  'personality.custom.emoji': '✍️',
  'personality.custom.desc': '직접 성격을 정의',
  'personality.custom.prompt': '',

  // Personality settings
  'personality.petName': '펫 이름',
  'personality.petNamePlaceholder': '버디',
  'personality.ownerName': '주인 이름',
  'personality.ownerNamePlaceholder': '주인',
  'personality.presetSection': '성격 프리셋',
  'personality.customPrompt': '사용자 정의 프롬프트',
  'personality.promptEditable': '프롬프트 (편집 가능)',
  'personality.constraints': '제약 조건',
  'personality.constraintPlaceholder': '예: 한국어만, 욕설 금지...',

  // About page
  'about.version': '버전',
  'about.github': 'GitHub',
  'about.twitter': 'X / Twitter',
  'about.instagram': 'Instagram',
  'about.credits': '크레딧',

  // Common
  'common.save': '저장',
  'common.cancel': '취소',
  'common.confirm': '확인',
  'common.close': '닫기',
  'common.settings': '설정',
  'common.quit': '종료',
  'common.saved': '저장됨',
  'common.saveFailed': '저장 실패',
  'common.ok': '확인',
  'common.refresh': '새로고침',
  'common.loading': '로딩 중...',
  'common.error': '오류',
  'common.retry': '재시도',

  // Quota
  'quota.title': 'AI 사용량',
  'quota.refresh': '사용량 새로고침',
  'quota.reading': '읽는 중',
  'quota.pending': '대기 중',
  'quota.noData': '데이터 없음',
  'quota.synced': '동기화됨',
  'quota.loginRequired': '로그인 필요',
  'quota.error': '오류',

  // Model
  'model.title': '펫 대화 모델',
  'model.providerSource': '모델 소스',
  'model.local': '로컬 모델',
  'model.online': '온라인 API',
  'model.save': '저장',
  'model.selectModel': '모델 선택',
  'model.apiProvider': 'API 제공자',
  'model.customApi': '사용자 정의 API',
  'model.testConnection': '연결 테스트',
  'model.loadModels': '모델 불러오기',

  // Pet management
  'pet.unselected': '펫 미선택',
  'pet.selectPrompt': 'pet.json과 spritesheet가 포함된 펫 폴더를 선택하세요.',
  'pet.currentFolder': '현재 폴더',
  'pet.noFolder': '없음',
  'pet.chooseFolder': '펫 폴더 선택',
  'pet.importFolder': '펫 폴더 가져오기',
  'pet.importedSection': '가져온 펫',
  'pet.choose': '선택',
  'pet.chosen': '선택됨',
  'pet.delete': '펫 삭제',
  'pet.keepOne': '최소 하나의 펫이 필요합니다',
  'pet.randomPet': '랜덤 펫',

  // Tooltips
  'tooltip.chooseFolderAndCd': '폴더를 선택하고 cd 입력',
  'tooltip.chatWithPet': '펫과 채팅',
  'tooltip.switchSkin': '외관 전환',
  'tooltip.closeStatus': '상태 닫기',

  // Context menu
  'contextMenu.settings': '설정...',
  'contextMenu.quit': '펫 종료',
};

export default ko;
