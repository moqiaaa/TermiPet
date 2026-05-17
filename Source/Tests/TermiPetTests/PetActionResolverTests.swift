import XCTest
@testable import TermiPetCore

final class PetActionResolverTests: XCTestCase {
    func testDraggingUsesSecondRunAction() {
        // 拖动时不改变动作，保持 previewAction
        let action = PetActionResolver.resolve(
            isDragging: true,
            previewAction: 7,
            commandsExpanded: true,
            suggestedAction: 5
        )

        XCTAssertEqual(action, 7)
    }

    func testDragEndReturnsToOriginalActionPriority() {
        let action = PetActionResolver.resolve(
            isDragging: false,
            previewAction: nil,
            commandsExpanded: false,
            suggestedAction: 3
        )

        XCTAssertEqual(action, 3)
    }
}
