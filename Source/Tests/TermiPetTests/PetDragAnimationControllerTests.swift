import XCTest
@testable import TermiPet

@MainActor
final class PetDragAnimationControllerTests: XCTestCase {
    func testBeginDraggingTurnsOnImmediately() async {
        let controller = PetDragAnimationController(startDelay: .milliseconds(20), endDelay: .milliseconds(20))

        controller.beginDragging()
        XCTAssertTrue(controller.isDragging)
    }

    func testEndDraggingTurnsOffAfterDelay() async {
        let controller = PetDragAnimationController(startDelay: .milliseconds(50), endDelay: .milliseconds(20))

        controller.beginDragging()
        XCTAssertTrue(controller.isDragging)

        controller.endDragging()

        try? await Task.sleep(for: .milliseconds(50))

        XCTAssertFalse(controller.isDragging)
    }
}
