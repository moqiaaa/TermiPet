import XCTest
@testable import TermiPetCore

final class PetActionIconsTests: XCTestCase {
    func testDefaultIconsMatchSelectedCuteSet() {
        XCTAssertEqual(PetActionIcons.defaults, [
            "🙂",
            "🚀",
            "🐾",
            "😆",
            "👀",
            "😵",
            "💤",
            "💭",
            "🥳",
        ])
    }
}
