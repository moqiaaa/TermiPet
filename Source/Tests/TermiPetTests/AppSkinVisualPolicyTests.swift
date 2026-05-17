import XCTest
@testable import TermiPet
@testable import TermiPetCore

final class AppSkinVisualPolicyTests: XCTestCase {
    func testPixelSkinIsAvailableAsHardEdgedToolbarSkin() {
        XCTAssertTrue(AppSkin.allCases.contains(.pixel))
        XCTAssertEqual(AppSkin.pixel.displayName, "像素")
    }

    func testToolbarIconSlotUsesStableSquareSize() {
        XCTAssertEqual(AppSkin.toolbarIconSlotSize, 34)
    }

    func testFloatingPanelWidthContainsActionBar() {
        XCTAssertLessThanOrEqual(AppSkin.petActionBarWidth, AppSkin.floatingRootWidth - AppSkin.floatingContentLeadingPadding)
    }

    func testGlassSettingsWindowUsesBlurredBackgroundMaterial() {
        XCTAssertTrue(AppSkin.glass.usesBlurredSettingsWindowBackground)
        XCTAssertFalse(AppSkin.dark.usesBlurredSettingsWindowBackground)
        XCTAssertFalse(AppSkin.pixel.usesBlurredSettingsWindowBackground)
    }

    func testSettingsWindowSizeMatchesContentLayout() {
        XCTAssertEqual(PetSettingsWindowLayout.size.width, 860)
        XCTAssertEqual(PetSettingsWindowLayout.size.height, 580)
    }

    func testSettingsWindowDividerSpansFullWindowHeight() {
        XCTAssertEqual(PetSettingsWindowLayout.dividerWidth, 1)
        XCTAssertEqual(PetSettingsWindowLayout.dividerHeight, PetSettingsWindowLayout.size.height)
    }

    func testMainMenuProvidesStandardCloseWindowShortcut() {
        XCTAssertEqual(AppMainMenuPolicy.closeWindowKeyEquivalent, "w")
        XCTAssertEqual(AppMainMenuPolicy.closeWindowAction, #selector(AppDelegate.closeWindowFromMenu))
    }
}
