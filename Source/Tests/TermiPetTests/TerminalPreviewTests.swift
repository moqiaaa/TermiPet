import XCTest
@testable import TermiPetCore

final class TerminalPreviewTests: XCTestCase {
    func testExtractsErrorAsStrongestSignal() {
        let preview = TerminalPreview.extract(
            appName: "Ghostty",
            windowTitle: "project",
            text: "$ npm run build\nwarning: deprecated API\nerror: Cannot find module './preview'\n"
        )

        XCTAssertEqual(preview.status, .error)
        XCTAssertEqual(preview.title, "Ghostty")
        XCTAssertEqual(preview.summary, "Error: Cannot find module './preview'")
        XCTAssertEqual(preview.detail, "Last command: npm run build")
    }

    func testExtractsWarningWhenNoErrorExists() {
        let preview = TerminalPreview.extract(
            appName: "Terminal",
            windowTitle: nil,
            text: "$ swift build\nwarning: unused variable value\nBuild complete\n"
        )

        XCTAssertEqual(preview.status, .warning)
        XCTAssertEqual(preview.summary, "Warning: unused variable value")
    }

    func testExtractsRunningCommandWhenNoErrorOrWarningExists() {
        let preview = TerminalPreview.extract(
            appName: "iTerm2",
            windowTitle: nil,
            text: "$ claude --enable-auto-mode\nThinking...\n"
        )

        XCTAssertEqual(preview.status, .running)
        XCTAssertEqual(preview.summary, "Running: claude --enable-auto-mode")
    }

    func testUnavailablePreview() {
        let preview = TerminalPreview.unavailable(appName: "Warp")

        XCTAssertEqual(preview.status, .unavailable)
        XCTAssertEqual(preview.summary, "Cannot read this terminal.")
    }
}
