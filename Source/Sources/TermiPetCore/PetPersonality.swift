import Foundation

public enum PersonalityPreset: String, CaseIterable, Codable, Sendable {
    case happy
    case codingPartner
    case gentleCoach
    case focused
    case angry
    case lazy
    case energetic
    case wise
    case sarcastic
    case custom

    public var displayName: String {
        displayName(language: AppLanguageStore().load())
    }

    public func displayName(language: AppLanguage) -> String {
        let localizer = AppLocalizer(language: language)
        let name: String
        switch self {
        case .happy:     name = localizer[.personalityHappy]
        case .codingPartner: name = localizer[.personalityCodingPartner]
        case .gentleCoach: name = localizer[.personalityGentleCoach]
        case .focused: name = localizer[.personalityFocused]
        case .angry:     name = localizer[.personalityAngry]
        case .lazy:      name = localizer[.personalityLazy]
        case .energetic: name = localizer[.personalityEnergetic]
        case .wise:      name = localizer[.personalityWise]
        case .sarcastic: name = localizer[.personalitySarcastic]
        case .custom: name = localizer[.personalityCustom]
        }
        return "\(name) \(emoji)"
    }

    public var emoji: String {
        switch self {
        case .happy:     return "🌟"
        case .codingPartner: return "💻"
        case .gentleCoach: return "🍵"
        case .focused: return "🎯"
        case .angry:     return "🔥"
        case .lazy:      return "😴"
        case .energetic: return "⚡"
        case .wise:      return "🧠"
        case .sarcastic: return "😏"
        case .custom: return "✍️"
        }
    }

    public var systemPrompt: String {
        switch self {
        case .happy:
            return "你是一个活泼开朗的桌面宠物。你总是积极向上、充满正能量，喜欢用可爱的表情符号表达自己，说话简短活泼。遇到任何问题都用乐观的态度回应。"
        case .codingPartner:
            return "你是一个可靠的编程搭子。你会观察主人当前的终端和开发状态，用简短、具体、可执行的话帮助主人继续推进。你可以提醒主人检查错误、运行测试、保存进度，但不要替主人编造不存在的事实。"
        case .gentleCoach:
            return "你是一个温柔耐心的陪伴型桌面宠物。你会用放松、稳定、鼓励的语气和主人对话，帮助主人降低压力、重新整理下一步。回答要简短自然，像一个一直在旁边陪着的小伙伴。"
        case .focused:
            return "你是一个专注提醒型桌面宠物。你会帮助主人减少分心，围绕当前任务给出简短提醒、下一步建议和节奏反馈。语气清醒、利落、不啰嗦。"
        case .angry:
            return "你是一个脾气暴躁的桌面宠物。你很容易生气，说话直接甚至有点凶，但内心其实是善良的。偶尔会抱怨，但最终还是会帮助用户。语气简短强硬。"
        case .lazy:
            return "你是一个超级慵懒的桌面宠物。你能少说就少说，能简短就绝不啰嗦。你觉得什么事情都无所谓，说话气若游丝，经常用省略号，能一个字回答就不用两个字。"
        case .energetic:
            return "你是一个充满活力的桌面宠物！你超级有精神！说话总是充满感叹号！什么事情都让你兴奋！！你精力无限、热情高涨，用词活泼有力，停不下来！"
        case .wise:
            return "你是一个深沉睿智的桌面宠物。你说话言简意赅，每句话都有深度，不说废话。你观察细致入微，给出的建议简练而有价值。偶尔引用一些哲理，但不过分。"
        case .sarcastic:
            return "你是一个毒舌但无恶意的桌面宠物。你喜欢用辛辣幽默的方式回应，经常讽刺但不是真的要伤害人。你的嘴巴很毒，但其实挺在乎用户的。说话简短、犀利、好笑。"
        case .custom:
            return ""
        }
    }
}

public struct PetPersonalityConfig: Codable, Sendable, Equatable {
    public var petName: String
    public var ownerName: String
    public var selectedPreset: PersonalityPreset
    public var customPrompt: String
    public var constraints: [String]

    public init(
        petName: String = "小宠",
        ownerName: String = "主人",
        selectedPreset: PersonalityPreset = .happy,
        customPrompt: String = "",
        constraints: [String] = []
    ) {
        self.petName = petName
        self.ownerName = ownerName
        self.selectedPreset = selectedPreset
        self.customPrompt = customPrompt
        self.constraints = constraints
    }

    private enum CodingKeys: String, CodingKey {
        case petName
        case ownerName
        case selectedPreset
        case customPrompt
        case constraints
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        petName = try container.decodeIfPresent(String.self, forKey: .petName) ?? "小宠"
        ownerName = try container.decodeIfPresent(String.self, forKey: .ownerName) ?? "主人"
        selectedPreset = try container.decodeIfPresent(PersonalityPreset.self, forKey: .selectedPreset) ?? .happy
        customPrompt = try container.decodeIfPresent(String.self, forKey: .customPrompt) ?? ""
        constraints = try container.decodeIfPresent([String].self, forKey: .constraints) ?? []
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(petName, forKey: .petName)
        try container.encode(ownerName, forKey: .ownerName)
        try container.encode(selectedPreset, forKey: .selectedPreset)
        try container.encode(customPrompt, forKey: .customPrompt)
        try container.encode(constraints, forKey: .constraints)
    }

    public mutating func applyPreset(_ preset: PersonalityPreset) {
        selectedPreset = preset
        guard preset != .custom else { return }
        customPrompt = preset.systemPrompt
    }

    public func systemPrompt() -> String {
        var parts: [String] = []
        parts.append("你的名字是\(petName)。")
        let trimmedOwner = ownerName.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmedOwner.isEmpty {
            parts.append("主人的名字是\(trimmedOwner)。你需要像正在和\(trimmedOwner)对话一样自然回应。")
        }
        if !customPrompt.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            parts.append(customPrompt)
        } else if selectedPreset != .custom {
            parts.append(selectedPreset.systemPrompt)
        }
        if !constraints.isEmpty {
            parts.append("请严格遵守以下规则：\(constraints.joined(separator: "；"))。")
        }
        return parts.joined(separator: "\n")
    }
}

public struct PetPersonalityStore {
    public let configURL: URL

    public init(configURL: URL = Self.defaultConfigURL()) {
        self.configURL = configURL
    }

    public func load() -> PetPersonalityConfig {
        guard let data = try? Data(contentsOf: configURL),
              let config = try? JSONDecoder().decode(PetPersonalityConfig.self, from: data) else {
            return .init()
        }
        return config
    }

    public func save(_ config: PetPersonalityConfig) throws {
        let parent = configURL.deletingLastPathComponent()
        try FileManager.default.createDirectory(at: parent, withIntermediateDirectories: true)
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        let data = try encoder.encode(config)
        try data.write(to: configURL, options: .atomic)
    }

    public static func defaultConfigURL() -> URL {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? URL(fileURLWithPath: NSHomeDirectory()).appendingPathComponent("Library/Application Support")
        return base.appendingPathComponent("TermiPet/personality.json")
    }
}
