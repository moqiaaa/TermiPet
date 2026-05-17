import XCTest
@testable import TermiPetCore

final class AppSkinTests: XCTestCase {
    func testSkinStoreDefaultsToGlass() {
        let suiteName = "TermiPetTests.AppSkin.default.\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suiteName)!
        let store = AppSkinStore(userDefaults: defaults)

        XCTAssertEqual(store.load(), .glass)
    }

    func testSkinStorePersistsSelectedSkin() {
        let suiteName = "TermiPetTests.AppSkin.persist.\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suiteName)!
        let store = AppSkinStore(userDefaults: defaults)

        store.save(.dark)
        XCTAssertEqual(store.load(), .dark)

        store.save(.pixel)
        XCTAssertEqual(store.load(), .pixel)
    }
}
