import XCTest
@testable import TermiPet

final class HoverVisibilityControllerTests: XCTestCase {
    func testPetEnterShowsPanel() {
        var controller = HoverVisibilityController()

        let token = controller.handle(.petEntered)

        XCTAssertNil(token)
        XCTAssertTrue(controller.state.isVisible)
        XCTAssertTrue(controller.state.isPetHovered)
        XCTAssertNil(controller.state.pendingHideToken)
    }

    func testPetExitSchedulesHideButDoesNotHideImmediately() {
        var controller = HoverVisibilityController()
        _ = controller.handle(.petEntered)

        let token = controller.handle(.petExited)

        XCTAssertNotNil(token)
        XCTAssertTrue(controller.state.isVisible)
        XCTAssertFalse(controller.state.isPetHovered)
        XCTAssertEqual(controller.state.pendingHideToken, token)
    }

    func testPetReenterCancelsPendingHide() {
        var controller = HoverVisibilityController()
        _ = controller.handle(.petEntered)
        let token = controller.handle(.petExited)

        _ = controller.handle(.petEntered)

        XCTAssertNotNil(token)
        XCTAssertTrue(controller.state.isVisible)
        XCTAssertTrue(controller.state.isPetHovered)
        XCTAssertNil(controller.state.pendingHideToken)
    }

    func testOldHideTokenCannotHideAfterReenter() {
        var controller = HoverVisibilityController()
        _ = controller.handle(.petEntered)
        let token = controller.handle(.petExited)!

        _ = controller.handle(.petEntered)
        _ = controller.handle(.hideDelayElapsed(token))

        XCTAssertTrue(controller.state.isVisible)
        XCTAssertNil(controller.state.pendingHideToken)
    }

    func testPinnedPanelDoesNotHideAfterPetExit() {
        var controller = HoverVisibilityController()
        _ = controller.handle(.petEntered)
        _ = controller.handle(.pinChanged(true))

        let token = controller.handle(.petExited)

        XCTAssertNil(token)
        XCTAssertTrue(controller.state.isVisible)
        XCTAssertTrue(controller.state.isPinned)
        XCTAssertNil(controller.state.pendingHideToken)
    }

    func testPanelHoverKeepsPanelVisibleAfterPetExit() {
        var controller = HoverVisibilityController()
        _ = controller.handle(.petEntered)
        _ = controller.handle(.panelEntered)

        let token = controller.handle(.petExited)

        XCTAssertNil(token)
        XCTAssertTrue(controller.state.isVisible)
        XCTAssertTrue(controller.state.isPanelHovered)
        XCTAssertNil(controller.state.pendingHideToken)
    }

    func testOpenedPanelCanHideAfterPetAndPanelExitWhenUnpinned() {
        var controller = HoverVisibilityController()
        _ = controller.handle(.petEntered)
        _ = controller.handle(.panelEntered)
        _ = controller.handle(.petExited)

        let token = controller.handle(.panelExited)!
        _ = controller.handle(.hideDelayElapsed(token))

        XCTAssertFalse(controller.state.isVisible)
        XCTAssertFalse(controller.state.isPetHovered)
        XCTAssertFalse(controller.state.isPanelHovered)
        XCTAssertNil(controller.state.pendingHideToken)
    }

    func testUnpinnedPanelHidesAfterLeavingPetAndPanelAndDelayElapses() {
        var controller = HoverVisibilityController()
        _ = controller.handle(.petEntered)
        _ = controller.handle(.panelEntered)
        _ = controller.handle(.petExited)
        let token = controller.handle(.panelExited)!

        _ = controller.handle(.hideDelayElapsed(token))

        XCTAssertFalse(controller.state.isVisible)
        XCTAssertNil(controller.state.pendingHideToken)
    }

    func testModalPresentationKeepsPanelVisibleAfterHoverExit() {
        var controller = HoverVisibilityController()
        _ = controller.handle(.petEntered)
        _ = controller.handle(.panelEntered)
        _ = controller.handle(.modalPresentationChanged(true))

        _ = controller.handle(.petExited)
        let token = controller.handle(.panelExited)

        XCTAssertNil(token)
        XCTAssertTrue(controller.state.isVisible)
        XCTAssertTrue(controller.state.isModalPresented)
        XCTAssertNil(controller.state.pendingHideToken)
    }

    func testPanelCanHideAfterModalDismissesAndHoverHasExited() {
        var controller = HoverVisibilityController()
        _ = controller.handle(.petEntered)
        _ = controller.handle(.panelEntered)
        _ = controller.handle(.modalPresentationChanged(true))
        _ = controller.handle(.petExited)
        _ = controller.handle(.panelExited)

        let token = controller.handle(.modalPresentationChanged(false))

        XCTAssertNotNil(token)
        XCTAssertTrue(controller.state.isVisible)
        XCTAssertEqual(controller.state.pendingHideToken, token)
    }
}
