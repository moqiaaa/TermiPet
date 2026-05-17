import XCTest
@testable import TermiPetCore

final class AppLanguageTests: XCTestCase {
    func testLanguageStorePersistsSelectedLanguage() {
        let suiteName = "TermiPetTests.AppLanguage.\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suiteName)!
        defer { defaults.removePersistentDomain(forName: suiteName) }
        let store = AppLanguageStore(userDefaults: defaults)

        store.save(.english)
        XCTAssertEqual(store.load(), .english)

        store.save(.japanese)
        XCTAssertEqual(store.load(), .japanese)
    }

    func testAllLocalizationKeysHaveValuesForEveryLanguage() {
        for language in AppLanguage.allCases {
            let localizer = AppLocalizer(language: language)
            for key in AppTextKey.allCases {
                XCTAssertFalse(
                    localizer.text(key).isEmpty,
                    "\(language.rawValue) is missing \(key.rawValue)"
                )
            }
        }
    }
}
