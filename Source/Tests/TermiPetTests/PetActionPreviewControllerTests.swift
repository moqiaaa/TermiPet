import XCTest
@testable import TermiPetCore

final class PetActionPreviewControllerTests: XCTestCase {
    func testNewActionReplacesPreviousPreview() {
        var controller = PetActionPreviewController()

        _ = controller.trigger(action: 0)
        _ = controller.trigger(action: 3)

        XCTAssertEqual(controller.currentAction, 3)
    }

    func testOldTokenCannotExpireNewAction() {
        var controller = PetActionPreviewController()

        let oldToken = controller.trigger(action: 0)
        _ = controller.trigger(action: 3)
        let expired = controller.expire(token: oldToken)

        XCTAssertFalse(expired)
        XCTAssertEqual(controller.currentAction, 3)
    }

    func testCurrentTokenExpiresPreview() {
        var controller = PetActionPreviewController()

        let token = controller.trigger(action: 5)
        let expired = controller.expire(token: token)

        XCTAssertTrue(expired)
        XCTAssertNil(controller.currentAction)
    }
}
