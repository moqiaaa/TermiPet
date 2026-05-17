import XCTest
@testable import TermiPetCore

final class PetPackageTests: XCTestCase {
    func testDecodesCodexPetMetadata() throws {
        let json = """
        {
          "id": "trumpet",
          "displayName": "Trumpet",
          "description": "A tiny pixel-art pet.",
          "spritesheetPath": "spritesheet.webp"
        }
        """.data(using: .utf8)!

        let metadata = try JSONDecoder().decode(PetMetadata.self, from: json)

        XCTAssertEqual(metadata.id, "trumpet")
        XCTAssertEqual(metadata.displayName, "Trumpet")
        XCTAssertEqual(metadata.description, "A tiny pixel-art pet.")
        XCTAssertEqual(metadata.spritesheetPath, "spritesheet.webp")
    }

    func testResolvesSpritesheetRelativeToPackageFolder() throws {
        let packageURL = URL(fileURLWithPath: "/Users/bleet/Desktop/trumpet")
        let metadata = PetMetadata(
            id: "trumpet",
            displayName: "Trumpet",
            description: "A tiny pixel-art pet.",
            spritesheetPath: "spritesheet.webp"
        )

        let package = PetPackage(folderURL: packageURL, metadata: metadata)

        XCTAssertEqual(
            package.spritesheetURL.path,
            "/Users/bleet/Desktop/trumpet/spritesheet.webp"
        )
    }

    func testLoadsPackageFromExplicitFolder() throws {
        let folderURL = FileManager.default.temporaryDirectory
            .appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: folderURL, withIntermediateDirectories: true)
        defer {
            try? FileManager.default.removeItem(at: folderURL)
        }

        let metadata = """
        {
          "id": "moon",
          "displayName": "Moon",
          "description": "A calm moon pet.",
          "spritesheetPath": "spritesheet.webp"
        }
        """
        try metadata.write(to: folderURL.appendingPathComponent("pet.json"), atomically: true, encoding: .utf8)
        FileManager.default.createFile(atPath: folderURL.appendingPathComponent("spritesheet.webp").path, contents: Data([1, 2, 3]))

        let package = PetPackageStore().loadPackage(from: folderURL)

        XCTAssertEqual(package?.metadata.id, "moon")
        XCTAssertEqual(package?.folderURL, folderURL)
    }

    func testImportsPackageByCopyingFolderIntoApplicationSupport() throws {
        let sourceURL = FileManager.default.temporaryDirectory
            .appendingPathComponent("source-\(UUID().uuidString)")
        let appSupportURL = FileManager.default.temporaryDirectory
            .appendingPathComponent("support-\(UUID().uuidString)")
        try FileManager.default.createDirectory(at: sourceURL, withIntermediateDirectories: true)

        let metadata = """
        {
          "id": "moon",
          "displayName": "Moon",
          "description": "A calm moon pet.",
          "spritesheetPath": "spritesheet.webp"
        }
        """
        try metadata.write(to: sourceURL.appendingPathComponent("pet.json"), atomically: true, encoding: .utf8)
        FileManager.default.createFile(atPath: sourceURL.appendingPathComponent("spritesheet.webp").path, contents: Data([1, 2, 3]))

        let store = PetPackageStore(defaultFolderURLs: [], applicationSupportURL: appSupportURL)
        let imported = try store.importPackage(from: sourceURL)

        XCTAssertTrue(imported.folderURL.path.hasPrefix(appSupportURL.appendingPathComponent("ImportedPets").path))
        XCTAssertEqual(imported.metadata.id, "moon")
        XCTAssertTrue(FileManager.default.fileExists(atPath: imported.spritesheetURL.path))
        XCTAssertEqual(store.importedPackages().map(\.metadata.id), ["moon"])
    }

    func testDeletesImportedPackageAndSelectsFallbackWhenNeeded() throws {
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
        _ = try store.importPackage(from: firstSource)
        let second = try store.importPackage(from: secondSource)

        let replacement = try store.deleteImportedPackage(at: second.folderURL)

        XCTAssertEqual(replacement?.metadata.id, "moon")
        XCTAssertEqual(store.loadDefaultPackage()?.metadata.id, "moon")
        XCTAssertEqual(store.importedPackages().map(\.metadata.id), ["moon"])
        XCTAssertFalse(FileManager.default.fileExists(atPath: second.folderURL.path))
    }

    func testCannotDeleteTheLastImportedPackage() throws {
        let appSupportURL = FileManager.default.temporaryDirectory
            .appendingPathComponent("support-\(UUID().uuidString)")
        let source = try makePetFixture(id: "moon", displayName: "Moon")
        defer {
            try? FileManager.default.removeItem(at: source)
            try? FileManager.default.removeItem(at: appSupportURL)
        }

        let store = PetPackageStore(defaultFolderURLs: [], applicationSupportURL: appSupportURL)
        let imported = try store.importPackage(from: source)

        XCTAssertThrowsError(try store.deleteImportedPackage(at: imported.folderURL)) { error in
            XCTAssertEqual(error as? PetPackageStoreError, .cannotDeleteLastPackage)
        }
        XCTAssertTrue(FileManager.default.fileExists(atPath: imported.folderURL.path))
    }

    func testInfersSpritesheetGridWithNineActions() {
        let grid = PetSpritesheetGrid.infer(pixelWidth: 1536, pixelHeight: 1872)

        XCTAssertEqual(grid.actionCount, 9)
        XCTAssertEqual(grid.framesPerAction, 8)
        XCTAssertEqual(grid.frameWidth, 192)
        XCTAssertEqual(grid.frameHeight, 208)
        XCTAssertEqual(grid.validFrameCount(forAction: 0), 6)
        XCTAssertEqual(grid.validFrameCount(forAction: 3), 4)
        XCTAssertEqual(grid.frameRect(action: 2, frame: 3), PetFrameRect(x: 576, y: 416, width: 192, height: 208))
    }

    func testSpritesheetFrameRectClampsToStaticFirstFrame() {
        let grid = PetSpritesheetGrid(
            actionCount: 9,
            framesPerAction: 8,
            validFramesByAction: [0: 6],
            frameWidth: 192,
            frameHeight: 208
        )

        XCTAssertEqual(grid.frameRect(action: 0, frame: 0), PetFrameRect(x: 0, y: 0, width: 192, height: 208))
        XCTAssertEqual(grid.frameRect(action: 0, frame: -4), PetFrameRect(x: 0, y: 0, width: 192, height: 208))
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
