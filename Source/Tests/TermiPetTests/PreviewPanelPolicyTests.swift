import XCTest
@testable import TermiPetCore

final class PreviewPanelPolicyTests: XCTestCase {
    func testStickyPreviewShowsForEveryAvailableStatus() {
        for status in [TerminalPreview.Status.running, .warning, .error] {
            let preview = TerminalPreview(status: status, title: "Terminal", summary: "Status")

            XCTAssertTrue(PreviewPanelPolicy.shouldShowStickyPreview(preview: preview, agentState: .idle))
        }
    }

    func testStickyPreviewHidesIdleStatus() {
        let preview = TerminalPreview(status: .idle, title: "Terminal", summary: "Idle")

        XCTAssertFalse(PreviewPanelPolicy.shouldShowStickyPreview(preview: preview, agentState: .idle))
    }

    func testStickyPreviewHidesWhenUnavailableAndNoAgentState() {
        let preview = TerminalPreview.unavailable(appName: "Terminal")

        XCTAssertFalse(PreviewPanelPolicy.shouldShowStickyPreview(preview: preview, agentState: .idle))
    }

    func testStickyPreviewShowsForAgentStateEvenWhenPreviewUnavailable() {
        let preview = TerminalPreview.unavailable(appName: nil)

        XCTAssertTrue(PreviewPanelPolicy.shouldShowStickyPreview(preview: preview, agentState: .working))
        XCTAssertTrue(PreviewPanelPolicy.shouldShowStickyPreview(preview: preview, agentState: .stopped))
        XCTAssertFalse(PreviewPanelPolicy.shouldShowStickyPreview(preview: preview, agentState: .idle))
    }
}
