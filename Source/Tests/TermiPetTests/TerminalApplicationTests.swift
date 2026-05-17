import XCTest
@testable import TermiPetCore

final class TerminalApplicationTests: XCTestCase {
    func testRecognizesKnownTerminalBundleIdentifiers() {
        XCTAssertTrue(TerminalApplication.isSupported(bundleIdentifier: "com.apple.Terminal", localizedName: "Terminal"))
        XCTAssertTrue(TerminalApplication.isSupported(bundleIdentifier: "com.googlecode.iterm2", localizedName: "iTerm2"))
        XCTAssertTrue(TerminalApplication.isSupported(bundleIdentifier: "com.mitchellh.ghostty", localizedName: "Ghostty"))
        XCTAssertTrue(TerminalApplication.isSupported(bundleIdentifier: "dev.warp.Warp-Stable", localizedName: "Warp"))
    }

    func testRecognizesTerminalBundleIdentifierVariants() {
        XCTAssertTrue(TerminalApplication.isSupported(bundleIdentifier: "com.mitchellh.ghostty.debug", localizedName: nil))
        XCTAssertTrue(TerminalApplication.isSupported(bundleIdentifier: "dev.warp.Warp", localizedName: nil))
        XCTAssertTrue(TerminalApplication.isSupported(bundleIdentifier: "com.github.wez.wezterm-nightly", localizedName: nil))
        XCTAssertTrue(TerminalApplication.isSupported(bundleIdentifier: "org.alacritty.Alacritty", localizedName: nil))
    }

    func testRecognizesKnownTerminalNamesWhenBundleIdentifierIsUnavailable() {
        XCTAssertTrue(TerminalApplication.isSupported(bundleIdentifier: nil, localizedName: "Ghostty"))
        XCTAssertTrue(TerminalApplication.isSupported(bundleIdentifier: nil, localizedName: "WezTerm"))
        XCTAssertTrue(TerminalApplication.isSupported(bundleIdentifier: nil, localizedName: "Alacritty"))
        XCTAssertTrue(TerminalApplication.isSupported(bundleIdentifier: nil, localizedName: "Kitty"))
    }

    func testRejectsNonTerminalApplications() {
        XCTAssertFalse(TerminalApplication.isSupported(bundleIdentifier: "com.apple.finder", localizedName: "Finder"))
        XCTAssertFalse(TerminalApplication.isSupported(bundleIdentifier: "com.google.Chrome", localizedName: "Google Chrome"))
        XCTAssertFalse(TerminalApplication.isSupported(bundleIdentifier: "com.openai.chat", localizedName: "Codex"))
    }
}
