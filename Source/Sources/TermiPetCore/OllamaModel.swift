import Foundation

public struct OllamaModelDefinition: Sendable, Identifiable {
    public let id: String
    public let displayName: String
    public let description: String
    public let sizeLabel: String
}

public extension OllamaModelDefinition {
    static let catalog: [OllamaModelDefinition] = [
        .init(id: "qwen2.5:0.5b",  displayName: "Qwen2.5 0.5B",  description: "极轻量，适合低配，中文优秀",  sizeLabel: "~400MB"),
        .init(id: "qwen2.5:1.5b",  displayName: "Qwen2.5 1.5B",  description: "推荐，中文最优，速度快",      sizeLabel: "~1.1GB"),
        .init(id: "phi3.5",         displayName: "Phi-3.5 mini",   description: "微软出品，小体积高质量",      sizeLabel: "~2.2GB"),
        .init(id: "gemma3:1b",      displayName: "Gemma 3 1B",     description: "Google 出品，均衡轻量",       sizeLabel: "~815MB"),
    ]

    func localizedDescription(_ localizer: AppLocalizer) -> String {
        switch id {
        case "qwen2.5:0.5b": return localizer.text(.ollamaDescQwenSmall)
        case "qwen2.5:1.5b": return localizer.text(.ollamaDescQwenRecommended)
        case "phi3.5":       return localizer.text(.ollamaDescPhi35)
        case "gemma3:1b":    return localizer.text(.ollamaDescGemma1b)
        default:             return description
        }
    }
}

public enum OllamaModelStatus: Sendable, Equatable {
    case notDownloaded
    case downloading(progress: Double)
    case ready
    case error(String)
}

public enum PetLocalModelSetupState: Sendable, Equatable {
    case notInstalledOrNotRunning
    case starting
    case runningNoModel
    case downloadingModel
    case ready
    case error

    public static func resolve(
        ollamaRunning: Bool,
        isStarting: Bool = false,
        recommendedModelId: String,
        downloadedIds: Set<String>,
        downloadStatus: OllamaModelStatus
    ) -> PetLocalModelSetupState {
        if isStarting {
            return .starting
        }

        guard ollamaRunning else {
            return .notInstalledOrNotRunning
        }

        switch downloadStatus {
        case .downloading:
            return .downloadingModel
        case .error:
            return .error
        case .ready:
            return .ready
        case .notDownloaded:
            return downloadedIds.isEmpty ? .runningNoModel : .ready
        }
    }
}

public enum PetChatModelProvider: String, Codable, Sendable, CaseIterable {
    case local
    case online

    public var displayName: String {
        switch self {
        case .local: return "本地模型"
        case .online: return "线上 API"
        }
    }

    public func localizedDisplayName(_ localizer: AppLocalizer) -> String {
        switch self {
        case .local: return localizer.text(.modelProviderLocal)
        case .online: return localizer.text(.modelProviderOnline)
        }
    }
}

public enum PetOnlineProvider: String, Codable, Sendable, CaseIterable {
    case openAI
    case google
    case custom

    public var displayName: String {
        switch self {
        case .openAI: return "OpenAI"
        case .google: return "Google Gemini"
        case .custom: return "自定义 API"
        }
    }

    public func localizedDisplayName(_ localizer: AppLocalizer) -> String {
        switch self {
        case .openAI: return "OpenAI"
        case .google: return "Google Gemini"
        case .custom: return localizer.text(.modelOnlineProviderCustom)
        }
    }

    public var defaultBaseURL: String {
        switch self {
        case .openAI: return "https://api.openai.com/v1"
        case .google: return "https://generativelanguage.googleapis.com/v1beta"
        case .custom: return ""
        }
    }

    public var defaultModel: String {
        switch self {
        case .openAI: return "gpt-4o-mini"
        case .google: return "gemini-2.5-flash"
        case .custom: return ""
        }
    }
}

public struct PetChatModelConfig: Codable, Sendable, Equatable {
    public static let defaultLocalModelId = "qwen2.5:1.5b"

    public var provider: PetChatModelProvider
    public var localModelId: String
    public var onlineProvider: PetOnlineProvider
    public var openAIBaseURL: String
    public var openAIModel: String
    public var googleBaseURL: String
    public var googleModel: String
    public var customBaseURL: String
    public var customModel: String

    public init(
        provider: PetChatModelProvider = .local,
        localModelId: String = Self.defaultLocalModelId,
        onlineProvider: PetOnlineProvider = .openAI,
        openAIBaseURL: String = PetOnlineProvider.openAI.defaultBaseURL,
        openAIModel: String = PetOnlineProvider.openAI.defaultModel,
        googleBaseURL: String = PetOnlineProvider.google.defaultBaseURL,
        googleModel: String = PetOnlineProvider.google.defaultModel,
        customBaseURL: String = "",
        customModel: String = ""
    ) {
        self.provider = provider
        self.localModelId = localModelId
        self.onlineProvider = onlineProvider
        self.openAIBaseURL = openAIBaseURL
        self.openAIModel = openAIModel
        self.googleBaseURL = googleBaseURL
        self.googleModel = googleModel
        self.customBaseURL = customBaseURL
        self.customModel = customModel
    }

    public var selectedModelId: String {
        get { localModelId }
        set { localModelId = newValue }
    }

    public func canSelectLocalModel(_ id: String, downloadedIds: Set<String>) -> Bool {
        downloadedIds.contains(id)
    }

    public func modelName(for provider: PetOnlineProvider) -> String {
        switch provider {
        case .openAI: return openAIModel
        case .google: return googleModel
        case .custom: return customModel
        }
    }

    public func baseURLString(for provider: PetOnlineProvider) -> String {
        switch provider {
        case .openAI: return openAIBaseURL
        case .google: return googleBaseURL
        case .custom: return customBaseURL
        }
    }
}

public typealias OllamaConfig = PetChatModelConfig

public struct PetChatModelConfigStore {
    public let configURL: URL

    public init(configURL: URL = Self.defaultConfigURL()) {
        self.configURL = configURL
    }

    public func load() -> PetChatModelConfig {
        guard let data = try? Data(contentsOf: configURL),
              let config = try? JSONDecoder().decode(PetChatModelConfig.self, from: data) else {
            return .init()
        }
        return config
    }

    public func save(_ config: PetChatModelConfig) throws {
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
        return base.appendingPathComponent("TermiPet/ollama-config.json")
    }
}

public typealias OllamaConfigStore = PetChatModelConfigStore
