import XCTest
@testable import TermiPetCore

final class CodingApplicationTests: XCTestCase {
    func testClassifiesTerminalsAsTerminal() {
        let cases: [(String?, String?)] = [
            ("com.apple.Terminal", "Terminal"),
            ("com.mitchellh.ghostty", "Ghostty"),
            ("com.googlecode.iterm2", "iTerm2"),
            ("dev.warp.Warp-Stable", "Warp"),
            ("com.github.wez.wezterm", "WezTerm"),
            ("net.kovidgoyal.kitty", "kitty"),
            ("org.alacritty", "Alacritty"),
            (nil, "Hyper"),
        ]
        for (bundle, name) in cases {
            let info = CodingApplication.classify(bundleIdentifier: bundle, localizedName: name)
            XCTAssertEqual(info.kind, .terminal, "\(bundle ?? "nil") / \(name ?? "nil") should be terminal")
        }
    }

    func testClassifiesEditorsAsEditor() {
        let cases: [(String?, String?)] = [
            ("com.todesktop.230313mzl4w4u92", "Cursor"),
            ("com.microsoft.VSCode", "Code"),
            ("com.microsoft.VSCodeInsiders", "Code - Insiders"),
            ("com.apple.dt.Xcode", "Xcode"),
            ("dev.zed.Zed", "Zed"),
            ("dev.zed.Zed-Preview", "Zed Preview"),
            ("com.jetbrains.intellij", "IntelliJ IDEA"),
            ("com.jetbrains.pycharm.ce", "PyCharm CE"),
            ("com.jetbrains.WebStorm", "WebStorm"),
            ("com.jetbrains.goland", "GoLand"),
            ("com.jetbrains.rider", "Rider"),
            ("com.jetbrains.CLion", "CLion"),
            ("com.google.android.studio", "Android Studio"),
            ("com.sublimetext.4", "Sublime Text"),
            ("com.panic.Nova", "Nova"),
            ("com.exafunction.windsurf", "Windsurf"),
        ]
        for (bundle, name) in cases {
            let info = CodingApplication.classify(bundleIdentifier: bundle, localizedName: name)
            XCTAssertEqual(info.kind, .editor, "\(bundle ?? "nil") / \(name ?? "nil") should be editor")
        }
    }

    func testClassifiesAIChatAsAIChat() {
        let cases: [(String?, String?)] = [
            ("com.anthropic.claudefordesktop", "Claude"),
            ("com.openai.chat", "ChatGPT"),
            (nil, "ChatGPT"),
        ]
        for (bundle, name) in cases {
            let info = CodingApplication.classify(bundleIdentifier: bundle, localizedName: name)
            XCTAssertEqual(info.kind, .aiChat, "\(bundle ?? "nil") / \(name ?? "nil") should be aiChat")
        }
    }

    func testReturnsUnknownForUnrelatedApps() {
        let cases: [(String?, String?)] = [
            ("com.apple.Safari", "Safari"),
            ("com.apple.finder", "Finder"),
            ("com.tinyspeck.slackmacgap", "Slack"),
            (nil, nil),
        ]
        for (bundle, name) in cases {
            let info = CodingApplication.classify(bundleIdentifier: bundle, localizedName: name)
            XCTAssertEqual(info.kind, .unknown, "\(bundle ?? "nil") / \(name ?? "nil") should be unknown")
        }
    }

    func testTerminalApplicationStillRecognizesKnownTerminals() {
        XCTAssertTrue(TerminalApplication.isSupported(bundleIdentifier: "com.mitchellh.ghostty", localizedName: "Ghostty"))
        XCTAssertTrue(TerminalApplication.isSupported(bundleIdentifier: nil, localizedName: "Terminal"))
        XCTAssertFalse(TerminalApplication.isSupported(bundleIdentifier: "com.microsoft.VSCode", localizedName: "Code"))
    }
}
