import Foundation

public enum AppLanguage: String, CaseIterable, Codable, Sendable {
    case simplifiedChinese = "zh-Hans"
    case english = "en"
    case traditionalChinese = "zh-Hant"
    case japanese = "ja"
    case korean = "ko"

    public var displayName: String {
        switch self {
        case .simplifiedChinese: return "简体中文"
        case .traditionalChinese: return "繁體中文"
        case .english: return "English"
        case .japanese: return "日本語"
        case .korean: return "한국어"
        }
    }

    public static var `default`: AppLanguage {
        .simplifiedChinese
    }
}

public struct AppLanguageStore {
    private let userDefaults: UserDefaults

    public init(userDefaults: UserDefaults = .standard) {
        self.userDefaults = userDefaults
    }

    public func load() -> AppLanguage {
        if let raw = userDefaults.string(forKey: "app_language"),
           let language = AppLanguage(rawValue: raw) {
            return language
        }
        return .default
    }

    public func save(_ language: AppLanguage) {
        userDefaults.set(language.rawValue, forKey: "app_language")
        userDefaults.synchronize()
    }
}
