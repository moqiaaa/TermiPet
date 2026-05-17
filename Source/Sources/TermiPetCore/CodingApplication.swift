import Foundation

public enum CodingAppKind: String, Sendable, Equatable {
    case terminal
    case editor
    case aiChat
    case unknown
}

public struct CodingAppInfo: Sendable, Equatable {
    public let kind: CodingAppKind
    public let displayName: String
    public let bundleIdentifier: String?

    public init(kind: CodingAppKind, displayName: String, bundleIdentifier: String?) {
        self.kind = kind
        self.displayName = displayName
        self.bundleIdentifier = bundleIdentifier
    }
}

public enum CodingApplication {
    private static let terminalBundleIdentifiers: Set<String> = [
        "co.zeit.hyper",
        "com.apple.terminal",
        "com.electron.hyper",
        "com.googlecode.iterm2",
        "com.mitchellh.ghostty",
        "io.alacritty",
        "io.hyper",
        "net.kovidgoyal.kitty",
        "org.alacritty",
        "sh.kovidgoyal.kitty",
    ]

    private static let terminalBundlePrefixes: [String] = [
        "com.github.wez.wezterm",
        "com.mitchellh.ghostty",
        "dev.warp.warp",
        "org.alacritty",
    ]

    private static let terminalNames: Set<String> = [
        "alacritty",
        "contour",
        "ghostty",
        "hyper",
        "iterm",
        "iterm2",
        "kitty",
        "rio",
        "tabby",
        "terminal",
        "warp",
        "wezterm",
    ]

    private static let editorBundleIdentifiers: Set<String> = [
        "com.todesktop.230313mzl4w4u92",        // Cursor
        "com.microsoft.VSCode",
        "com.microsoft.VSCodeInsiders",
        "com.visualstudio.code.oss",
        "com.apple.dt.Xcode",
        "dev.zed.Zed",
        "dev.zed.Zed-Preview",
        "com.jetbrains.intellij",
        "com.jetbrains.intellij.ce",
        "com.jetbrains.pycharm",
        "com.jetbrains.pycharm.ce",
        "com.jetbrains.WebStorm",
        "com.jetbrains.goland",
        "com.jetbrains.rider",
        "com.jetbrains.CLion",
        "com.jetbrains.AppCode",
        "com.jetbrains.RubyMine",
        "com.jetbrains.PhpStorm",
        "com.jetbrains.datagrip",
        "com.jetbrains.fleet",
        "com.google.android.studio",
        "com.sublimetext.4",
        "com.sublimetext.3",
        "com.panic.Nova",
        "com.exafunction.windsurf",
        "com.exafunction.windsurf-next",
    ]

    private static let editorBundlePrefixes: [String] = [
        "com.todesktop.",                       // todesktop builds (Cursor 等)
        "com.jetbrains.",
        "com.exafunction.windsurf",
    ]

    private static let editorNames: Set<String> = [
        "androidstudio",
        "appcode",
        "clion",
        "code",
        "codeinsiders",
        "cursor",
        "datagrip",
        "fleet",
        "goland",
        "intellijidea",
        "intellijideace",
        "intellijideacommunityedition",
        "nova",
        "phpstorm",
        "pycharm",
        "pycharmce",
        "pycharmcommunityedition",
        "rider",
        "rubymine",
        "sublimetext",
        "visualstudiocode",
        "webstorm",
        "windsurf",
        "xcode",
        "zed",
        "zedpreview",
    ]

    private static let aiChatBundleIdentifiers: Set<String> = [
        "com.anthropic.claudefordesktop",
        "com.openai.chat",
    ]

    private static let aiChatNames: Set<String> = [
        "chatgpt",
        "claude",
        "claudefordesktop",
    ]

    public static func classify(bundleIdentifier: String?, localizedName: String?) -> CodingAppInfo {
        let normalizedBundle = bundleIdentifier?.lowercased()
        let normalizedName = localizedName.map(normalize) ?? ""
        let display = localizedName ?? bundleIdentifier ?? "Unknown"

        if let normalizedBundle {
            if terminalBundleIdentifiers.contains(normalizedBundle)
                || terminalBundlePrefixes.contains(where: { normalizedBundle.hasPrefix($0) })
            {
                return CodingAppInfo(kind: .terminal, displayName: display, bundleIdentifier: bundleIdentifier)
            }
            if aiChatBundleIdentifiers.contains(normalizedBundle) {
                return CodingAppInfo(kind: .aiChat, displayName: display, bundleIdentifier: bundleIdentifier)
            }
            if editorBundleIdentifiers.contains(normalizedBundle)
                || editorBundlePrefixes.contains(where: { normalizedBundle.hasPrefix($0) })
            {
                return CodingAppInfo(kind: .editor, displayName: display, bundleIdentifier: bundleIdentifier)
            }
        }

        if !normalizedName.isEmpty {
            if terminalNames.contains(normalizedName) {
                return CodingAppInfo(kind: .terminal, displayName: display, bundleIdentifier: bundleIdentifier)
            }
            if aiChatNames.contains(normalizedName) {
                return CodingAppInfo(kind: .aiChat, displayName: display, bundleIdentifier: bundleIdentifier)
            }
            if editorNames.contains(normalizedName) {
                return CodingAppInfo(kind: .editor, displayName: display, bundleIdentifier: bundleIdentifier)
            }
        }

        return CodingAppInfo(kind: .unknown, displayName: display, bundleIdentifier: bundleIdentifier)
    }

    public static func isTerminal(bundleIdentifier: String?, localizedName: String?) -> Bool {
        classify(bundleIdentifier: bundleIdentifier, localizedName: localizedName).kind == .terminal
    }

    private static func normalize(_ value: String) -> String {
        value
            .lowercased()
            .filter { $0.isLetter || $0.isNumber }
    }
}
