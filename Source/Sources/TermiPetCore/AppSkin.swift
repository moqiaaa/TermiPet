import Foundation

public enum AppSkin: String, CaseIterable, Codable, Sendable {
    case glass
    case dark
    case pixel

    public static let toolbarIconSlotSize: Double = 34
    public static let petActionButtonCount: Double = 9
    public static let petActionButtonSpacing: Double = 7
    public static let petActionBarHorizontalPadding: Double = 14
    public static let floatingContentLeadingPadding: Double = 10
    public static let floatingRootWidth: Double = 398

    public static var petActionBarWidth: Double {
        toolbarIconSlotSize * petActionButtonCount
            + petActionButtonSpacing * (petActionButtonCount - 1)
            + petActionBarHorizontalPadding
    }

    public var displayName: String {
        displayName(language: AppLanguageStore().load())
    }

    public func displayName(language: AppLanguage) -> String {
        let localizer = AppLocalizer(language: language)
        switch self {
        case .glass: return localizer[.skinGlass]
        case .dark: return localizer[.skinDark]
        case .pixel: return localizer[.skinPixel]
        }
    }

    public var usesBlurredSettingsWindowBackground: Bool {
        self == .glass
    }

    public static var `default`: AppSkin { .glass }
}

public struct AppSkinStore {
    private let userDefaults: UserDefaults
    private let key = "app_skin"

    public init(userDefaults: UserDefaults = .standard) {
        self.userDefaults = userDefaults
    }

    public func load() -> AppSkin {
        guard let raw = userDefaults.string(forKey: key),
              let skin = AppSkin(rawValue: raw) else {
            return .default
        }
        return skin
    }

    public func save(_ skin: AppSkin) {
        userDefaults.set(skin.rawValue, forKey: key)
        userDefaults.synchronize()
    }
}
