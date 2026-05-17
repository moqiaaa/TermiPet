import XCTest
@testable import TermiPetCore

final class PreviewCardTapPolicyTests: XCTestCase {
    func testPreviewCardTapActivatesTargetWithoutDismissingItem() {
        let item = WorkspacePreviewItem(
            id: "claude:window:com.mitchellh.ghostty:123:TermiPet - claude",
            source: .claude,
            status: .idle,
            title: "Claude Code",
            summary: "Done",
            targetBundleIdentifier: "com.mitchellh.ghostty",
            targetProcessIdentifier: 123,
            targetWindowTitle: "TermiPet - claude"
        )

        let action = PreviewCardTapPolicy.action(for: item)

        XCTAssertTrue(action.shouldActivateTarget)
        XCTAssertFalse(action.shouldDismissPreview)
    }
}
