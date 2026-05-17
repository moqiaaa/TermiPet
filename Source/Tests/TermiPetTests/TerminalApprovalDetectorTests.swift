import XCTest
@testable import TermiPetCore

final class TerminalApprovalDetectorTests: XCTestCase {
    func testDetectsYesNoPromptAsTypeYesEnter() {
        let prompt = TerminalApprovalDetector.detect(
            appName: "Ghostty",
            windowTitle: "TermiPet",
            text: "Run command `swift test`?\nProceed? (y/N)"
        )

        XCTAssertEqual(prompt?.action, .typeYesEnter)
        XCTAssertEqual(prompt?.executionHint, "Y + Enter")
    }

    func testDetectsPressEnterPromptAsPressEnter() {
        let prompt = TerminalApprovalDetector.detect(
            appName: "Terminal",
            windowTitle: nil,
            text: "Permission granted.\nPress Enter to continue"
        )

        XCTAssertEqual(prompt?.action, .pressEnter)
        XCTAssertEqual(prompt?.executionHint, "Enter")
    }

    func testDetectsAllowChoiceAsHighlightedAllow() {
        let prompt = TerminalApprovalDetector.detect(
            appName: "iTerm2",
            windowTitle: nil,
            text: "Do you want to allow this tool?\n❯ 1. Allow\n  2. Deny"
        )

        XCTAssertEqual(prompt?.action, .selectHighlightedAllow)
        XCTAssertEqual(prompt?.executionHint, "Enter")
    }

    func testIgnoresOrdinaryOutput() {
        let prompt = TerminalApprovalDetector.detect(
            appName: "Warp",
            windowTitle: nil,
            text: "Build complete\nTests passed"
        )

        XCTAssertNil(prompt)
    }
}
