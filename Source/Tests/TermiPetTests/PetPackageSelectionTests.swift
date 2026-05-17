import XCTest
@testable import TermiPet
@testable import TermiPetCore

@MainActor
final class PetPackageSelectionTests: XCTestCase {
    func testRandomImportedPetSwitchesToDifferentImportedPetWhenAvailable() throws {
        let appSupportURL = FileManager.default.temporaryDirectory
            .appendingPathComponent("support-\(UUID().uuidString)")
        let firstSource = try makePetFixture(id: "moon", displayName: "Moon")
        let secondSource = try makePetFixture(id: "sun", displayName: "Sun")
        defer {
            try? FileManager.default.removeItem(at: firstSource)
            try? FileManager.default.removeItem(at: secondSource)
            try? FileManager.default.removeItem(at: appSupportURL)
        }

        let store = PetPackageStore(defaultFolderURLs: [], applicationSupportURL: appSupportURL)
        let selection = PetPackageSelection(store: store)
        selection.importAndSelect(folderURL: firstSource)
        selection.importAndSelect(folderURL: secondSource)
        guard let first = selection.importedPackages.first(where: { $0.metadata.id == "moon" }) else {
            return XCTFail("Expected imported moon pet")
        }
        selection.select(package: first)

        selection.selectRandomImportedPackage { candidates in
            XCTAssertEqual(candidates.map(\.metadata.id), ["sun"])
            return candidates.first
        }

        XCTAssertEqual(selection.package?.metadata.id, "sun")
        XCTAssertNil(selection.errorMessage)
    }

    private func makePetFixture(id: String, displayName: String) throws -> URL {
        let folderURL = FileManager.default.temporaryDirectory
            .appendingPathComponent("pet-\(id)-\(UUID().uuidString)")
        try FileManager.default.createDirectory(at: folderURL, withIntermediateDirectories: true)
        let metadata = """
        {
          "id": "\(id)",
          "displayName": "\(displayName)",
          "description": "A test pet.",
          "spritesheetPath": "spritesheet.webp"
        }
        """
        try metadata.write(to: folderURL.appendingPathComponent("pet.json"), atomically: true, encoding: .utf8)
        FileManager.default.createFile(atPath: folderURL.appendingPathComponent("spritesheet.webp").path, contents: Data([1, 2, 3]))
        return folderURL
    }
}
