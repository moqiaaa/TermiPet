import XCTest
@testable import TermiPetCore

final class ClaudeSessionPreviewTests: XCTestCase {
    func testClaudePreviewIDUsesTerminalWindowAcrossSessionTurns() {
        let firstTurn = WorkspacePreviewItem.claudeID(
            sessionID: "session-1",
            cwd: "/Users/bleet/Desktop/TermiPet",
            targetBundleIdentifier: "com.mitchellh.ghostty",
            targetProcessIdentifier: 123,
            targetWindowTitle: "TermiPet - claude"
        )
        let secondTurn = WorkspacePreviewItem.claudeID(
            sessionID: "session-2",
            cwd: "/Users/bleet/Desktop/TermiPet",
            targetBundleIdentifier: "com.mitchellh.ghostty",
            targetProcessIdentifier: 123,
            targetWindowTitle: "TermiPet - claude"
        )

        XCTAssertEqual(firstTurn, secondTurn)
        XCTAssertEqual(firstTurn, "claude:window:com.mitchellh.ghostty:123:TermiPet - claude")
    }

    func testClaudePreviewIDKeepsDifferentTerminalWindowsSeparate() {
        let firstWindow = WorkspacePreviewItem.claudeID(
            sessionID: "session-1",
            cwd: "/Users/bleet/Desktop/TermiPet",
            targetBundleIdentifier: "com.mitchellh.ghostty",
            targetProcessIdentifier: 123,
            targetWindowTitle: "TermiPet - claude"
        )
        let secondWindow = WorkspacePreviewItem.claudeID(
            sessionID: "session-1",
            cwd: "/Users/bleet/Desktop/TermiPet",
            targetBundleIdentifier: "com.mitchellh.ghostty",
            targetProcessIdentifier: 456,
            targetWindowTitle: "Other - claude"
        )

        XCTAssertNotEqual(firstWindow, secondWindow)
    }

    func testClaudePreviewIDFallsBackToWorkingDirectoryAcrossSessions() {
        let firstTurn = WorkspacePreviewItem.claudeID(
            sessionID: "session-1",
            cwd: "/Users/bleet/Desktop/TermiPet"
        )
        let secondTurn = WorkspacePreviewItem.claudeID(
            sessionID: "session-2",
            cwd: "/Users/bleet/Desktop/TermiPet"
        )

        XCTAssertEqual(firstTurn, secondTurn)
        XCTAssertEqual(firstTurn, "claude:cwd:/Users/bleet/Desktop/TermiPet")
    }
}
